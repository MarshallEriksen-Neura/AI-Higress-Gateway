"""
Weighted API key selection and backoff for providers with multiple keys.
"""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

from redis.asyncio import Redis

from service.logging_config import logger
from service.models import ProviderAPIKey, ProviderConfig


@dataclass
class ProviderKeyState:
    key: str
    label: str
    weight: float
    max_qps: Optional[int]
    fail_count: int = 0
    backoff_until: float = 0.0
    last_used_at: float = 0.0


@dataclass
class SelectedProviderKey:
    provider_id: str
    key: str
    label: str
    state: ProviderKeyState


class NoAvailableProviderKey(Exception):
    """
    Raised when no healthy/available key can be selected for a provider.
    """


_KEY_STATES: Dict[str, Dict[str, ProviderKeyState]] = {}
_LOCKS: Dict[str, asyncio.Lock] = {}


def _get_lock(provider_id: str) -> asyncio.Lock:
    if provider_id not in _LOCKS:
        _LOCKS[provider_id] = asyncio.Lock()
    return _LOCKS[provider_id]


def _mask_label(raw_key: str, explicit: Optional[str], idx: int) -> str:
    if explicit:
        return explicit
    tail = raw_key[-4:] if raw_key else "xxxx"
    return f"key{idx + 1}-***{tail}"


def _ensure_states(provider: ProviderConfig) -> List[ProviderKeyState]:
    """
    Initialise per-provider key state from ProviderConfig.
    """
    pool = _KEY_STATES.setdefault(provider.id, {})
    keys = provider.get_api_keys()
    if not keys:
        raise NoAvailableProviderKey(f"Provider {provider.id} has no configured keys")

    for idx, entry in enumerate(keys):
        label = _mask_label(entry.key, entry.label, idx)
        if entry.key not in pool:
            pool[entry.key] = ProviderKeyState(
                key=entry.key,
                label=label,
                weight=entry.weight,
                max_qps=entry.max_qps,
            )
        else:
            # Keep existing backoff state but refresh metadata.
            pool_entry = pool[entry.key]
            pool_entry.label = label
            pool_entry.weight = entry.weight
            pool_entry.max_qps = entry.max_qps

    # Drop any state entries no longer present in config.
    valid_keys = {entry.key for entry in keys}
    for stale_key in list(pool.keys()):
        if stale_key not in valid_keys:
            pool.pop(stale_key, None)

    return list(pool.values())


async def _reserve_qps(redis: Optional[Redis], provider_id: str, state: ProviderKeyState) -> bool:
    if redis is None or state.max_qps is None:
        return True
    bucket = f"provider:{provider_id}:key:{state.label}:qps:{int(time.time())}"
    count = await redis.incr(bucket)
    if count == 1:
        await redis.expire(bucket, 1)
    if count > state.max_qps:
        await redis.expire(bucket, 1)
        return False
    return True


async def acquire_provider_key(
    provider: ProviderConfig, redis: Optional[Redis] = None
) -> SelectedProviderKey:
    """
    Choose an available key for a provider using weighted random selection.
    Keys in backoff or exceeding per-key QPS are skipped.
    """
    async with _get_lock(provider.id):
        states = _ensure_states(provider)
        now = time.time()
        candidates = [s for s in states if s.backoff_until <= now]
        if not candidates:
            raise NoAvailableProviderKey(
                f"No available keys for provider {provider.id} (all in backoff)"
            )

        working_set = list(candidates)
        while working_set:
            weights = [max(s.weight, 0.0001) for s in working_set]
            state = random.choices(working_set, weights=weights, k=1)[0]

            if not await _reserve_qps(redis, provider.id, state):
                working_set.remove(state)
                continue

            state.last_used_at = now
            return SelectedProviderKey(
                provider_id=provider.id, key=state.key, label=state.label, state=state
            )

    raise NoAvailableProviderKey(
        f"No available keys for provider {provider.id} (rate limited)"
    )


def record_key_success(selection: SelectedProviderKey) -> None:
    selection.state.fail_count = 0
    selection.state.backoff_until = 0.0


def record_key_failure(
    selection: SelectedProviderKey,
    *,
    retryable: bool = True,
    status_code: Optional[int] = None,
) -> None:
    """
    Increase backoff for a key after an upstream failure.
    """
    selection.state.fail_count += 1
    base = 1.0 if retryable else 5.0
    backoff_seconds = base * (2 ** min(selection.state.fail_count, 5))
    if status_code in (401, 403):
        backoff_seconds = max(backoff_seconds, 30.0)
    selection.state.backoff_until = time.time() + min(backoff_seconds, 60.0)
    logger.warning(
        "provider=%s key=%s enter backoff for %.1fs (status=%s retryable=%s)",
        selection.provider_id,
        selection.label,
        backoff_seconds,
        status_code,
        retryable,
    )


def reset_key_pool(provider_id: Optional[str] = None) -> None:
    """
    Clear cached key state (useful in tests).
    """
    if provider_id is None:
        _KEY_STATES.clear()
        _LOCKS.clear()
    else:
        _KEY_STATES.pop(provider_id, None)
        _LOCKS.pop(provider_id, None)


__all__ = [
    "SelectedProviderKey",
    "NoAvailableProviderKey",
    "acquire_provider_key",
    "record_key_failure",
    "record_key_success",
    "reset_key_pool",
]
