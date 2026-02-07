"""Add will versioning and session persistence columns.

Revision ID: 007_will_versioning
Revises: 006_payments
Create Date: 2026-02-07

Adds version (int) and current_section (str) columns to wills table
for post-purchase regeneration tracking and wizard resume support.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# Revision identifiers used by Alembic
revision: str = "007_will_versioning"
down_revision: Union[str, Sequence[str], None] = "006_payments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add version and current_section columns to wills table."""

    op.add_column(
        "wills",
        sa.Column(
            "version",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )
    op.add_column(
        "wills",
        sa.Column(
            "current_section",
            sa.String(50),
            nullable=False,
            server_default="personal",
        ),
    )


def downgrade() -> None:
    """Remove version and current_section columns from wills table."""
    op.drop_column("wills", "current_section")
    op.drop_column("wills", "version")
