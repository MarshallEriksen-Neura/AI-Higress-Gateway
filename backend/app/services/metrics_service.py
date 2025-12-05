from __future__ import annotations

import datetime as dt
import time
from collections.abc import AsyncIterator
from typing import Any, Literal
from uuid import UUID

import httpx

from sqlalchemy.orm import Session

from app.logging_config import logger
from app.models import ProviderRoutingMetricsHistory
from app.upstream import UpstreamStreamError, stream_upstream
from app.settings import settings
from app.services.metrics_buffer import BufferedMetricsRecorder, MetricsKey, MetricsStats

BucketSizeSeconds = Literal[60]

DEFAULT_BUCKET_SECONDS: BucketSizeSeconds = 60

metrics_recorder = BufferedMetricsRecorder(
    flush_interval_seconds=settings.metrics_flush_interval_seconds,
    latency_sample_size=settings.metrics_latency_sample_size,
    max_buffered_buckets=settings.metrics_max_buffered_buckets,
    success_sample_rate=settings.metrics_success_sample_rate,
)

if settings.metrics_buffer_enabled:
    metrics_recorder.start()


def _current_bucket_start(now: dt.datetime, bucket_seconds: int) -> dt.datetime:
    """
    将当前时间截断到指定秒数的聚合桶起点（例如按分钟聚合）。
    """
    if now.tzinfo is None:
        now = now.replace(tzinfo=dt.timezone.utc)
    else:
        now = now.astimezone(dt.timezone.utc)

    # 使用 timestamp 截断，支持不同桶尺寸（默认 60s）。
    epoch_seconds = int(now.timestamp())
    bucket_start = epoch_seconds - (epoch_seconds % bucket_seconds)
    return dt.datetime.fromtimestamp(bucket_start, tz=dt.timezone.utc)


def record_provider_call_metric(
    db: Session,
    *,
    provider_id: str,
    logical_model: str,
    transport: str,
    is_stream: bool,
    user_id: UUID | None,
    api_key_id: UUID | None,
    success: bool,
    latency_ms: float,
    bucket_seconds: int = DEFAULT_BUCKET_SECONDS,
) -> None:
    """
    将单次上游调用累加到本地缓冲区，由后台批量写入 provider_routing_metrics_history。

    - 默认开启指标缓冲：减少每次请求的同步写库开销。
    - 若关闭缓冲（METRICS_BUFFER_ENABLED=false），退化为立即 UPSERT。
    """
    try:
        now = dt.datetime.now(tz=dt.timezone.utc)
        window_start = _current_bucket_start(now, bucket_seconds)

        if settings.metrics_buffer_enabled:
            metrics_recorder.record_sample(
                provider_id=provider_id,
                logical_model=logical_model,
                transport=transport,
                is_stream=is_stream,
                user_id=user_id,
                api_key_id=api_key_id,
                window_start=window_start,
                bucket_seconds=bucket_seconds,
                success=success,
                latency_ms=latency_ms,
            )
            return

        # 缓冲关闭时，直接写库（保留旧逻辑）。
        stats = MetricsStats()
        stats.record(success=success, latency_ms=latency_ms, sample_limit=1)
        key = MetricsKey(
            provider_id=provider_id,
            logical_model=logical_model,
            transport=transport,
            is_stream=is_stream,
            user_id=user_id,
            api_key_id=api_key_id,
            window_start=window_start,
            bucket_seconds=bucket_seconds,
        )
        immediate_stmt = metrics_recorder._build_upsert_stmt(key, stats)
        db.execute(immediate_stmt)
        db.commit()
    except Exception:  # pragma: no cover - 防御性日志，不影响主流程
        logger.exception(
            "Failed to record provider metrics for provider=%s logical_model=%s",
            provider_id,
            logical_model,
        )


def flush_metrics_buffer() -> int:
    """手动触发一次缓冲刷新，便于调试或关停前落盘。"""
    return metrics_recorder.flush()


async def call_upstream_http_with_metrics(
    *,
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
    json_body: dict[str, object],
    db: Session,
    provider_id: str,
    logical_model: str,
    user_id: UUID | None = None,
    api_key_id: UUID | None = None,
) -> httpx.Response:
    """
    统一封装上游 HTTP 调用 + 指标打点。

    - 成功：HTTP 状态码 < 400；
    - 失败：请求抛出 httpx.HTTPError 或返回状态码 >= 400。
    """
    start = time.perf_counter()
    success = False
    try:
        resp = await client.post(url, headers=headers, json=json_body)
        success = resp.status_code < 400
        return resp
    except httpx.HTTPError as exc:
        logger.warning(
            "Upstream HTTP error for %s (provider=%s): %s",
            url,
            provider_id,
            exc,
        )
        raise
    finally:
        latency_ms = (time.perf_counter() - start) * 1000.0
        try:
            record_provider_call_metric(
                db,
                provider_id=provider_id,
                logical_model=logical_model,
                transport="http",
                is_stream=False,
                user_id=user_id,
                api_key_id=api_key_id,
                success=success,
                latency_ms=latency_ms,
            )
        except Exception:  # pragma: no cover - 防御性日志
            logger.exception(
                "record_provider_call_metric failed in call_upstream_http_with_metrics "
                "for provider=%s logical_model=%s",
                provider_id,
                logical_model,
            )


