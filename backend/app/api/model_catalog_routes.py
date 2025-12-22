from __future__ import annotations

from fastapi import APIRouter, Depends, Query

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - 允许在无 redis 环境导入
    Redis = object  # type: ignore[misc,assignment]

from app.deps import get_redis
from app.errors import not_found
from app.jwt_auth import require_jwt_token
from app.logging_config import logger
from app.schemas.model_catalog import (
    ModelCatalogModelsResponse,
    ModelCatalogProvidersResponse,
)
from app.services.model_catalog_service import (
    load_cached_catalog,
    summarize_provider,
)

router = APIRouter(
    prefix="/model-catalog",
    tags=["model_catalog"],
    dependencies=[Depends(require_jwt_token)],
)


@router.get("/providers", response_model=ModelCatalogProvidersResponse)
async def list_model_catalog_providers(
    redis: Redis = Depends(get_redis),
) -> ModelCatalogProvidersResponse:
    snapshot = await load_cached_catalog(redis)
    if snapshot is None:
        logger.info("模型目录缓存缺失，返回空列表")
        return ModelCatalogProvidersResponse(
            providers=[],
            total=0,
            fetched_at=None,
            etag=None,
        )

    providers = [summarize_provider(p) for p in snapshot.providers]
    return ModelCatalogProvidersResponse(
        providers=providers,
        total=len(providers),
        fetched_at=snapshot.fetched_at,
        etag=snapshot.etag,
    )


@router.get(
    "/providers/{provider_slug}/models",
    response_model=ModelCatalogModelsResponse,
)
async def list_model_catalog_models_by_provider(
    provider_slug: str,
    redis: Redis = Depends(get_redis),
    limit: int = Query(
        default=300,
        ge=1,
        le=2000,
        description="最多返回的模型数量，防止一次性拉取过大列表",
    ),
) -> ModelCatalogModelsResponse:
    snapshot = await load_cached_catalog(redis)
    if snapshot is None:
        raise not_found("公共模型目录尚未刷新，请稍后重试")

    provider = next(
        (p for p in snapshot.providers if p.provider_slug == provider_slug), None
    )
    if provider is None:
        raise not_found(f"未找到提供商 {provider_slug} 的公共目录信息")

    models = provider.models[:limit]
    summary = summarize_provider(provider)
    return ModelCatalogModelsResponse(
        provider=summary,
        models=models,
        total=provider.model_count,
        fetched_at=snapshot.fetched_at,
        etag=snapshot.etag,
    )


__all__ = ["router"]
