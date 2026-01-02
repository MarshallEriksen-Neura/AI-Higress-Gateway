from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

MemoryScope = Literal["none", "user", "system"]


class MemoryItem(BaseModel):
    content: str = Field(..., min_length=1, description="独立陈述句（已去上下文）")
    category: str = Field(..., min_length=1, description="记忆分类标签（用于检索过滤）")
    keywords: list[str] = Field(default_factory=list, description="关键词列表（用于检索过滤）")


class ProjectMemoryRouteDryRunRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="最近对话片段（user/assistant 交错文本）")
    router_logical_model: str | None = Field(default=None, min_length=1, max_length=128, description="可选：临时覆盖路由模型")

    model_config = ConfigDict(extra="forbid")


class ProjectMemoryRouteDryRunResponse(BaseModel):
    project_id: UUID
    router_logical_model: str
    should_store: bool
    scope: MemoryScope
    memory_text: str
    memory_items: list[MemoryItem]
    raw_model_output: str


__all__ = [
    "MemoryItem",
    "MemoryScope",
    "ProjectMemoryRouteDryRunRequest",
    "ProjectMemoryRouteDryRunResponse",
]

