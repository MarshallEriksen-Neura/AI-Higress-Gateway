from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import os
import httpx

from fastapi import BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.errors import bad_request, forbidden, http_error, not_found
from app.http_client import CurlCffiClient
from app.jwt_auth import AuthenticatedUser
from app.logging_config import logger
from app.models import APIKey, AssistantPreset, Conversation, Eval, EvalRating, Message, Run, User
from app.services import chat_run_service
from app.services.bandit_policy_service import recommend_challengers
from app.services.chat_history_service import update_assistant_message_for_user_sequence
from app.services.context_features_service import build_rule_context_features
from app.services.project_ai_service import (
    build_project_ai_explanation,
    build_rule_explanation,
    infer_context_features_via_project_ai,
)
from app.services.project_eval_config_service import (
    DEFAULT_PROVIDER_SCOPES,
    get_effective_provider_ids_for_user,
    get_or_default_project_eval_config,
    resolve_project_context,
)
from app.auth import AuthenticatedAPIKey
from app.redis_client import get_redis_client
from app.settings import settings
from app.api.v1.chat.request_handler import RequestHandler
from app.upstream import detect_request_format


try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore


_RUN_SEMAPHORE = asyncio.Semaphore(6)

def _get_background_session_factory():
    return SessionLocal


def _get_background_redis():
    return get_redis_client()


@asynccontextmanager
async def _background_http_client():
    async with CurlCffiClient(
        timeout=settings.upstream_timeout,
        impersonate="chrome120",
        trust_env=True,
    ) as client:
        yield client

def _to_authenticated_api_key(db: Session, *, api_key: APIKey) -> AuthenticatedAPIKey:
    user = db.execute(select(User).where(User.id == api_key.user_id)).scalars().first()
    if user is None:
        raise not_found("API Key 所属用户不存在", details={"api_key_id": str(api_key.id)})
    return AuthenticatedAPIKey(
        id=UUID(str(api_key.id)),
        user_id=UUID(str(user.id)),
        user_username=user.username,
        is_superuser=bool(user.is_superuser),
        name=api_key.name,
        is_active=bool(api_key.is_active),
        disabled_reason=api_key.disabled_reason,
        has_provider_restrictions=bool(api_key.has_provider_restrictions),
        allowed_provider_ids=list(api_key.allowed_provider_ids),
    )


def _extract_user_text_from_run(run: Run) -> str:
    payload = run.request_payload or {}
    if not isinstance(payload, dict):
        return ""
    msgs = payload.get("messages")
    if not isinstance(msgs, list):
        return ""
    # find last user message
    for item in reversed(msgs):
        if isinstance(item, dict) and item.get("role") == "user":
            val = item.get("content")
            if isinstance(val, str):
                return val
    return ""


def _ensure_cooldown_ok(db: Session, *, user_id: UUID, project_id: UUID, cooldown_seconds: int) -> None:
    if cooldown_seconds <= 0:
        return
    latest = db.execute(
        select(Eval)
        .where(Eval.user_id == user_id, Eval.api_key_id == project_id)
        .order_by(Eval.created_at.desc())
        .limit(1)
    ).scalars().first()
    if latest is None or latest.created_at is None:
        return
    now = datetime.now(UTC)
    delta = (now - latest.created_at).total_seconds()
    if delta < cooldown_seconds:
        raise http_error(
            429,
            error="PROJECT_EVAL_COOLDOWN",
            message="评测太频繁，请稍后再试",
            details={"cooldown_seconds": cooldown_seconds, "retry_after_seconds": int(cooldown_seconds - delta)},
        )


