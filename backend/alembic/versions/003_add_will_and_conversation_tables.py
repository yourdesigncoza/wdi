"""Add will and conversation tables.

Revision ID: 003_will_conversation
Revises: 002_add_user
Create Date: 2026-02-06

Creates:
  - wills: will documents with JSONB section columns
  - conversations: per-section conversation history linked to wills
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "003_will_conversation"
down_revision: Union[str, Sequence[str], None] = "002_add_user"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create wills and conversations tables."""

    # ── Wills ────────────────────────────────────────────────────────
    op.create_table(
        "wills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "will_type",
            sa.String(50),
            nullable=False,
            server_default="basic",
        ),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="draft",
        ),
        # Section data (JSONB)
        sa.Column(
            "testator",
            postgresql.JSONB,
            nullable=False,
            server_default="'{}'",
        ),
        sa.Column(
            "marital",
            postgresql.JSONB,
            nullable=False,
            server_default="'{}'",
        ),
        sa.Column(
            "beneficiaries",
            postgresql.JSONB,
            nullable=False,
            server_default="'[]'",
        ),
        sa.Column(
            "assets",
            postgresql.JSONB,
            nullable=False,
            server_default="'[]'",
        ),
        sa.Column(
            "guardians",
            postgresql.JSONB,
            nullable=False,
            server_default="'[]'",
        ),
        sa.Column(
            "executor",
            postgresql.JSONB,
            nullable=False,
            server_default="'{}'",
        ),
        sa.Column(
            "bequests",
            postgresql.JSONB,
            nullable=False,
            server_default="'[]'",
        ),
        sa.Column(
            "residue",
            postgresql.JSONB,
            nullable=False,
            server_default="'{}'",
        ),
        # Section completion tracking
        sa.Column(
            "sections_complete",
            postgresql.JSONB,
            nullable=False,
            server_default="'{}'",
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_wills_user_id", "wills", ["user_id"])

    # ── Conversations ────────────────────────────────────────────────
    op.create_table(
        "conversations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "will_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wills.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section", sa.String(50), nullable=False),
        sa.Column(
            "messages",
            postgresql.JSONB,
            nullable=False,
            server_default="'[]'",
        ),
        # Timestamps
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    # One conversation per will+section (unique constraint as index)
    op.create_index(
        "ix_conversations_will_section",
        "conversations",
        ["will_id", "section"],
        unique=True,
    )


def downgrade() -> None:
    """Drop conversations and wills tables."""
    op.drop_index(
        "ix_conversations_will_section", table_name="conversations"
    )
    op.drop_table("conversations")
    op.drop_index("ix_wills_user_id", table_name="wills")
    op.drop_table("wills")
