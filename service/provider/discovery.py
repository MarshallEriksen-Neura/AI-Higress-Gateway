"""
Provider model discovery service.

For each configured provider we call its `/models`-like endpoint,
normalise the response into `service.models.Model` objects and store
them in Redis using the key scheme defined in data-model.md:

    llm:vendor:{provider_id}:models -> JSON array
"""

from __future__ import annotations

from typing import Any, Dict, List

import httpx

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from service.logging_config import logger
from service.models import Model, ModelCapability, ProviderConfig
from service.storage.redis_service import get_provider_models_json, set_provider_models


def _infer_capabilities(raw_model: Dict[str, Any]) -> List[ModelCapability]:
    """
    Best-effort capability inference from upstream metadata.
    Falls back to CHAT if nothing explicit is present.
    """
    caps: List[ModelCapability] = []
    raw_caps = raw_model.get("capabilities") or raw_model.get("capability") or []

    if isinstance(raw_caps, list):
        for c in raw_caps:
            if not isinstance(c, str):
                continue
            normalized = c.lower()
            for member in ModelCapability:
                if member.value == normalized:
                    caps.append(member)
                    break
    elif isinstance(raw_caps, str):
        normalized = raw_caps.lower()
        for member in ModelCapability:
            if member.value == normalized:
                caps.append(member)

    if not caps:
        caps = [ModelCapability.CHAT]
    return caps


def _normalise_single_model(
    provider: ProviderConfig, raw_model: Dict[str, Any]
) -> Model | None:
    """
    Convert a provider-specific model entry into our standard Model.
    """
    model_id = raw_model.get("id") or raw_model.get("model_id")
    if not isinstance(model_id, str):
        return None

    family = raw_model.get("family") or model_id
    display_name = raw_model.get("display_name") or model_id
    # Prefer explicit context/window size fields; default to 8192 if missing.
    context_len = (
        raw_model.get("context_length")
        or raw_model.get("max_context")
        or raw_model.get("context_window")
        or 8192
    )
    try:
        context_len_int = int(context_len)
    except (TypeError, ValueError):
        context_len_int = 8192

    capabilities = _infer_capabilities(raw_model)

    pricing = None
    if isinstance(raw_model.get("pricing"), dict):
        pricing = {}
        for k, v in raw_model["pricing"].items():
            try:
                pricing[str(k)] = float(v)
            except (TypeError, ValueError):
                continue

    return Model(
        model_id=model_id,
        provider_id=provider.id,
        family=str(family),
        display_name=str(display_name),
        context_length=context_len_int,
        capabilities=capabilities,
        pricing=pricing,
        metadata=raw_model,
    )


async def fetch_models_from_provider(
    client: httpx.AsyncClient, provider: ProviderConfig
) -> List[Model]:
    """
    Call a provider's models endpoint and normalise the response.
    """
    base = str(provider.base_url).rstrip("/")
    path = provider.models_path or "/v1/models"
    url = f"{base}/{path.lstrip('/')}"

    headers: Dict[str, str] = {
        "Authorization": f"Bearer {provider.api_key}",
        "Accept": "application/json",
    }
    if provider.custom_headers:
        headers.update(provider.custom_headers)

    logger.info("Fetching models from provider %s at %s", provider.id, url)

    resp = await client.get(url, headers=headers)
    resp.raise_for_status()

    payload = resp.json()

    raw_models: List[Dict[str, Any]] = []
    if isinstance(payload, dict) and "data" in payload and isinstance(
        payload["data"], list
    ):
        raw_models = [m for m in payload["data"] if isinstance(m, dict)]
    elif isinstance(payload, list):
        raw_models = [m for m in payload if isinstance(m, dict)]

    models: List[Model] = []
    for raw in raw_models:
        model = _normalise_single_model(provider, raw)
        if model is not None:
            models.append(model)

    logger.info(
        "Discovered %d models for provider %s", len(models), provider.id
    )
    return models


async def refresh_provider_models(
    client: httpx.AsyncClient,
    redis: Redis,
    provider: ProviderConfig,
    *,
    ttl_seconds: int = 300,
) -> int:
    """
    Refresh a single provider's models in Redis.
    Returns the number of models stored.
    """
    models = await fetch_models_from_provider(client, provider)
    await set_provider_models(redis, provider.id, models, ttl_seconds=ttl_seconds)
    return len(models)


async def ensure_provider_models_cached(
    client: httpx.AsyncClient,
    redis: Redis,
    provider: ProviderConfig,
    *,
    ttl_seconds: int = 300,
) -> List[Dict[str, Any]]:
    """
    Ensure that a provider's models list exists in Redis and return it
    as a JSON-serialisable list (dicts).

    If the cache miss occurs, models are fetched from the provider.
    """
    cached = await get_provider_models_json(redis, provider.id)
    if cached is not None:
        return cached

    await refresh_provider_models(client, redis, provider, ttl_seconds=ttl_seconds)
    cached = await get_provider_models_json(redis, provider.id)
    return cached or []


async def refresh_all_providers_models(
    client: httpx.AsyncClient, redis: Redis, providers: List[ProviderConfig]
) -> Dict[str, int]:
    """
    Refresh models for all configured providers.
    Returns a mapping provider_id -> number of models discovered.
    """
    result: Dict[str, int] = {}
    for provider in providers:
        try:
            count = await refresh_provider_models(client, redis, provider)
        except httpx.HTTPError as exc:
            logger.warning(
                "Failed to refresh models for provider %s: %s", provider.id, exc
            )
            continue
        result[provider.id] = count
    return result


__all__ = [
    "fetch_models_from_provider",
    "refresh_provider_models",
    "ensure_provider_models_cached",
    "refresh_all_providers_models",
]
