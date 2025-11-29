from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - type placeholder when redis is missing
    Redis = object  # type: ignore[misc,assignment]

from service.auth import require_api_key
from service.deps import get_http_client, get_redis
from service.errors import not_found
from service.logging_config import logger
from service.models import ProviderConfig, RoutingMetrics
from service.provider.config import get_provider_config, load_provider_configs
from service.provider.discovery import ensure_provider_models_cached
from service.provider.health import HealthStatus, check_provider_health
from service.storage.redis_service import get_routing_metrics


router = APIRouter(
    tags=["providers"],
    dependencies=[Depends(require_api_key)],
)


class ProvidersResponse(BaseModel):
    providers: List[ProviderConfig] = Field(default_factory=list)
    total: int


class ProviderModelsResponse(BaseModel):
    models: List[Dict[str, Any]] = Field(default_factory=list)
    total: int


class ProviderMetricsResponse(BaseModel):
    metrics: List[RoutingMetrics] = Field(default_factory=list)


@router.get("/providers", response_model=ProvidersResponse)
async def list_providers() -> ProvidersResponse:
    """
    Return all configured providers from environment.
    """
    providers = load_provider_configs()
    return ProvidersResponse(providers=providers, total=len(providers))


@router.get("/providers/{provider_id}", response_model=ProviderConfig)
async def get_provider(provider_id: str) -> ProviderConfig:
    """
    Return configuration of a single provider.
    """
    cfg = get_provider_config(provider_id)
    if cfg is None:
        raise not_found(f"Provider '{provider_id}' not found")
    return cfg


@router.get("/providers/{provider_id}/models", response_model=ProviderModelsResponse)
async def get_provider_models(
    provider_id: str,
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
) -> ProviderModelsResponse:
    """
    Return the list of models for a provider, refreshing from upstream on cache miss.
    """
    cfg = get_provider_config(provider_id)
    if cfg is None:
        raise not_found(f"Provider '{provider_id}' not found")

    items = await ensure_provider_models_cached(client, redis, cfg)
    return ProviderModelsResponse(models=items, total=len(items))


@router.get("/providers/{provider_id}/health", response_model=HealthStatus)
async def get_provider_health(
    provider_id: str,
    client: httpx.AsyncClient = Depends(get_http_client),
) -> HealthStatus:
    """
    Perform a lightweight health check for the given provider.
    """
    cfg = get_provider_config(provider_id)
    if cfg is None:
        raise not_found(f"Provider '{provider_id}' not found")
    return await check_provider_health(client, cfg)


@router.get("/providers/{provider_id}/metrics", response_model=ProviderMetricsResponse)
async def get_provider_metrics(
    provider_id: str,
    logical_model: Optional[str] = Query(
        default=None,
        description="Optional logical model filter",
    ),
    redis: Redis = Depends(get_redis),
) -> ProviderMetricsResponse:
    """
    Return routing metrics for a provider.

    When `logical_model` is provided, we return at most one entry; for
    now we do not scan Redis for all logical models and simply return
    an empty list when the metrics key is missing.
    """
    cfg = get_provider_config(provider_id)
    if cfg is None:
        raise not_found(f"Provider '{provider_id}' not found")

    metrics_list: List[RoutingMetrics] = []
    if logical_model:
        metrics = await get_routing_metrics(redis, logical_model, provider_id)
        if metrics is not None:
            metrics_list.append(metrics)
    else:
        logger.info(
            "Provider metrics requested for %s without logical_model; returning empty list",
            provider_id,
        )

    return ProviderMetricsResponse(metrics=metrics_list)


__all__ = ["router"]
