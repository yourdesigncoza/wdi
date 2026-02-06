"""Add complex estate scenario columns to wills table.

Revision ID: 004_complex_sections
Revises: 003_will_conversation
Create Date: 2026-02-06

Adds 5 new JSONB columns for complex estate scenarios:
  - trust_provisions: testamentary trust data
  - usufruct: usufruct provision data
  - business_assets: business asset entries
  - joint_will: joint will configuration
  - scenarios: list of active scenario strings
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "004_complex_sections"
down_revision: Union[str, Sequence[str], None] = "003_will_conversation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add complex estate scenario JSONB columns to wills table."""

    op.add_column(
        "wills",
        sa.Column(
            "trust_provisions",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "usufruct",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "business_assets",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "joint_will",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "scenarios",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    """Remove complex estate scenario columns from wills table."""
    op.drop_column("wills", "scenarios")
    op.drop_column("wills", "joint_will")
    op.drop_column("wills", "business_assets")
    op.drop_column("wills", "usufruct")
    op.drop_column("wills", "trust_provisions")
