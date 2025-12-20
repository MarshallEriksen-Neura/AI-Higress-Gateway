from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from app.deps import get_http_client, get_redis
from app.models import User
from tests.utils import InMemoryRedis, jwt_auth_headers


def _get_single_user(session) -> User:
    user = session.query(User).first()
    assert user is not None
    return user


def test_user_probe_task_crud_and_run(client: TestClient, db_session, monkeypatch):
    user = _get_single_user(db_session)
    user_id = str(user.id)
    headers = jwt_auth_headers(user_id)

    # Override Redis dependency to avoid requiring a real Redis server.
    async def _fake_redis():
        return InMemoryRedis()

    client.app.dependency_overrides[get_redis] = _fake_redis

    # 1) Create a private provider (no upstream call required).
    payload = {
        "name": "My Provider",
        "base_url": "http://upstream.test",
        "api_key": "sk-test",
        "provider_type": "native",
        "transport": "http",
        "chat_completions_path": "/v1/chat/completions",
    }
    resp = client.post(f"/users/{user_id}/private-providers", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    provider_id = resp.json()["provider_id"]

    # 2) Create a probe task.
    task_payload = {
        "name": "probe-1",
        "model_id": "gpt-3.5-turbo",
        "prompt": "ping",
        "interval_seconds": 300,
        "max_tokens": 8,
        "api_style": "openai",
        # 默认不启用调度任务，仍允许“运行一次”做即时连通性检查。
        "enabled": False,
    }
    resp = client.post(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks",
        json=task_payload,
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    task_id = resp.json()["id"]
    assert resp.json()["enabled"] is False

    # 3) List tasks.
    resp = client.get(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks",
        headers=headers,
    )
    assert resp.status_code == 200
    tasks = resp.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_id

    # 4) Patch upstream chat call for "run now".
    def _handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "pong"}}]},
        )

    transport = httpx.MockTransport(_handler)
    async def _fake_http_client():
        async with httpx.AsyncClient(transport=transport, timeout=30.0) as upstream_client:
            yield upstream_client

    client.app.dependency_overrides[get_http_client] = _fake_http_client

    resp = client.post(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks/{task_id}/run",
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    run = resp.json()
    assert run["success"] is True
    assert run["response_text"] == "pong"

    # 5) Task should remain disabled, without next_run_at, but should have last_run_at.
    resp = client.get(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks",
        headers=headers,
    )
    assert resp.status_code == 200
    tasks = resp.json()
    assert tasks[0]["enabled"] is False
    assert tasks[0]["next_run_at"] is None
    assert tasks[0]["last_run_at"] is not None
    assert tasks[0]["last_run"]["id"] == run["id"]

    # 6) List runs.
    resp = client.get(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks/{task_id}/runs?limit=10",
        headers=headers,
    )
    assert resp.status_code == 200
    runs = resp.json()
    assert len(runs) == 1
    assert runs[0]["id"] == run["id"]

    # 7) Enable task.
    resp = client.put(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks/{task_id}",
        json={"enabled": True},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True
    assert resp.json()["next_run_at"] is not None

    # 8) Delete task.
    resp = client.delete(
        f"/users/{user_id}/private-providers/{provider_id}/probe-tasks/{task_id}",
        headers=headers,
    )
    assert resp.status_code == 204


@pytest.fixture(autouse=True)
def _clear_overrides(client: TestClient):
    yield
    client.app.dependency_overrides.pop(get_redis, None)
    client.app.dependency_overrides.pop(get_http_client, None)
