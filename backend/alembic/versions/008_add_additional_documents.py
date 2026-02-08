"""Add additional_documents table for living will and funeral wishes.

Revision ID: 008_additional_documents
Revises: 007_will_versioning
Create Date: 2026-02-08

Creates additional_documents table with JSONB content column
for storing living will and funeral wishes data.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "008_additional_documents"
down_revision: Union[str, Sequence[str], None] = "007_will_versioning"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create additional_documents table."""

    op.create_table(
        "additional_documents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "will_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wills.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("document_type", sa.String(50), nullable=False),
        sa.Column(
            "status",
            sa.String(50),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "content",
            postgresql.JSONB,
            nullable=False,
            server_default="{}",
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
    op.create_index(
        "ix_additional_documents_user_id",
        "additional_documents",
        ["user_id"],
    )


def downgrade() -> None:
    """Remove additional_documents table."""
    op.drop_index(
        "ix_additional_documents_user_id",
        table_name="additional_documents",
    )
    op.drop_table("additional_documents")
