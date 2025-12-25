from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Message, Run


def save_conversation_title(db: Session, *, conversation: Any, title: str) -> Any:
    conversation.title = title
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def persist_run(db: Session, run: Run) -> Run:
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def refresh_run(db: Session, run: Run) -> Run:
    db.refresh(run)
    return run


def get_assistant_message(db: Session, assistant_message_id: UUID) -> Message | None:
    return db.get(Message, assistant_message_id)


def get_previous_user_message(db: Session, assistant_msg: Message) -> Message | None:
    stmt = (
        select(Message)
        .where(
            Message.conversation_id == assistant_msg.conversation_id,
            Message.sequence == int(assistant_msg.sequence) - 1,
            Message.role == "user",
        )
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def delete_message(db: Session, message: Message) -> None:
    db.delete(message)
    db.commit()


def get_last_run_for_message(db: Session, message_id: UUID) -> Run | None:
    stmt = (
        select(Run)
        .where(Run.message_id == message_id)
        .order_by(Run.created_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


__all__ = [
    "delete_message",
    "get_assistant_message",
    "get_last_run_for_message",
    "get_previous_user_message",
    "persist_run",
    "refresh_run",
    "save_conversation_title",
]
