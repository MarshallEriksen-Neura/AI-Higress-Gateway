"""Create chat_run_events table for durable run event sourcing.

Revision ID: 0052_create_chat_run_events
Revises: 0051_update_bridge_agent_tokens_drop_token_add_issued_at
Create Date: 2025-12-24 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0052_create_chat_run_events"
down_revision = "0051_update_bridge_agent_tokens_drop_token_add_issued_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_run_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("seq", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'"), nullable=False),
        sa.ForeignKeyConstraint(
            ["run_id"],
            ["chat_runs.id"],
            name="fk_chat_run_events_run_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("run_id", "seq", name="uq_chat_run_events_run_seq"),
    )
    op.create_index(
        "ix_chat_run_events_run_created",
        "chat_run_events",
        ["run_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_chat_run_events_run_id",
        "chat_run_events",
        ["run_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_run_events_run_id", table_name="chat_run_events")
    op.drop_index("ix_chat_run_events_run_created", table_name="chat_run_events")
    op.drop_table("chat_run_events")

