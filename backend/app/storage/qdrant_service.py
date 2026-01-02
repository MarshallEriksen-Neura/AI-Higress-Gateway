from __future__ import annotations

import httpx


async def qdrant_ping(client: httpx.AsyncClient) -> bool:
    """
    Best-effort connectivity check.

    Notes:
    - We intentionally use a lightweight read endpoint.
    - Caller decides whether failures should be fatal or trigger downgrade.
    """
    try:
        resp = await client.get("/collections")
    except Exception:
        return False
    return 200 <= int(resp.status_code) < 300


__all__ = ["qdrant_ping"]

