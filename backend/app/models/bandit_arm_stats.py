from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BanditArmStats(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Contextual bandit 的臂统计（Beta-Bernoulli）。"""

    __tablename__ = "bandit_arm_stats"
    __table_args__ = (
        UniqueConstraint(
            "api_key_id",
            "context_key",
            "arm_logical_model",
            name="uq_bandit_arm_stats_project_context_arm",
        ),
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
    context_key: Mapped[str] = Column(String(64), nullable=False, index=True)
    arm_logical_model: Mapped[str] = Column(String(128), nullable=False, index=True)

    alpha: Mapped[float] = Column(Float, nullable=False, server_default=text("1.0"))
    beta: Mapped[float] = Column(Float, nullable=False, server_default=text("1.0"))
    wins: Mapped[int] = Column(Integer, nullable=False, server_default=text("0"))
    losses: Mapped[int] = Column(Integer, nullable=False, server_default=text("0"))
    samples: Mapped[int] = Column(Integer, nullable=False, server_default=text("0"))
    last_updated_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ["BanditArmStats"]

