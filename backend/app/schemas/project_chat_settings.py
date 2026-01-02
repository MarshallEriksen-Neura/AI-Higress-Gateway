from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectChatSettingsResponse(BaseModel):
    project_id: UUID = Field(..., description="MVP: project_id == api_key_id")
    default_logical_model: str = Field(..., min_length=1, max_length=128, description="项目级聊天默认模型")
    title_logical_model: str | None = Field(default=None, min_length=1, max_length=128, description="项目级标题生成模型")
    kb_embedding_logical_model: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="项目级知识库 embedding 模型（用于 Qdrant/RAG 等向量化场景）",
    )
    kb_memory_router_logical_model: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        description="项目级聊天记忆路由模型（判断是否存储、存到 user/system 维度）",
    )


class ProjectChatSettingsUpdateRequest(BaseModel):
    default_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    title_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    kb_embedding_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    kb_memory_router_logical_model: str | None = Field(default=None, min_length=1, max_length=128)

    model_config = ConfigDict(extra="forbid")


__all__ = ["ProjectChatSettingsResponse", "ProjectChatSettingsUpdateRequest"]
