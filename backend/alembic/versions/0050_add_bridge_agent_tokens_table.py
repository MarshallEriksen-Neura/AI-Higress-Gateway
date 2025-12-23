"""Add bridge agent token versions.

Revision ID: 0050_add_bridge_agent_tokens_table
Revises: 0049_change_last_message_content_to_text
Create Date: 2026-01-15 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0050_add_bridge_agent_tokens_table"
down_revision = "0049_change_last_message_content_to_text"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bridge_agent_tokens",
        sa.Column("id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("agent_id", sa.String(length=128), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "agent_id", name="uq_bridge_agent_tokens_user_agent"),
    )
    op.create_index(op.f("ix_bridge_agent_tokens_agent_id"), "bridge_agent_tokens", ["agent_id"], unique=False)
    op.create_index(op.f("ix_bridge_agent_tokens_user_id"), "bridge_agent_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_bridge_agent_tokens_user_id"), table_name="bridge_agent_tokens")
    op.drop_index(op.f("ix_bridge_agent_tokens_agent_id"), table_name="bridge_agent_tokens")
    op.drop_table("bridge_agent_tokens")
