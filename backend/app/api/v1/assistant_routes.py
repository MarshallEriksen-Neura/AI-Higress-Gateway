from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore

from app.deps import get_db, get_http_client, get_redis
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.schemas import (
    AssistantPresetCreateRequest,
    AssistantPresetListResponse,
    AssistantPresetResponse,
    AssistantPresetUpdateRequest,
    ConversationCreateRequest,
    ConversationItem,
    ConversationListResponse,
    MessageCreateRequest,
    MessageCreateResponse,
    MessageListResponse,
    RunDetailResponse,
    RunSummary,
)
from app.services import chat_app_service
from app.services.chat_history_service import (
    create_assistant,
    create_conversation,
    get_assistant,
    get_run_detail,
    list_assistants,
    list_conversations,
    list_messages_with_run_summaries,
    update_assistant,
)

router = APIRouter(
    tags=["assistants"],
    dependencies=[Depends(require_jwt_token)],
)


def _assistant_to_response(obj) -> AssistantPresetResponse:
    return AssistantPresetResponse(
        assistant_id=obj.id,
        project_id=obj.api_key_id,
        name=obj.name,
        system_prompt=obj.system_prompt,
        default_logical_model=obj.default_logical_model,
        model_preset=obj.model_preset,
        archived_at=obj.archived_at,
        created_at=obj.created_at,
        updated_at=obj.updated_at,
    )


def _conversation_to_item(obj) -> dict:
    return {
        "conversation_id": obj.id,
        "assistant_id": obj.assistant_id,
        "project_id": obj.api_key_id,
        "title": obj.title,
        "last_activity_at": obj.last_activity_at,
        "created_at": obj.created_at,
        "updated_at": obj.updated_at,
    }


def _run_to_summary(run) -> RunSummary:
    return RunSummary(
        run_id=run.id,
        requested_logical_model=run.requested_logical_model,
        status=run.status,
        output_preview=run.output_preview,
        latency_ms=run.latency_ms,
        error_code=run.error_code,
    )


@router.get("/v1/assistants", response_model=AssistantPresetListResponse)
def list_assistants_endpoint(
    project_id: UUID | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> AssistantPresetListResponse:
    items, next_cursor = list_assistants(
        db,
        user_id=UUID(str(current_user.id)),
        project_id=project_id,
        cursor=cursor,
        limit=limit,
    )
    return AssistantPresetListResponse(
        items=[
            {
                "assistant_id": it.id,
                "project_id": it.api_key_id,
                "name": it.name,
                "default_logical_model": it.default_logical_model,
                "created_at": it.created_at,
                "updated_at": it.updated_at,
            }
            for it in items
        ],
        next_cursor=next_cursor,
    )


@router.post("/v1/assistants", response_model=AssistantPresetResponse, status_code=status.HTTP_201_CREATED)
def create_assistant_endpoint(
    payload: AssistantPresetCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> AssistantPresetResponse:
    assistant = create_assistant(
        db,
        user_id=UUID(str(current_user.id)),
        project_id=payload.project_id,
        name=payload.name,
        system_prompt=payload.system_prompt,
        default_logical_model=payload.default_logical_model,
        model_preset=payload.model_preset,
    )
    return _assistant_to_response(assistant)


@router.get("/v1/assistants/{assistant_id}", response_model=AssistantPresetResponse)
def get_assistant_endpoint(
    assistant_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> AssistantPresetResponse:
    assistant = get_assistant(
        db,
        assistant_id=assistant_id,
        user_id=UUID(str(current_user.id)),
    )
    return _assistant_to_response(assistant)


@router.put("/v1/assistants/{assistant_id}", response_model=AssistantPresetResponse)
def update_assistant_endpoint(
    assistant_id: UUID,
    payload: AssistantPresetUpdateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> AssistantPresetResponse:
    assistant = update_assistant(
        db,
        assistant_id=assistant_id,
        user_id=UUID(str(current_user.id)),
        name=payload.name,
        system_prompt=payload.system_prompt,
        default_logical_model=payload.default_logical_model,
        model_preset=payload.model_preset,
        archived=payload.archived,
    )
    return _assistant_to_response(assistant)


@router.post("/v1/conversations", response_model=ConversationItem, status_code=status.HTTP_201_CREATED)
def create_conversation_endpoint(
    payload: ConversationCreateRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> dict:
    conv = create_conversation(
        db,
        user_id=UUID(str(current_user.id)),
        project_id=payload.project_id,
        assistant_id=payload.assistant_id,
        title=payload.title,
    )
    return _conversation_to_item(conv)


@router.get("/v1/conversations", response_model=ConversationListResponse)
def list_conversations_endpoint(
    assistant_id: UUID = Query(...),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> ConversationListResponse:
    items, next_cursor = list_conversations(
        db,
        user_id=UUID(str(current_user.id)),
        assistant_id=assistant_id,
        cursor=cursor,
        limit=limit,
    )
    return ConversationListResponse(
        items=[_conversation_to_item(it) for it in items],
        next_cursor=next_cursor,
    )


@router.post("/v1/conversations/{conversation_id}/messages", response_model=MessageCreateResponse)
async def create_message_endpoint(
    conversation_id: UUID,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    redis: Redis = Depends(get_redis),
    client: Any = Depends(get_http_client),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> MessageCreateResponse:
    message_id, run_id = await chat_app_service.send_message_and_run_baseline(
        db,
        redis=redis,
        client=client,
        current_user=current_user,
        conversation_id=conversation_id,
        content=payload.content,
        override_logical_model=payload.override_logical_model,
        model_preset=payload.model_preset,
    )
    run = get_run_detail(db, run_id=run_id, user_id=UUID(str(current_user.id)))
    return MessageCreateResponse(message_id=message_id, baseline_run=_run_to_summary(run))


@router.get("/v1/conversations/{conversation_id}/messages", response_model=MessageListResponse)
def list_messages_endpoint(
    conversation_id: UUID,
    cursor: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> MessageListResponse:
    messages, runs_by_message, next_cursor = list_messages_with_run_summaries(
        db,
        conversation_id=conversation_id,
        user_id=UUID(str(current_user.id)),
        cursor=cursor,
        limit=limit,
    )

    items = []
    for msg in messages:
        runs = runs_by_message.get(UUID(str(msg.id)), []) if msg.role == "user" else []
        items.append(
            {
                "message_id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at,
                "runs": [_run_to_summary(r) for r in runs],
            }
        )

    return MessageListResponse(items=items, next_cursor=next_cursor)


@router.get("/v1/runs/{run_id}", response_model=RunDetailResponse)
def get_run_endpoint(
    run_id: UUID,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(require_jwt_token),
) -> RunDetailResponse:
    run = get_run_detail(db, run_id=run_id, user_id=UUID(str(current_user.id)))
    return RunDetailResponse(
        run_id=run.id,
        message_id=run.message_id,
        requested_logical_model=run.requested_logical_model,
        selected_provider_id=run.selected_provider_id,
        selected_provider_model=run.selected_provider_model,
        status=run.status,
        output_preview=run.output_preview,
        output_text=run.output_text,
        request_payload=run.request_payload,
        response_payload=run.response_payload,
        latency_ms=run.latency_ms,
        error_code=run.error_code,
        created_at=run.created_at,
        updated_at=run.updated_at,
    )


__all__ = ["router"]
