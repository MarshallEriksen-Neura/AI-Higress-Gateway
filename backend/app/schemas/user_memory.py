from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class UserMemoryItemResponse(BaseModel):
    id: str = Field(..., description="记忆单元 ID (Qdrant point_id)")
    content: str = Field(..., description="记忆内容")
    categories: Optional[List[str]] = Field(default=None, description="分类")
    keywords: Optional[List[str]] = Field(default=None, description="关键词")
    created_at: Optional[str] = Field(default=None, description="创建时间")
    source_conversation_id: Optional[UUID] = Field(default=None, description="来源会话 ID")
    scope: str = Field(..., description="作用域 (user|system)")


class UserAttributeResponse(BaseModel):
    id: UUID = Field(..., description="属性 ID")
    scope: str = Field(..., description="作用域 (user|project)")
    category: str = Field(..., description="分类 (preference|constraint)")
    key: str = Field(..., description="属性 Key")
    value: Any = Field(..., description="属性值")
    updated_at: datetime = Field(..., description="最后更新时间")
    project_id: Optional[UUID] = Field(default=None, description="关联项目 ID")


class UserMemoryListResponse(BaseModel):
    memories: List[UserMemoryItemResponse] = Field(default_factory=list, description="向量记忆列表")
    attributes: List[UserAttributeResponse] = Field(default_factory=list, description="结构化属性列表")
