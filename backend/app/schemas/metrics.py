from __future__ import annotations

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field


class MetricsTimeRange(str):
    TODAY = "today"
    LAST_7D = "7d"
    LAST_30D = "30d"
    ALL = "all"


class MetricsBucket(str):
    MINUTE = "minute"


class MetricsDataPoint(BaseModel):
    window_start: dt.datetime = Field(..., description="时间桶起点（UTC）")
    total_requests: int = Field(..., description="该时间桶内总请求数")
    success_requests: int = Field(..., description="成功请求数")
    error_requests: int = Field(..., description="失败请求数")
    latency_avg_ms: float = Field(..., description="平均延迟（毫秒）")
    latency_p95_ms: float = Field(..., description="P95 延迟（毫秒）")
    latency_p99_ms: float = Field(..., description="P99 延迟（毫秒）")
    error_rate: float = Field(..., description="错误率 [0,1]")


class ProviderMetricsTimeSeries(BaseModel):
    provider_id: str
    logical_model: str
    time_range: str
    bucket: str
    transport: str = Field(
        "all",
        description="传输模式过滤：http/sdk/all",
    )
    is_stream: str = Field(
        "all",
        description="流式过滤：true/false/all",
    )
    points: list[MetricsDataPoint] = Field(default_factory=list)


class ProviderMetricsSummary(BaseModel):
    provider_id: str
    logical_model: str
    time_range: str
    transport: str = Field(
        "all",
        description="传输模式过滤：http/sdk/all",
    )
    is_stream: str = Field(
        "all",
        description="流式过滤：true/false/all",
    )
    user_id: str | None = Field(
        None,
        description="用户 ID 过滤（如提供则仅统计该用户，默认全部用户）",
    )
    api_key_id: str | None = Field(
        None,
        description="API Key ID 过滤（如提供则仅统计该密钥，默认全部密钥）",
    )
    total_requests: int
    success_requests: int
    error_requests: int
    error_rate: float
    latency_avg_ms: float | None = Field(
        None,
        description="平均延迟（毫秒），无请求时为 null",
    )


class UserMetricsSummary(BaseModel):
    user_id: str
    time_range: str
    transport: str = Field(
        "all",
        description="传输模式过滤：http/sdk/all",
    )
    is_stream: str = Field(
        "all",
        description="流式过滤：true/false/all",
    )
    total_requests: int
    success_requests: int
    error_requests: int
    error_rate: float
    latency_avg_ms: float | None = Field(
        None,
        description="平均延迟（毫秒），无请求时为 null",
    )


class APIKeyMetricsSummary(BaseModel):
    api_key_id: str
    time_range: str
    transport: str = Field(
        "all",
        description="传输模式过滤：http/sdk/all",
    )
    is_stream: str = Field(
        "all",
        description="流式过滤：true/false/all",
    )
    total_requests: int
    success_requests: int
    error_requests: int
    error_rate: float
    latency_avg_ms: float | None = Field(
        None,
        description="平均延迟（毫秒），无请求时为 null",
    )


__all__ = [
    "APIKeyMetricsSummary",
    "MetricsBucket",
    "MetricsDataPoint",
    "MetricsTimeRange",
    "ProviderMetricsSummary",
    "ProviderMetricsTimeSeries",
    "UserMetricsSummary",
]
