from __future__ import annotations

from uuid import UUID

import httpx
import pytest

from app.models import APIKey
from app.settings import settings
from app.services.qdrant_collection_service import ensure_collection_ready


@pytest.mark.asyncio
async def test_ensure_collection_ready_uses_project_default_model_and_vector_size(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "qdrant_kb_user_collection_strategy", "per_user", raising=False)
    uid = UUID("00000000-0000-0000-0000-000000000001")
    api_key = APIKey(
        id=UUID("00000000-0000-0000-0000-0000000000aa"),
        user_id=uid,
        name="k",
        key_hash="h",
        key_prefix="p",
        expiry_type="never",
        is_active=True,
        has_provider_restrictions=False,
        chat_default_logical_model=None,
        chat_title_logical_model=None,
        kb_embedding_logical_model="embed-model-x",
    )

    calls: list[tuple[str, str]] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.method == "GET" and request.url.path.startswith("/collections/"):
            return httpx.Response(404, json={"status": "not_found"})
        if request.method == "PUT" and request.url.path.startswith("/collections/"):
            body = request.json()
            assert body["vectors"]["text"]["size"] == 1536
            return httpx.Response(200, json={"result": True})
        raise AssertionError(f"unexpected request: {request.method} {request.url}")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as qdrant:
        collection_name, size, model = await ensure_collection_ready(
            db_session,
            qdrant=qdrant,
            user_id=uid,
            api_key=api_key,
            preferred_model=None,
            preferred_vector_size=1536,
        )
        assert size == 1536
        assert model == "embed-model-x"
        assert collection_name.endswith(uid.hex)
