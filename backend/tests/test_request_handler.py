"""
测试 RequestHandler 模块
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.responses import JSONResponse

from app.api.v1.chat.request_handler import RequestHandler
from app.auth import AuthenticatedAPIKey
from app.routing.scheduler import CandidateScore
from app.schemas import PhysicalModel


@pytest.fixture
def mock_api_key():
    """Mock API Key"""
    from uuid import UUID
    
    return AuthenticatedAPIKey(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        user_id=UUID("00000000-0000-0000-0000-000000000100"),
        user_username="test_user",
        is_superuser=False,
        name="Test API Key",
        is_active=True,
        disabled_reason=None,
        has_provider_restrictions=False,
        allowed_provider_ids=[],
    )


@pytest.fixture
def mock_redis():
    """Mock Redis 客户端"""
    return MagicMock()


@pytest.fixture
def mock_db():
    """Mock 数据库 Session"""
    return MagicMock()


@pytest.fixture
def mock_client():
    """Mock HTTP 客户端"""
    return MagicMock()


@pytest.fixture
def request_handler(mock_api_key, mock_db, mock_redis, mock_client):
    """创建 RequestHandler 实例"""
    return RequestHandler(
        api_key=mock_api_key,
        db=mock_db,
        redis=mock_redis,
        client=mock_client,
    )


@pytest.fixture
def sample_candidates():
    """示例候选列表"""
    from datetime import datetime
    
    return [
        CandidateScore(
            upstream=PhysicalModel(
                provider_id="openai",
                model_id="gpt-4-turbo",
                endpoint="https://api.openai.com/v1/chat/completions",
                base_weight=1.0,
                updated_at=datetime.now().timestamp(),
            ),
            score=0.95,
            metrics=None,
        ),
        CandidateScore(
            upstream=PhysicalModel(
                provider_id="azure",
                model_id="gpt-4",
                endpoint="https://azure.openai.com/v1/chat/completions",
                base_weight=0.8,
                updated_at=datetime.now().timestamp(),
            ),
            score=0.85,
            metrics=None,
        ),
    ]


@pytest.mark.asyncio
async def test_handle_non_stream_success(request_handler, sample_candidates):
    """测试非流式请求成功"""
    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Hello"}],
    }
    
    # Mock 依赖
    with patch.object(request_handler.provider_selector, "select") as mock_select, \
         patch("app.api.v1.chat.request_handler.enforce_request_moderation") as mock_moderation, \
         patch("app.api.v1.chat.request_handler.try_candidates_non_stream") as mock_try_candidates, \
         patch("app.api.v1.chat.request_handler.apply_response_moderation") as mock_apply_moderation, \
         patch("app.api.v1.chat.request_handler.record_completion_usage") as mock_record_usage:
        
        # 设置返回值
        mock_select.return_value = sample_candidates
        mock_moderation.return_value = None
        
        # Mock 成功响应
        success_response = MagicMock()
        success_response.body = b'{"choices": [{"message": {"content": "Hi!"}}]}'
        success_response.status_code = 200
        mock_try_candidates.return_value = success_response
        
        mock_apply_moderation.return_value = {"choices": [{"message": {"content": "Hi!"}}]}
        mock_record_usage.return_value = None
        
        # 执行测试
        result = await request_handler.handle(
            payload=payload,
            logical_model_id="gpt-4",
            session_id="test-session",
            idempotency_key="test-key",
        )
        
        # 验证结果
        assert isinstance(result, JSONResponse)
        mock_select.assert_called_once()
        mock_try_candidates.assert_called_once()


@pytest.mark.asyncio
async def test_handle_non_stream_with_session_binding(request_handler, sample_candidates):
    """测试非流式请求的 Session 绑定"""
    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Hello"}],
    }
    
    # Mock 依赖
    with patch.object(request_handler.provider_selector, "select") as mock_select, \
         patch("app.api.v1.chat.request_handler.enforce_request_moderation") as mock_moderation, \
         patch("app.api.v1.chat.request_handler.try_candidates_non_stream") as mock_try_candidates, \
         patch("app.api.v1.chat.request_handler.apply_response_moderation") as mock_apply_moderation, \
         patch("app.api.v1.chat.request_handler.record_completion_usage") as mock_record_usage, \
         patch.object(request_handler.session_manager, "bind_session") as mock_bind_session:
        
        # 设置返回值
        mock_select.return_value = sample_candidates
        mock_moderation.return_value = None
        
        # Mock 成功响应
        success_response = MagicMock()
        success_response.body = b'{"choices": [{"message": {"content": "Hi!"}}]}'
        success_response.status_code = 200
        
        # 模拟 try_candidates_non_stream 调用 on_success 回调
        async def mock_try_candidates_impl(*args, **kwargs):
            on_success = kwargs.get("on_success")
            if on_success:
                await on_success("openai", "gpt-4-turbo")
            return success_response
        
        mock_try_candidates.side_effect = mock_try_candidates_impl
        mock_apply_moderation.return_value = {"choices": [{"message": {"content": "Hi!"}}]}
        mock_record_usage.return_value = None
        mock_bind_session.return_value = None
        
        # 执行测试
        result = await request_handler.handle(
            payload=payload,
            logical_model_id="gpt-4",
            session_id="test-session",
            idempotency_key="test-key",
        )
        
        # 验证 Session 绑定被调用
        mock_bind_session.assert_called_once_with(
            session_id="test-session",
            logical_model_id="gpt-4",
            provider_id="openai",
            model_id="gpt-4-turbo",
        )


@pytest.mark.asyncio
async def test_handle_stream_success(request_handler, sample_candidates):
    """测试流式请求成功"""
    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Hello"}],
        "stream": True,
    }
    
    # Mock 依赖
    with patch.object(request_handler.provider_selector, "select") as mock_select, \
         patch("app.api.v1.chat.request_handler.enforce_request_moderation") as mock_moderation, \
         patch("app.api.v1.chat.request_handler.try_candidates_stream") as mock_try_stream, \
         patch("app.api.v1.chat.request_handler.apply_response_moderation") as mock_apply_moderation, \
         patch("app.api.v1.chat.request_handler.record_stream_usage") as mock_record_usage, \
         patch("app.context_store.save_context") as mock_save_context:
        
        # 设置返回值
        mock_select.return_value = sample_candidates
        mock_moderation.return_value = None
        mock_record_usage.return_value = None
        mock_save_context.return_value = None
        
        # Mock 流式响应
        async def mock_stream_generator():
            yield b'data: {"choices": [{"delta": {"content": "Hi"}}]}\n\n'
            yield b'data: {"choices": [{"delta": {"content": "!"}}]}\n\n'
            yield b'data: [DONE]\n\n'
        
        mock_try_stream.return_value = mock_stream_generator()
        mock_apply_moderation.side_effect = lambda x, **kwargs: x
        
        # 执行测试
        result_generator = request_handler.handle_stream(
            payload=payload,
            logical_model_id="gpt-4",
            session_id="test-session",
            idempotency_key="test-key",
        )
        
        # 收集所有 chunk
        chunks = []
        async for chunk in result_generator:
            chunks.append(chunk)
        
        # 验证结果
        assert len(chunks) == 3
        mock_select.assert_called_once()
        mock_try_stream.assert_called_once()


@pytest.mark.asyncio
async def test_handle_moderation_blocked(request_handler):
    """测试内容审核阻断"""
    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Sensitive content"}],
    }
    
    # Mock 依赖
    with patch("app.api.v1.chat.request_handler.enforce_request_moderation") as mock_moderation:
        # 模拟审核阻断
        from fastapi import HTTPException
        mock_moderation.side_effect = HTTPException(status_code=400, detail="Content blocked")
        
        # 执行测试，应该抛出异常
        with pytest.raises(HTTPException) as exc_info:
            await request_handler.handle(
                payload=payload,
                logical_model_id="gpt-4",
                session_id=None,
                idempotency_key=None,
            )
        
        assert exc_info.value.status_code == 400
