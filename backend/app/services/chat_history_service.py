from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import bad_request, forbidden, not_found
from app.models import AssistantPreset, Conversation, Message, Run


def _parse_offset_cursor(cursor: str | None) -> int:
    if not cursor:
        return 0
    try:
        value = int(cursor)
    except (TypeError, ValueError):
        return 0
    return max(value, 0)


def _next_cursor(offset: int, limit: int, *, has_more: bool) -> str | None:
    if not has_more:
        return None
    return str(offset + limit)


def create_assistant(
    db: Session,
    *,
    user_id: UUID,
    project_id: UUID | None,
    name: str,
    system_prompt: str,
    default_logical_model: str,
    model_preset: dict | None,
) -> AssistantPreset:
    assistant = AssistantPreset(
        user_id=user_id,
        api_key_id=project_id,
        name=name,
        system_prompt=system_prompt or "",
        default_logical_model=default_logical_model,
        model_preset=model_preset,
        archived_at=None,
    )
    db.add(assistant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("助手名称已存在")
    db.refresh(assistant)
    return assistant


def update_assistant(
    db: Session,
    *,
    assistant_id: UUID,
    user_id: UUID,
    name: str | None = None,
    system_prompt: str | None = None,
    default_logical_model: str | None = None,
    model_preset: dict | None = None,
    archived: bool | None = None,
) -> AssistantPreset:
    assistant = db.execute(
        select(AssistantPreset).where(
            AssistantPreset.id == assistant_id,
            AssistantPreset.user_id == user_id,
        )
    ).scalars().first()
    if assistant is None:
        raise not_found("助手不存在", details={"assistant_id": str(assistant_id)})

    if name is not None:
        assistant.name = name
    if system_prompt is not None:
        assistant.system_prompt = system_prompt
    if default_logical_model is not None:
        assistant.default_logical_model = default_logical_model
    if model_preset is not None:
        assistant.model_preset = model_preset
    if archived is not None:
        assistant.archived_at = datetime.now(UTC) if archived else None

    db.add(assistant)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise bad_request("助手名称已存在")
    db.refresh(assistant)
    return assistant


def list_assistants(
    db: Session,
    *,
    user_id: UUID,
    project_id: UUID | None = None,
    cursor: str | None = None,
    limit: int = 30,
) -> tuple[list[AssistantPreset], str | None]:
    offset = _parse_offset_cursor(cursor)
    limit = max(1, min(int(limit or 30), 100))

    stmt: Select[tuple[AssistantPreset]] = select(AssistantPreset).where(
        AssistantPreset.user_id == user_id,
        AssistantPreset.archived_at.is_(None),
    )
    if project_id is not None:
        stmt = stmt.where(AssistantPreset.api_key_id == project_id)
    stmt = stmt.order_by(AssistantPreset.updated_at.desc(), AssistantPreset.created_at.desc())
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    items = rows[:limit]
    return items, _next_cursor(offset, limit, has_more=has_more)


def get_assistant(
    db: Session,
    *,
    assistant_id: UUID,
    user_id: UUID,
) -> AssistantPreset:
    assistant = db.execute(
        select(AssistantPreset).where(
            AssistantPreset.id == assistant_id,
            AssistantPreset.user_id == user_id,
        )
    ).scalars().first()
    if assistant is None:
        raise not_found("助手不存在", details={"assistant_id": str(assistant_id)})
    return assistant


def create_conversation(
    db: Session,
    *,
    user_id: UUID,
    project_id: UUID,
    assistant_id: UUID,
    title: str | None,
) -> Conversation:
    assistant = get_assistant(db, assistant_id=assistant_id, user_id=user_id)
    if assistant.api_key_id is not None and UUID(str(assistant.api_key_id)) != project_id:
        raise forbidden("该助手不属于当前项目", details={"assistant_id": str(assistant_id), "project_id": str(project_id)})

    now = datetime.now(UTC)
    conv = Conversation(
        user_id=user_id,
        api_key_id=project_id,
        assistant_id=assistant_id,
        title=title,
        last_activity_at=now,
        archived_at=None,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def list_conversations(
    db: Session,
    *,
    user_id: UUID,
    assistant_id: UUID,
    cursor: str | None = None,
    limit: int = 30,
) -> tuple[list[Conversation], str | None]:
    offset = _parse_offset_cursor(cursor)
    limit = max(1, min(int(limit or 30), 100))

    stmt: Select[tuple[Conversation]] = (
        select(Conversation)
        .where(
            Conversation.user_id == user_id,
            Conversation.assistant_id == assistant_id,
            Conversation.archived_at.is_(None),
        )
        .order_by(Conversation.last_activity_at.desc(), Conversation.created_at.desc())
    )
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    items = rows[:limit]
    return items, _next_cursor(offset, limit, has_more=has_more)


def get_conversation(
    db: Session,
    *,
    conversation_id: UUID,
    user_id: UUID,
) -> Conversation:
    conv = db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
            Conversation.archived_at.is_(None),
        )
    ).scalars().first()
    if conv is None:
        raise not_found("会话不存在", details={"conversation_id": str(conversation_id)})
    return conv


