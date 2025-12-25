from __future__ import annotations

from sqlalchemy import Column, ForeignKey, Index, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RunEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Run 执行过程中的不可变事件（append-only）。

    用途：
    - 断线重连回放（SSE replay）
    - 审计/排障（长任务、多工具链路可追溯）
    - 为后续“执行与连接解耦（worker 驱动）”提供真相来源
    """

    __tablename__ = "chat_run_events"
    __table_args__ = (
        UniqueConstraint("run_id", "seq", name="uq_chat_run_events_run_seq"),
        Index("ix_chat_run_events_run_created", "run_id", "created_at"),
    )

    run_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seq: Mapped[int] = Column(Integer, nullable=False, server_default=text("0"))
    event_type: Mapped[str] = Column(String(64), nullable=False)
    payload: Mapped[dict] = Column(JSONBCompat(), nullable=False, server_default=text("'{}'"))


__all__ = ["RunEvent"]
