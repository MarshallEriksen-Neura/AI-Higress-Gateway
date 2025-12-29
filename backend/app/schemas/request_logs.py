from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RequestLogAttempt(BaseModel):
    idx: int = Field(..., description="Attempt index (0-based)")
    provider_id: str | None = Field(default=None)
    model_id: str | None = Field(default=None)
    transport: str | None = Field(default=None)
    endpoint: str | None = Field(default=None)
    success: bool | None = Field(default=None)
    retryable: bool | None = Field(default=None)
    skipped: bool = Field(default=False)
    skip_reason: str | None = Field(default=None)
    status_code: int | None = Field(default=None)
    error_category: str | None = Field(default=None)
    error_message: str | None = Field(default=None)
    ttfb_ms: int | None = Field(default=None, description="Time to first byte (stream only)")
    duration_ms: int | None = Field(default=None)
    cooldown: dict[str, Any] | None = Field(default=None)


class RequestLogEntry(BaseModel):
    request_id: str
    ts: str = Field(..., description="ISO timestamp")
    user_id: str
    api_key_id: str
    method: str | None = None
    path: str | None = None
    logical_model: str | None = None
    requested_model: str | None = None
    api_style: str | None = None
    is_stream: bool = False
    status_code: int | None = None
    latency_ms: int | None = None
    selected_provider_id: str | None = None
    selected_provider_model: str | None = None
    upstream_status: int | None = None
    error_message: str | None = None
    attempts: list[RequestLogAttempt] = Field(default_factory=list)


class RequestLogsResponse(BaseModel):
    items: list[RequestLogEntry] = Field(default_factory=list)


__all__ = ["RequestLogAttempt", "RequestLogEntry", "RequestLogsResponse"]

