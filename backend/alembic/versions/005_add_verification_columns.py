"""Add verification columns to wills table.

Revision ID: 005_verification
Revises: 004_complex_sections
Create Date: 2026-02-06

Adds 3 columns for dual-LLM verification layer:
  - verification_result: full VerificationResult JSON (nullable)
  - verified_at: timestamp of last verification
  - acknowledged_warnings: list of acknowledged warning codes
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "005_verification"
down_revision: Union[str, Sequence[str], None] = "004_complex_sections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add verification columns to wills table."""

    op.add_column(
        "wills",
        sa.Column(
            "verification_result",
            postgresql.JSONB,
            nullable=True,
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "acknowledged_warnings",
            postgresql.JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    """Remove verification columns from wills table."""
    op.drop_column("wills", "acknowledged_warnings")
    op.drop_column("wills", "verified_at")
    op.drop_column("wills", "verification_result")
