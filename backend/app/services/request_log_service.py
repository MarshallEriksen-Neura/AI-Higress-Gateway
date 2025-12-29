from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from app.logging_config import logger

REQUEST_LOG_KEY_PREFIX = "request_logs:user:"
REQUEST_LOG_MAX_ENTRIES = 100
REQUEST_LOG_TTL_SECONDS = 7 * 24 * 60 * 60
REQUEST_LOG_MAX_TEXT_CHARS = 2000


def _key(user_id: str) -> str:
    return f"{REQUEST_LOG_KEY_PREFIX}{user_id}"


def _truncate_text(value: Any, *, limit: int = REQUEST_LOG_MAX_TEXT_CHARS) -> str | None:
    if value is None:
        return None
    text = str(value)
    if len(text) <= limit:
        return text
    return text[:limit] + "…"


def build_request_log_entry(
    *,
    request_id: str,
    user_id: str,
    api_key_id: str,
    method: str | None,
    path: str | None,
    logical_model: str | None,
    requested_model: str | None,
    api_style: str | None,
    is_stream: bool,
    status_code: int | None,
    latency_ms: int | None,
    selected_provider_id: str | None,
    selected_provider_model: str | None,
    upstream_status: int | None = None,
    error_message: Any | None = None,
    attempts: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "request_id": request_id,
        "ts": datetime.now(UTC).isoformat(),
        "user_id": user_id,
        "api_key_id": api_key_id,
        "method": (method or "").upper() or None,
        "path": path,
        "logical_model": logical_model,
        "requested_model": requested_model,
        "api_style": api_style,
        "is_stream": bool(is_stream),
        "status_code": status_code,
        "latency_ms": latency_ms,
        "selected_provider_id": selected_provider_id,
        "selected_provider_model": selected_provider_model,
        "upstream_status": upstream_status,
        "error_message": _truncate_text(error_message),
        "attempts": attempts or [],
    }


async def append_request_log(
    redis: Redis,
    *,
    user_id: str,
    entry: dict[str, Any],
) -> None:
    if not user_id:
        return
    if redis is object:
        return

    key = _key(user_id)
    try:
        raw = json.dumps(entry, ensure_ascii=False, separators=(",", ":"))
        await redis.lpush(key, raw)
        await redis.ltrim(key, 0, REQUEST_LOG_MAX_ENTRIES - 1)
        await redis.expire(key, REQUEST_LOG_TTL_SECONDS)
    except Exception:  # pragma: no cover - best-effort only
        logger.debug("request_log: failed to append (user_id=%s)", user_id, exc_info=True)


async def list_request_logs(
    redis: Redis,
    *,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if not user_id:
        return []
    if redis is object:
        return []

    safe_limit = max(1, min(int(limit), 200))
    safe_offset = max(0, int(offset))
    start = safe_offset
    end = safe_offset + safe_limit - 1
    key = _key(user_id)

    try:
        rows = await redis.lrange(key, start, end)
    except Exception:  # pragma: no cover
        logger.debug("request_log: failed to list (user_id=%s)", user_id, exc_info=True)
        return []

    items: list[dict[str, Any]] = []
    for raw in rows or []:
        try:
            text = raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else str(raw)
            parsed = json.loads(text)
        except Exception:
            continue
        if isinstance(parsed, dict):
            items.append(parsed)
    return items


__all__ = [
    "REQUEST_LOG_MAX_ENTRIES",
    "append_request_log",
    "build_request_log_entry",
    "list_request_logs",
]