async def stream_upstream_with_metrics(
    *,
    client: httpx.AsyncClient,
    method: str,
    url: str,
    headers: dict[str, str],
    json_body: dict[str, object],
    redis,
    session_id: str | None,
    db: Session,
    provider_id: str,
    logical_model: str,
    user_id: UUID | None = None,
    api_key_id: UUID | None = None,
) -> AsyncIterator[bytes]:
    """
    封装流式上游请求 + 指标打点。

    约定：
    - 若在收到任何 chunk 之前抛出 UpstreamStreamError，则视为一次失败调用；
    - 若至少收到一个 chunk，则视为成功调用，延迟取“首包到达时间”（TTFB）。
    """
    start = time.perf_counter()
    first_chunk_seen = False

    try:
        async for chunk in stream_upstream(
            client=client,
            method=method,
            url=url,
            headers=headers,
            json_body=json_body,
            redis=redis,
            session_id=session_id,
        ):
            if not first_chunk_seen:
                first_chunk_seen = True
                latency_ms = (time.perf_counter() - start) * 1000.0
                try:
                    record_provider_call_metric(
                        db,
                        provider_id=provider_id,
                        logical_model=logical_model,
                        transport="http",
                        is_stream=True,
                        user_id=user_id,
                        api_key_id=api_key_id,
                        success=True,
                        latency_ms=latency_ms,
                    )
                except Exception:  # pragma: no cover - 防御性日志
                    logger.exception(
                        "record_provider_call_metric failed in stream_upstream_with_metrics "
                        "for provider=%s logical_model=%s (first chunk)",
                        provider_id,
                        logical_model,
                    )
            yield chunk
    except UpstreamStreamError as err:
        latency_ms = (time.perf_counter() - start) * 1000.0
        try:
            record_provider_call_metric(
                db,
                provider_id=provider_id,
                logical_model=logical_model,
                transport="http",
                is_stream=True,
                user_id=user_id,
                api_key_id=api_key_id,
                success=False,
                latency_ms=latency_ms,
            )
        except Exception:  # pragma: no cover - 防御性日志
            logger.exception(
                "record_provider_call_metric failed in stream_upstream_with_metrics "
                "for provider=%s logical_model=%s (UpstreamStreamError)",
                provider_id,
                logical_model,
            )
        # 将错误重新抛给调用方，保持原有路由控制逻辑。
        raise


async def call_sdk_generate_with_metrics(
    *,
    driver: Any,
    api_key: str,
    model_id: str,
    payload: dict[str, Any],
    base_url: str,
    db: Session,
    provider_id: str,
    logical_model: str,
    user_id: UUID | None = None,
    api_key_id: UUID | None = None,
) -> Any:
    """
    封装 SDK 模式 generate_content 调用 + 指标打点。

    - SDK 视角下不存在 HTTP 状态码，这里统一认为调用成功即 success=True；
    - 若 driver.generate_content 抛出异常，则视为一次失败调用。
    """
    start = time.perf_counter()
    success = False
    try:
        result = await driver.generate_content(
            api_key=api_key,
            model_id=model_id,
            payload=payload,
            base_url=base_url,
        )
        success = True
        return result
    finally:
        latency_ms = (time.perf_counter() - start) * 1000.0
        try:
            record_provider_call_metric(
                db,
                provider_id=provider_id,
                logical_model=logical_model,
                transport="sdk",
                is_stream=False,
                user_id=user_id,
                api_key_id=api_key_id,
                success=success,
                latency_ms=latency_ms,
            )
        except Exception:  # pragma: no cover - 防御性日志
            logger.exception(
                "record_provider_call_metric failed in call_sdk_generate_with_metrics "
                "for provider=%s logical_model=%s",
                provider_id,
                logical_model,
            )


async def stream_sdk_with_metrics(
    *,
    driver: Any,
    api_key: str,
    model_id: str,
    payload: dict[str, Any],
    base_url: str,
    db: Session,
    provider_id: str,
    logical_model: str,
    user_id: UUID | None = None,
    api_key_id: UUID | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """
    封装 SDK 模式 stream_content 调用 + 指标打点。

    - 若在收到任何 chunk 之前抛出错误，则视为失败调用；
    - 若至少收到一个 chunk，则视为成功调用，延迟取“首包时间”。
    """
    start = time.perf_counter()
    first_chunk_seen = False

    try:
        async for chunk in driver.stream_content(
            api_key=api_key,
            model_id=model_id,
            payload=payload,
            base_url=base_url,
        ):
            if not first_chunk_seen:
                first_chunk_seen = True
                latency_ms = (time.perf_counter() - start) * 1000.0
                try:
                    record_provider_call_metric(
                        db,
                        provider_id=provider_id,
                        logical_model=logical_model,
                        transport="sdk",
                        is_stream=True,
                        user_id=user_id,
                        api_key_id=api_key_id,
                        success=True,
                        latency_ms=latency_ms,
                    )
                except Exception:  # pragma: no cover - 防御性日志
                    logger.exception(
                        "record_provider_call_metric failed in stream_sdk_with_metrics "
                        "for provider=%s logical_model=%s (first chunk)",
                        provider_id,
                        logical_model,
                    )
            yield chunk
    except Exception:
        # 只有在尚未收到任何 chunk 时，才将其视为失败调用。
        if not first_chunk_seen:
            latency_ms = (time.perf_counter() - start) * 1000.0
            try:
                record_provider_call_metric(
                    db,
                    provider_id=provider_id,
                    logical_model=logical_model,
                    transport="sdk",
                    is_stream=True,
                    user_id=user_id,
                    api_key_id=api_key_id,
                    success=False,
                    latency_ms=latency_ms,
                )
            except Exception:  # pragma: no cover - 防御性日志
                logger.exception(
                    "record_provider_call_metric failed in stream_sdk_with_metrics "
                    "for provider=%s logical_model=%s (error before first chunk)",
                    provider_id,
                    logical_model,
                )
        raise


__all__ = [
    "record_provider_call_metric",
    "flush_metrics_buffer",
    "call_upstream_http_with_metrics",
    "stream_upstream_with_metrics",
    "call_sdk_generate_with_metrics",
    "stream_sdk_with_metrics",
]
