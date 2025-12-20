from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import APIKey, Message, User
from app.services import chat_history_service
from tests.utils import jwt_auth_headers


def test_clear_conversation_messages_keeps_conversation(client: TestClient, db_session: Session):
    user = User(email="clear-messages@example.com", username="clear-messages", hashed_password="...")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    api_key = APIKey(user_id=user.id, name="test-key", key_prefix="test", key_hash="...")
    db_session.add(api_key)
    db_session.commit()
    db_session.refresh(api_key)

    headers = jwt_auth_headers(str(user.id))

    assistant = chat_history_service.create_assistant(
        db_session,
        user_id=user.id,
        project_id=api_key.id,
        name="Test Assistant",
        system_prompt="...",
        default_logical_model="gpt-4o",
        title_logical_model=None,
        model_preset={},
    )

    conversation = chat_history_service.create_conversation(
        db_session,
        user_id=user.id,
        project_id=api_key.id,
        assistant_id=assistant.id,
        title="Chat",
    )

    user_msg = chat_history_service.create_user_message(
        db_session, conversation=conversation, content_text="Hello Bot"
    )
    chat_history_service.create_assistant_message_after_user(
        db_session,
        conversation_id=conversation.id,
        user_sequence=user_msg.sequence,
        content_text="Hello Human",
    )
    db_session.refresh(conversation)
    assert conversation.last_message_content == "Hello Human"
    assert conversation.unread_count == 1

    resp = client.delete(f"/v1/conversations/{conversation.id}/messages", headers=headers)
    assert resp.status_code == 204, resp.text

    remaining = (
        db_session.execute(select(Message).where(Message.conversation_id == conversation.id))
        .scalars()
        .all()
    )
    assert remaining == []

    db_session.refresh(conversation)
    assert conversation.last_message_content is None
    assert conversation.unread_count == 0

    resp_list = client.get(f"/v1/conversations/{conversation.id}/messages", headers=headers)
    assert resp_list.status_code == 200, resp_list.text
    assert resp_list.json()["items"] == []

