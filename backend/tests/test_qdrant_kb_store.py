from __future__ import annotations

import httpx
import pytest

from app.storage.qdrant_kb_store import QDRANT_DEFAULT_VECTOR_NAME, ensure_collection_vector_size, get_collection_vector_size


@pytest.mark.asyncio
async def test_get_collection_vector_size_none_on_404() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/collections/kb_user_x"
        return httpx.Response(404, json={"status": "not_found"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as client:
        assert await get_collection_vector_size(client, collection_name="kb_user_x") is None


@pytest.mark.asyncio
async def test_ensure_collection_vector_size_creates_when_missing() -> None:
    calls: list[tuple[str, str]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.method == "GET" and request.url.path == "/collections/kb_user_x":
            return httpx.Response(404, json={"status": "not_found"})
        if request.method == "PUT" and request.url.path == "/collections/kb_user_x":
            body = request.json()
            assert body["vectors"][QDRANT_DEFAULT_VECTOR_NAME]["size"] == 1536
            assert str(body["vectors"][QDRANT_DEFAULT_VECTOR_NAME]["distance"]).lower() == "cosine"
            return httpx.Response(200, json={"result": True})
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as client:
        size = await ensure_collection_vector_size(client, collection_name="kb_user_x", vector_size=1536)
        assert size == 1536
        assert calls == [("GET", "/collections/kb_user_x"), ("PUT", "/collections/kb_user_x")]


@pytest.mark.asyncio
async def test_ensure_collection_vector_size_raises_on_mismatch() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "GET" and request.url.path == "/collections/kb_user_x":
            return httpx.Response(
                200,
                json={
                    "result": {
                        "config": {
                            "params": {
                                "vectors": {QDRANT_DEFAULT_VECTOR_NAME: {"size": 1024, "distance": "Cosine"}}
                            }
                        }
                    }
                },
            )
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as client:
        with pytest.raises(RuntimeError, match="vector size mismatch"):
            await ensure_collection_vector_size(client, collection_name="kb_user_x", vector_size=1536)
