"""Fix payments.will_id FK to CASCADE on delete.

Revision ID: 009_fix_payment_cascade
Revises: 008_additional_documents
Create Date: 2026-02-08

The original migration (006) created the payments.will_id FK without
ON DELETE CASCADE, causing 500 errors when deleting a will that has
associated payment records.
"""

from typing import Sequence, Union

from alembic import op

# Revision identifiers used by Alembic
revision: str = "009_fix_payment_cascade"
down_revision: Union[str, Sequence[str], None] = "008_additional_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop old FK and re-add with ON DELETE CASCADE."""
    op.drop_constraint("payments_will_id_fkey", "payments", type_="foreignkey")
    op.create_foreign_key(
        "payments_will_id_fkey",
        "payments",
        "wills",
        ["will_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Revert to FK without CASCADE (original behavior)."""
    op.drop_constraint("payments_will_id_fkey", "payments", type_="foreignkey")
    op.create_foreign_key(
        "payments_will_id_fkey",
        "payments",
        "wills",
        ["will_id"],
        ["id"],
    )
