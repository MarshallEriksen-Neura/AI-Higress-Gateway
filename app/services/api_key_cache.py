from __future__ import annotations

from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, ValidationError

from app.models import APIKey
from app.redis_client import redis_delete, redis_get_json, redis_set_json

CACHE_KEY_TEMPLATE = "auth:api-key:{key_hash}"
CACHE_TTL_SECONDS = 600


class CachedAPIKey(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    user_username: str
    user_is_superuser: bool
    name: str
    expires_at: datetime | None = None


def build_cache_entry(api_key: APIKey) -> CachedAPIKey:
    user = api_key.user
    username = user.username if user is not None else ""
    is_superuser = user.is_superuser if user is not None else False
    return CachedAPIKey(
        id=str(api_key.id),
        user_id=str(api_key.user_id),
        user_username=username,
        user_is_superuser=is_superuser,
        name=api_key.name,
        expires_at=api_key.expires_at,
    )


async def get_cached_api_key(redis, key_hash: str) -> CachedAPIKey | None:
    key = CACHE_KEY_TEMPLATE.format(key_hash=key_hash)
    data = await redis_get_json(redis, key)
    if not data:
        return None
    try:
        return CachedAPIKey.model_validate(data)
    except ValidationError:
        await redis_delete(redis, key)
        return None


def _compute_ttl_seconds(entry: CachedAPIKey) -> int | None:
    ttl = CACHE_TTL_SECONDS
    if entry.expires_at is None:
        return ttl
    remaining = int(entry.expires_at.timestamp() - datetime.now(UTC).timestamp())
    if remaining <= 0:
        return 0
    return min(ttl, remaining)


async def cache_api_key(redis, key_hash: str, entry: CachedAPIKey) -> None:
    ttl_seconds = _compute_ttl_seconds(entry)
    if ttl_seconds == 0:
        return
    key = CACHE_KEY_TEMPLATE.format(key_hash=key_hash)
    payload = entry.model_dump(mode="json")
    await redis_set_json(redis, key, payload, ttl_seconds=ttl_seconds)


async def invalidate_cached_api_key(redis, key_hash: str) -> None:
    key = CACHE_KEY_TEMPLATE.format(key_hash=key_hash)
    await redis_delete(redis, key)


__all__ = [
    "CACHE_KEY_TEMPLATE",
    "CachedAPIKey",
    "build_cache_entry",
    "cache_api_key",
    "get_cached_api_key",
    "invalidate_cached_api_key",
]
