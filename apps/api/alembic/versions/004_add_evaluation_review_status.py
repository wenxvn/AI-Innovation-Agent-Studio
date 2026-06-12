"""add evaluation review status

Revision ID: 004
Revises: 003
Create Date: 2026-06-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "evaluations",
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
    )
    op.add_column(
        "evaluations",
        sa.Column("review_note", sa.Text(), nullable=True, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("evaluations", "review_note")
    op.drop_column("evaluations", "status")
