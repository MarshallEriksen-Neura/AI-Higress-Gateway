from typing import Any, Dict, List

import httpx
import pytest

from service.models import Model, ProviderConfig
from service.provider.discovery import (
    ensure_provider_models_cached,
    fetch_models_from_provider,
)


class DummyRedis:
    """
    Minimal Redis replacement for discovery tests.
    """

    def __init__(self) -> None:
        self._data: Dict[str, Any] = {}

    async def get(self, key: str):
        return self._data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None):
        self._data[key] = value


def _make_provider() -> ProviderConfig:
    return ProviderConfig(
        id="mock",
        name="Mock Provider",
        base_url="https://api.mock.local",
        api_key="sk-test",  # pragma: allowlist secret
        models_path="/v1/models",
    )


@pytest.mark.asyncio
async def test_fetch_models_from_provider_normalises_payload():
    provider = _make_provider()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/v1/models")
        data = {
            "object": "list",
            "data": [
                {"id": "m1", "context_length": 4096, "capabilities": ["chat"]},
                {"id": "m2", "context_length": 8192, "capabilities": ["completion"]},
            ],
        }
        return httpx.Response(200, json=data)

    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as client:
        models: List[Model] = await fetch_models_from_provider(client, provider)

    assert len(models) == 2
    assert models[0].model_id == "m1"
    assert models[0].context_length == 4096
    assert models[1].model_id == "m2"
    assert models[1].context_length == 8192


@pytest.mark.asyncio
async def test_ensure_provider_models_cached_uses_redis_cache():
    provider = _make_provider()
    redis = DummyRedis()
    call_count = {"models": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        call_count["models"] += 1
        data = {
            "object": "list",
            "data": [
                {"id": "m1", "context_length": 4096, "capabilities": ["chat"]},
            ],
        }
        return httpx.Response(200, json=data)

    transport = httpx.MockTransport(handler)

    async with httpx.AsyncClient(transport=transport) as client:
        models_first = await ensure_provider_models_cached(client, redis, provider)
        models_second = await ensure_provider_models_cached(client, redis, provider)

    assert call_count["models"] == 1
    assert models_first == models_second
    assert len(models_first) == 1
    assert models_first[0]["model_id"] == "m1"

