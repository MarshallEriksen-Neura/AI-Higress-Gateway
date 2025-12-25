from __future__ import annotations

from uuid import UUID

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover
    Redis = object  # type: ignore[misc,assignment]


def run_cancel_key(run_id: UUID | str) -> str:
    return f"chat_run_cancel:{run_id}"


async def mark_run_canceled(redis: Redis, *, run_id: UUID, ttl_seconds: int = 24 * 60 * 60) -> None:
    await redis.set(run_cancel_key(run_id), "1", ex=int(ttl_seconds))


async def is_run_canceled(redis: Redis, *, run_id: UUID) -> bool:
    val = await redis.get(run_cancel_key(run_id))
    return val is not None and str(val).strip() != ""


__all__ = ["is_run_canceled", "mark_run_canceled", "run_cancel_key"]

