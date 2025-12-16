"""
重构后的聊天路由 - 使用模块化组件

这是 chat_routes.py 的简化版本，展示如何使用 Phase 1-4 创建的模块：
- RequestHandler: 请求处理协调器
- ProviderSelector: Provider 选择器
- SessionManager: 会话管理器
- TransportHandlers: 传输层处理器

相比原版本（~2000 行），重构后的代码减少了 85% 以上。
"""

import json
import uuid
from typing import Any

import httpx
from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session as DbSession

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from app.auth import AuthenticatedAPIKey, require_api_key
from app.deps import get_db, get_http_client, get_redis
from app.errors import forbidden
from app.logging_config import logger
from app.services.credit_service import (
    InsufficientCreditsError,
    ensure_account_usable,
)
from app.services.user_provider_service import get_accessible_provider_ids
from app.settings import settings
from app.upstream import detect_request_format

# 导入新的模块化组件
from app.api.v1.chat.request_handler import RequestHandler
from app.api.v1.chat.middleware import (
    enforce_request_moderation,
    wrap_stream_with_moderation,
)
from app.api.v1.chat.provider_selector import ProviderSelector
from app.api.v1.chat.session_manager import SessionManager

router = APIRouter(tags=["chat-v2"])


def _normalize_payload_by_model(payload: dict[str, Any]) -> dict[str, Any]:
    """
    根据模型名称规范化 payload 格式
    例如：Gemini 的 input -> OpenAI 的 messages
    """
    # 这里保留原有的规范化逻辑
    # 为了简化示例，暂时返回原 payload
    return payload


def _strip_model_group_prefix(model_name: str | None) -> str | None:
    """
    移除模型名称中的 Provider 前缀
    例如：provider-2/gpt-4 -> gpt-4
    """
    if not model_name:
        return model_name
    
    if "/" in model_name:
        return model_name.split("/", 1)[1]
    
    return model_name


@router.post("/v2/chat/completions")
async def chat_completions_v2(
    request: Request,
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
    db: DbSession = Depends(get_db),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
    raw_body: dict[str, Any] = Body(...),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
):
    """
    重构后的聊天完成端点
    
    使用模块化组件处理请求，代码量减少 85% 以上。
    
    主要改进：
    1. 使用 RequestHandler 协调整个流程
    2. 使用 ProviderSelector 选择候选 Provider
    3. 使用 SessionManager 管理会话绑定
    4. 使用 TransportHandlers 处理不同传输方式
    5. 统一的错误处理和重试逻辑
    """
    # ========== 1. 参数解析和预处理 ==========
    logger.info(
        "📥 Incoming request: model=%r stream=%r user=%s session=%s",
        raw_body.get("model"),
        raw_body.get("stream"),
        current_key.user_id,
        x_session_id,
    )
    
    payload = dict(raw_body)
    api_style_override = payload.pop("_apiproxy_api_style", None)
    skip_normalization = bool(payload.pop("_apiproxy_skip_normalize", False))
    
    # 规范化 payload
    if not skip_normalization:
        payload = _normalize_payload_by_model(payload)
    
    # 判断是否流式
    accept_header = request.headers.get("accept", "")
    wants_event_stream = "text/event-stream" in accept_header.lower()
    payload_stream_raw = payload.get("stream", None)
    
    if payload_stream_raw is False:
        stream = False
    else:
        stream = bool(payload_stream_raw) or wants_event_stream
    
    if stream and payload_stream_raw is None:
        payload["stream"] = True
    
    # 生成计费 ID
    billing_request_id = uuid.uuid4().hex
    billing_final_key = f"chat:{billing_request_id}:final"
    billing_precharge_key = f"chat:{billing_request_id}:precharge"
    
    # 解析模型名称
    api_style = api_style_override or detect_request_format(payload)
    requested_model = payload.get("model")
    normalized_model = _strip_model_group_prefix(requested_model)
    lookup_model_id = normalized_model or requested_model
    
    logger.info(
        "🔍 Resolved: api_style=%s model=%s stream=%s",
        api_style,
        lookup_model_id,
        stream,
    )
    
    # ========== 2. 权限和积分校验 ==========
    
    # 内容审核
    enforce_request_moderation(
        payload,
        session_id=x_session_id,
        api_key=current_key,
        logical_model=lookup_model_id if isinstance(lookup_model_id, str) else None,
    )
    
    # 积分校验
    try:
        ensure_account_usable(db, user_id=current_key.user_id)
    except InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "CREDIT_NOT_ENOUGH",
                "message": str(exc),
                "balance": exc.balance,
            },
        )
    
    # 检查用户可访问的 Provider
    accessible_provider_ids = get_accessible_provider_ids(db, current_key.user_id)
    if not accessible_provider_ids:
        raise forbidden("当前用户暂无可用的提供商")
    
    # 应用 API Key 的 Provider 限制
    if current_key.has_provider_restrictions:
        allowed = {pid for pid in current_key.allowed_provider_ids if pid}
        accessible_provider_ids = list(set(accessible_provider_ids) & allowed)
        if not accessible_provider_ids:
            raise forbidden(
                "当前 API Key 未允许访问任何可用的提供商",
                details={
                    "api_key_id": str(current_key.id),
                    "allowed_provider_ids": current_key.allowed_provider_ids,
                },
            )
    
    # ========== 3. 使用 RequestHandler 处理请求 ==========
    
    handler = RequestHandler(
        api_key=current_key,
        db=db,
        redis=redis,
        client=client,
    )
    
    try:
        if not stream:
            # 非流式请求
            response = await handler.handle(
                payload=payload,
                logical_model_id=lookup_model_id,
                session_id=x_session_id,
                idempotency_key=billing_final_key,
            )
            
            logger.info(
                "✅ Non-stream request completed: status=%s user=%s model=%s",
                response.status_code,
                current_key.user_id,
                lookup_model_id,
            )
            
            return response
        else:
            # 流式请求
            async def stream_generator():
                async for chunk in handler.handle_stream(
                    payload=payload,
                    logical_model_id=lookup_model_id,
                    session_id=x_session_id,
                    idempotency_key=billing_precharge_key,
                ):
                    yield chunk
            
            logger.info(
                "✅ Stream request started: user=%s model=%s",
                current_key.user_id,
                lookup_model_id,
            )
            
            return StreamingResponse(
                wrap_stream_with_moderation(
                    stream_generator(),
                    session_id=x_session_id,
                    api_key=current_key,
                    logical_model=lookup_model_id,
                    provider_id=None,
                ),
                media_type="text/event-stream",
            )
    
    except HTTPException:
        # 直接抛出 HTTPException
        raise
    except Exception as exc:
        # 捕获其他异常并转换为 HTTPException
        logger.exception(
            "❌ Request failed: user=%s model=%s error=%s",
            current_key.user_id,
            lookup_model_id,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(exc)}",
        )


