from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.deps import get_db
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import ProjectChatSettingsResponse, ProjectChatSettingsUpdateRequest
from app.services.project_chat_settings_service import (
    get_project_chat_settings,
    update_project_chat_settings,
)

router = APIRouter(
    tags=["project-chat-settings"],
    dependencies=[Depends(require_jwt_token)],
)


@router.get("/v1/projects/{project_id}/chat-settings", response_model=ProjectChatSettingsResponse)
def get_project_chat_settings_endpoint(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> ProjectChatSettingsResponse:
    return get_project_chat_settings(db, project_id=project_id, current_user=current_user)


@router.put("/v1/projects/{project_id}/chat-settings", response_model=ProjectChatSettingsResponse)
def update_project_chat_settings_endpoint(
    project_id: UUID,
    payload: ProjectChatSettingsUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> ProjectChatSettingsResponse:
    return update_project_chat_settings(db, project_id=project_id, current_user=current_user, payload=payload)


__all__ = ["router"]

