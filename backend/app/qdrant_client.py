"""
Qdrant helper utilities.

This module mirrors the patterns used by app.redis_client:
- Cache one client per running event loop
- Provide best-effort close helpers for short-lived event loops (e.g. Celery tasks using asyncio.run)

Qdrant integration is optional and guarded by settings:
- QDRANT_ENABLED=true
- QDRANT_URL set
"""

from __future__ import annotations

import asyncio
import inspect
from typing import Any
from weakref import WeakKeyDictionary

import httpx

from app.settings import settings

_qdrant_clients_by_loop: WeakKeyDictionary[asyncio.AbstractEventLoop, httpx.AsyncClient] = WeakKeyDictionary()


class QdrantNotConfigured(RuntimeError):
    pass


def qdrant_is_configured() -> bool:
    if not bool(getattr(settings, "qdrant_enabled", False)):
        return False
    url = str(getattr(settings, "qdrant_url", "") or "").strip()
    return bool(url)


def _ensure_event_loop() -> asyncio.AbstractEventLoop:
    try:
        return asyncio.get_running_loop()
    except RuntimeError as exc:  # pragma: no cover
        raise RuntimeError(
            "get_qdrant_client() 必须在运行中的事件循环内调用，请在 async 环境或 "
            "asyncio.run(...) 内部获取 Qdrant 客户端"
        ) from exc


def _build_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    api_key = str(getattr(settings, "qdrant_api_key", "") or "").strip()
    if api_key:
        # Qdrant uses `api-key` header for API key auth.
        headers["api-key"] = api_key
    return headers


def _create_client() -> httpx.AsyncClient:
    if not qdrant_is_configured():
        raise QdrantNotConfigured("Qdrant 未启用或未配置（需要 QDRANT_ENABLED=true 且 QDRANT_URL 非空）")

    url = str(getattr(settings, "qdrant_url", "") or "").strip()
    timeout = float(getattr(settings, "qdrant_timeout_seconds", 10.0) or 10.0)
    return httpx.AsyncClient(
        base_url=url,
        timeout=timeout,
        headers=_build_headers(),
    )


def get_qdrant_client() -> httpx.AsyncClient:
    """
    Return a Qdrant client bound to the current event loop.
    """

    loop = _ensure_event_loop()
    client = _qdrant_clients_by_loop.get(loop)
    if client is None:
        client = _create_client()
        _qdrant_clients_by_loop[loop] = client
    return client


async def _maybe_await(result: Any) -> None:
    if inspect.isawaitable(result):
        await result


async def close_qdrant_client(client: Any) -> None:
    """
    Best-effort close for httpx AsyncClient instances (or compatible fakes).
    """

    close_fn = getattr(client, "aclose", None)
    if callable(close_fn):
        await _maybe_await(close_fn())
        return

    close_fn = getattr(client, "close", None)
    if callable(close_fn):
        await _maybe_await(close_fn())


async def close_qdrant_client_for_current_loop() -> None:
    """
    Close and forget the cached Qdrant client for the current running loop.
    """

    loop = _ensure_event_loop()
    client = _qdrant_clients_by_loop.pop(loop, None)
    if client is None:
        return
    await close_qdrant_client(client)


__all__ = [
    "QdrantNotConfigured",
    "close_qdrant_client",
    "close_qdrant_client_for_current_loop",
    "get_qdrant_client",
    "qdrant_is_configured",
]

