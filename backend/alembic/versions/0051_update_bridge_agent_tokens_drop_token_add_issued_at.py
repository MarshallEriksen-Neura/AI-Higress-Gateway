"""Drop token column and add issued_at for bridge agent tokens.

Revision ID: 0051_update_bridge_agent_tokens_drop_token_add_issued_at
Revises: 0050_add_bridge_agent_tokens_table
Create Date: 2026-01-15 12:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0051_update_bridge_agent_tokens_drop_token_add_issued_at"
down_revision = "0050_add_bridge_agent_tokens_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add issued_at with a default to backfill existing rows, then drop token column.
    op.add_column(
        "bridge_agent_tokens",
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Backfill issued_at using updated_at if present; fall back to now().
    op.execute(
        "UPDATE bridge_agent_tokens SET issued_at = COALESCE(issued_at, updated_at, now())"
    )
    op.alter_column("bridge_agent_tokens", "issued_at", nullable=False)
    op.drop_column("bridge_agent_tokens", "token")


def downgrade() -> None:
    op.add_column(
        "bridge_agent_tokens",
        sa.Column("token", sa.String(), nullable=True),
    )
    op.drop_column("bridge_agent_tokens", "issued_at")
