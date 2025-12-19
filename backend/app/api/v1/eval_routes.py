from __future__ import annotations

from uuid import UUID

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.errors import not_found
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import EvalCreateRequest, EvalRatingRequest, EvalRatingResponse, EvalResponse
from app.models import Eval as EvalModel
from app.models import Run as RunModel
from app.deps import get_http_client, get_redis
from app.services.eval_service import create_eval, submit_rating

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


@router.post("/v1/evals", response_model=EvalResponse)
async def create_eval_endpoint(
    payload: EvalCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis: Any = Depends(get_redis),
    client: Any = Depends(get_http_client),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> EvalResponse:
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
        background_tasks=background_tasks,
    )
    return EvalResponse(
        eval_id=eval_obj.id,
        status=eval_obj.status,
        baseline_run_id=eval_obj.baseline_run_id,
        challengers=[_run_to_summary(r) for r in challenger_runs],
        explanation=explanation,  # dict -> EvalExplanation
        created_at=eval_obj.created_at,
        updated_at=eval_obj.updated_at,
    )


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
