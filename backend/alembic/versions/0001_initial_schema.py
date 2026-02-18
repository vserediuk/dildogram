"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(20), unique=True, nullable=False, index=True),
        sa.Column("username", sa.String(50), unique=True, nullable=True, index=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("password_hash", sa.String(256), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("last_seen", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- chats ---
    op.create_table(
        "chats",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chat_type", sa.Enum("private", "group", name="chattype"), nullable=False, server_default="private"),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("created_by", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- chat_members ---
    op.create_table(
        "chat_members",
        sa.Column("chat_id", UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- messages ---
    op.create_table(
        "messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("chat_id", UUID(as_uuid=True), sa.ForeignKey("chats.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("sender_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("status", sa.Enum("sent", "delivered", "read", name="messagestatus"), server_default="sent", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- read_receipts ---
    op.create_table(
        "read_receipts",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("message_id", UUID(as_uuid=True), sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("read_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("message_id", "user_id", name="uq_read_receipt"),
    )

    # --- sms_codes ---
    op.create_table(
        "sms_codes",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("phone", sa.String(20), nullable=False, index=True),
        sa.Column("code", sa.String(6), nullable=False),
        sa.Column("is_used", sa.Boolean, server_default=sa.text("false")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("sms_codes")
    op.drop_table("read_receipts")
    op.drop_table("messages")
    op.drop_table("chat_members")
    op.drop_table("chats")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS chattype")
    op.execute("DROP TYPE IF EXISTS messagestatus")
