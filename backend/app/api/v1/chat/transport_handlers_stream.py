"""
流式传输层处理辅助函数

提供 HTTP/SDK/Claude CLI 三种传输方式的流式处理
"""

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.auth import AuthenticatedAPIKey
from app.logging_config import logger
from app.provider.config import get_provider_config
from app.provider.key_pool import (
    NoAvailableProviderKey,
    acquire_provider_key,
    record_key_failure,
    record_key_success,
)
from app.provider.sdk_selector import get_sdk_driver, normalize_base_url
from app.services.claude_cli_transformer import (
    build_claude_cli_headers,
    transform_to_claude_cli_format,
)
from app.services.metrics_service import (
    stream_sdk_with_metrics,
    stream_upstream_with_metrics,
)
from app.upstream import UpstreamStreamError
from app.api.v1.chat.transport_handlers import _build_headers


async def execute_http_stream(
    *,
    client: httpx.AsyncClient,
    redis: Redis,
    db: DbSession,
    provider_id: str,
    model_id: str,
    url: str,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
) -> AsyncIterator[bytes]:
    """
    执行 HTTP 流式传输
    
    Yields:
        流式响应的 chunk
    
    Raises:
        UpstreamStreamError: 上游错误
        Exception: 其他错误
    """
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        raise Exception(f"Provider '{provider_id}' is not configured")
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        raise Exception(str(exc))
    
    # 构建请求头
    headers = _build_headers(key_selection.key, provider_cfg)
    
    # 准备 payload（使用 provider 的 model_id）
    upstream_payload = dict(payload)
    upstream_payload["model"] = model_id
    upstream_payload["stream"] = True
    
    logger.info(
        "HTTP stream: starting request to provider=%s model=%s url=%s",
        provider_id,
        model_id,
        url,
    )
    
    # 发送流式请求
    try:
        async for chunk in stream_upstream_with_metrics(
            client=client,
            method="POST",
            url=url,
            headers=headers,
            json_body=upstream_payload,
            redis=redis,
            session_id=session_id,
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        ):
            yield chunk
        
        # 流式传输成功
        record_key_success(key_selection, redis=redis)
        logger.info(
            "HTTP stream: completed successfully provider=%s model=%s",
            provider_id,
            model_id,
        )
        
    except UpstreamStreamError as err:
        # 记录 Key 失败
        retryable = _is_retryable_status(err.status_code)
        record_key_failure(
            key_selection,
            retryable=retryable,
            status_code=err.status_code,
            redis=redis,
        )
        logger.error(
            "HTTP stream: error provider=%s model=%s status=%s retryable=%s",
            provider_id,
            model_id,
            err.status_code,
            retryable,
        )
        raise
    
    except Exception as exc:
        # 其他错误
        record_key_failure(
            key_selection,
            retryable=True,
            status_code=None,
            redis=redis,
        )
        logger.error(
            "HTTP stream: unexpected error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        raise


async def execute_sdk_stream(
    *,
    redis: Redis,
    db: DbSession,
    provider_id: str,
    model_id: str,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
) -> AsyncIterator[bytes]:
    """
    执行 SDK 流式传输
    
    Yields:
        流式响应的 chunk（JSON 格式）
    
    Raises:
        Exception: 错误
    """
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        raise Exception(f"Provider '{provider_id}' is not configured")
    
    driver = get_sdk_driver(provider_cfg)
    if driver is None:
        raise Exception(f"Provider '{provider_id}' 不支持 transport=sdk")
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        raise Exception(str(exc))
    
    logger.info(
        "SDK stream: starting request to provider=%s model=%s driver=%s",
        provider_id,
        model_id,
        driver.name,
    )
    
    # 调用 SDK 流式接口
    try:
        async for chunk_dict in stream_sdk_with_metrics(
            driver=driver,
            api_key=key_selection.key,
            model_id=model_id,
            payload=payload,
            base_url=normalize_base_url(provider_cfg.base_url),
            redis=redis,
            session_id=session_id,
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        ):
            # 将 dict 转换为 JSON bytes
            yield json.dumps(chunk_dict).encode("utf-8") + b"\n"
        
        # 流式传输成功
        record_key_success(key_selection, redis=redis)
        logger.info(
            "SDK stream: completed successfully provider=%s model=%s",
            provider_id,
            model_id,
        )
        
    except Exception as exc:
        # 记录 Key 失败
        record_key_failure(
            key_selection,
            retryable=True,
            status_code=None,
            redis=redis,
        )
        logger.error(
            "SDK stream: error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        raise


async def execute_claude_cli_stream(
    *,
    client: httpx.AsyncClient,
    redis: Redis,
    db: DbSession,
    provider_id: str,
    model_id: str,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
) -> AsyncIterator[bytes]:
    """
    执行 Claude CLI 流式传输
    
    Yields:
        流式响应的 chunk
    
    Raises:
        UpstreamStreamError: 上游错误
        Exception: 其他错误
    """
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        raise Exception(f"Provider '{provider_id}' is not configured")
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        raise Exception(str(exc))
    
    # 构建 Claude CLI 请求
    try:
        claude_cli_headers = build_claude_cli_headers(key_selection.key)
        claude_payload = transform_to_claude_cli_format(
            payload,
            api_key=key_selection.key,
            session_id=session_id,
        )
    except Exception as exc:
        logger.error(
            "Claude CLI stream: failed to build request provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        raise Exception(f"Failed to build Claude CLI request: {exc}")
    
    # 确保流式模式
    claude_payload["stream"] = True
    
    # 构建 URL
    claude_url = f"{str(provider_cfg.base_url).rstrip('/')}/v1/messages?beta=true"
    
    logger.info(
        "Claude CLI stream: starting request to provider=%s model=%s url=%s",
        provider_id,
        model_id,
        claude_url,
    )
    
    # 发送流式请求
    try:
        async for chunk in stream_upstream_with_metrics(
            client=client,
            method="POST",
            url=claude_url,
            headers=claude_cli_headers,
            json_body=claude_payload,
            redis=redis,
            session_id=session_id,
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        ):
            yield chunk
        
        # 流式传输成功
        record_key_success(key_selection, redis=redis)
        logger.info(
            "Claude CLI stream: completed successfully provider=%s model=%s",
            provider_id,
            model_id,
        )
        
    except UpstreamStreamError as err:
        # 记录 Key 失败
        retryable = _is_retryable_status(err.status_code)
        record_key_failure(
            key_selection,
            retryable=retryable,
            status_code=err.status_code,
            redis=redis,
        )
        logger.error(
            "Claude CLI stream: error provider=%s model=%s status=%s retryable=%s",
            provider_id,
            model_id,
            err.status_code,
            retryable,
        )
        raise
    
    except Exception as exc:
        # 其他错误
        record_key_failure(
            key_selection,
            retryable=True,
            status_code=None,
            redis=redis,
        )
        logger.error(
            "Claude CLI stream: unexpected error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        raise


def _is_retryable_status(status_code: int) -> bool:
    """判断状态码是否可重试"""
    # 5xx 服务器错误通常可重试
    if 500 <= status_code < 600:
        return True
    # 429 限流可重试
    if status_code == 429:
        return True
    # 408 请求超时可重试
    if status_code == 408:
        return True
    # 其他 4xx 客户端错误不可重试
    return False


__all__ = [
    "execute_http_stream",
    "execute_sdk_stream",
    "execute_claude_cli_stream",
]
