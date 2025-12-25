from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient

from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, RunEvent, User
from app.services.chat_history_service import create_user_message, get_conversation
from app.services.chat_run_service import create_run_record
from app.services.run_cancel_service import run_cancel_key


def test_cancel_run_sets_flag_and_appends_events(client: TestClient, db_session):
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

    # Create assistant
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

    # Create conversation
    resp = client.post(
        "/v1/conversations",
        json={"assistant_id": assistant_id, "project_id": str(api_key.id), "title": "test"},
    )
    assert resp.status_code == 201
    conversation_id = resp.json()["conversation_id"]

    # Manually create a user message + queued run
    conv = get_conversation(db_session, conversation_id=UUID(conversation_id), user_id=UUID(str(user.id)))
    user_message = create_user_message(db_session, conversation=conv, content_text="hi")
    run = create_run_record(
        db_session,
        user_id=UUID(str(user.id)),
        api_key_id=UUID(str(api_key.id)),
        message_id=UUID(str(user_message.id)),
        requested_logical_model="test-model",
        request_payload={"model": "test-model", "messages": [{"role": "user", "content": "hi"}]},
        status="queued",
    )

    # Cancel
    resp = client.post(f"/v1/runs/{run.id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["run_id"] == str(run.id)
    assert data["status"] == "canceled"
    assert data["error_code"] == "CANCELED"

    # Redis flag set
    redis = client.app.state._test_redis
    assert redis is not None
    assert redis._data.get(run_cancel_key(run.id)) == "1"

    # RunEvent appended
    events = db_session.query(RunEvent).filter(RunEvent.run_id == run.id).all()
    event_types = {e.event_type for e in events}
    assert "run.canceled" in event_types
    assert "message.failed" in event_types
