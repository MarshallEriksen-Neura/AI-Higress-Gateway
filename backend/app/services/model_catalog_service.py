"""
models.dev 公共模型目录抓取与缓存。
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx

from app.redis_client import redis_get_json, redis_set_json
from app.schemas.model_catalog import (
    ModelCatalogModel,
    ModelCatalogProvider,
    ModelCatalogProviderSummary,
    ModelCatalogSnapshot,
)

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:  # pragma: no cover - 允许在无 redis 依赖环境导入
    Redis = object  # type: ignore[misc,assignment]

logger = logging.getLogger(__name__)

MODELS_DEV_URL = "https://models.dev/api.json"
MODELS_DEV_LOGO_TEMPLATE = "https://models.dev/logos/{provider}.svg"
CATALOG_KEY = "llm:model-catalog:models-dev:data"
CATALOG_META_KEY = "llm:model-catalog:models-dev:meta"


def _infer_capabilities(raw_model: dict[str, Any]) -> list[str]:
    caps: list[str] = []
    modalities = raw_model.get("modalities") or {}
    inputs = modalities.get("input") or []
    outputs = modalities.get("output") or []
    if any(m in {"image", "video"} for m in inputs + outputs):
        caps.append("vision")
    if any(m == "audio" for m in inputs + outputs):
        caps.append("audio")
    if raw_model.get("reasoning"):
        caps.append("reasoning")
    if raw_model.get("tool_call"):
        caps.append("tool_call")
    if raw_model.get("structured_output"):
        caps.append("structured_output")
    if not caps:
        caps.append("text")
    return caps


def _normalize_pricing(raw: Any) -> dict[str, float] | None:
    if not isinstance(raw, dict):
        return None
    result: dict[str, float] = {}
    for k, v in raw.items():
        try:
            result[str(k)] = float(v)
        except (TypeError, ValueError):
            continue
    return result or None


def _normalize_model(model_id: str, raw_model: dict[str, Any]) -> ModelCatalogModel:
    limit = raw_model.get("limit") or {}
    pricing = _normalize_pricing(raw_model.get("cost"))
    return ModelCatalogModel(
        model_id=model_id,
        display_name=str(raw_model.get("name") or model_id),
        family=raw_model.get("family"),
        capabilities=_infer_capabilities(raw_model),
        context_limit=_safe_int(limit.get("context")),
        output_limit=_safe_int(limit.get("output")),
        pricing=pricing,
        release_date=raw_model.get("release_date"),
        last_updated=raw_model.get("last_updated"),
        knowledge_cutoff=raw_model.get("knowledge"),
        open_weights=raw_model.get("open_weights"),
        raw=raw_model,
    )


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_provider(
    provider_slug: str, payload: dict[str, Any]
) -> ModelCatalogProvider:
    models_dict = payload.get("models") or {}
    models: list[ModelCatalogModel] = []
    for model_id, raw_model in models_dict.items():
        if not isinstance(raw_model, dict):
            continue
        models.append(_normalize_model(str(model_id), raw_model))

    last_updated = None
    for model in models:
        if model.last_updated and (
            last_updated is None or model.last_updated > last_updated
        ):
            last_updated = model.last_updated

    return ModelCatalogProvider(
        provider_slug=provider_slug,
        provider_name=str(payload.get("name") or provider_slug),
        api=payload.get("api"),
        doc=payload.get("doc"),
        logo_url=MODELS_DEV_LOGO_TEMPLATE.format(provider=provider_slug),
        models=models,
        model_count=len(models),
        last_updated=last_updated,
    )


def _build_snapshot(data: dict[str, Any], etag: str | None) -> ModelCatalogSnapshot:
    providers: list[ModelCatalogProvider] = []
    for provider_slug, payload in data.items():
        if not isinstance(payload, dict):
            continue
        providers.append(_normalize_provider(str(provider_slug), payload))

    model_count = sum(p.model_count for p in providers)
    return ModelCatalogSnapshot(
        source="models.dev",
        fetched_at=time.time(),
        etag=etag,
        provider_count=len(providers),
        model_count=model_count,
        providers=providers,
    )


async def load_cached_catalog(redis: Redis) -> ModelCatalogSnapshot | None:
    cached = await redis_get_json(redis, CATALOG_KEY)
    if not cached:
        return None
    try:
        return ModelCatalogSnapshot.model_validate(cached)
    except Exception:
        logger.warning("模型目录缓存内容无法解析，忽略并等待下次刷新")
        return None


async def save_catalog(redis: Redis, snapshot: ModelCatalogSnapshot) -> None:
    await redis_set_json(redis, CATALOG_KEY, snapshot.model_dump(), ttl_seconds=None)
    await redis_set_json(
        redis,
        CATALOG_META_KEY,
        {
            "etag": snapshot.etag,
            "fetched_at": snapshot.fetched_at,
            "provider_count": snapshot.provider_count,
            "model_count": snapshot.model_count,
        },
        ttl_seconds=None,
    )


async def refresh_models_dev_catalog(
    redis: Redis,
    *,
    force: bool = False,
    timeout: float = 30.0,
) -> dict[str, Any]:
    """
    拉取 models.dev 并写入 Redis。

    返回简要统计信息。
    """
    etag: str | None = None
    if not force:
        meta = await redis_get_json(redis, CATALOG_META_KEY) or {}
        etag = meta.get("etag")

    headers: dict[str, str] = {"Accept": "application/json"}
    if etag and not force:
        headers["If-None-Match"] = etag

    logger.info("刷新 models.dev 目录（etag=%s force=%s）", etag, force)

    async with httpx.AsyncClient(
        timeout=timeout, follow_redirects=True, headers=headers
    ) as client:
        response = await client.get(MODELS_DEV_URL)

    if response.status_code == httpx.codes.NOT_MODIFIED and not force:
        logger.info("models.dev 目录未更新（304），跳过重写缓存")
        snapshot = await load_cached_catalog(redis)
        return {
            "refreshed": False,
            "etag": etag,
            "provider_count": snapshot.provider_count if snapshot else 0,
            "model_count": snapshot.model_count if snapshot else 0,
        }

    response.raise_for_status()

    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("models.dev 响应格式异常：顶层不是对象")

    new_etag = response.headers.get("etag") or response.headers.get("ETag")
    snapshot = _build_snapshot(body, new_etag)
    await save_catalog(redis, snapshot)
    logger.info(
        "models.dev 目录刷新完成：providers=%s models=%s",
        snapshot.provider_count,
        snapshot.model_count,
    )
    return {
        "refreshed": True,
        "etag": snapshot.etag,
        "provider_count": snapshot.provider_count,
        "model_count": snapshot.model_count,
    }


def summarize_provider(provider: ModelCatalogProvider) -> ModelCatalogProviderSummary:
    return ModelCatalogProviderSummary(
        provider_slug=provider.provider_slug,
        provider_name=provider.provider_name,
        logo_url=provider.logo_url,
        model_count=provider.model_count,
        last_updated=provider.last_updated,
    )


__all__ = [
    "CATALOG_KEY",
    "CATALOG_META_KEY",
    "load_cached_catalog",
    "refresh_models_dev_catalog",
    "save_catalog",
    "summarize_provider",
]
