from __future__ import annotations

import pytest
from uuid import UUID

from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, User
from app.services import chat_app_service


@pytest.mark.asyncio
async def test_create_message_and_queue_baseline_run_enqueues_celery_task(client, db_session, monkeypatch):
    user = db_session.query(User).first()
    api_key = db_session.query(APIKey).first()
    assert user is not None
    assert api_key is not None

    current_user = AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        is_active=True,
    )
    client.app.dependency_overrides[require_jwt_token] = lambda: current_user

    # Create assistant + conversation
    resp = client.post(
        "/v1/assistants",
        json={
            "project_id": str(api_key.id),
            "name": "默认助手",
            "system_prompt": "你是一个测试助手",
            "default_logical_model": "test-model",
        },
    )
    assert resp.status_code == 201
    assistant_id = resp.json()["assistant_id"]

    resp = client.post(
        "/v1/conversations",
        json={"assistant_id": assistant_id, "project_id": str(api_key.id), "title": "test"},
    )
    assert resp.status_code == 201
    conversation_id = UUID(resp.json()["conversation_id"])

    calls: list[tuple[str, list]] = []

    def _fake_send_task(name: str, args=None, kwargs=None, **_):
        calls.append((name, list(args or [])))
        return None

    monkeypatch.setattr("app.celery_app.celery_app.send_task", _fake_send_task)

    redis = client.app.state._test_redis

    message_id, run_id, _assistant_msg_id, _created_payload, _created_seq, _agent_ids = await chat_app_service.create_message_and_queue_baseline_run(
        db_session,
        redis=redis,
        client=None,
        current_user=current_user,
        conversation_id=conversation_id,
        content="hi",
        streaming=False,
        override_logical_model="test-model",
    )

    assert UUID(str(message_id))
    assert UUID(str(run_id))
    assert calls
    assert calls[-1][0] == "tasks.execute_chat_run"
    assert calls[-1][1][0] == str(run_id)

