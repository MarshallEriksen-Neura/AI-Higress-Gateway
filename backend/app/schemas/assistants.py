from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssistantPresetCreateRequest(BaseModel):
    project_id: UUID | None = Field(default=None, description="MVP: project_id == api_key_id，可为空")
    name: str = Field(..., min_length=1, max_length=120)
    system_prompt: str = Field(default="", max_length=20000)
    default_logical_model: str = Field(..., min_length=1, max_length=128)
    model_preset: dict | None = None

    model_config = ConfigDict(extra="forbid")


class AssistantPresetUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    system_prompt: str | None = Field(default=None, max_length=20000)
    default_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    model_preset: dict | None = None
    archived: bool | None = None

    model_config = ConfigDict(extra="forbid")


class AssistantPresetItem(BaseModel):
    assistant_id: UUID
    project_id: UUID | None = None
    name: str
    default_logical_model: str
    created_at: datetime
    updated_at: datetime


class AssistantPresetResponse(AssistantPresetItem):
    system_prompt: str
    model_preset: dict | None = None
    archived_at: datetime | None = None


class PaginatedResponse(BaseModel):
    next_cursor: str | None = None


class AssistantPresetListResponse(PaginatedResponse):
    items: list[AssistantPresetItem] = Field(default_factory=list)


class ConversationCreateRequest(BaseModel):
    assistant_id: UUID
    project_id: UUID = Field(..., description="MVP: project_id == api_key_id")
    title: str | None = Field(default=None, max_length=255)

    model_config = ConfigDict(extra="forbid")


class ConversationItem(BaseModel):
    conversation_id: UUID
    assistant_id: UUID
    project_id: UUID
    title: str | None = None
    last_activity_at: datetime
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(PaginatedResponse):
    items: list[ConversationItem] = Field(default_factory=list)


class MessageCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=20000)
    override_logical_model: str | None = Field(default=None, min_length=1, max_length=128)
    model_preset: dict | None = None

    model_config = ConfigDict(extra="forbid")


class MessageCreateResponse(BaseModel):
    message_id: UUID
    baseline_run: RunSummary


class RunSummary(BaseModel):
    run_id: UUID
    requested_logical_model: str
    status: str
    output_preview: str | None = None
    latency_ms: int | None = None
    error_code: str | None = None


class MessageItem(BaseModel):
    message_id: UUID
    role: str
    content: dict
    created_at: datetime
    runs: list[RunSummary] = Field(default_factory=list)


class MessageListResponse(PaginatedResponse):
    items: list[MessageItem] = Field(default_factory=list)


class RunDetailResponse(RunSummary):
    message_id: UUID
    selected_provider_id: str | None = None
    selected_provider_model: str | None = None
    output_text: str | None = None
    request_payload: dict | None = None
    response_payload: dict | None = None
    created_at: datetime
    updated_at: datetime


__all__ = [
    "AssistantPresetCreateRequest",
    "AssistantPresetUpdateRequest",
    "AssistantPresetItem",
    "AssistantPresetResponse",
    "AssistantPresetListResponse",
    "ConversationCreateRequest",
    "ConversationItem",
    "ConversationListResponse",
    "MessageCreateRequest",
    "MessageCreateResponse",
    "MessageItem",
    "MessageListResponse",
    "RunSummary",
    "RunDetailResponse",
]
