from __future__ import annotations

from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BridgeAgentToken(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Bridge Agent token 版本记录。

    仅存储版本号与 token 字符串，便于实现“单活”与复用同一 token。
    """

    __tablename__ = "bridge_agent_tokens"
    __table_args__ = (
        UniqueConstraint("user_id", "agent_id", name="uq_bridge_agent_tokens_user_agent"),
    )

    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    agent_id = Column(String(128), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    issued_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)


__all__ = ["BridgeAgentToken"]
