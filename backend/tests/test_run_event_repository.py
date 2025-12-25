from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import APIKey, User
from app.repositories.run_event_repository import append_run_event, list_run_events
from app.services.chat_history_service import create_assistant, create_conversation, create_user_message
from app.services.chat_run_service import create_run_record


def _seed_user_and_project(db: Session) -> tuple[UUID, UUID]:
    user = db.execute(select(User).limit(1)).scalars().first()
    api_key = db.execute(select(APIKey).limit(1)).scalars().first()
    assert user is not None
    assert api_key is not None
    return UUID(str(user.id)), UUID(str(api_key.id))


def test_append_run_event_allocates_monotonic_seq(db_session: Session) -> None:
    user_id, project_id = _seed_user_and_project(db_session)

    assistant = create_assistant(
        db_session,
        user_id=user_id,
        project_id=project_id,
        name="test-assistant",
        system_prompt="",
        default_logical_model="gpt-test",
        model_preset=None,
    )
    conv = create_conversation(
        db_session,
        user_id=user_id,
        project_id=project_id,
        assistant_id=UUID(str(assistant.id)),
        title=None,
    )
    msg = create_user_message(db_session, conversation=conv, content_text="hello")
    run = create_run_record(
        db_session,
        user_id=user_id,
        api_key_id=project_id,
        message_id=UUID(str(msg.id)),
        requested_logical_model="gpt-test",
        request_payload={"model": "gpt-test", "messages": [{"role": "user", "content": "hello"}]},
    )

    ev1 = append_run_event(db_session, run_id=UUID(str(run.id)), event_type="message.created", payload={"a": 1})
    ev2 = append_run_event(db_session, run_id=UUID(str(run.id)), event_type="tool.status", payload={"b": 2})

    assert int(ev1.seq) == 1
    assert int(ev2.seq) == 2
    assert ev1.event_type == "message.created"
    assert ev2.event_type == "tool.status"

    items = list_run_events(db_session, run_id=UUID(str(run.id)))
    assert [int(it.seq) for it in items] == [1, 2]


def test_list_run_events_after_seq(db_session: Session) -> None:
    user_id, project_id = _seed_user_and_project(db_session)

    assistant = create_assistant(
        db_session,
        user_id=user_id,
        project_id=project_id,
        name="test-assistant-2",
        system_prompt="",
        default_logical_model="gpt-test",
        model_preset=None,
    )
    conv = create_conversation(
        db_session,
        user_id=user_id,
        project_id=project_id,
        assistant_id=UUID(str(assistant.id)),
        title=None,
    )
    msg = create_user_message(db_session, conversation=conv, content_text="hello")
    run = create_run_record(
        db_session,
        user_id=user_id,
        api_key_id=project_id,
        message_id=UUID(str(msg.id)),
        requested_logical_model="gpt-test",
        request_payload={"model": "gpt-test", "messages": [{"role": "user", "content": "hello"}]},
    )

    append_run_event(db_session, run_id=UUID(str(run.id)), event_type="e1", payload={})
    append_run_event(db_session, run_id=UUID(str(run.id)), event_type="e2", payload={})
    append_run_event(db_session, run_id=UUID(str(run.id)), event_type="e3", payload={})

    items = list_run_events(db_session, run_id=UUID(str(run.id)), after_seq=1)
    assert [it.event_type for it in items] == ["e2", "e3"]

