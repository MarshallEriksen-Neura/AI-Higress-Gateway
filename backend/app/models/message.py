from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Message(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """会话内消息（user/assistant/system）。"""

    __tablename__ = "chat_messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "sequence", name="uq_chat_messages_conversation_sequence"),
    )

    conversation_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = Column(String(16), nullable=False)
    content = Column(
        JSONBCompat(),
        nullable=False,
        doc="消息内容，建议使用统一结构（例如 {type:'text', text:'...'}）。",
    )
    sequence: Mapped[int] = Column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )


__all__ = ["Message"]
