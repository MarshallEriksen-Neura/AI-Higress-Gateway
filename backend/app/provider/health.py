"""
Provider health status model.

网关会将“探针/巡检”的结果写入 Provider 的健康状态（DB + Redis 缓存），
用于路由时的健康过滤、以及 `GET /providers/{provider_id}/health` 等接口返回。
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas import ProviderStatus


class HealthStatus(BaseModel):
    """
    Minimal health status model aligned with provider-api.yaml.
    """

    provider_id: str = Field(..., description="Provider id")
    status: ProviderStatus = Field(..., description="Health status")
    timestamp: float = Field(..., description="Check timestamp (epoch seconds)")
    response_time_ms: float | None = Field(
        None, description="Response time in milliseconds"
    )
    error_message: str | None = Field(
        None, description="Error message if check failed"
    )
    last_successful_check: float | None = Field(
        None, description="Timestamp of last successful check"
    )


__all__ = ["HealthStatus"]
