"""Add user table for Clerk authentication.

Revision ID: 002_add_user
Revises: 001_initial
Create Date: 2026-02-06

Creates:
  - users: local user records linked by clerk_user_id
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "002_add_user"
down_revision: Union[str, Sequence[str], None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users table for Clerk authentication."""

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clerk_user_id",
            sa.String(255),
            nullable=False,
            unique=True,
        ),
        sa.Column("email", sa.String(320), nullable=False),
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
    op.create_index(
        "ix_users_clerk_user_id",
        "users",
        ["clerk_user_id"],
        unique=True,
    )


def downgrade() -> None:
    """Drop users table."""
    op.drop_index("ix_users_clerk_user_id", table_name="users")
    op.drop_table("users")
