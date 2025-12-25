from __future__ import annotations

import asyncio
import json
import time
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.assistant_routes import stream_run_events_endpoint
from app.jwt_auth import AuthenticatedUser, require_jwt_token
from app.models import APIKey, User
from app.repositories.run_event_repository import append_run_event
from app.services.chat_history_service import create_assistant, create_conversation, create_user_message
from app.services.chat_run_service import create_run_record
from app.services.run_event_bus import build_run_event_envelope, run_event_channel


def _seed_user_and_project(db: Session) -> tuple[UUID, UUID, str, str]:
    user = db.execute(select(User).limit(1)).scalars().first()
    api_key = db.execute(select(APIKey).limit(1)).scalars().first()
    assert user is not None
    assert api_key is not None
    return UUID(str(user.id)), UUID(str(api_key.id)), user.username, user.email


def test_run_events_endpoint_replays_db_and_streams_redis(client: TestClient, db_session: Session) -> None:
    user_id, project_id, username, email = _seed_user_and_project(db_session)

    client.app.dependency_overrides[require_jwt_token] = lambda: AuthenticatedUser(
        id=str(user_id),
        username=username,
        email=email,
        is_superuser=True,
        is_active=True,
    )

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

    ev1 = append_run_event(db_session, run_id=UUID(str(run.id)), event_type="message.created", payload={"type": "message.created"})
    ev2 = append_run_event(db_session, run_id=UUID(str(run.id)), event_type="message.completed", payload={"type": "message.completed"})
    assert int(ev1.seq) == 1
    assert int(ev2.seq) == 2

    redis = getattr(client.app.state, "_test_redis", None)
    assert redis is not None

    class _DummyRequest:
        async def is_disconnected(self) -> bool:
            return False

    async def _collect() -> list[dict]:
        response = await stream_run_events_endpoint(
            run_id=UUID(str(run.id)),
            request=_DummyRequest(),  # type: ignore[arg-type]
            after_seq=0,
            limit=200,
            db=db_session,
            redis=redis,
            current_user=AuthenticatedUser(
                id=str(user_id),
                username=username,
                email=email,
                is_superuser=True,
                is_active=True,
            ),
        )

        iterator = response.body_iterator  # type: ignore[attr-defined]
        buffer = b""
        seen: list[dict] = []
        published = False

        try:
            while True:
                try:
                    chunk = await asyncio.wait_for(iterator.__anext__(), timeout=3.0)  # type: ignore[misc]
                except StopAsyncIteration:
                    break
                except asyncio.TimeoutError:
                    raise AssertionError(f"run events SSE stream did not produce expected events in time, seen={seen!r}")

                if not chunk:
                    continue
                buffer += chunk if isinstance(chunk, (bytes, bytearray)) else str(chunk).encode("utf-8")

                while b"\n\n" in buffer:
                    frame, buffer = buffer.split(b"\n\n", 1)
                    lines = frame.decode("utf-8", errors="ignore").splitlines()
                    data_lines = [ln[len("data:") :].strip() for ln in lines if ln.startswith("data:")]
                    if not data_lines:
                        continue
                    data_str = "\n".join(data_lines).strip()
                    if not data_str or data_str == "[DONE]":
                        continue
                    try:
                        obj = json.loads(data_str)
                    except Exception:
                        continue
                    if not isinstance(obj, dict):
                        continue
                    seen.append(obj)

                    if obj.get("type") == "replay.done" and not published:
                        published = True
                        env = build_run_event_envelope(
                            run_id=run.id,
                            seq=3,
                            event_type="tool.status",
                            created_at_iso=None,
                            payload={"type": "tool.status", "state": "running"},
                        )
                        # 该 endpoint 会在 replay 前就建立订阅，因此此处可以立即发布，消息不会丢失。
                        await redis.publish(
                            run_event_channel(run_id=run.id),
                            json.dumps(env, ensure_ascii=False),
                        )

                    if obj.get("event_type") == "tool.status":
                        return seen
        finally:
            try:
                await iterator.aclose()
            except Exception:
                pass

        raise AssertionError(f"run events SSE stream did not produce expected events in time, seen={seen!r}")

    seen = asyncio.run(_collect())

    types = [x.get("type") for x in seen if isinstance(x, dict)]
    assert "run.event" in types
    assert "replay.done" in types

    seqs = [int(x.get("seq")) for x in seen if x.get("type") == "run.event"]
    assert 1 in seqs
    assert 2 in seqs
    assert 3 in seqs
