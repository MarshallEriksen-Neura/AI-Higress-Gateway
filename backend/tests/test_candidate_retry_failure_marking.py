"""
测试候选 Provider 重试的实时故障冷却（通过 RoutingStateService 门面）
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.api.v1.chat.candidate_retry import try_candidates_non_stream
from app.api.v1.chat.routing_state import FailureCooldownStatus, RoutingStateService
from app.api.v1.chat.transport_handlers import TransportResult
from app.routing.scheduler import CandidateScore
from app.schemas import PhysicalModel


@pytest.fixture
def mock_candidates():
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
    return [CandidateScore(upstream=c, metrics=None, score=1.0) for c in mock_candidates]


@pytest.fixture
def mock_routing_state():
    state = MagicMock(spec=RoutingStateService)
    state.get_failure_cooldown_status = AsyncMock(
        side_effect=lambda pid: FailureCooldownStatus(
            provider_id=pid,
            count=0,
            threshold=3,
            cooldown_seconds=60,
            should_skip=False,
        )
    )
    state.increment_provider_failure = AsyncMock(return_value=1)
    state.clear_provider_failure = AsyncMock()
    return state


@pytest.mark.asyncio
async def test_skip_provider_in_cooldown(mock_candidates, mock_routing_state):
    async def _cooldown(pid: str) -> FailureCooldownStatus:
        return FailureCooldownStatus(
            provider_id=pid,
            count=3 if pid == "provider-1" else 0,
            threshold=3,
            cooldown_seconds=60,
            should_skip=pid == "provider-1",
        )

    mock_routing_state.get_failure_cooldown_status.side_effect = _cooldown

    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()

    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")

        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            mock_exec.return_value = TransportResult(success=True, response=MagicMock())

            await try_candidates_non_stream(
                candidates=mock_candidates,
                client=mock_client,
                redis=AsyncMock(),
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
                routing_state=mock_routing_state,
            )

            called_provider_ids = [call.kwargs["provider_id"] for call in mock_exec.call_args_list]
            assert "provider-1" not in called_provider_ids
            assert "provider-2" in called_provider_ids


@pytest.mark.asyncio
async def test_mark_failure_on_retryable_error(mock_candidates, mock_routing_state):
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()

    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")

        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            mock_exec.side_effect = [
                TransportResult(
                    success=False,
                    status_code=503,
                    error_text="Service Unavailable",
                    retryable=True,
                ),
                TransportResult(success=True, response=MagicMock()),
            ]

            await try_candidates_non_stream(
                candidates=mock_candidates[:2],
                client=mock_client,
                redis=AsyncMock(),
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
                routing_state=mock_routing_state,
            )

            mock_routing_state.increment_provider_failure.assert_awaited()


@pytest.mark.asyncio
async def test_clear_failure_on_success(mock_candidates, mock_routing_state):
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()

    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")

        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            mock_exec.return_value = TransportResult(success=True, response=MagicMock())

            await try_candidates_non_stream(
                candidates=mock_candidates[:1],
                client=mock_client,
                redis=AsyncMock(),
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
                routing_state=mock_routing_state,
            )

            mock_routing_state.clear_provider_failure.assert_awaited_once_with("provider-1")


@pytest.mark.asyncio
async def test_all_providers_in_cooldown(mock_candidates, mock_routing_state):
    async def _cooldown(pid: str) -> FailureCooldownStatus:
        return FailureCooldownStatus(
            provider_id=pid,
            count=3,
            threshold=3,
            cooldown_seconds=60,
            should_skip=True,
        )

    mock_routing_state.get_failure_cooldown_status.side_effect = _cooldown

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
                redis=AsyncMock(),
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
                routing_state=mock_routing_state,
            )

        assert exc_info.value.status_code == 502
        assert "skipped=3" in exc_info.value.detail


@pytest.mark.asyncio
async def test_try_candidates_accepts_candidate_score_input(mock_scored_candidates, mock_routing_state):
    mock_client = AsyncMock()
    mock_db = MagicMock()
    mock_api_key = MagicMock()
    mock_api_key.user_id = "user-123"
    mock_api_key.id = "key-123"
    mock_on_success = AsyncMock()

    with patch("app.api.v1.chat.candidate_retry.get_provider_config") as mock_cfg:
        mock_cfg.return_value = MagicMock(transport="http")

        with patch("app.api.v1.chat.candidate_retry.execute_http_transport") as mock_exec:
            mock_exec.return_value = TransportResult(success=True, response=MagicMock())

            await try_candidates_non_stream(
                candidates=mock_scored_candidates[:1],
                client=mock_client,
                redis=AsyncMock(),
                db=mock_db,
                payload={"model": "test"},
                logical_model_id="test-model",
                api_key=mock_api_key,
                session_id=None,
                on_success=mock_on_success,
                routing_state=mock_routing_state,
            )

            mock_on_success.assert_awaited_once_with("provider-1", "model-1")


@pytest.mark.asyncio
async def test_non_retryable_upstream_error_detail_includes_provider_and_request_id(
    mock_candidates, mock_routing_state
):
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
                success=False,
                status_code=429,
                error_text='{"error":{"message":"insufficient_quota"}}',
                retryable=False,
            )

            with pytest.raises(HTTPException) as exc_info:
                await try_candidates_non_stream(
                    candidates=mock_candidates[:1],
                    client=mock_client,
                    redis=AsyncMock(),
                    db=mock_db,
                    payload={"model": "test"},
                    logical_model_id="test-model",
                    api_key=mock_api_key,
                    session_id=None,
                    on_success=mock_on_success,
                    routing_state=mock_routing_state,
                    request_id="rid_123",
                )

            assert exc_info.value.status_code == 502
            assert "provider=provider-1" in exc_info.value.detail
            assert "upstream_status=429" in exc_info.value.detail
            assert "request_id=rid_123" in exc_info.value.detail
            assert "insufficient_quota" in exc_info.value.detail
