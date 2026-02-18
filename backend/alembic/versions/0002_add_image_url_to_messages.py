"""add image_url to messages

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("messages", sa.Column("image_url", sa.String(512), nullable=True))
    op.alter_column("messages", "content", existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column("messages", "content", existing_type=sa.Text(), nullable=False)
    op.drop_column("messages", "image_url")
