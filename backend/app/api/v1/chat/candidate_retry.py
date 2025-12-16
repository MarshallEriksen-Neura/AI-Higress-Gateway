"""
候选 Provider 重试逻辑

提取非流式和流式请求中重复的候选遍历和重试逻辑
"""

import json
from collections.abc import Awaitable, Sequence
from typing import Any, Callable, TypeVar

import httpx
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.api.v1.chat.transport_handlers import (
    TransportResult,
    execute_claude_cli_transport,
    execute_http_transport,
    execute_sdk_transport,
)
from app.auth import AuthenticatedAPIKey
import app.context_store as context_store
from app.logging_config import logger
from app.provider.config import get_provider_config
from app.routing.scheduler import CandidateScore
from app.schemas import PhysicalModel
from app.settings import settings


# 实时故障标记相关常量
FAILURE_KEY_PREFIX = "provider:failure:"

C = TypeVar("C", CandidateScore, PhysicalModel)


def _unwrap_candidate(candidate: C) -> PhysicalModel:
    if isinstance(candidate, CandidateScore):
        return candidate.upstream
    return candidate


async def _get_provider_failure_count(redis: Redis, provider_id: str) -> int:
    """获取 Provider 的故障次数"""
    failure_key = f"{FAILURE_KEY_PREFIX}{provider_id}"
    try:
        count = await redis.get(failure_key)
        return int(count) if count else 0
    except Exception:
        return 0


async def _increment_provider_failure(redis: Redis, provider_id: str) -> int:
    """增加 Provider 的故障次数，并设置过期时间"""
    failure_key = f"{FAILURE_KEY_PREFIX}{provider_id}"
    try:
        count = await redis.incr(failure_key)
        await redis.expire(failure_key, settings.provider_failure_cooldown_seconds)
        return int(count)
    except Exception:
        logger.exception("Failed to increment provider failure count for %s", provider_id)
        return 0


async def _clear_provider_failure(redis: Redis, provider_id: str) -> None:
    """清除 Provider 的故障标记"""
    failure_key = f"{FAILURE_KEY_PREFIX}{provider_id}"
    try:
        await redis.delete(failure_key)
    except Exception:
        logger.exception("Failed to clear provider failure flag for %s", provider_id)


