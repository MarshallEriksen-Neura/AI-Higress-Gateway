from __future__ import annotations

import asyncio

from fastapi.testclient import TestClient

from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, User
from app.services.request_log_service import append_request_log, build_request_log_entry


def test_list_request_logs_returns_recent_items(client: TestClient, db_session):
    user = db_session.query(User).first()
    api_key = db_session.query(APIKey).first()
    assert user is not None
    assert api_key is not None

    client.app.dependency_overrides[require_jwt_token] = lambda: AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        is_active=True,
    )

    redis = client.app.state._test_redis
    assert redis is not None

    entry1 = build_request_log_entry(
        request_id="r1",
        user_id=str(user.id),
        api_key_id=str(api_key.id),
        method="POST",
        path="/v1/chat/completions",
        logical_model="test-model",
        requested_model="test-model",
        api_style="openai",
        is_stream=False,
        status_code=502,
        latency_ms=123,
        selected_provider_id="p1",
        selected_provider_model="m1",
        upstream_status=429,
        error_message="insufficient_quota",
        attempts=[{"idx": 0, "provider_id": "p1", "model_id": "m1", "success": False}],
    )
    entry2 = build_request_log_entry(
        request_id="r2",
        user_id=str(user.id),
        api_key_id=str(api_key.id),
        method="POST",
        path="/v1/chat/completions",
        logical_model="test-model",
        requested_model="test-model",
        api_style="openai",
        is_stream=False,
        status_code=200,
        latency_ms=50,
        selected_provider_id="p2",
        selected_provider_model="m2",
        upstream_status=200,
        error_message=None,
        attempts=[{"idx": 0, "provider_id": "p2", "model_id": "m2", "success": True}],
    )

    asyncio.run(append_request_log(redis, user_id=str(user.id), entry=entry1))
    asyncio.run(append_request_log(redis, user_id=str(user.id), entry=entry2))

    resp = client.get("/v1/request-logs?limit=1&offset=0")
    assert resp.status_code == 200
    payload = resp.json()
    assert isinstance(payload.get("items"), list)
    assert payload["items"][0]["request_id"] == "r2"

    resp2 = client.get("/v1/request-logs?limit=1&offset=1")
    assert resp2.status_code == 200
    payload2 = resp2.json()
    assert payload2["items"][0]["request_id"] == "r1"

