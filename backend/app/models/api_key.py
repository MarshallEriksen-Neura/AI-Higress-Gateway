from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint, text
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
    is_active: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("TRUE"),
        default=True,
    )
    disabled_reason: Mapped[str | None] = Column(String(64), nullable=True)
    has_provider_restrictions: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("FALSE"),
        default=False,
    )

    # Chat defaults (project-level)
    chat_default_logical_model: Mapped[str | None] = Column(
        String(128),
        nullable=True,
        doc="项目级聊天默认逻辑模型；为空表示默认 auto",
    )
    chat_title_logical_model: Mapped[str | None] = Column(
        String(128),
        nullable=True,
        doc="项目级会话标题生成逻辑模型；为空表示不自动命名",
    )

    # Knowledge base / embedding defaults (project-level)
    kb_embedding_logical_model: Mapped[str | None] = Column(
        String(128),
        nullable=True,
        doc="项目级知识库 embedding 逻辑模型；为空表示未配置（由上层策略决定是否启用/如何选择）。",
    )
    kb_memory_router_logical_model: Mapped[str | None] = Column(
        String(128),
        nullable=True,
        doc="项目级聊天记忆路由模型：用于判断是否存储以及存储到 user/system 维度；为空表示由上层选择默认。",
    )

    user: Mapped[User] = relationship("User", back_populates="api_keys")
    allowed_provider_links: Mapped[list[APIKeyAllowedProvider]] = relationship(
        "APIKeyAllowedProvider",
        back_populates="api_key",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )

    @property
    def allowed_provider_ids(self) -> list[str]:
        return sorted(link.provider_id for link in self.allowed_provider_links)


__all__ = ["APIKey"]
