from __future__ import annotations

from sqlalchemy import Column, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class EvalRating(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """用户对某次 Eval 的 winner 反馈。"""

    __tablename__ = "chat_eval_ratings"
    __table_args__ = (
        UniqueConstraint("eval_id", "user_id", name="uq_chat_eval_ratings_eval_user"),
    )

    eval_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_evals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    winner_run_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        ForeignKey("chat_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason_tags = Column(JSONBCompat(), nullable=False, default=list)


__all__ = ["EvalRating"]
