"""
测试 RequestHandler（v2）
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.api.v1.chat.provider_selector import ProviderSelectionResult
from app.api.v1.chat.request_handler import RequestHandler
from app.auth import AuthenticatedAPIKey
from app.routing.scheduler import CandidateScore
from app.schemas import LogicalModel, PhysicalModel


@pytest.fixture
def mock_api_key():
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
def request_handler(mock_api_key):
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock()
    redis.delete = AsyncMock()
    return RequestHandler(
        api_key=mock_api_key,
        db=MagicMock(),
        redis=redis,
        client=AsyncMock(),
    )


@pytest.fixture
def selection_result():
    from datetime import datetime

    now = datetime.now().timestamp()
    upstream1 = PhysicalModel(
        provider_id="openai",
        model_id="gpt-4-turbo",
        endpoint="https://api.example.com/v1/chat/completions",
        base_weight=1.0,
        updated_at=now,
    )
    upstream2 = PhysicalModel(
        provider_id="azure",
        model_id="gpt-4",
        endpoint="https://api.example.com/v1/chat/completions",
        base_weight=0.8,
        updated_at=now,
    )
    selected = CandidateScore(upstream=upstream1, score=1.0, metrics=None)
    scored = [
        selected,
        CandidateScore(upstream=upstream2, score=0.9, metrics=None),
    ]
    logical_model = LogicalModel(
        logical_id="gpt-4",
        display_name="GPT-4",
        description="desc",
        capabilities=["chat"],
        upstreams=[upstream1, upstream2],
        strategy={"name": "balanced"},
        updated_at=now,
    )
    return ProviderSelectionResult(
        logical_model=logical_model,
        ordered_candidates=scored,
        scored_candidates=scored,
        base_weights={"openai": 1.0, "azure": 0.8},
    )


@pytest.mark.asyncio
async def test_handle_non_stream_success(request_handler, selection_result):
    payload = {"model": "gpt-4", "messages": [{"role": "user", "content": "hi"}]}

    with patch.object(request_handler.provider_selector, "select") as mock_select, patch(
        "app.api.v1.chat.request_handler.try_candidates_non_stream"
    ) as mock_try, patch(
        "app.api.v1.chat.request_handler.apply_response_moderation"
    ) as mock_moderate, patch(
        "app.api.v1.chat.request_handler.record_completion_usage"
    ) as mock_bill, patch(
        "app.api.v1.chat.request_handler.RoutingStateService.record_success"
    ) as mock_record_success:
        mock_select.return_value = selection_result

        upstream_resp = MagicMock()
        upstream_resp.body = b'{"choices":[{"message":{"content":"ok"}}]}'
        upstream_resp.status_code = 200

        async def _try_impl(*_a, **kwargs):
            on_success = kwargs.get("on_success")
            if on_success:
                await on_success("openai", "gpt-4-turbo")
            return upstream_resp

        mock_try.side_effect = _try_impl
        mock_moderate.return_value = {"choices": [{"message": {"content": "ok"}}]}

        resp = await request_handler.handle(
            payload=payload,
            requested_model="gpt-4",
            lookup_model_id="gpt-4",
            api_style="openai",
            effective_provider_ids={"openai"},
            session_id="s1",
            idempotency_key="k1",
        )

        assert isinstance(resp, JSONResponse)
        assert mock_moderate.call_args.kwargs.get("session_id") == "s1"
        mock_select.assert_called_once()
        mock_record_success.assert_called_once()
        mock_bill.assert_called_once()


@pytest.mark.asyncio
async def test_handle_non_stream_moderation_blocks(request_handler, selection_result):
    payload = {"model": "gpt-4", "messages": [{"role": "user", "content": "hi"}]}

    with patch.object(request_handler.provider_selector, "select") as mock_select, patch(
        "app.api.v1.chat.request_handler.try_candidates_non_stream"
    ) as mock_try, patch(
        "app.api.v1.chat.request_handler.apply_response_moderation"
    ) as mock_moderate:
        mock_select.return_value = selection_result

        upstream_resp = MagicMock()
        upstream_resp.body = b'{"choices":[{"message":{"content":"ok"}}]}'
        upstream_resp.status_code = 200

        mock_try.return_value = upstream_resp
        mock_moderate.side_effect = HTTPException(status_code=400, detail="blocked")

        with pytest.raises(HTTPException):
            await request_handler.handle(
                payload=payload,
                requested_model="gpt-4",
                lookup_model_id="gpt-4",
                api_style="openai",
                effective_provider_ids={"openai"},
                session_id=None,
                idempotency_key="k1",
            )
        assert mock_moderate.call_args.kwargs.get("session_id") is None


@pytest.mark.asyncio
async def test_handle_stream_yields_chunks(request_handler, selection_result):
    payload = {"model": "gpt-4", "messages": [{"role": "user", "content": "hi"}], "stream": True}

    async def _gen():
        yield b"data: 1\n\n"
        yield b"data: [DONE]\n\n"

    with patch.object(request_handler.provider_selector, "select") as mock_select, patch(
        "app.api.v1.chat.request_handler.try_candidates_stream"
    ) as mock_try, patch(
        "app.api.v1.chat.request_handler.record_stream_usage"
    ) as mock_bill:
        mock_select.return_value = selection_result
        mock_try.return_value = _gen()

        out = []
        async for chunk in request_handler.handle_stream(
            payload=payload,
            requested_model="gpt-4",
            lookup_model_id="gpt-4",
            api_style="openai",
            effective_provider_ids={"openai"},
            session_id="s1",
            idempotency_key="k2",
        ):
            out.append(chunk)

        assert out == [b"data: 1\n\n", b"data: [DONE]\n\n"]
        mock_bill.assert_called_once()
