from __future__ import annotations

import time
from typing import Any

from pydantic import BaseModel, Field


class ModelCatalogModel(BaseModel):
    """
    归一化后的公共模型目录条目。
    """

    model_id: str = Field(..., description="上游模型 ID")
    display_name: str = Field(..., description="模型展示名称")
    family: str | None = Field(None, description="模型家族，用于分组")
    capabilities: list[str] = Field(
        default_factory=list,
        description="能力标签，例如 reasoning/tool_call/vision/audio/text",
    )
    context_limit: int | None = Field(None, description="最大上下文长度")
    output_limit: int | None = Field(None, description="最大输出 token 数")
    pricing: dict[str, float] | None = Field(
        default=None,
        description="每百万 token 成本，保留原始字段名（input/output/cache_read 等）",
    )
    release_date: str | None = Field(None, description="发布日期（如 2025-09-01）")
    last_updated: str | None = Field(None, description="最近更新日期")
    knowledge_cutoff: str | None = Field(None, description="知识截止信息")
    open_weights: bool | None = Field(None, description="是否开放权重")
    raw: dict[str, Any] = Field(
        default_factory=dict, description="保留的原始字段（上游完整条目）"
    )


class ModelCatalogProvider(BaseModel):
    """
    单个提供商及其模型列表。
    """

    provider_slug: str = Field(..., description="models.dev 提供商短标识")
    provider_name: str = Field(..., description="提供商名称")
    api: str | None = Field(None, description="官方 API 基础地址")
    doc: str | None = Field(None, description="官方文档链接")
    logo_url: str | None = Field(None, description="logo 直链")
    models: list[ModelCatalogModel] = Field(default_factory=list)
    model_count: int = Field(..., description="该提供商的模型数量")
    last_updated: str | None = Field(None, description="最新模型的 last_updated")


class ModelCatalogSnapshot(BaseModel):
    """
    models.dev 的完整快照。
    """

    source: str = Field(default="models.dev")
    fetched_at: float = Field(default_factory=lambda: time.time())
    etag: str | None = Field(default=None, description="上次抓取的 ETag")
    provider_count: int = Field(..., description="提供商数量")
    model_count: int = Field(..., description="模型总数")
    providers: list[ModelCatalogProvider] = Field(default_factory=list)


class ModelCatalogProviderSummary(BaseModel):
    provider_slug: str
    provider_name: str
    logo_url: str | None = None
    model_count: int
    last_updated: str | None = None


class ModelCatalogProvidersResponse(BaseModel):
    providers: list[ModelCatalogProviderSummary]
    total: int
    fetched_at: float | None = None
    etag: str | None = None


class ModelCatalogModelsResponse(BaseModel):
    provider: ModelCatalogProviderSummary
    models: list[ModelCatalogModel]
    total: int
    fetched_at: float | None = None
    etag: str | None = None


__all__ = [
    "ModelCatalogModel",
    "ModelCatalogModelsResponse",
    "ModelCatalogProvider",
    "ModelCatalogProviderSummary",
    "ModelCatalogProvidersResponse",
    "ModelCatalogSnapshot",
]
