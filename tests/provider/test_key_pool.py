import pytest

from service.models import ProviderAPIKey, ProviderConfig
from service.provider.key_pool import (
    NoAvailableProviderKey,
    acquire_provider_key,
    record_key_failure,
    reset_key_pool,
)


def _make_provider(provider_id: str = "multi") -> ProviderConfig:
    return ProviderConfig(
        id=provider_id,
        name="Multi Key Provider",
        base_url="https://api.multi.local",
        api_keys=[
            ProviderAPIKey(key="k1"),  # pragma: allowlist secret
            ProviderAPIKey(key="k2"),  # pragma: allowlist secret
        ],
    )


@pytest.mark.asyncio
async def test_acquire_provider_key_skips_backoff_key(monkeypatch):
    provider = _make_provider("backoff")
    reset_key_pool(provider.id)

    first = await acquire_provider_key(provider, redis=None)
    record_key_failure(first, retryable=False, status_code=401)

    second = await acquire_provider_key(provider, redis=None)
    assert second.key != first.key

    reset_key_pool(provider.id)


@pytest.mark.asyncio
async def test_acquire_provider_key_raises_when_all_in_backoff(monkeypatch):
    provider = ProviderConfig(
        id="single",
        name="Single Key Provider",
        base_url="https://api.single.local",
        api_keys=[ProviderAPIKey(key="solo")],  # pragma: allowlist secret
    )
    reset_key_pool(provider.id)

    selection = await acquire_provider_key(provider, redis=None)
    record_key_failure(selection, retryable=False, status_code=401)

    with pytest.raises(NoAvailableProviderKey):
        await acquire_provider_key(provider, redis=None)

    reset_key_pool(provider.id)
