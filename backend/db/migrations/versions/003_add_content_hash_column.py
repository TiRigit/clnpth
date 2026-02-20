"""add content_hash column for duplicate detection

Revision ID: 003
Revises: 002
Create Date: 2026-02-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "redaktions_log",
        sa.Column("content_hash", sa.String(64), nullable=True),
        schema="clnpth",
    )
    op.create_index(
        "ix_redaktions_log_content_hash",
        "redaktions_log",
        ["content_hash"],
        schema="clnpth",
    )


def downgrade() -> None:
    op.drop_index("ix_redaktions_log_content_hash", table_name="redaktions_log", schema="clnpth")
    op.drop_column("redaktions_log", "content_hash", schema="clnpth")
