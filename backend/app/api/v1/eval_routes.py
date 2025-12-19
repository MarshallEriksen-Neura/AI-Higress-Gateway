from __future__ import annotations

import json
from uuid import UUID

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db, get_http_client, get_redis
from app.errors import not_found
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import EvalCreateRequest, EvalRatingRequest, EvalRatingResponse, EvalResponse
from app.models import Eval as EvalModel
from app.models import Run as RunModel
from app.models import Message as MessageModel
from app.services.eval_service import (
    create_eval,
    submit_rating,
    execute_run_stream,
    _maybe_mark_eval_ready,
    _to_authenticated_api_key,
)
from app.services.project_eval_config_service import (
    resolve_project_context,
    get_or_default_project_eval_config,
    DEFAULT_PROVIDER_SCOPES,
    get_effective_provider_ids_for_user,
)
from app.services.chat_history_service import get_conversation, get_assistant


from app.logging_config import logger
from app.db.session import SessionLocal
import asyncio

router = APIRouter(
    tags=["evals"],
    dependencies=[Depends(require_jwt_token)],
)


def _run_to_summary(run) -> dict:
    return {
        "run_id": run.id,
        "requested_logical_model": run.requested_logical_model,
        "status": run.status,
        "output_preview": run.output_preview,
        "latency_ms": run.latency_ms,
        "error_code": run.error_code,
    }


@router.post("/v1/evals")
async def create_eval_endpoint(
    payload: EvalCreateRequest,
    db: Session = Depends(get_db),
    redis: Any = Depends(get_redis),
    client: Any = Depends(get_http_client),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> Any:
    eval_obj, challenger_runs, explanation = await create_eval(
        db,
        redis=redis,
        client=client,
        current_user=current_user,
        project_id=payload.project_id,
        assistant_id=payload.assistant_id,
        conversation_id=payload.conversation_id,
        message_id=payload.message_id,
        baseline_run_id=payload.baseline_run_id,
        start_background_runs=not bool(payload.streaming),
    )
    
    if not payload.streaming:
        return EvalResponse(
            eval_id=eval_obj.id,
            status=eval_obj.status,
            baseline_run_id=eval_obj.baseline_run_id,
            challengers=[_run_to_summary(r) for r in challenger_runs],
            explanation=explanation,
            created_at=eval_obj.created_at,
            updated_at=eval_obj.updated_at,
        )

    # 流式模式：真并行执行 challenger runs 并通过 SSE 返回
    async def _stream_generator():
        run_tasks = []
        try:
            # 1. 首先返回 Eval 对象基本信息
            initial_data = {
                "type": "eval.created",
                "eval_id": str(eval_obj.id),
                "status": eval_obj.status,
                "baseline_run_id": str(eval_obj.baseline_run_id),
                "challengers": [
                    {k: (str(v) if isinstance(v, UUID) else v) for k, v in _run_to_summary(r).items()}
                    for r in challenger_runs
                ],
                "explanation": explanation,
            }
            yield f"data: {json.dumps(initial_data, ensure_ascii=False)}\n\n".encode("utf-8")

            # 准备公共执行上下文
            ctx = resolve_project_context(db, project_id=payload.project_id, current_user=current_user)
            cfg = get_or_default_project_eval_config(db, project_id=ctx.project_id)
            effective_provider_ids = get_effective_provider_ids_for_user(
                db,
                user_id=UUID(str(current_user.id)),
                api_key=ctx.api_key,
                provider_scopes=list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES),
            )
            auth = _to_authenticated_api_key(db, api_key=ctx.api_key)
            
            queue = asyncio.Queue()
            
            async def _run_task(run_id: UUID):
                try:
                    # 每个 run 独立 session，避免同一 Session 在多个并发任务中交叉使用导致报错
                    with SessionLocal() as task_db:
                        # 重新加载必要对象
                        task_run = task_db.execute(select(RunModel).where(RunModel.id == run_id)).scalars().first()
                        conv = get_conversation(task_db, conversation_id=payload.conversation_id, user_id=UUID(str(current_user.id)))
                        assistant = get_assistant(task_db, assistant_id=payload.assistant_id, user_id=UUID(str(current_user.id)))
                        user_message = task_db.execute(select(MessageModel).where(MessageModel.id == payload.message_id)).scalars().first()
                        
                        if not all([task_run, conv, assistant, user_message]):
                            logger.error("eval_routes: context objects not found for run %s", run_id)
                            await queue.put({"run_id": str(run_id), "type": "run.error", "error": {"message": "Context objects not found"}})
                            return

                        async for item in execute_run_stream(
                            task_db,
                            redis=redis,
                            client=client,
                            api_key=auth,
                            effective_provider_ids=effective_provider_ids,
                            conversation=conv,
                            assistant=assistant,
                            user_message=user_message,
                            run=task_run,
                            requested_logical_model=task_run.requested_logical_model,
                            payload_override=dict(task_run.request_payload or {}),
                        ):
                            await queue.put(item)
                except Exception as task_exc:
                    logger.exception("eval_routes: run_task failed for run %s", run_id)
                    await queue.put({"run_id": str(run_id), "type": "run.error", "error": {"message": str(task_exc)}})

            # 启动所有任务
            run_tasks = [asyncio.create_task(_run_task(r.id)) for r in challenger_runs]
            
            num_tasks = len(run_tasks)
            while True:
                finished_tasks = sum(1 for t in run_tasks if t.done())
                if finished_tasks >= num_tasks and queue.empty():
                    break

                try:
                    # 使用 wait_for 实现 heartbeat
                    item = await asyncio.wait_for(queue.get(), timeout=10.0)
                    yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n".encode('utf-8')
                except asyncio.TimeoutError:
                    yield b": heartbeat\n\n"
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("eval_routes: error getting from queue")

            # 检查是否全部 ready
            with SessionLocal() as final_db:
                _maybe_mark_eval_ready(final_db, eval_id=eval_obj.id)
                final_db.commit()

            final_data = {
                "type": "eval.completed",
                "eval_id": str(eval_obj.id),
                "status": "ready"
            }
            yield f"data: {json.dumps(final_data, ensure_ascii=False)}\n\n".encode("utf-8")
            yield b"data: [DONE]\n\n"
            
        except Exception as e:
            logger.exception("eval_routes: stream generator failed")
            yield f"data: {json.dumps({'type': 'eval.error', 'error': {'message': str(e)}}, ensure_ascii=False)}\n\n".encode("utf-8")
        finally:
            # 确保所有任务被取消
            for t in run_tasks:
                if not t.done():
                    t.cancel()
            if run_tasks:
                # 给一点时间让任务响应取消
                await asyncio.gather(*run_tasks, return_exceptions=True)

    return StreamingResponse(_stream_generator(), media_type="text/event-stream")


