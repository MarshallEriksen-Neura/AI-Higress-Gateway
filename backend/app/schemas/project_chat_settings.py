from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectChatSettingsResponse(BaseModel):
    project_id: UUID = Field(..., description="MVP: project_id == api_key_id")
    default_logical_model: str = Field(..., min_length=1, max_length=128, description="项目级聊天默认模型")
    title_logical_model: str | None = Field(default=None, min_length=1, max_length=128, description="项目级标题生成模型")


class ProjectChatSettingsUpdateRequest(BaseModel):
    default_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    title_logical_model: str | None = Field(default=None, min_length=1, max_length=128)

    model_config = ConfigDict(extra="forbid")


__all__ = ["ProjectChatSettingsResponse", "ProjectChatSettingsUpdateRequest"]

