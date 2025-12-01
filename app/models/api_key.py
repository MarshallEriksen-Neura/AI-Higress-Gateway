from __future__ import annotations

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class APIKey(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """User-owned API key used to访问网关。"""

    __tablename__ = "api_keys"
    __table_args__ = (
        UniqueConstraint("key_hash", name="uq_api_keys_key_hash"),
        UniqueConstraint("user_id", "name", name="uq_api_keys_user_name"),
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = Column(String(255), nullable=False)
    key_hash: Mapped[str] = Column(String(128), nullable=False)
    key_prefix: Mapped[str] = Column(String(32), nullable=False)
    expiry_type: Mapped[str] = Column(String(16), nullable=False, default="never")
    expires_at = Column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="api_keys")


__all__ = ["APIKey"]