def _next_message_sequence(db: Session, *, conversation_id: UUID) -> int:
    seq = db.execute(
        select(func.max(Message.sequence)).where(Message.conversation_id == conversation_id)
    ).scalar_one()
    if seq is None:
        return 1
    return int(seq) + 1


def create_user_message(
    db: Session,
    *,
    conversation: Conversation,
    content_text: str,
) -> Message:
    if not content_text.strip():
        raise bad_request("消息内容不能为空")
    seq = _next_message_sequence(db, conversation_id=UUID(str(conversation.id)))
    msg = Message(
        conversation_id=conversation.id,
        role="user",
        content={"type": "text", "text": content_text},
        sequence=seq,
    )
    conversation.last_activity_at = datetime.now(UTC)
    db.add_all([msg, conversation])
    db.commit()
    db.refresh(msg)
    return msg


def create_assistant_message_after_user(
    db: Session,
    *,
    conversation_id: UUID,
    user_sequence: int,
    content_text: str,
) -> Message:
    seq = int(user_sequence) + 1
    msg = Message(
        conversation_id=conversation_id,
        role="assistant",
        content={"type": "text", "text": content_text},
        sequence=seq,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def update_assistant_message_for_user_sequence(
    db: Session,
    *,
    conversation_id: UUID,
    user_sequence: int,
    new_text: str,
) -> Message | None:
    assistant_seq = int(user_sequence) + 1
    msg = db.execute(
        select(Message).where(
            Message.conversation_id == conversation_id,
            Message.sequence == assistant_seq,
            Message.role == "assistant",
        )
    ).scalars().first()
    if msg is None:
        return None
    msg.content = {"type": "text", "text": new_text}
    db.add(msg)
    return msg


def list_messages_with_run_summaries(
    db: Session,
    *,
    conversation_id: UUID,
    user_id: UUID,
    cursor: str | None = None,
    limit: int = 30,
) -> tuple[list[Message], dict[UUID, list[Run]], str | None]:
    conv = get_conversation(db, conversation_id=conversation_id, user_id=user_id)
    _ = conv

    offset = _parse_offset_cursor(cursor)
    limit = max(1, min(int(limit or 30), 100))

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.sequence.desc())
    )
    rows = list(db.execute(stmt.offset(offset).limit(limit + 1)).scalars().all())
    has_more = len(rows) > limit
    items = rows[:limit]

    message_ids = [UUID(str(m.id)) for m in items if m.role == "user"]
    if not message_ids:
        return items, {}, _next_cursor(offset, limit, has_more=has_more)

    run_rows = db.execute(
        select(Run)
        .where(Run.message_id.in_(message_ids))
        .order_by(Run.created_at.desc())
    ).scalars().all()
    by_message: dict[UUID, list[Run]] = {}
    for run in run_rows:
        key = UUID(str(run.message_id))
        by_message.setdefault(key, []).append(run)

    return items, by_message, _next_cursor(offset, limit, has_more=has_more)


def get_run_detail(db: Session, *, run_id: UUID, user_id: UUID) -> Run:
    run = db.execute(
        select(Run).where(Run.id == run_id, Run.user_id == user_id)
    ).scalars().first()
    if run is None:
        raise not_found("Run 不存在", details={"run_id": str(run_id)})
    return run


__all__ = [
    "create_assistant",
    "create_assistant_message_after_user",
    "create_conversation",
    "create_user_message",
    "get_assistant",
    "get_conversation",
    "get_run_detail",
    "list_assistants",
    "list_conversations",
    "list_messages_with_run_summaries",
    "update_assistant",
    "update_assistant_message_for_user_sequence",
]
