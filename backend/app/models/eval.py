from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Eval(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """一次“推荐评测”事件：baseline + 多个 challenger。"""

    __tablename__ = "chat_evals"
    __table_args__ = (
        UniqueConstraint("baseline_run_id", name="uq_chat_evals_baseline_run_id"),
    )

    user_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    api_key_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assistant_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("assistant_presets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    baseline_run_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    challenger_run_ids = Column(JSONBCompat(), nullable=False, server_default=text("'[]'"))
    effective_provider_ids = Column(
        JSONBCompat(),
        nullable=False,
        server_default=text("'[]'"),
        doc="本次评测允许路由的 provider_id 集合快照，用于审计/复现。",
    )
    context_features = Column(JSONBCompat(), nullable=True)
    policy_version: Mapped[str] = Column(String(32), nullable=False, server_default=text("'ts-v1'"))
    explanation = Column(JSONBCompat(), nullable=True)
    status: Mapped[str] = Column(
        String(16),
        nullable=False,
        server_default=text("'running'"),
        default="running",
    )
    rated_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ["Eval"]

