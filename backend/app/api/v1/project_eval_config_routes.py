from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import ProjectEvalConfigResponse, ProjectEvalConfigUpdateRequest
from app.services.project_eval_config_service import (
    DEFAULT_PROVIDER_SCOPES,
    get_or_default_project_eval_config,
    resolve_project_context,
    upsert_project_eval_config,
)

router = APIRouter(
    tags=["project-eval-config"],
    dependencies=[Depends(require_jwt_token)],
)


@router.get("/v1/projects/{project_id}/eval-config", response_model=ProjectEvalConfigResponse)
def get_project_eval_config_endpoint(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> ProjectEvalConfigResponse:
    ctx = resolve_project_context(db, project_id=project_id, current_user=current_user)
    cfg = get_or_default_project_eval_config(db, project_id=ctx.project_id)
    scopes = list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES)
    return ProjectEvalConfigResponse(
        project_id=ctx.project_id,
        enabled=bool(cfg.enabled),
        max_challengers=int(cfg.max_challengers or 0),
        provider_scopes=scopes,
        candidate_logical_models=list(cfg.candidate_logical_models or []) if cfg.candidate_logical_models is not None else None,
        cooldown_seconds=int(cfg.cooldown_seconds or 0),
        budget_per_eval_credits=cfg.budget_per_eval_credits,
        rubric=cfg.rubric,
        project_ai_enabled=bool(getattr(cfg, "project_ai_enabled", False)),
        project_ai_provider_model=cfg.project_ai_provider_model,
    )


@router.put("/v1/projects/{project_id}/eval-config", response_model=ProjectEvalConfigResponse)
def update_project_eval_config_endpoint(
    project_id: UUID,
    payload: ProjectEvalConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> ProjectEvalConfigResponse:
    ctx = resolve_project_context(db, project_id=project_id, current_user=current_user)
    cfg = upsert_project_eval_config(
        db,
        project_id=ctx.project_id,
        enabled=payload.enabled,
        max_challengers=payload.max_challengers,
        provider_scopes=payload.provider_scopes,
        candidate_logical_models=payload.candidate_logical_models,
        cooldown_seconds=payload.cooldown_seconds,
        budget_per_eval_credits=payload.budget_per_eval_credits,
        rubric=payload.rubric,
        project_ai_enabled=payload.project_ai_enabled,
        project_ai_provider_model=payload.project_ai_provider_model,
    )
    scopes = list(getattr(cfg, "provider_scopes", None) or DEFAULT_PROVIDER_SCOPES)
    return ProjectEvalConfigResponse(
        project_id=ctx.project_id,
        enabled=bool(cfg.enabled),
        max_challengers=int(cfg.max_challengers or 0),
        provider_scopes=scopes,
        candidate_logical_models=list(cfg.candidate_logical_models or []) if cfg.candidate_logical_models is not None else None,
        cooldown_seconds=int(cfg.cooldown_seconds or 0),
        budget_per_eval_credits=cfg.budget_per_eval_credits,
        rubric=cfg.rubric,
        project_ai_enabled=bool(getattr(cfg, "project_ai_enabled", False)),
        project_ai_provider_model=cfg.project_ai_provider_model,
    )


__all__ = ["router"]
