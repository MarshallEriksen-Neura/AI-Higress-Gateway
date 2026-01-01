from __future__ import annotations

import time
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore[misc,assignment]

from app.auth import AuthenticatedAPIKey
from app.jwt_auth import AuthenticatedUser
from app.models import APIKey, Conversation, Run
from app.repositories.run_event_repository import append_run_event
from app.services.chat_history_service import (
    create_assistant_image_generation_placeholder_after_user,
    create_user_message,
    get_conversation,
)
from app.services.run_event_bus import build_run_event_envelope, publish_run_event_best_effort
from app.services.video_app_service import VideoAppService
from app.schemas.video import VideoGenerationRequest


def _run_to_summary(run: Run) -> dict[str, Any]:
    return {
        "run_id": str(run.id),
        "requested_logical_model": run.requested_logical_model,
        "status": run.status,
        "output_preview": run.output_preview,
        "latency_ms": run.latency_ms,
        "error_code": run.error_code,
        "tool_invocations": getattr(run, "tool_invocations", None),
    }


def _to_authenticated_api_key(*, api_key: APIKey, current_user: AuthenticatedUser) -> AuthenticatedAPIKey:
    return AuthenticatedAPIKey(
        id=UUID(str(api_key.id)),
        user_id=UUID(str(api_key.user_id)),
        user_username=current_user.username,
        is_superuser=bool(current_user.is_superuser),
        name=api_key.name,
        is_active=bool(api_key.is_active),
        disabled_reason=api_key.disabled_reason,
        has_provider_restrictions=bool(api_key.has_provider_restrictions),
        allowed_provider_ids=list(api_key.allowed_provider_ids),
    )


def _append_run_event_and_publish(
    db: Session,
    *,
    redis: Redis | None,
    run_id: UUID,
    event_type: str,
    payload: dict[str, Any],
) -> int | None:
    try:
        row = append_run_event(db, run_id=run_id, event_type=event_type, payload=payload)
        created_at_iso = None
        try:
            created_at_iso = row.created_at.isoformat() if getattr(row, "created_at", None) is not None else None
        except Exception:
            created_at_iso = None
        publish_run_event_best_effort(
            redis,
            run_id=run_id,
            envelope=build_run_event_envelope(
                run_id=run_id,
                seq=int(getattr(row, "seq", 0) or 0),
                event_type=str(getattr(row, "event_type", event_type) or event_type),
                created_at_iso=created_at_iso,
                payload=payload,
            ),
        )
        return int(getattr(row, "seq", 0) or 0)
    except Exception:  # pragma: no cover
        return None


def create_video_generation_and_queue_run(
    db: Session,
    *,
    redis: Redis,
    current_user: AuthenticatedUser,
    conversation_id: UUID,
    prompt: str,
    video_request: dict[str, Any],
    streaming: bool,
) -> tuple[UUID, UUID, UUID | None, dict[str, Any], int, AuthenticatedAPIKey]:
    """
    创建 user message + queued run，并在 streaming 场景下创建 assistant 占位消息。
    """
    conv: Conversation = get_conversation(db, conversation_id=conversation_id, user_id=UUID(str(current_user.id)))
    api_key = db.get(APIKey, UUID(str(conv.api_key_id)))
    if api_key is None:
        raise RuntimeError("project api_key not found")
    auth_key = _to_authenticated_api_key(api_key=api_key, current_user=current_user)

    user_message = create_user_message(db, conversation=conv, content_text=prompt)

    assistant_message_id: UUID | None = None
    if streaming:
        assistant_message = create_assistant_image_generation_placeholder_after_user(
            db,
            conversation_id=UUID(str(conv.id)),
            user_sequence=int(user_message.sequence or 0),
            content={
                "type": "video_generation",
                "status": "pending",
                "prompt": prompt,
                "params": video_request,
                "videos": [],
            },
        )
        assistant_message_id = UUID(str(assistant_message.id))

    run = Run(
        message_id=UUID(str(user_message.id)),
        user_id=UUID(str(current_user.id)),
        api_key_id=UUID(str(conv.api_key_id)),
        requested_logical_model=str(video_request.get("model") or "").strip(),
        status="queued",
        request_payload={
            "kind": "video_generation",
            "prompt": prompt,
            **(video_request or {}),
        },
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    created_payload: dict[str, Any] = {
        "type": "message.created",
        "conversation_id": str(conv.id),
        "user_message_id": str(user_message.id),
        "assistant_message_id": str(assistant_message_id) if assistant_message_id is not None else None,
        "baseline_run": _run_to_summary(run),
        "kind": "video_generation",
    }

    created_seq = _append_run_event_and_publish(
        db,
        redis=redis,
        run_id=UUID(str(run.id)),
        event_type="message.created",
        payload=created_payload,
    ) or 0

    return (
        UUID(str(user_message.id)),
        UUID(str(run.id)),
        assistant_message_id,
        created_payload,
        int(created_seq),
        auth_key,
    )


async def execute_video_generation_inline(
    *,
    db: Session,
    redis: Redis,
    client: httpx.AsyncClient,
    api_key: AuthenticatedAPIKey,
    prompt: str,
    video_request: dict[str, Any],
) -> dict[str, Any]:
    """
    测试/兜底：在请求内直接执行视频生成并返回最终结构化内容（含 url）。
    """
    request = VideoGenerationRequest.model_validate({**video_request, "prompt": prompt})
    resp = await VideoAppService(client=client, redis=redis, db=db, api_key=api_key).generate_video(request)

    videos: list[dict[str, Any]] = []
    for item in resp.data or []:
        url = getattr(item, "url", None)
        object_key = getattr(item, "object_key", None)
        revised = getattr(item, "revised_prompt", None)
        entry: dict[str, Any] = {}
        if isinstance(url, str) and url:
            entry["url"] = url
        if isinstance(object_key, str) and object_key:
            entry["object_key"] = object_key
        if revised is not None:
            entry["revised_prompt"] = revised
        if entry:
            videos.append(entry)

    return {
        "type": "video_generation",
        "status": "succeeded",
        "prompt": prompt,
        "params": video_request,
        "videos": videos,
        "created": int(getattr(resp, "created", None) or time.time()),
    }


__all__ = [
    "create_video_generation_and_queue_run",
    "execute_video_generation_inline",
]

