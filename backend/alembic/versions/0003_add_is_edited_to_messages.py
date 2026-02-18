"""add is_edited to messages

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("is_edited", sa.Boolean, server_default=sa.text("false"), nullable=False))


def downgrade() -> None:
    op.drop_column("messages", "is_edited")
