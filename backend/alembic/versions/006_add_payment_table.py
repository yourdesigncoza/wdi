"""Add payments table and paid_at to wills.

Revision ID: 006_payments
Revises: 005_verification
Create Date: 2026-02-07

Creates payments table for PayFast payment lifecycle tracking
and adds paid_at column to wills for download gating.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "006_payments"
down_revision: Union[str, Sequence[str], None] = "005_verification"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create payments table and add paid_at to wills."""

    op.create_table(
        "payments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "will_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wills.id"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("m_payment_id", sa.String(100), nullable=False),
        sa.Column("pf_payment_id", sa.String(100), nullable=True),
        sa.Column("amount", sa.String(20), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("itn_data", postgresql.JSONB, nullable=True),
        sa.Column("download_token", sa.Text, nullable=True),
        sa.Column(
            "email_sent",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "email_sent_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # Indexes
    op.create_index("ix_payments_will_id", "payments", ["will_id"])
    op.create_index(
        "ix_payments_m_payment_id", "payments", ["m_payment_id"], unique=True
    )

    # Add paid_at to wills for download gating
    op.add_column(
        "wills",
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove payments table and paid_at from wills."""
    op.drop_column("wills", "paid_at")
    op.drop_index("ix_payments_m_payment_id", table_name="payments")
    op.drop_index("ix_payments_will_id", table_name="payments")
    op.drop_table("payments")
