from typing import Any

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from app.services.compliance_service import redact_for_storage
from app.settings import settings


async def save_context(
    redis: Redis,
    session_id: str | None,
    payload: dict[str, Any],
    response_text: str,
) -> None:
    """
    Persist conversation context into Redis.
    """
    if not session_id:
        return

    if settings.enable_content_moderation:
        masked_request = redact_for_storage(payload, settings.content_moderation_mask_token)
        masked_response = redact_for_storage(response_text, settings.content_moderation_mask_token)
    else:
        masked_request = payload
        masked_response = response_text

    key = f"session:{session_id}:history"
    entry = {
        "request": masked_request,
        "response": masked_response,
    }
    # Keep last 50 turns by trimming the list
    await redis.lpush(key, str(entry))
    await redis.ltrim(key, 0, 49)
