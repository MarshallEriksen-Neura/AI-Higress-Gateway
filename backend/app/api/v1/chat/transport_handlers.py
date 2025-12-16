"""
传输层处理辅助函数

提取 HTTP/SDK/Claude CLI 三种传输方式的通用逻辑，减少代码重复
"""

import json
from typing import Any, AsyncIterator
from uuid import UUID

import httpx
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.auth import AuthenticatedAPIKey
from app.context_store import save_context
from app.logging_config import logger
from app.provider.config import ProviderConfig, get_provider_config
from app.provider.key_pool import (
    NoAvailableProviderKey,
    SelectedProviderKey,
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
    call_sdk_generate_with_metrics,
    call_upstream_http_with_metrics,
    stream_sdk_with_metrics,
    stream_upstream_with_metrics,
)
from app.upstream import UpstreamStreamError


class TransportResult:
    """传输层执行结果"""
    
    def __init__(
        self,
        success: bool,
        response: JSONResponse | None = None,
        status_code: int | None = None,
        error_text: str | None = None,
        retryable: bool = False,
    ):
        self.success = success
        self.response = response
        self.status_code = status_code
        self.error_text = error_text
        self.retryable = retryable


async def execute_http_transport(
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
) -> TransportResult:
    """
    执行 HTTP 传输（非流式）
    
    返回 TransportResult，调用方根据 success 决定是否重试下一个 Provider
    """
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=f"Provider '{provider_id}' is not configured",
            retryable=False,
        )
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=str(exc),
            retryable=False,
        )
    
    # 构建请求头
    headers = _build_headers(key_selection.key, provider_cfg)
    
    # 准备 payload（使用 provider 的 model_id）
    upstream_payload = dict(payload)
    upstream_payload["model"] = model_id
    
    logger.info(
        "HTTP transport: sending request to provider=%s model=%s url=%s",
        provider_id,
        model_id,
        url,
    )
    
    # 发送请求
    try:
        r = await call_upstream_http_with_metrics(
            client=client,
            url=url,
            headers=headers,
            json_body=upstream_payload,
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        )
    except httpx.HTTPError as exc:
        record_key_failure(key_selection, retryable=True, status_code=None, redis=redis)
        logger.warning(
            "HTTP transport: network error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
        )
        return TransportResult(
            success=False,
            error_text=str(exc),
            retryable=True,
        )
    
    status_code = r.status_code
    text = r.text
    
    logger.info(
        "HTTP transport: response status=%s provider=%s model=%s body_length=%d",
        status_code,
        provider_id,
        model_id,
        len(text or ""),
    )
    
    # 检查是否可重试
    if status_code >= 400:
        retryable = _is_retryable_status(status_code)
        record_key_failure(
            key_selection,
            retryable=retryable,
            status_code=status_code,
            redis=redis,
        )
        
        if retryable:
            logger.warning(
                "HTTP transport: retryable error status=%s provider=%s model=%s",
                status_code,
                provider_id,
                model_id,
            )
            return TransportResult(
                success=False,
                status_code=status_code,
                error_text=text,
                retryable=True,
            )
        else:
            logger.error(
                "HTTP transport: non-retryable error status=%s provider=%s model=%s",
                status_code,
                provider_id,
                model_id,
            )
            return TransportResult(
                success=False,
                status_code=status_code,
                error_text=text,
                retryable=False,
            )
    
    # 成功
    record_key_success(key_selection, redis=redis)
    await save_context(redis, session_id, payload, text)
    
    try:
        content = r.json()
    except ValueError:
        content = {"raw": text}
    
    return TransportResult(
        success=True,
        response=JSONResponse(content=content, status_code=status_code),
    )


