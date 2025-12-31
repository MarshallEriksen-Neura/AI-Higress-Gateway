from __future__ import annotations

import asyncio
import json
from contextlib import suppress
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.api.v1.assistant_routes import create_message_endpoint
from app.jwt_auth import AuthenticatedUser
from app.models import APIKey, Conversation, User
from app.repositories.run_event_repository import append_run_event
from app.schemas.assistants import MessageCreateRequest
from app.services.chat_history_service import (
    create_assistant,
    create_assistant_message_placeholder_after_user,
    create_conversation,
    create_user_message,
)
from app.services.chat_run_service import create_run_record
from tests.utils import InMemoryRedis


class _DummyRequest:
    headers = {"accept": "text/event-stream"}

    async def is_disconnected(self) -> bool:
        return False


@pytest.mark.asyncio
async def test_create_message_streaming_sse_can_finish_when_redis_hot_channel_misses(
    db_session: Session, monkeypatch
) -> None:
    """
    生产分支下 create_message_endpoint 依赖 Redis pub/sub 推进 SSE；
    如果 worker 侧未能发布（例如 loop 关闭导致 best-effort publish 任务被取消），前端会一直等待。

    该用例模拟“只写 DB，不发 Redis”的场景：确保 SSE 能通过 heartbeat 触发的 DB 回放拿到终态事件。
    """
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    user = db_session.execute(select(User).limit(1)).scalars().first()
    api_key = db_session.execute(select(APIKey).limit(1)).scalars().first()
    assert user is not None
    assert api_key is not None

    current_user = AuthenticatedUser(
        id=str(user.id),
        username=user.username,
        email=user.email,
        is_superuser=True,
        is_active=True,
    )

    assistant = create_assistant(
        db_session,
        user_id=UUID(str(user.id)),
        project_id=UUID(str(api_key.id)),
        name="test-assistant",
        system_prompt="",
        default_logical_model="test-model",
        model_preset=None,
    )
    conv = create_conversation(
        db_session,
        user_id=UUID(str(user.id)),
        project_id=UUID(str(api_key.id)),
        assistant_id=UUID(str(assistant.id)),
        title="test",
    )

    redis = InMemoryRedis()

    created: dict[str, Any] = {"run_id": None, "created_seq": None}

    async def _fake_create_message_and_queue_baseline_run(db: Session, **kwargs):
        conversation_id = kwargs["conversation_id"]
        content = kwargs["content"]
        streaming = bool(kwargs["streaming"])

        conv_obj = db.get(Conversation, UUID(str(conversation_id)))
        assert conv_obj is not None

        user_message = create_user_message(db, conversation=conv_obj, content_text=content)
        assistant_message_id = None
        if streaming:
            assistant_msg = create_assistant_message_placeholder_after_user(
                db,
                conversation_id=UUID(str(conv_obj.id)),
                user_sequence=int(user_message.sequence or 0),
            )
            assistant_message_id = UUID(str(assistant_msg.id))

        run = create_run_record(
            db,
            user_id=UUID(str(current_user.id)),
            api_key_id=UUID(str(conv_obj.api_key_id)),
            message_id=UUID(str(user_message.id)),
            requested_logical_model="test-model",
            request_payload={"model": "test-model", "messages": [{"role": "user", "content": content}]},
            status="queued",
        )

        created_payload = {
            "type": "message.created",
            "conversation_id": str(conv_obj.id),
            "user_message_id": str(user_message.id),
            "assistant_message_id": str(assistant_message_id) if assistant_message_id is not None else None,
            "baseline_run": {
                "run_id": str(run.id),
                "requested_logical_model": run.requested_logical_model,
                "status": run.status,
                "output_preview": None,
                "latency_ms": None,
                "error_code": None,
                "tool_invocations": [],
            },
        }

        ev = append_run_event(db, run_id=UUID(str(run.id)), event_type="message.created", payload=created_payload)

        created["run_id"] = UUID(str(run.id))
        created["created_seq"] = int(ev.seq)

        return (
            UUID(str(user_message.id)),
            UUID(str(run.id)),
            assistant_message_id,
            created_payload,
            int(ev.seq),
            [],
        )

    monkeypatch.setattr(
        "app.services.chat_app_service.create_message_and_queue_baseline_run",
        _fake_create_message_and_queue_baseline_run,
    )

    # 1) 启动 SSE 流
    resp = await create_message_endpoint(
        conversation_id=UUID(str(conv.id)),
        request=_DummyRequest(),  # type: ignore[arg-type]
        payload=MessageCreateRequest(content="hi", streaming=True),
        db=db_session,
        redis=redis,
        client=None,
        current_user=current_user,
    )

    iterator = resp.body_iterator  # type: ignore[attr-defined]

    # 2) 模拟 worker：只写 DB（不 publish Redis），稍后落 message.failed 终态事件
    TestSessionLocal = sessionmaker(bind=db_session.get_bind(), future=True, expire_on_commit=False)

    async def _insert_terminal_event() -> None:
        await asyncio.sleep(0.2)
        run_id = created["run_id"]
        assert isinstance(run_id, UUID)
        with TestSessionLocal() as s:
            append_run_event(
                s,
                run_id=run_id,
                event_type="message.failed",
                payload={"type": "message.failed", "run_id": str(run_id), "error": "boom"},
            )

    inserter = asyncio.create_task(_insert_terminal_event())

    try:
        seen: list[dict[str, Any]] = []
        buffer = b""
        # 期待在 heartbeat（1s）触发 DB 回放后拿到 message.failed
        while True:
            try:
                chunk = await asyncio.wait_for(iterator.__anext__(), timeout=3.0)  # type: ignore[misc]
            except StopAsyncIteration:
                break
            except asyncio.TimeoutError:
                raise AssertionError(f"SSE 未在预期时间内输出终态事件，seen={seen!r}")

            if not chunk:
                continue
            if not isinstance(chunk, (bytes, bytearray)):
                chunk = str(chunk).encode("utf-8")
            buffer += chunk

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
                if obj.get("type") == "message.failed":
                    buffer = b""
                    break
            if any(obj.get("type") == "message.failed" for obj in seen):
                break

        types = [obj.get("type") for obj in seen]
        assert "message.created" in types
        assert "message.failed" in types
    finally:
        inserter.cancel()
        with suppress(Exception):
            await inserter
        with suppress(Exception):
            await iterator.aclose()
