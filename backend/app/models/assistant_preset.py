from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AssistantPreset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """用户预设助手（系统提示词 + 默认模型 + 参数预设）。"""

    __tablename__ = "assistant_presets"
    __table_args__ = (
        UniqueConstraint("user_id", "api_key_id", "name", name="uq_assistant_presets_user_project_name"),
    )

    user_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    api_key_id: Mapped[PG_UUID | None] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("api_keys.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="MVP project_id == api_key_id；为空表示用户级默认助手。",
    )
    name: Mapped[str] = Column(String(120), nullable=False)
    system_prompt: Mapped[str] = Column(Text, nullable=False, default="")
    default_logical_model: Mapped[str] = Column(String(128), nullable=False)
    model_preset = Column(
        JSONBCompat(),
        nullable=True,
        doc="模型参数预设（temperature/top_p/max_tokens 等）。",
    )
    archived_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ["AssistantPreset"]