async def create_eval(
    db: Session,
    *,
    redis,
    client,
    current_user: AuthenticatedUser,
    project_id: UUID,
    assistant_id: UUID,
    conversation_id: UUID,
    message_id: UUID,
    baseline_run_id: UUID,
    start_background_runs: bool = True,
) -> tuple[Eval, list[Run], dict | None]:
    ctx = resolve_project_context(db, project_id=project_id, current_user=current_user)
    cfg = get_or_default_project_eval_config(db, project_id=ctx.project_id)
    if not bool(cfg.enabled):
        raise forbidden("该项目未启用推荐评测", details={"project_id": str(project_id)})

    _ensure_cooldown_ok(
        db,
        user_id=UUID(str(current_user.id)),
        project_id=ctx.project_id,
        cooldown_seconds=int(cfg.cooldown_seconds or 0),
    )

    baseline = db.execute(
        select(Run).where(
            Run.id == baseline_run_id,
            Run.user_id == UUID(str(current_user.id)),
            Run.api_key_id == ctx.project_id,
        )
    ).scalars().first()
    if baseline is None:
        raise not_found("baseline_run 不存在", details={"baseline_run_id": str(baseline_run_id)})

    existing = db.execute(select(Eval).where(Eval.baseline_run_id == baseline_run_id)).scalars().first()
    if existing is not None:
        # 允许幂等返回
        run_ids = existing.challenger_run_ids or []
        challengers: list[Run] = []
        if isinstance(run_ids, list) and run_ids:
            challenger_uuid_ids = []
            for item in run_ids:
                try:
                    challenger_uuid_ids.append(UUID(str(item)))
                except ValueError:
                    continue
            if challenger_uuid_ids:
                challenger_rows = db.execute(select(Run).where(Run.id.in_(challenger_uuid_ids))).scalars().all()
            else:
                challenger_rows = []
            challengers = list(challenger_rows)
        return existing, challengers, existing.explanation

    conversation = db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == UUID(str(current_user.id)),
            Conversation.api_key_id == ctx.project_id,
        )
    ).scalars().first()
    if conversation is None:
        raise not_found("会话不存在", details={"conversation_id": str(conversation_id)})

    assistant = db.execute(
        select(AssistantPreset).where(
            AssistantPreset.id == assistant_id,
            AssistantPreset.user_id == UUID(str(current_user.id)),
        )
    ).scalars().first()
    if assistant is None:
        raise not_found("助手不存在", details={"assistant_id": str(assistant_id)})

    message = db.execute(
        select(Message).where(
            Message.id == message_id,
            Message.conversation_id == conversation_id,
        )
    ).scalars().first()
    if message is None:
        raise not_found("消息不存在", details={"message_id": str(message_id)})
    if UUID(str(baseline.message_id)) != UUID(str(message.id)):
        raise bad_request(
            "baseline_run_id 与 message_id 不匹配",
            details={"baseline_run_id": str(baseline_run_id), "message_id": str(message_id)},
        )

    effective_provider_ids = get_effective_provider_ids_for_user(
        db,
        user_id=UUID(str(current_user.id)),
        api_key=ctx.api_key,
        provider_scopes=list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES),
    )

    user_text = _extract_user_text_from_run(baseline)
    candidate_models = list(cfg.candidate_logical_models or [])
    max_challengers = int(cfg.max_challengers or 2)
    max_challengers = max(0, min(max_challengers, 5))

    # Context features（低基数）：规则优先，unknown 则走 Project AI 兜底（可拔插）
    features = build_rule_context_features(
        user_text=user_text,
        request_payload=baseline.request_payload if isinstance(baseline.request_payload, dict) else None,
    )
    if (
        features.get("task_type") == "unknown"
        and bool(getattr(cfg, "project_ai_enabled", False))
        and cfg.project_ai_provider_model
    ):
        try:
            auth_key = AuthenticatedAPIKey(
                id=UUID(str(ctx.api_key.id)),
                user_id=UUID(str(ctx.api_key.user_id)),
                user_username=current_user.username,
                is_superuser=bool(current_user.is_superuser),
                name=ctx.api_key.name,
                is_active=bool(ctx.api_key.is_active),
                disabled_reason=ctx.api_key.disabled_reason,
                has_provider_restrictions=bool(ctx.api_key.has_provider_restrictions),
                allowed_provider_ids=list(ctx.api_key.allowed_provider_ids),
            )
            patch = await infer_context_features_via_project_ai(
                db,
                redis=redis,
                client=client,
                api_key=auth_key,
                project_ai_provider_model=str(cfg.project_ai_provider_model),
                allowed_provider_ids=set(effective_provider_ids),
                user_text=user_text,
                rule_features=dict(features),
                idempotency_key=f"eval:{baseline_run_id}:project_ai_context_features",
            )
            if patch:
                if features.get("task_type") == "unknown" and patch.get("task_type"):
                    features["task_type"] = patch["task_type"]
                if patch.get("risk_tier"):
                    order = {"low": 0, "medium": 1, "high": 2}
                    current = str(features.get("risk_tier") or "low")
                    proposed = str(patch["risk_tier"])
                    if order.get(proposed, 0) > order.get(current, 0):
                        features["risk_tier"] = proposed
        except Exception:
            logger.info("eval_service: project ai context features skipped", exc_info=True)

    rec = recommend_challengers(
        db,
        project_id=ctx.project_id,
        assistant_id=UUID(str(assistant.id)),
        baseline_logical_model=baseline.requested_logical_model,
        user_text=user_text,
        context_features=features,
        candidate_logical_models=candidate_models,
        k=max_challengers,
        policy_version="ts-v1",
    )
    explanation_obj = build_rule_explanation(recommendation=rec, rubric=cfg.rubric)

    eval_obj = Eval(
        user_id=UUID(str(current_user.id)),
        api_key_id=ctx.project_id,
        assistant_id=UUID(str(assistant.id)),
        conversation_id=UUID(str(conversation.id)),
        message_id=UUID(str(message.id)),
        baseline_run_id=UUID(str(baseline.id)),
        challenger_run_ids=[],
        effective_provider_ids=sorted(effective_provider_ids),
        context_features={"context_key": rec.context_key, "features": rec.features},
        policy_version=rec.policy_version,
        explanation=explanation_obj.to_dict() if explanation_obj else None,
        status="running",
        rated_at=None,
    )
    db.add(eval_obj)
    db.flush()

    challenger_runs: list[Run] = []
    challenger_ids: list[str] = []
    for cand in rec.candidates:
        # 基于 baseline 的 request_payload 复用，仅替换 model 字段。
        req_payload = dict(baseline.request_payload or {})
        req_payload["model"] = cand.logical_model
        run = Run(
            eval_id=UUID(str(eval_obj.id)),
            message_id=baseline.message_id,
            user_id=baseline.user_id,
            api_key_id=baseline.api_key_id,
            requested_logical_model=cand.logical_model,
            selected_provider_id=None,
            selected_provider_model=None,
            status="queued",
            started_at=None,
            finished_at=None,
            latency_ms=None,
            cost_credits=None,
            error_code=None,
            error_message=None,
            request_payload=req_payload,
            response_payload=None,
            output_text=None,
            output_preview=None,
        )
        db.add(run)
        db.flush()
        challenger_runs.append(run)
        challenger_ids.append(str(run.id))

    eval_obj.challenger_run_ids = challenger_ids
    # baseline run 也挂上 eval_id，便于未来扩展（例如统计/审计）。
    baseline.eval_id = UUID(str(eval_obj.id))
    db.add(baseline)
    db.add(eval_obj)
    db.commit()
    db.refresh(eval_obj)

    if start_background_runs:
        if os.getenv("PYTEST_CURRENT_TEST"):
            # 测试环境下同步跑完，避免后台任务不确定性。
            for run in challenger_runs:
                await _execute_run_background(run_id=UUID(str(run.id)))
        else:
            for run in challenger_runs:
                asyncio.create_task(_execute_run_background(run_id=UUID(str(run.id))))

    # Optional: Project AI（LLM）解释（可拔插），失败降级为规则解释
    try:
        if bool(getattr(cfg, "project_ai_enabled", False)) and cfg.project_ai_provider_model:
            auth_key = AuthenticatedAPIKey(
                id=UUID(str(ctx.api_key.id)),
                user_id=UUID(str(ctx.api_key.user_id)),
                user_username=current_user.username,
                is_superuser=bool(current_user.is_superuser),
                name=ctx.api_key.name,
                is_active=bool(ctx.api_key.is_active),
                disabled_reason=ctx.api_key.disabled_reason,
                has_provider_restrictions=bool(ctx.api_key.has_provider_restrictions),
                allowed_provider_ids=list(ctx.api_key.allowed_provider_ids),
            )
            llm_expl = await build_project_ai_explanation(
                db,
                redis=redis,
                client=client,
                api_key=auth_key,
                project_ai_provider_model=str(cfg.project_ai_provider_model),
                allowed_provider_ids=set(effective_provider_ids),
                rubric=cfg.rubric,
                recommendation=rec,
                baseline_logical_model=str(baseline.requested_logical_model),
                idempotency_key=f"eval:{baseline_run_id}:project_ai_explanation",
            )
            if llm_expl is not None:
                eval_obj.explanation = llm_expl.to_dict()
                db.add(eval_obj)
                db.commit()
                db.refresh(eval_obj)
    except Exception:
        logger.info("eval_service: project ai explanation skipped", exc_info=True)

    return eval_obj, challenger_runs, eval_obj.explanation


