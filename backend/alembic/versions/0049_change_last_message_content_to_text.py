"""Change last_message_content to Text.

Revision ID: 0049_change_last_message_content_to_text
Revises: 0048_add_project_chat_settings_to_api_keys
Create Date: 2025-12-22 12:40:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision = "0049_change_last_message_content_to_text"
down_revision = "0048_add_project_chat_settings_to_api_keys"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "chat_conversations",
        "last_message_content",
        existing_type=sa.String(length=1000),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "chat_conversations",
        "last_message_content",
        existing_type=sa.Text(),
        type_=sa.String(length=1000),
        existing_nullable=True,
    )
