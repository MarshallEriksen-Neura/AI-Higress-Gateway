from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectEvalConfigResponse(BaseModel):
    project_id: UUID = Field(..., description="MVP: project_id == api_key_id")
    enabled: bool
    max_challengers: int = Field(..., ge=0, le=5)
    provider_scopes: list[str] = Field(default_factory=lambda: ["private", "shared", "public"])
    candidate_logical_models: list[str] | None = None
    cooldown_seconds: int = Field(..., ge=0, le=24 * 3600)
    budget_per_eval_credits: int | None = Field(default=None, ge=0)
    rubric: str | None = None
    project_ai_enabled: bool = False
    project_ai_provider_model: str | None = None


class ProjectEvalConfigUpdateRequest(BaseModel):
    enabled: bool | None = None
    max_challengers: int | None = Field(default=None, ge=0, le=5)
    provider_scopes: list[str] | None = None
    candidate_logical_models: list[str] | None = None
    cooldown_seconds: int | None = Field(default=None, ge=0, le=24 * 3600)
    budget_per_eval_credits: int | None = Field(default=None, ge=0)
    rubric: str | None = None
    project_ai_enabled: bool | None = None
    project_ai_provider_model: str | None = None

    model_config = ConfigDict(extra="forbid")


__all__ = ["ProjectEvalConfigResponse", "ProjectEvalConfigUpdateRequest"]
