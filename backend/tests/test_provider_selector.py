"""
测试 ProviderSelector 模块
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.v1.chat.provider_selector import ProviderSelector
from app.routing.scheduler import CandidateScore
from app.schemas import LogicalModel, PhysicalModel, RoutingMetrics, Session


@pytest.fixture
def mock_redis():
    """Mock Redis 客户端"""
    return MagicMock()


@pytest.fixture
def mock_db():
    """Mock 数据库 Session"""
    return MagicMock()


@pytest.fixture
def provider_selector(mock_redis, mock_db):
    """创建 ProviderSelector 实例"""
    return ProviderSelector(redis=mock_redis, db=mock_db)


@pytest.fixture
def sample_logical_model():
    """示例逻辑模型"""
    from datetime import datetime
    
    return LogicalModel(
        logical_id="gpt-4",
        display_name="GPT-4",
        description="GPT-4 model",
        capabilities=["chat"],
        upstreams=[
            PhysicalModel(
                provider_id="openai",
                model_id="gpt-4-turbo",
                endpoint="https://api.openai.com/v1/chat/completions",
                base_weight=1.0,
                updated_at=datetime.now().timestamp(),
            ),
            PhysicalModel(
                provider_id="azure",
                model_id="gpt-4",
                endpoint="https://azure.openai.com/v1/chat/completions",
                base_weight=0.8,
                updated_at=datetime.now().timestamp(),
            ),
        ],
        strategy={"name": "balanced"},
        updated_at=datetime.now().timestamp(),
    )


@pytest.mark.asyncio
async def test_select_basic(provider_selector, mock_redis, sample_logical_model):
    """测试基本的 Provider 选择"""
    # Mock 依赖
    with patch.object(provider_selector, "_load_logical_model") as mock_load_model, \
         patch.object(provider_selector, "_load_metrics") as mock_load_metrics, \
         patch.object(provider_selector, "_load_dynamic_weights") as mock_load_weights, \
         patch("app.api.v1.chat.provider_selector.get_session") as mock_get_session, \
         patch("app.api.v1.chat.provider_selector.choose_upstream") as mock_choose:
        
        # 设置返回值
        mock_load_model.return_value = sample_logical_model
        mock_load_metrics.return_value = {}
        mock_load_weights.return_value = None
        mock_get_session.return_value = None
        
        # Mock choose_upstream 返回
        selected = CandidateScore(
            upstream=sample_logical_model.upstreams[0],
            score=0.95,
            metrics=None,
        )
        all_candidates = [
            selected,
            CandidateScore(
                upstream=sample_logical_model.upstreams[1],
                score=0.85,
                metrics=None,
            ),
        ]
        mock_choose.return_value = (selected, all_candidates)
        
        # 执行测试
        result = await provider_selector.select(
            logical_model_id="gpt-4",
            session_id=None,
            payload={"messages": []},
        )
        
        # 验证结果
        assert len(result) == 2
        assert result[0].upstream.provider_id == "openai"
        assert result[0].score == 0.95


@pytest.mark.asyncio
async def test_select_with_session(provider_selector, mock_redis, sample_logical_model):
    """测试带 Session 的 Provider 选择（粘性路由）"""
    # 准备 Session
    from datetime import datetime
    
    now = datetime.now().timestamp()
    existing_session = Session(
        conversation_id="test-session",
        logical_model="gpt-4",
        provider_id="azure",
        model_id="gpt-4",
        created_at=now,
        last_accessed=now,
    )
    
    # Mock 依赖
    with patch.object(provider_selector, "_load_logical_model") as mock_load_model, \
         patch.object(provider_selector, "_load_metrics") as mock_load_metrics, \
         patch.object(provider_selector, "_load_dynamic_weights") as mock_load_weights, \
         patch("app.api.v1.chat.provider_selector.get_session") as mock_get_session, \
         patch("app.api.v1.chat.provider_selector.choose_upstream") as mock_choose:
        
        # 设置返回值
        mock_load_model.return_value = sample_logical_model
        mock_load_metrics.return_value = {}
        mock_load_weights.return_value = None
        mock_get_session.return_value = existing_session
        
        # Mock choose_upstream 返回（应该选择 azure）
        selected = CandidateScore(
            upstream=sample_logical_model.upstreams[1],  # azure
            score=1.0,  # 粘性路由会给更高分数
            metrics=None,
        )
        all_candidates = [
            selected,
            CandidateScore(upstream=sample_logical_model.upstreams[0], score=0.95),
        ]
        mock_choose.return_value = (selected, all_candidates)
        
        # 执行测试
        result = await provider_selector.select(
            logical_model_id="gpt-4",
            session_id="test-session",
            payload={"messages": []},
        )
        
        # 验证结果
        assert len(result) == 2
        assert result[0].upstream.provider_id == "azure"  # 粘性路由选择了 azure
        mock_get_session.assert_called_once_with(mock_redis, "test-session")


@pytest.mark.asyncio
async def test_select_model_not_found(provider_selector):
    """测试逻辑模型不存在的情况"""
    # Mock _load_logical_model 返回 None
    with patch.object(provider_selector, "_load_logical_model") as mock_load_model:
        mock_load_model.return_value = None
        
        # 执行测试，应该抛出异常
        with pytest.raises(ValueError, match="Logical model 'non-existent' not found"):
            await provider_selector.select(
                logical_model_id="non-existent",
                session_id=None,
                payload={"messages": []},
            )


@pytest.mark.asyncio
async def test_select_no_upstreams(provider_selector):
    """测试逻辑模型没有上游的情况"""
    from datetime import datetime
    
    # 创建没有上游的逻辑模型
    empty_model = LogicalModel(
        logical_id="empty-model",
        display_name="Empty Model",
        description="Empty model for testing",
        capabilities=[],
        upstreams=[],
        strategy={"name": "balanced"},
        updated_at=datetime.now().timestamp(),
    )
    
    # Mock _load_logical_model
    with patch.object(provider_selector, "_load_logical_model") as mock_load_model:
        mock_load_model.return_value = empty_model
        
        # 执行测试，应该抛出异常
        with pytest.raises(ValueError, match="has no upstreams"):
            await provider_selector.select(
                logical_model_id="empty-model",
                session_id=None,
                payload={"messages": []},
            )


@pytest.mark.asyncio
async def test_load_metrics(provider_selector, mock_redis, sample_logical_model):
    """测试加载 Provider 指标"""
    # Mock get_routing_metrics (从 app.storage.redis_service 导入)
    with patch("app.storage.redis_service.get_routing_metrics") as mock_get_metrics:
        # 设置返回值
        openai_metrics = RoutingMetrics(
            logical_model="gpt-4",
            provider_id="openai",
            latency_p95_ms=100.0,
            latency_p99_ms=150.0,
            error_rate=0.01,
            success_qps_1m=10.0,
            total_requests_1m=100,
            last_updated=1234567890.0,
            status="healthy",
        )
        azure_metrics = RoutingMetrics(
            logical_model="gpt-4",
            provider_id="azure",
            latency_p95_ms=120.0,
            latency_p99_ms=180.0,
            error_rate=0.02,
            success_qps_1m=8.0,
            total_requests_1m=80,
            last_updated=1234567890.0,
            status="healthy",
        )
        
        async def get_metrics_side_effect(redis, logical_model_id, provider_id):
            assert logical_model_id == "gpt-4"
            if provider_id == "openai":
                return openai_metrics
            elif provider_id == "azure":
                return azure_metrics
            return None
        
        mock_get_metrics.side_effect = get_metrics_side_effect
        
        # 执行测试
        result = await provider_selector._load_metrics("gpt-4", sample_logical_model.upstreams)
        
        # 验证结果
        assert len(result) == 2
        assert result["openai"] == openai_metrics
        assert result["azure"] == azure_metrics
