from __future__ import annotations

import json
import time
from typing import Any

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from app.schemas.session import Session

SESSION_KEY_TEMPLATE = "routing:session:{conversation_id}"


def _session_key(conversation_id: str) -> str:
    return SESSION_KEY_TEMPLATE.format(conversation_id=conversation_id)


def _decode_redis_value(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        return value.decode("utf-8")
    if isinstance(value, str):
        return value
    return str(value)


def _serialize_session(session: Session) -> str:
    record = {
        "conversation_id": session.conversation_id,
        "logical_model": session.logical_model,
        "provider_id": session.provider_id,
        "model_id": session.model_id,
        "created_at": session.created_at,
        "last_accessed": session.last_accessed,
        # 内部字段：用于测试/统计，不对外输出（见 app.schemas.session.Session）
        "message_count": session.message_count,
    }
    return json.dumps(record, ensure_ascii=False, separators=(",", ":"))


def _parse_session(raw: Any) -> Session | None:
    text = _decode_redis_value(raw)
    if not text:
        return None

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, dict):
        return None

    # pydantic v2: model_validate; v1: parse_obj
    model_validate = getattr(Session, "model_validate", None)
    if callable(model_validate):
        return model_validate(payload)
    return Session.parse_obj(payload)  # type: ignore[attr-defined]


async def get_session(redis: Redis, conversation_id: str) -> Session | None:
    key = _session_key(conversation_id)
    raw = await redis.get(key)
    return _parse_session(raw)


async def bind_session(
    redis: Redis,
    *,
    conversation_id: str,
    logical_model: str,
    provider_id: str,
    model_id: str,
    ts: float | None = None,
) -> Session:
    now = time.time() if ts is None else ts

    existing = await get_session(redis, conversation_id)
    created_at = existing.created_at if existing else now
    message_count = existing.message_count if existing else 0

    session = Session(
        conversation_id=conversation_id,
        logical_model=logical_model,
        provider_id=provider_id,
        model_id=model_id,
        created_at=created_at,
        last_accessed=now,
        message_count=message_count,
    )
    await redis.set(_session_key(conversation_id), _serialize_session(session))
    return session


async def touch_session(
    redis: Redis,
    conversation_id: str,
    *,
    increment_messages: int = 1,
    ts: float | None = None,
) -> Session | None:
    session = await get_session(redis, conversation_id)
    if session is None:
        return None

    now = time.time() if ts is None else ts
    session.message_count += max(0, increment_messages)
    session.last_accessed = now

    await redis.set(_session_key(conversation_id), _serialize_session(session))
    return session


async def delete_session(redis: Redis, conversation_id: str) -> bool:
    key = _session_key(conversation_id)
    existed = await redis.get(key) is not None
    await redis.delete(key)
    return existed


__all__ = ["bind_session", "delete_session", "get_session", "touch_session"]

