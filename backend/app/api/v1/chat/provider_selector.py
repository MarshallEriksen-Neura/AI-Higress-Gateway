"""
Provider 选择器

负责：
- 构建或加载 LogicalModel
- 筛选可用的 Provider
- 调用调度器选择最优 Provider
- 返回候选列表
"""

from typing import Any

try:
    from redis.asyncio import Redis
except ModuleNotFoundError:
    Redis = object  # type: ignore

from sqlalchemy.orm import Session as DbSession

from app.logging_config import logger
from app.routing.scheduler import CandidateScore, choose_upstream
from app.routing.session_manager import get_session
from app.schemas import LogicalModel, PhysicalModel, RoutingMetrics, Session
from app.storage.redis_service import get_logical_model


class ProviderSelector:
    """Provider 选择器，负责选择最优的 Provider 候选列表"""
    
    def __init__(
        self,
        *,
        redis: Redis,
        db: DbSession,
    ):
        self.redis = redis
        self.db = db
    
    async def select(
        self,
        *,
        logical_model_id: str,
        session_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> list[CandidateScore]:
        """
        选择 Provider 候选列表
        
        Args:
            logical_model_id: 逻辑模型 ID
            session_id: 会话 ID（用于粘性路由）
            payload: 请求 payload（预留，用于未来的动态选择）
        
        Returns:
            候选列表（已按分数排序）
        
        Raises:
            ValueError: 逻辑模型不存在或没有可用的 Provider
        """
        # 1. 加载 LogicalModel
        logical_model = await self._load_logical_model(logical_model_id)
        if logical_model is None:
            raise ValueError(f"Logical model '{logical_model_id}' not found")
        
        # 2. 获取物理模型列表
        upstreams = logical_model.upstreams
        if not upstreams:
            raise ValueError(f"Logical model '{logical_model_id}' has no upstreams")
        
        # 3. 获取 Session（用于粘性路由）
        session: Session | None = None
        if session_id:
            session = await get_session(self.redis, session_id)
            if session:
                logger.info(
                    "📌 Found existing session: conversation_id=%s provider=%s model=%s",
                    session_id,
                    session.provider_id,
                    session.model_id,
                )
        
        # 4. 获取 Provider 指标
        metrics_by_provider = await self._load_metrics(logical_model_id, upstreams)
        
        # 5. 调用调度器选择候选
        strategy = logical_model.strategy
        
        # 从环境变量读取是否启用健康检查
        from app.settings import settings
        enable_health_check = settings.enable_provider_health_check
        
        # 加载动态权重（如果有）
        dynamic_weights = await self._load_dynamic_weights(logical_model_id)
        
        selected, all_candidates = choose_upstream(
            logical_model=logical_model,
            upstreams=upstreams,
            metrics_by_provider=metrics_by_provider,
            strategy=strategy,
            session=session,
            dynamic_weights=dynamic_weights,
            enable_health_check=enable_health_check,
        )
        
        logger.info(
            "🎯 Selected provider: %s/%s (score=%.2f, total_candidates=%d)",
            selected.upstream.provider_id,
            selected.upstream.model_id,
            selected.score,
            len(all_candidates),
        )
        
        return all_candidates
    
    async def _load_logical_model(self, logical_model_id: str) -> LogicalModel | None:
        """从 Redis 加载逻辑模型"""
        return await get_logical_model(self.redis, logical_model_id)
    
    async def _load_metrics(
        self,
        logical_model_id: str,
        upstreams: list[PhysicalModel],
    ) -> dict[str, RoutingMetrics]:
        """加载 Provider 指标"""
        from app.storage.redis_service import get_routing_metrics
        
        metrics_by_provider: dict[str, RoutingMetrics] = {}
        for upstream in upstreams:
            metrics = await get_routing_metrics(self.redis, logical_model_id, upstream.provider_id)
            if metrics:
                metrics_by_provider[upstream.provider_id] = metrics
        
        return metrics_by_provider
    
    async def _load_dynamic_weights(
        self,
        logical_model_id: str,
    ) -> dict[str, float] | None:
        """加载动态权重（如果有）"""
        from app.routing.provider_weight import load_dynamic_weights
        
        try:
            weights = await load_dynamic_weights(self.redis, logical_model_id)
            if weights:
                logger.info(
                    "📊 Loaded dynamic weights for %s: %s",
                    logical_model_id,
                    weights,
                )
            return weights
        except Exception as exc:
            logger.warning(
                "Failed to load dynamic weights for %s: %s",
                logical_model_id,
                exc,
            )
            return None


__all__ = ["ProviderSelector"]
