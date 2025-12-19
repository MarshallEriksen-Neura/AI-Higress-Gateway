from __future__ import annotations

from sqlalchemy import Boolean, Column, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped

from app.db.types import JSONBCompat

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ProjectEvalConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    项目级“推荐评测”配置（MVP：project_id == api_key_id）。

    注意：这里的 project_id 不是单独的 Project 表，而是复用用户 API Key 作为项目边界。
    """

    __tablename__ = "project_eval_configs"
    __table_args__ = (
        UniqueConstraint("api_key_id", name="uq_project_eval_configs_api_key_id"),
    )

    api_key_id: Mapped[PG_UUID] = Column(
        PG_UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    enabled: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("TRUE"),
        default=True,
    )
    max_challengers: Mapped[int] = Column(
        Integer,
        nullable=False,
        server_default=text("2"),
        default=2,
    )
    provider_scopes = Column(
        JSONBCompat(),
        nullable=False,
        server_default=text("'[\"private\",\"shared\",\"public\"]'"),
        doc='可用 provider 范围：["private","shared","public"] 的子集',
    )
    candidate_logical_models = Column(
        JSONBCompat(),
        nullable=True,
        doc="候选 logical model 列表；为空表示不限制（由后端再做保护）。",
    )
    cooldown_seconds: Mapped[int] = Column(
        Integer,
        nullable=False,
        server_default=text("120"),
        default=120,
    )
    budget_per_eval_credits: Mapped[int | None] = Column(
        Integer,
        nullable=True,
        doc="每次评测允许的预算上限（credits）。为空表示不限制。",
    )
    rubric: Mapped[str | None] = Column(
        Text,
        nullable=True,
        doc="项目评测口径/偏好，用于解释与引导评测。",
    )
    project_ai_enabled: Mapped[bool] = Column(
        Boolean,
        nullable=False,
        server_default=text("FALSE"),
        default=False,
        doc="是否启用 Project AI（LLM）解释；关闭时仅返回规则解释。",
    )
    project_ai_provider_model: Mapped[str | None] = Column(
        String(128),
        nullable=True,
        doc="Project AI 用于生成解释的模型标识（可为空，空则走规则解释）。",
    )


__all__ = ["ProjectEvalConfig"]