@router.get("/v1/evals/{eval_id}", response_model=EvalResponse)
def get_eval_endpoint(
    eval_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> EvalResponse:
    eval_row = db.execute(
        select(EvalModel).where(
            EvalModel.id == eval_id,
            EvalModel.user_id == UUID(str(current_user.id)),
        )
    ).scalars().first()
    if eval_row is None:
        raise not_found("评测不存在", details={"eval_id": str(eval_id)})

    challenger_ids = []
    if isinstance(eval_row.challenger_run_ids, list):
        for item in eval_row.challenger_run_ids:
            try:
                challenger_ids.append(UUID(str(item)))
            except ValueError:
                continue

    challengers = []
    if challenger_ids:
        challengers = list(
            db.execute(select(RunModel).where(RunModel.id.in_(challenger_ids))).scalars().all()
        )

    return EvalResponse(
        eval_id=eval_row.id,
        status=eval_row.status,
        baseline_run_id=eval_row.baseline_run_id,
        challengers=[_run_to_summary(r) for r in challengers],
        explanation=eval_row.explanation,
        created_at=eval_row.created_at,
        updated_at=eval_row.updated_at,
    )


@router.post("/v1/evals/{eval_id}/rating", response_model=EvalRatingResponse)
def submit_eval_rating_endpoint(
    eval_id: UUID,
    payload: EvalRatingRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> EvalRatingResponse:
    rating = submit_rating(
        db,
        current_user=current_user,
        eval_id=eval_id,
        winner_run_id=payload.winner_run_id,
        reason_tags=payload.reason_tags,
    )
    return EvalRatingResponse(
        eval_id=rating.eval_id,
        winner_run_id=rating.winner_run_id,
        reason_tags=list(rating.reason_tags or []),
        created_at=rating.created_at,
    )


__all__ = ["router"]