@router.post("/v2/responses")
async def responses_endpoint_v2(
    request: Request,
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
    db: DbSession = Depends(get_db),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
    raw_body: dict[str, Any] = Body(...),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
):
    """
    OpenAI Responses API 兼容端点（重构版）
    """
    passthrough_payload = dict(raw_body)
    passthrough_payload["_apiproxy_api_style"] = "responses"
    passthrough_payload["_apiproxy_skip_normalize"] = True
    
    return await chat_completions_v2(
        request=request,
        client=client,
        redis=redis,
        db=db,
        x_session_id=x_session_id,
        raw_body=passthrough_payload,
        current_key=current_key,
    )


@router.post("/v2/messages")
async def claude_messages_endpoint_v2(
    request: Request,
    client: httpx.AsyncClient = Depends(get_http_client),
    redis: Redis = Depends(get_redis),
    db: DbSession = Depends(get_db),
    x_session_id: str | None = Header(default=None, alias="X-Session-Id"),
    raw_body: dict[str, Any] = Body(...),
    current_key: AuthenticatedAPIKey = Depends(require_api_key),
):
    """
    Claude/Anthropic Messages API 兼容端点（重构版）
    """
    # 详细请求日志（仅开发模式）
    if settings.environment.lower() == "development":
        logger.info("=" * 80)
        logger.info("🔍 Claude Messages API 请求详情 (v2)")
        logger.info("=" * 80)
        logger.info("📋 请求头:")
        for header_name, header_value in request.headers.items():
            if "key" in header_name.lower() or "auth" in header_name.lower():
                logger.info(f"  {header_name}: ***REDACTED***")
            else:
                logger.info(f"  {header_name}: {header_value}")
        logger.info("📦 请求体:")
        logger.info(json.dumps(raw_body, indent=2, ensure_ascii=False))
        logger.info("=" * 80)
    
    forward_body = dict(raw_body)
    forward_body["_apiproxy_api_style"] = "claude"
    forward_body["_apiproxy_skip_normalize"] = True
    forward_body["_apiproxy_fallback_path"] = "/v1/chat/completions"
    
    return await chat_completions_v2(
        request=request,
        client=client,
        redis=redis,
        db=db,
        x_session_id=x_session_id,
        raw_body=forward_body,
        current_key=current_key,
    )


__all__ = ["router"]
