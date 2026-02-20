"""add social snippets table

Revision ID: 002
Revises: 001
Create Date: 2026-02-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "social_snippets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("artikel_id", sa.Integer(), sa.ForeignKey("clnpth.redaktions_log.id")),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("hashtags", JSONB(), server_default="[]"),
        sa.Column("erstellt_am", sa.DateTime(), server_default=sa.func.now()),
        schema="clnpth",
    )


def downgrade() -> None:
    op.drop_table("social_snippets", schema="clnpth")
