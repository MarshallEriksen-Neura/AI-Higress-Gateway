from __future__ import annotations
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from app.api.v1.chat.provider_selector import ProviderSelector
from app.api.v1.chat.routing_state import RoutingStateService
from app.schemas import LogicalModel, PhysicalModel, ProviderStatus
from app.provider.health import HealthStatus

@pytest.fixture
def mock_client():
    return AsyncMock()

@pytest.fixture
def mock_redis():
    return AsyncMock()

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def provider_selector(mock_client, mock_redis, mock_db):
    routing_state = MagicMock(spec=RoutingStateService)
    routing_state.get_cached_health_status = AsyncMock(return_value=None)
    # Mock load_disabled_pairs default to empty set
    provider_selector = ProviderSelector(
        client=mock_client, redis=mock_redis, db=mock_db, routing_state=routing_state
    )
    provider_selector._load_disabled_pairs = MagicMock(return_value=set())
    return provider_selector

@pytest.fixture
def sample_logical_model():
    from datetime import datetime
    now = datetime.now().timestamp()
    return LogicalModel(
        logical_id="model-a",
        display_name="Model A",
        description="A model",
        capabilities=["chat"],
        upstreams=[
            PhysicalModel(
                provider_id="prov-1",
                model_id="model-a-1",
                endpoint="http://p1",
                base_weight=1.0,
                updated_at=now,
                api_style="openai"
            ),
            PhysicalModel(
                provider_id="prov-2",
                model_id="model-a-2",
                endpoint="http://p2",
                base_weight=1.0,
                updated_at=now,
                api_style="openai"
            ),
        ],
        strategy={"name": "balanced"},
        updated_at=now,
        enabled=True
    )

@pytest.mark.asyncio
async def test_check_candidate_availability(provider_selector, sample_logical_model):
    # Setup
    with patch.object(provider_selector, "_resolve_logical_model") as mock_resolve, \
         patch("app.api.v1.chat.provider_selector.select_candidate_upstreams") as mock_select_upstreams, \
         patch("app.api.v1.chat.provider_selector.settings") as mock_settings:
        
        mock_settings.enable_provider_health_check = True
        mock_resolve.return_value = sample_logical_model
        mock_select_upstreams.return_value = list(sample_logical_model.upstreams)
        
        # Test 1: All available
        provider_selector.routing_state.get_cached_health_status.return_value = None
        
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1", "prov-2"}
        )
        assert available == ["model-a"]

        # Test 2: One provider restricted (but model still available via another)
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1"}
        )
        assert available == ["model-a"]

        # Test 3: All providers restricted
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-3"}
        )
        assert available == []

        # Test 4: One provider down (but model still available via another)
        # Note: side_effect overrides return_value
        def health_side_effect(pid):
             if pid == "prov-1":
                 return HealthStatus(provider_id="prov-1", status=ProviderStatus.DOWN, timestamp=0, error_message=None)
             return None
        
        provider_selector.routing_state.get_cached_health_status.side_effect = health_side_effect

        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1", "prov-2"}
        )
        assert available == ["model-a"]
        provider_selector.routing_state.get_cached_health_status.side_effect = None

        # Test 5: All providers down
        provider_selector.routing_state.get_cached_health_status.return_value = HealthStatus(provider_id="dummy", status=ProviderStatus.DOWN, timestamp=0, error_message=None)
        
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1", "prov-2"}
        )
        assert available == []
        provider_selector.routing_state.get_cached_health_status.return_value = None

        # Test 6: Disabled pair
        provider_selector._load_disabled_pairs.return_value = {("prov-1", "model-a-1")}
        
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1"} # Only prov-1 allowed, but disabled
        )
        assert available == []
        
        # Test 7: Disabled pair (but other provider available)
        available = await provider_selector.check_candidate_availability(
            candidate_logical_models=["model-a"],
            effective_provider_ids={"prov-1", "prov-2"}
        )
        assert available == ["model-a"]
