"""
请求处理协调器

负责：
- 协调整个请求处理流程
- 根据传输方式选择对应的 Transport
- 处理重试逻辑
- 统一错误处理
"""

from typing import Any

import httpx
from fastapi.responses import JSONResponse

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.api.v1.chat.billing import record_completion_usage, record_stream_usage
from app.api.v1.chat.candidate_retry import (
    try_candidates_non_stream,
    try_candidates_stream,
)
from app.api.v1.chat.middleware import (
    apply_response_moderation,
    enforce_request_moderation,
)
from app.api.v1.chat.provider_selector import ProviderSelector
from app.api.v1.chat.session_manager import SessionManager
from app.auth import AuthenticatedAPIKey
from app.logging_config import logger


class RequestHandler:
    """请求处理协调器，负责协调整个请求处理流程"""
    
    def __init__(
        self,
        *,
        api_key: AuthenticatedAPIKey,
        db: DbSession,
        redis: Redis,
        client: httpx.AsyncClient,
    ):
        self.api_key = api_key
        self.db = db
        self.redis = redis
        self.client = client
        
        # 初始化子模块
        self.provider_selector = ProviderSelector(redis=redis, db=db)
        self.session_manager = SessionManager(redis=redis)
    
    async def handle(
        self,
        *,
        payload: dict[str, Any],
        logical_model_id: str,
        session_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> JSONResponse:
        """
        处理非流式请求
        
        Args:
            payload: 请求 payload
            logical_model_id: 逻辑模型 ID
            session_id: 会话 ID（可选）
            idempotency_key: 幂等性 key（可选）
        
        Returns:
            JSONResponse
        
        Raises:
            HTTPException: 请求失败时抛出
        """
        # 1. 内容审核
        enforce_request_moderation(
            payload,
            session_id=session_id,
            api_key=self.api_key,
            logical_model=logical_model_id,
        )
        
        logger.info(
            "🚀 Handling non-stream request: user=%s logical_model=%s session_id=%s",
            self.api_key.user_id,
            logical_model_id,
            session_id,
        )
        
        # 2. 选择 Provider 候选列表
        candidates = await self.provider_selector.select(
            logical_model_id=logical_model_id,
            session_id=session_id,
            payload=payload,
        )
        
        # 3. 定义成功回调（用于记录指标、绑定 Session、计费）
        async def on_success(provider_id: str, model_id: str) -> None:
            # 3.1 绑定 Session
            if session_id:
                await self.session_manager.bind_session(
                    session_id=session_id,
                    logical_model_id=logical_model_id,
                    provider_id=provider_id,
                    model_id=model_id,
                )
            
            logger.info(
                "✅ Request succeeded: provider=%s model=%s",
                provider_id,
                model_id,
            )
        
        # 4. 遍历候选列表，执行请求
        response = await try_candidates_non_stream(
            candidates=candidates,
            client=self.client,
            redis=self.redis,
            db=self.db,
            payload=payload,
            logical_model_id=logical_model_id,
            api_key=self.api_key,
            session_id=session_id,
            on_success=on_success,
        )
        
        # 5. 响应内容审核
        content = response.body.decode("utf-8")
        try:
            import json
            content_dict = json.loads(content)
        except Exception:
            content_dict = {"raw": content}
        
        moderated_content = apply_response_moderation(
            content_dict,
            session_id=session_id,
            api_key=self.api_key,
            logical_model=logical_model_id,
            provider_id=None,  # 由 try_candidates_non_stream 内部处理
            status_code=response.status_code,
        )
        
        # 6. 计费（异步）
        record_completion_usage(
            self.db,
            user_id=self.api_key.user_id,
            api_key_id=self.api_key.id,
            logical_model_name=logical_model_id,
            provider_id=None,  # 由 try_candidates_non_stream 内部处理
            provider_model_id=None,
            response_payload=moderated_content,
            request_payload=payload,
            is_stream=False,
            idempotency_key=idempotency_key,
        )
        
        logger.info(
            "🎉 Request completed: user=%s logical_model=%s status=%s",
            self.api_key.user_id,
            logical_model_id,
            response.status_code,
        )
        
        return JSONResponse(
            content=moderated_content,
            status_code=response.status_code,
        )
    
    async def handle_stream(
        self,
        *,
        payload: dict[str, Any],
        logical_model_id: str,
        session_id: str | None = None,
        idempotency_key: str | None = None,
    ):
        """
        处理流式请求
        
        Args:
            payload: 请求 payload
            logical_model_id: 逻辑模型 ID
            session_id: 会话 ID（可选）
            idempotency_key: 幂等性 key（可选）
        
        Returns:
            AsyncIterator[bytes]: 流式响应的迭代器
        
        Raises:
            HTTPException: 请求失败时抛出
        """
        # 1. 内容审核
        enforce_request_moderation(
            payload,
            session_id=session_id,
            api_key=self.api_key,
            logical_model=logical_model_id,
        )
        
        logger.info(
            "🚀 Handling stream request: user=%s logical_model=%s session_id=%s",
            self.api_key.user_id,
            logical_model_id,
            session_id,
        )
        
        # 2. 预扣费
        record_stream_usage(
            self.db,
            user_id=self.api_key.user_id,
            api_key_id=self.api_key.id,
            logical_model_name=logical_model_id,
            provider_id=None,  # 暂时为 None，后续可以优化
            provider_model_id=None,
            payload=payload,
            idempotency_key=idempotency_key,
        )
        
        # 3. 选择 Provider 候选列表
        candidates = await self.provider_selector.select(
            logical_model_id=logical_model_id,
            session_id=session_id,
            payload=payload,
        )
        
        # 4. 定义首个 chunk 回调（用于绑定 Session）
        async def on_first_chunk(provider_id: str, model_id: str) -> None:
            # 绑定 Session
            if session_id:
                await self.session_manager.bind_session(
                    session_id=session_id,
                    logical_model_id=logical_model_id,
                    provider_id=provider_id,
                    model_id=model_id,
                )
            
            logger.info(
                "✅ Stream started: provider=%s model=%s",
                provider_id,
                model_id,
            )
        
        # 5. 遍历候选列表，执行流式请求
        async for chunk in try_candidates_stream(
            candidates=candidates,
            client=self.client,
            redis=self.redis,
            db=self.db,
            payload=payload,
            logical_model_id=logical_model_id,
            api_key=self.api_key,
            session_id=session_id,
            on_first_chunk=on_first_chunk,
        ):
            # 应用内容审核（如果启用）
            moderated_chunk = apply_response_moderation(
                chunk.decode("utf-8", errors="ignore"),
                session_id=session_id,
                api_key=self.api_key,
                logical_model=logical_model_id,
                provider_id=None,  # 由 try_candidates_stream 内部处理
                status_code=None,
            )
            
            # 如果审核后的内容是字符串，重新编码
            if isinstance(moderated_chunk, str):
                yield moderated_chunk.encode("utf-8")
            else:
                yield chunk
        
        logger.info(
            "🎉 Stream completed: user=%s logical_model=%s",
            self.api_key.user_id,
            logical_model_id,
        )


__all__ = ["RequestHandler"]