def _maybe_mark_eval_ready(db: Session, *, eval_id: UUID) -> None:
    eval_obj = db.execute(select(Eval).where(Eval.id == eval_id)).scalars().first()
    if eval_obj is None:
        return
    # rated 优先，不覆盖
    if eval_obj.status == "rated":
        return
    if eval_obj.status not in {"running", "ready"}:
        return

    unfinished = db.execute(
        select(Run.id)
        .where(Run.eval_id == eval_id)
        .where(Run.status.in_(("queued", "running")))
        .limit(1)
    ).scalars().first()
    if unfinished is not None:
        return

    # challengers 全部结束（成功/失败/取消），置为 ready
    if eval_obj.status != "ready":
        eval_obj.status = "ready"
        db.add(eval_obj)


async def execute_run_stream(
    db: Session,
    *,
    redis: Redis,
    client: httpx.AsyncClient,
    api_key: AuthenticatedAPIKey,
    effective_provider_ids: set[str],
    conversation: Conversation,
    assistant: AssistantPreset,
    user_message: Message,
    run: Run,
    requested_logical_model: str,
    payload_override: dict[str, Any] | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    执行一次 stream run，并持续产生 chunk 给调用方。
    每个 chunk 包含 run_id, status, provider_id, delta 等字段。
    """
    run_id_str = str(run.id)
    start = time.time()
    
    # 状态置为 running
    run.status = "running"
    run.started_at = datetime.now(UTC)
    db.add(run)
    db.commit()
    db.refresh(run)

    full_text_list: list[str] = []
    selected: dict[str, str | None] = {"provider_id": None, "model_id": None}

    try:
        payload = payload_override or chat_run_service.build_openai_request_payload(
            db,
            conversation=conversation,
            assistant=assistant,
            user_message=user_message,
            requested_logical_model=requested_logical_model,
        )
        payload["stream"] = True
        api_style = detect_request_format(payload)

        def _sink(provider_id: str, model_id: str | None = None) -> None:
            selected["provider_id"] = provider_id
            if model_id:
                selected["model_id"] = model_id

        handler = RequestHandler(api_key=api_key, db=db, redis=redis, client=client)
        
        async for chunk_bytes in handler.handle_stream(
            payload=payload,
            requested_model=requested_logical_model,
            lookup_model_id=requested_logical_model,
            api_style=api_style,
            effective_provider_ids=effective_provider_ids,
            session_id=str(conversation.id),
            provider_id_sink=_sink,
        ):
            # 解析 chunk 获取文本增量（best-effort）
            text_delta = ""
            try:
                chunk_str = chunk_bytes.decode("utf-8", errors="ignore")
                if chunk_str.startswith("data: "):
                    data_str = chunk_str[6:].strip()
                    if data_str != "[DONE]":
                        data = json.loads(data_str)
                        if "choices" in data and len(data["choices"]) > 0:
                            delta = data["choices"][0].get("delta", {})
                            text_delta = delta.get("content", "")
                            if text_delta:
                                full_text_list.append(text_delta)
                        elif "error" in data:
                            yield {
                                "run_id": run_id_str,
                                "type": "run.error",
                                "status": "failed",
                                "error": data["error"],
                            }
                            # 更新 DB 记录失败
                            run.status = "failed"
                            run.selected_provider_id = selected.get("provider_id")
                            run.selected_provider_model = selected.get("model_id")
                            run.error_code = data["error"].get("type") or "UPSTREAM_ERROR"
                            run.error_message = data["error"].get("message")
                            run.finished_at = datetime.now(UTC)
                            db.add(run)
                            db.commit()
                            return
            except Exception:
                pass

            yield {
                "run_id": run_id_str,
                "type": "run.delta",
                "status": "running",
                "provider_id": selected.get("provider_id"),
                "delta": text_delta,
            }

        full_text = "".join(full_text_list)
        output_preview = full_text[:380].rstrip() if full_text else None
        
        run.status = "succeeded"
        run.selected_provider_id = selected.get("provider_id")
        run.selected_provider_model = selected.get("model_id")
        run.output_text = full_text
        run.output_preview = output_preview
        run.latency_ms = int(max(0, (time.time() - start) * 1000))
        run.finished_at = datetime.now(UTC)
        db.add(run)
        db.commit()

        yield {
            "run_id": run_id_str,
            "type": "run.completed",
            "status": "succeeded",
            "provider_id": selected.get("provider_id"),
            "provider_model": selected.get("model_id"),
            "latency_ms": run.latency_ms,
            "full_text": full_text,
        }

    except asyncio.CancelledError:
        logger.info("eval_service: streaming run cancelled (run_id=%s)", run.id)
        run.status = "cancelled"
        run.selected_provider_id = selected.get("provider_id")
        run.selected_provider_model = selected.get("model_id")
        run.finished_at = datetime.now(UTC)
        db.add(run)
        db.commit()
        # 对于 CancelledError，通常不需要 yield 东西，因为连接已经断开了
        raise
    except Exception as exc:
        logger.exception("eval_service: streaming run failed (run_id=%s): %s", run.id, exc)
        run.status = "failed"
        run.selected_provider_id = selected.get("provider_id")
        run.selected_provider_model = selected.get("model_id")
        run.error_code = "INTERNAL_ERROR"
        run.error_message = str(exc)
        run.latency_ms = int(max(0, (time.time() - start) * 1000))
        run.finished_at = datetime.now(UTC)
        db.add(run)
        db.commit()
        yield {
            "run_id": run_id_str,
            "type": "run.error",
            "status": "failed",
            "error": {"message": str(exc)},
        }


async def _execute_run_background(*, run_id: UUID) -> None:
    async with _RUN_SEMAPHORE:
        SessionFactory = _get_background_session_factory()
        with SessionFactory() as db:
            run = db.execute(select(Run).where(Run.id == run_id)).scalars().first()
            if run is None:
                return
            if run.status not in {"queued", "running"}:
                return
            eval_id = UUID(str(run.eval_id)) if run.eval_id else None

            conversation = db.execute(
                select(Conversation)
                .join(Message, Message.conversation_id == Conversation.id)
                .where(Message.id == run.message_id)
                .limit(1)
            ).scalars().first()
            if conversation is None:
                run.status = "failed"
                run.error_code = "NOT_FOUND"
                run.error_message = "conversation not found"
                db.add(run)
                db.commit()
                return

            assistant = db.execute(select(AssistantPreset).where(AssistantPreset.id == conversation.assistant_id)).scalars().first()
            if assistant is None:
                run.status = "failed"
                run.error_code = "NOT_FOUND"
                run.error_message = "assistant not found"
                db.add(run)
                db.commit()
                return

            user_message = db.execute(select(Message).where(Message.id == run.message_id)).scalars().first()
            if user_message is None:
                run.status = "failed"
                run.error_code = "NOT_FOUND"
                run.error_message = "message not found"
                db.add(run)
                db.commit()
                return

            api_key = db.execute(select(APIKey).where(APIKey.id == run.api_key_id)).scalars().first()
            if api_key is None:
                run.status = "failed"
                run.error_code = "NOT_FOUND"
                run.error_message = "api_key not found"
                db.add(run)
                db.commit()
                return

            cfg = get_or_default_project_eval_config(db, project_id=UUID(str(api_key.id)))
            effective_provider_ids = get_effective_provider_ids_for_user(
                db,
                user_id=UUID(str(run.user_id)),
                api_key=api_key,
                provider_scopes=list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES),
            )

            redis = _get_background_redis()
            async with _background_http_client() as client:
                auth = _to_authenticated_api_key(db, api_key=api_key)
                run.status = "running"
                run.started_at = datetime.now(UTC)
                db.add(run)
                db.commit()
                db.refresh(run)

                updated = await chat_run_service.execute_run_non_stream(
                    db,
                    redis=redis,
                    client=client,
                    api_key=auth,
                    effective_provider_ids=effective_provider_ids,
                    conversation=conversation,
                    assistant=assistant,
                    user_message=user_message,
                    run=run,
                    requested_logical_model=run.requested_logical_model,
                    model_preset_override=None,
                    payload_override=dict(run.request_payload or {}),
                )
                _ = updated
                if eval_id is not None:
                    _maybe_mark_eval_ready(db, eval_id=eval_id)
                    db.commit()


def submit_rating(
    db: Session,
    *,
    current_user: AuthenticatedUser,
    eval_id: UUID,
    winner_run_id: UUID,
    reason_tags: list[str],
) -> EvalRating:
    eval_obj = db.execute(
        select(Eval).where(Eval.id == eval_id, Eval.user_id == UUID(str(current_user.id)))
    ).scalars().first()
    if eval_obj is None:
        raise not_found("评测不存在", details={"eval_id": str(eval_id)})

    # winner 必须属于 baseline/challengers
    allowed: set[str] = {str(eval_obj.baseline_run_id)}
    challenger_ids = eval_obj.challenger_run_ids or []
    if isinstance(challenger_ids, list):
        allowed |= {str(x) for x in challenger_ids}
    if str(winner_run_id) not in allowed:
        raise bad_request("winner_run_id 不属于该评测", details={"winner_run_id": str(winner_run_id)})

    existing = db.execute(
        select(EvalRating).where(
            EvalRating.eval_id == eval_id,
            EvalRating.user_id == UUID(str(current_user.id)),
        )
    ).scalars().first()
    if existing is not None:
        return existing

    rating = EvalRating(
        eval_id=eval_id,
        user_id=UUID(str(current_user.id)),
        winner_run_id=winner_run_id,
        reason_tags=reason_tags or [],
    )
    db.add(rating)
    eval_obj.status = "rated"
    eval_obj.rated_at = datetime.now(UTC)
    db.add(eval_obj)

    # 更新 bandit（best-effort）
    try:
        context = eval_obj.context_features or {}
        context_key = ""
        if isinstance(context, dict):
            context_key = str(context.get("context_key") or "")
        # 从 run_id 映射到 logical_model
        allowed_uuids = [UUID(rid) for rid in allowed]
        run_rows = db.execute(select(Run).where(Run.id.in_(allowed_uuids))).scalars().all()
        model_by_run = {str(r.id): r.requested_logical_model for r in run_rows}
        winner_model = model_by_run.get(str(winner_run_id))
        if winner_model:
            candidate_models = [model_by_run[rid] for rid in allowed if rid in model_by_run]
            from app.services.bandit_policy_service import apply_winner_update

            apply_winner_update(
                db,
                project_id=UUID(str(eval_obj.api_key_id)),
                assistant_id=UUID(str(eval_obj.assistant_id)),
                context_key=context_key,
                candidate_models=candidate_models,
                winner_model=winner_model,
            )
    except Exception:
        logger.exception("eval_service: failed to update bandit stats (eval_id=%s)", eval_id)

    # winner 写回会话正文（若有 assistant message）
    try:
        winner_run = db.execute(select(Run).where(Run.id == winner_run_id)).scalars().first()
        base_message = db.execute(select(Message).where(Message.id == eval_obj.message_id)).scalars().first()
        if winner_run is not None and base_message is not None:
            new_text = (winner_run.output_text or "").strip()
            if new_text:
                update_assistant_message_for_user_sequence(
                    db,
                    conversation_id=UUID(str(eval_obj.conversation_id)),
                    user_sequence=int(base_message.sequence or 0),
                    new_text=new_text,
                )
    except Exception:
        logger.exception("eval_service: failed to update assistant message for eval %s", eval_id)

    db.commit()
    db.refresh(rating)
    return rating


__all__ = ["create_eval", "submit_rating"]
