"""
测试候选 Provider 重试的实时故障标记功能
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.api.v1.chat.candidate_retry import (
    try_candidates_non_stream,
    _get_provider_failure_count,
    _increment_provider_failure,
    _clear_provider_failure,
    FAILURE_KEY_PREFIX,
)
from app.api.v1.chat.transport_handlers import TransportResult
from app.routing.scheduler import CandidateScore
from app.schemas import PhysicalModel


@pytest.fixture
def mock_redis():
    """Mock Redis 客户端"""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.incr = AsyncMock(return_value=1)
    redis.expire = AsyncMock()
    redis.delete = AsyncMock()
    return redis


@pytest.fixture
def mock_candidates():
    """Mock 候选 Provider 列表"""
    return [
        PhysicalModel(
            provider_id="provider-1",
            model_id="model-1",
            endpoint="https://api1.example.com/v1/chat/completions",
            base_weight=1.0,
            updated_at=0.0,
        ),
        PhysicalModel(
            provider_id="provider-2",
            model_id="model-2",
            endpoint="https://api2.example.com/v1/chat/completions",
            base_weight=1.0,
            updated_at=0.0,
        ),
        PhysicalModel(
            provider_id="provider-3",
            model_id="model-3",
            endpoint="https://api3.example.com/v1/chat/completions",
            base_weight=1.0,
            updated_at=0.0,
        ),
    ]


@pytest.fixture
def mock_scored_candidates(mock_candidates):
    """Mock 候选 Provider 列表（带评分包装）"""
    return [CandidateScore(upstream=c, metrics=None, score=1.0) for c in mock_candidates]


@pytest.mark.asyncio
async def test_get_provider_failure_count(mock_redis):
    """测试获取 Provider 故障次数"""
    # 无故障记录
    mock_redis.get.return_value = None
    count = await _get_provider_failure_count(mock_redis, "provider-1")
    assert count == 0
    
    # 有故障记录
    mock_redis.get.return_value = "2"
    count = await _get_provider_failure_count(mock_redis, "provider-1")
    assert count == 2


@pytest.mark.asyncio
async def test_increment_provider_failure(mock_redis):
    """测试增加 Provider 故障次数"""
    mock_redis.incr.return_value = 1
    
    count = await _increment_provider_failure(mock_redis, "provider-1")
    
    assert count == 1
    mock_redis.incr.assert_called_once_with(f"{FAILURE_KEY_PREFIX}provider-1")
    mock_redis.expire.assert_called_once()


@pytest.mark.asyncio
async def test_clear_provider_failure(mock_redis):
    """测试清除 Provider 故障标记"""
    await _clear_provider_failure(mock_redis, "provider-1")
    
    mock_redis.delete.assert_called_once_with(f"{FAILURE_KEY_PREFIX}provider-1")


@pytest.mark.asyncio
async def test_skip_provider_in_cooldown(mock_redis, mock_candidates):
    """测试跳过故障冷却期的 Provider"""
    # provider-1 有 3 次故障（达到阈值）
    async def mock_get(key):
        if key == f"{FAILURE_KEY_PREFIX}provider-1":
            return "3"
        return None
    
    mock_redis.get = mock_get
    
    # Mock 其他依赖
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()
    
    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")
        
        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            # provider-2 成功
            mock_exec.return_value = TransportResult(
                success=True,
                response=MagicMock(),
            )
            
            result = await try_candidates_non_stream(
                candidates=mock_candidates,
                client=mock_client,
                redis=mock_redis,
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
            )
            
            # 应该跳过 provider-1，直接尝试 provider-2
            assert result is not None
            # provider-1 不应该被调用
            calls = [call[1]["provider_id"] for call in mock_exec.call_args_list]
            assert "provider-1" not in calls
            assert "provider-2" in calls


@pytest.mark.asyncio
async def test_mark_failure_on_retryable_error(mock_redis, mock_candidates):
    """测试在可重试错误时标记故障"""
    mock_redis.get.return_value = None
    mock_redis.incr.return_value = 1
    
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()
    
    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")
        
        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            # provider-1 失败（503），provider-2 成功
            mock_exec.side_effect = [
                TransportResult(
                    success=False,
                    status_code=503,
                    error_text="Service Unavailable",
                    retryable=True,
                ),
                TransportResult(
                    success=True,
                    response=MagicMock(),
                ),
            ]
            
            result = await try_candidates_non_stream(
                candidates=mock_candidates[:2],
                client=mock_client,
                redis=mock_redis,
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
            )
            
            # 应该成功返回
            assert result is not None
            
            # provider-1 应该被标记为故障
            mock_redis.incr.assert_called()
            mock_redis.expire.assert_called()


@pytest.mark.asyncio
async def test_clear_failure_on_success(mock_redis, mock_candidates):
    """测试成功时清除故障标记"""
    # provider-1 之前有 2 次故障
    mock_redis.get.return_value = "2"
    
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()
    
    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")
        
        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            # provider-1 成功
            mock_exec.return_value = TransportResult(
                success=True,
                response=MagicMock(),
            )
            
            result = await try_candidates_non_stream(
                candidates=mock_candidates[:1],
                client=mock_client,
                redis=mock_redis,
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
            )
            
            # 应该成功返回
            assert result is not None
            
            # provider-1 的故障标记应该被清除
            mock_redis.delete.assert_called_with(f"{FAILURE_KEY_PREFIX}provider-1")


@pytest.mark.asyncio
async def test_all_providers_in_cooldown(mock_redis, mock_candidates):
    """测试所有 Provider 都在故障冷却期"""
    # 所有 Provider 都有 3 次故障
    async def mock_get(key):
        return "3"
    
    mock_redis.get = mock_get
    
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()
    
    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")
        
        with pytest.raises(HTTPException) as exc_info:
            await try_candidates_non_stream(
                candidates=mock_candidates,
                client=mock_client,
                redis=mock_redis,
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
            )
        
        # 应该抛出 502 错误
        assert exc_info.value.status_code == 502
        assert "skipped=3" in exc_info.value.detail


@pytest.mark.asyncio
async def test_try_candidates_accepts_candidate_score_input(mock_redis, mock_scored_candidates):
    """确保 try_candidates_non_stream() 支持 CandidateScore 输入（与 chat_routes 一致）"""
    mock_redis.get.return_value = None

    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()

    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")

        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            mock_exec.return_value = TransportResult(
                success=True,
                response=MagicMock(),
            )

            result = await try_candidates_non_stream(
                candidates=mock_scored_candidates[:1],
                client=mock_client,
                redis=mock_redis,
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
            )

            assert result is not None
            mock_on_success.assert_awaited_once_with("provider-1", "model-1")
