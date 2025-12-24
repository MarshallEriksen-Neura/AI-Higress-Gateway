from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from app.jwt_auth import AuthenticatedUser
from app.models import APIKey, User
from app.services import chat_app_service, chat_history_service
from tests.utils import InMemoryRedis


@pytest.mark.asyncio
async def test_auto_title_falls_back_to_default_model(db_session, monkeypatch):
    user = db_session.query(User).first()
    api_key = db_session.query(APIKey).first()
    assert user is not None
    assert api_key is not None

    assistant = chat_history_service.create_assistant(
        db_session,
        user_id=user.id,
        project_id=api_key.id,
        name="Test Bot",
        system_prompt="...",
        default_logical_model="test-model",
        title_logical_model=None,
        model_preset={},
    )
    conv = chat_history_service.create_conversation(
        db_session,
        user_id=user.id,
        project_id=api_key.id,
        assistant_id=assistant.id,
        title=None,
    )

    class DummyCtx:
        def __init__(self) -> None:
            self.project_id = api_key.id
            self.api_key = api_key

    monkeypatch.setattr(
        chat_app_service,
        "resolve_project_context",
        lambda db, project_id, current_user: DummyCtx(),
    )
    monkeypatch.setattr(chat_app_service, "ensure_account_usable", lambda db, user_id: None)

    recorded: dict[str, str] = {}

    class DummyHandler:
        def __init__(self, api_key, db, redis, client):  # noqa: D401
            """Stub handler."""

        async def handle(
            self,
            *,
            payload,
            requested_model,
            lookup_model_id,
            api_style,
            effective_provider_ids,
            session_id,
            assistant_id,
            billing_reason,
        ):
            recorded["requested_model"] = requested_model
            recorded["payload_model"] = payload.get("model")
            return SimpleNamespace(
                status_code=200,
                body=json.dumps(
                    {
                        "choices": [
                            {
                                "message": {
                                    "content": "auto title sample",
                                }
                            }
                        ]
                    },
                    ensure_ascii=False,
                ).encode("utf-8"),
            )

    monkeypatch.setattr(chat_app_service, "RequestHandler", DummyHandler)

    current_user = AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        is_active=True,
    )

    await chat_app_service._maybe_auto_title_conversation(
        db_session,
        redis=InMemoryRedis(),
        client=None,
        current_user=current_user,
        conv=conv,
        assistant=assistant,
        effective_provider_ids={"mock"},
        user_text="hello world",
        user_sequence=1,
        requested_model_for_title_fallback="fallback-model",
    )

    db_session.refresh(conv)
    assert conv.title == "auto title sample"
    assert recorded["requested_model"] == "test-model"
    assert recorded["payload_model"] == "test-model"