async def execute_sdk_transport(
    *,
    redis: Redis,
    db: DbSession,
    provider_id: str,
    model_id: str,
    payload: dict[str, Any],
    logical_model_id: str,
    api_key: AuthenticatedAPIKey,
    session_id: str | None,
) -> TransportResult:
    """执行 SDK 传输（非流式）"""
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=f"Provider '{provider_id}' is not configured",
            retryable=False,
        )
    
    driver = get_sdk_driver(provider_cfg)
    if driver is None:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=f"Provider '{provider_id}' 不支持 transport=sdk",
            retryable=False,
        )
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=str(exc),
            retryable=False,
        )
    
    logger.info(
        "SDK transport: calling provider=%s model=%s driver=%s",
        provider_id,
        model_id,
        driver.name,
    )
    
    # 调用 SDK
    try:
        sdk_payload = await call_sdk_generate_with_metrics(
            driver=driver,
            api_key=key_selection.key,
            model_id=model_id,
            payload=payload,
            base_url=normalize_base_url(provider_cfg.base_url),
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        )
    except Exception as exc:
        record_key_failure(key_selection, retryable=True, status_code=None, redis=redis)
        logger.warning(
            "SDK transport: error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
        )
        return TransportResult(
            success=False,
            error_text=str(exc),
            retryable=True,
        )
    
    # 成功
    record_key_success(key_selection, redis=redis)
    await save_context(redis, session_id, payload, json.dumps(sdk_payload))
    
    return TransportResult(
        success=True,
        response=JSONResponse(content=sdk_payload, status_code=status.HTTP_200_OK),
    )


async def execute_claude_cli_transport(
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
) -> TransportResult:
    """执行 Claude CLI 传输（非流式）"""
    provider_cfg = get_provider_config(provider_id)
    if provider_cfg is None:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=f"Provider '{provider_id}' is not configured",
            retryable=False,
        )
    
    # 获取 API Key
    try:
        key_selection = await acquire_provider_key(provider_cfg, redis)
    except NoAvailableProviderKey as exc:
        return TransportResult(
            success=False,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_text=str(exc),
            retryable=False,
        )
    
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
            "Claude CLI: failed to build request provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        return TransportResult(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_text=f"Failed to build Claude CLI request: {exc}",
            retryable=False,
        )
    
    # 构建 URL
    claude_url = f"{str(provider_cfg.base_url).rstrip('/')}/v1/messages?beta=true"
    
    logger.info(
        "Claude CLI transport: sending request to provider=%s model=%s url=%s",
        provider_id,
        model_id,
        claude_url,
    )
    
    # 发送请求
    try:
        r = await call_upstream_http_with_metrics(
            client=client,
            url=claude_url,
            headers=claude_cli_headers,
            json_body=claude_payload,
            db=db,
            provider_id=provider_id,
            logical_model=logical_model_id,
            user_id=api_key.user_id,
            api_key_id=api_key.id,
        )
    except httpx.HTTPError as exc:
        record_key_failure(key_selection, retryable=True, status_code=None, redis=redis)
        logger.error(
            "Claude CLI: network error provider=%s model=%s error=%s",
            provider_id,
            model_id,
            exc,
            exc_info=True,
        )
        return TransportResult(
            success=False,
            error_text=str(exc),
            retryable=True,
        )
    
    status_code = r.status_code
    text = r.text
    
    logger.info(
        "Claude CLI transport: response status=%s provider=%s model=%s body_length=%d",
        status_code,
        provider_id,
        model_id,
        len(text or ""),
    )
    
    # 检查错误
    if status_code >= 400:
        retryable = _is_retryable_status(status_code)
        record_key_failure(
            key_selection,
            retryable=retryable,
            status_code=status_code,
            redis=redis,
        )
        
        return TransportResult(
            success=False,
            status_code=status_code,
            error_text=text,
            retryable=retryable,
        )
    
    # 成功
    record_key_success(key_selection, redis=redis)
    await save_context(redis, session_id, payload, text)
    
    try:
        content = r.json()
    except ValueError:
        content = {"raw": text}
    
    return TransportResult(
        success=True,
        response=JSONResponse(content=content, status_code=status_code),
    )


def _build_headers(api_key: str, provider_cfg: ProviderConfig) -> dict[str, str]:
    """构建请求头"""
    headers = {"Authorization": f"Bearer {api_key}"}
    if provider_cfg.custom_headers:
        headers.update(provider_cfg.custom_headers)
    return headers


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