async def try_candidates_stream(
    *,
    candidates: Sequence[CandidateScore | PhysicalModel],
    client: httpx.AsyncClient,
    redis: Redis,
    db: DbSession,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
    on_first_chunk: Callable[[str, str], Awaitable[None]],  # (provider_id, model_id) -> None
):
    """
    遍历候选 Provider，执行流式请求，失败时重试下一个
    
    实时故障标记机制：
    - 检查 Provider 是否在故障冷却期（最近 60 秒内失败 >= 3 次）
    - 失败时立即标记，避免短时间内重复选择
    - 成功时清除故障标记
    
    Args:
        candidates: 候选 Provider 列表（已排序）
        on_first_chunk: 收到第一个 chunk 时的回调函数（用于绑定 Session）
    
    Yields:
        流式响应的 chunk
    
    Raises:
        无异常抛出，所有错误都通过 SSE 格式返回
    """
    from app.api.v1.chat.transport_handlers_stream import (
        execute_claude_cli_stream,
        execute_http_stream,
        execute_sdk_stream,
    )
    
    last_status: int | None = None
    last_error_text: str | None = None
    skipped_count = 0
    
    for idx, cand in enumerate(candidates):
        upstream = _unwrap_candidate(cand)
        provider_id = upstream.provider_id
        model_id = upstream.model_id
        base_endpoint = upstream.endpoint
        is_last = idx == len(candidates) - 1
        
        # 🔥 实时故障检查：跳过故障冷却期的 Provider
        failure_count = await _get_provider_failure_count(redis, provider_id)
        if failure_count >= settings.provider_failure_threshold:
            skipped_count += 1
            logger.warning(
                "⏭️  Skipping provider %s (stream): in failure cooldown (failures=%d/%d, cooldown=%ds)",
                provider_id,
                failure_count,
                settings.provider_failure_threshold,
                settings.provider_failure_cooldown_seconds,
            )
            continue
        
        provider_cfg = get_provider_config(provider_id)
        if provider_cfg is None:
            last_status = 503
            last_error_text = f"Provider '{provider_id}' is not configured"
            continue
        
        transport = getattr(provider_cfg, "transport", "http")
        
        logger.info(
            "🔄 Trying candidate (stream): provider=%s model=%s transport=%s (failures=%d/%d, candidate=%d/%d)",
            provider_id,
            model_id,
            transport,
            failure_count,
            settings.provider_failure_threshold,
            idx + 1,
            len(candidates),
        )
        
        # 根据传输方式选择对应的流式处理函数
        stream_iterator = None
        
        if transport == "claude_cli":
            stream_iterator = execute_claude_cli_stream(
                client=client,
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        elif transport == "sdk":
            stream_iterator = execute_sdk_stream(
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        else:  # http
            stream_iterator = execute_http_stream(
                client=client,
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                url=base_endpoint,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        
        # 尝试流式传输
        first_chunk_seen = False
        try:
            async for chunk in stream_iterator:
                if not first_chunk_seen:
                    first_chunk_seen = True
                    # 🔥 成功：清除故障标记
                    await _clear_provider_failure(redis, provider_id)
                    logger.info(
                        "✅ Provider %s (stream) succeeded, failure flag cleared",
                        provider_id,
                    )
                    # 调用回调（绑定 Session）
                    await on_first_chunk(provider_id, model_id)
                    logger.info(
                        "📡 Received first chunk from provider=%s model=%s",
                        provider_id,
                        model_id,
                    )
                
                yield chunk
            
            # 流式传输成功完成
            logger.info(
                "🎉 Stream completed successfully: provider=%s model=%s",
                provider_id,
                model_id,
            )
            return
            
        except Exception as exc:
            # 流式传输失败
            error_status = getattr(exc, "status_code", None)
            error_text = str(exc)
            
            last_status = error_status
            last_error_text = error_text
            
            # 判断是否可重试
            retryable = _is_stream_error_retryable(exc, error_status)
            
            # 🔥 实时故障标记：对可重试的服务器错误立即标记
            if retryable and error_status in (500, 502, 503, 504, 429):
                new_count = await _increment_provider_failure(redis, provider_id)
                logger.warning(
                    "⚠️  Provider %s (stream) failed with status %s, failure count: %d/%d (cooldown=%ds)",
                    provider_id,
                    error_status,
                    new_count,
                    settings.provider_failure_threshold,
                    settings.provider_failure_cooldown_seconds,
                )
            
            if retryable and not is_last:
                logger.warning(
                    "🔁 Stream failed (retryable): provider=%s model=%s status=%s, trying next",
                    provider_id,
                    model_id,
                    error_status,
                )
                continue
            else:
                # 不可重试或已是最后一个候选：返回错误
                logger.error(
                    "❌ Stream failed (non-retryable or last): provider=%s model=%s status=%s",
                    provider_id,
                    model_id,
                    error_status,
                )
                
                # 构建错误响应（SSE 格式）
                error_payload = {
                    "error": {
                        "type": "upstream_error",
                        "status": error_status,
                        "message": error_text,
                        "provider_id": provider_id,
                    }
                }
                error_chunk = f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n".encode("utf-8")
                
                await context_store.save_context(redis, session_id, payload, error_text)
                yield error_chunk
                return
    
    # 所有候选都失败
    message = f"All upstream providers failed for logical model '{logical_model_id}'"
    details: list[str] = []
    if skipped_count > 0:
        details.append(f"skipped={skipped_count} (in failure cooldown)")
    if last_status is not None:
        details.append(f"last_status={last_status}")
    if last_error_text:
        details.append(f"last_error={last_error_text}")
    detail_text = message
    if details:
        detail_text = f"{message}; " + ", ".join(details)
    
    logger.error(
        "💥 %s (total_candidates=%d, skipped=%d, tried=%d)",
        detail_text,
        len(candidates),
        skipped_count,
        len(candidates) - skipped_count,
    )
    
    # 返回错误（SSE 格式）
    error_payload = {
        "error": {
            "type": "all_providers_failed",
            "message": detail_text,
            "last_status": last_status,
        }
    }
    error_chunk = f"data: {json.dumps(error_payload, ensure_ascii=False)}\n\n".encode("utf-8")
    
    await context_store.save_context(redis, session_id, payload, detail_text)
    yield error_chunk


def _is_stream_error_retryable(exc: Exception, status_code: int | None) -> bool:
    """判断流式错误是否可重试"""
    # 导入 UpstreamStreamError
    from app.upstream import UpstreamStreamError
    
    if isinstance(exc, UpstreamStreamError):
        if status_code is None:
            return True
        # 5xx 服务器错误可重试
        if 500 <= status_code < 600:
            return True
        # 429 限流可重试
        if status_code == 429:
            return True
        # 408 请求超时可重试
        if status_code == 408:
            return True
        return False
    
    # 其他异常默认可重试
    return True


async def try_candidates_non_stream(
    *,
    candidates: Sequence[CandidateScore | PhysicalModel],
    client: httpx.AsyncClient,
    redis: Redis,
    db: DbSession,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
    on_success: Callable[[str, str], Awaitable[None]],  # (provider_id, model_id) -> None
) -> JSONResponse:
    """
    遍历候选 Provider，执行非流式请求，失败时重试下一个
    
    实时故障标记机制：
    - 检查 Provider 是否在故障冷却期（最近 60 秒内失败 >= 3 次）
    - 失败时立即标记，避免短时间内重复选择
    - 成功时清除故障标记
    
    Args:
        candidates: 候选 Provider 列表（已排序）
        on_success: 成功时的回调函数（用于记录指标、绑定 Session 等）
    
    Returns:
        成功的响应
    
    Raises:
        HTTPException: 所有候选都失败时抛出
    """
    last_status: int | None = None
    last_error_text: str | None = None
    skipped_count = 0
    
    for cand in candidates:
        upstream = _unwrap_candidate(cand)
        provider_id = upstream.provider_id
        model_id = upstream.model_id
        base_endpoint = upstream.endpoint
        
        # 🔥 实时故障检查：跳过故障冷却期的 Provider
        failure_count = await _get_provider_failure_count(redis, provider_id)
        if failure_count >= settings.provider_failure_threshold:
            skipped_count += 1
            logger.warning(
                "⏭️  Skipping provider %s: in failure cooldown (failures=%d/%d, cooldown=%ds)",
                provider_id,
                failure_count,
                settings.provider_failure_threshold,
                settings.provider_failure_cooldown_seconds,
            )
            continue
        
        provider_cfg = get_provider_config(provider_id)
        if provider_cfg is None:
            last_status = status.HTTP_503_SERVICE_UNAVAILABLE
            last_error_text = f"Provider '{provider_id}' is not configured"
            continue
        
        transport = getattr(provider_cfg, "transport", "http")
        
        logger.info(
            "🔄 Trying candidate: provider=%s model=%s transport=%s (failures=%d/%d)",
            provider_id,
            model_id,
            transport,
            failure_count,
            settings.provider_failure_threshold,
        )
        
        # 根据传输方式选择对应的处理函数
        result: TransportResult
        
        if transport == "claude_cli":
            result = await execute_claude_cli_transport(
                client=client,
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        elif transport == "sdk":
            result = await execute_sdk_transport(
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        else:  # http
            result = await execute_http_transport(
                client=client,
                redis=redis,
                db=db,
                provider_id=provider_id,
                model_id=model_id,
                url=base_endpoint,
                payload=payload,
                logical_model_id=logical_model_id,
                api_key=api_key,
                session_id=session_id,
            )
        
        # 检查结果
        if result.success:
            # 🔥 成功：清除故障标记
            await _clear_provider_failure(redis, provider_id)
            logger.info(
                "✅ Provider %s succeeded, failure flag cleared",
                provider_id,
            )
            
            # 调用回调并返回
            await on_success(provider_id, model_id)
            return result.response
        
        # 失败：记录错误
        last_status = result.status_code
        last_error_text = result.error_text
        
        # 🔥 实时故障标记：对可重试的服务器错误立即标记
        if result.retryable and result.status_code in (500, 502, 503, 504, 429):
            new_count = await _increment_provider_failure(redis, provider_id)
            logger.warning(
                "⚠️  Provider %s failed with status %s, failure count: %d/%d (cooldown=%ds)",
                provider_id,
                result.status_code,
                new_count,
                settings.provider_failure_threshold,
                settings.provider_failure_cooldown_seconds,
            )
        
        if result.retryable:
            logger.warning(
                "🔁 Candidate failed (retryable): provider=%s model=%s status=%s, trying next",
                provider_id,
                model_id,
                result.status_code,
            )
            continue
        else:
            # 不可重试的错误：直接抛出
            logger.error(
                "❌ Candidate failed (non-retryable): provider=%s model=%s status=%s",
                provider_id,
                model_id,
                result.status_code,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Upstream error {result.status_code}: {result.error_text}",
            )
    
    # 所有候选都失败
    message = f"All upstream providers failed for logical model '{logical_model_id}'"
    details: list[str] = []
    if skipped_count > 0:
        details.append(f"skipped={skipped_count} (in failure cooldown)")
    if last_status is not None:
        details.append(f"last_status={last_status}")
    if last_error_text:
        details.append(f"last_error={last_error_text}")
    detail_text = message
    if details:
        detail_text = f"{message}; " + ", ".join(details)
    
    logger.error(
        "💥 %s (total_candidates=%d, skipped=%d, tried=%d)",
        detail_text,
        len(candidates),
        skipped_count,
        len(candidates) - skipped_count,
    )
    await context_store.save_context(redis, session_id, payload, detail_text)
    
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=detail_text,
    )


__all__ = [
    "try_candidates_non_stream",
    "try_candidates_stream",
]
