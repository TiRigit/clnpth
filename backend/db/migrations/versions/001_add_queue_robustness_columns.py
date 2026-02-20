"""add queue robustness columns

Revision ID: 001
Revises: None
Create Date: 2026-02-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("redaktions_log", sa.Column("retry_count", sa.Integer(), server_default="0"), schema="clnpth")
    op.add_column("redaktions_log", sa.Column("max_retries", sa.Integer(), server_default="3"), schema="clnpth")
    op.add_column("redaktions_log", sa.Column("last_error", sa.Text(), nullable=True), schema="clnpth")
    op.add_column("redaktions_log", sa.Column("timeout_at", sa.DateTime(), nullable=True), schema="clnpth")


def downgrade() -> None:
    op.drop_column("redaktions_log", "timeout_at", schema="clnpth")
    op.drop_column("redaktions_log", "last_error", schema="clnpth")
    op.drop_column("redaktions_log", "max_retries", schema="clnpth")
    op.drop_column("redaktions_log", "retry_count", schema="clnpth")
