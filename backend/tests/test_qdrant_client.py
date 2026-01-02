from __future__ import annotations

import asyncio

import httpx
import pytest

import app.qdrant_client as qdrant_client
from app.qdrant_client import QdrantNotConfigured, get_qdrant_client, qdrant_is_configured
from app.settings import settings
from app.storage.qdrant_service import qdrant_ping


def test_qdrant_is_configured_requires_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qdrant_enabled", False, raising=False)
    monkeypatch.setattr(settings, "qdrant_url", "http://qdrant:6333", raising=False)
    assert qdrant_is_configured() is False


def test_qdrant_is_configured_requires_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qdrant_enabled", True, raising=False)
    monkeypatch.setattr(settings, "qdrant_url", "", raising=False)
    assert qdrant_is_configured() is False


def test_qdrant_is_configured_true(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qdrant_enabled", True, raising=False)
    monkeypatch.setattr(settings, "qdrant_url", "http://qdrant:6333", raising=False)
    assert qdrant_is_configured() is True


@pytest.mark.asyncio
async def test_get_qdrant_client_raises_when_not_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "qdrant_enabled", False, raising=False)
    monkeypatch.setattr(settings, "qdrant_url", None, raising=False)
    with pytest.raises(QdrantNotConfigured):
        get_qdrant_client()


class DummyClient:
    def __init__(self) -> None:
        self.closed = False

    async def aclose(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_close_qdrant_client_for_current_loop_closes_and_unsets() -> None:
    loop = asyncio.get_running_loop()
    dummy = DummyClient()
    clients_by_loop = getattr(qdrant_client, "_qdrant_clients_by_loop")
    clients_by_loop[loop] = dummy  # type: ignore[assignment]

    await qdrant_client.close_qdrant_client_for_current_loop()

    assert dummy.closed is True
    assert loop not in clients_by_loop


@pytest.mark.asyncio
async def test_qdrant_ping_true_on_200() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        assert request.url.path == "/collections"
        return httpx.Response(200, json={"result": {"collections": []}})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as client:
        assert await qdrant_ping(client) is True


@pytest.mark.asyncio
async def test_qdrant_ping_false_on_error_status() -> None:
    async def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, json={"status": "unavailable"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(base_url="http://qdrant:6333", transport=transport) as client:
        assert await qdrant_ping(client) is False

