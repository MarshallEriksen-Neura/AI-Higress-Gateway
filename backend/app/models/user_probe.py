from __future__ import annotations

from datetime import datetime
from uuid import UUID as PyUUID

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, relationship

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserProbeTask(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    用户自定义的对话探针任务。

    该任务由用户创建并控制启停，调度器按 interval_seconds 周期触发一次实际对话请求，
    结果写入 user_probe_runs 供前端展示。
    """

    __tablename__ = "user_probe_tasks"

    user_id: Mapped[PyUUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_uuid: Mapped[PyUUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = Column(String(100), nullable=False)
    model_id: Mapped[str] = Column(String(200), nullable=False)
    prompt: Mapped[str] = Column(Text, nullable=False)
    interval_seconds: Mapped[int] = Column(Integer, nullable=False)
    max_tokens: Mapped[int] = Column(Integer, nullable=False, server_default=text("16"))
    api_style: Mapped[str] = Column(
        String(16),
        nullable=False,
        server_default=text("'auto'"),
        doc="auto/openai/claude/responses",
    )

    enabled: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("true"),
        default=True,
    )
    in_progress: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("false"),
        default=False,
        doc="用于调度器防止并发重复执行",
    )
    last_run_at: Mapped[datetime | None] = Column(DateTime(timezone=True), nullable=True)
    next_run_at: Mapped[datetime | None] = Column(DateTime(timezone=True), nullable=True, index=True)

    last_run_uuid: Mapped[PyUUID | None] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "user_probe_runs.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_user_probe_tasks_last_run_uuid",
        ),
        nullable=True,
    )

    provider = relationship("Provider")
    user = relationship("User")
    runs = relationship(
        "UserProbeRun",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="UserProbeRun.task_uuid",
    )
    last_run = relationship("UserProbeRun", foreign_keys=[last_run_uuid], post_update=True)


class UserProbeRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """探针任务每次执行的结果记录。"""

    __tablename__ = "user_probe_runs"

    task_uuid: Mapped[PyUUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("user_probe_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[PyUUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider_uuid: Mapped[PyUUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    model_id: Mapped[str] = Column(String(200), nullable=False)
    api_style: Mapped[str] = Column(String(16), nullable=False)
    success: Mapped[bool] = Column(Boolean, nullable=False, server_default=text("false"))
    status_code: Mapped[int | None] = Column(Integer, nullable=True)
    latency_ms: Mapped[int | None] = Column(Integer, nullable=True)
    error_message: Mapped[str | None] = Column(Text, nullable=True)

    response_text: Mapped[str | None] = Column(Text, nullable=True, doc="提取出的 assistant 文本（可能为空）")
    response_excerpt: Mapped[str | None] = Column(Text, nullable=True, doc="原始响应的截断文本（用于展示/排障）")
    response_json = Column(JSONBCompat(), nullable=True)

    started_at: Mapped[datetime | None] = Column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = Column(DateTime(timezone=True), nullable=True)

    task = relationship("UserProbeTask", back_populates="runs", foreign_keys=[task_uuid])
    provider = relationship("Provider")
    user = relationship("User")


__all__ = ["UserProbeRun", "UserProbeTask"]
