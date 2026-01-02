"""Add kb memory router logical model to api keys.

Revision ID: 0061_add_kb_memory_router_model_to_api_keys
Revises: 0060_add_kb_embedding_model_to_api_keys
Create Date: 2026-01-02 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0061_add_kb_memory_router_model_to_api_keys"
down_revision = "0060_add_kb_embedding_model_to_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "api_keys",
        sa.Column("kb_memory_router_logical_model", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("api_keys", "kb_memory_router_logical_model")

