"""Initial schema with POPIA compliance tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-02-06

Creates:
  - consent_records: POPIA consent tracking
  - clauses: versioned attorney-approved clause library
  - audit_logs: immutable, partitioned audit trail
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Revision identifiers used by Alembic
revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create consent_records, clauses, and audit_logs tables."""

    # ── Consent Records ─────────────────────────────────────────────
    op.create_table(
        "consent_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("consent_version", sa.String(50), nullable=False),
        sa.Column("privacy_policy_version", sa.String(50), nullable=False),
        sa.Column(
            "accepted_at", sa.DateTime(timezone=True), nullable=False
        ),
        sa.Column(
            "withdrawn_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("consent_categories", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_consent_records_accepted_at",
        "consent_records",
        ["accepted_at"],
    )

    # ── Clauses (versioned attorney-approved templates) ─────────────
    op.create_table(
        "clauses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "is_current", sa.Boolean, nullable=False, server_default="true"
        ),
        sa.Column(
            "previous_version_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("template_text", sa.Text, nullable=False),
        sa.Column("variables_schema", postgresql.JSONB, nullable=False),
        sa.Column("will_types", postgresql.JSONB, nullable=False),
        sa.Column(
            "is_required", sa.Boolean, nullable=False, server_default="false"
        ),
        sa.Column(
            "display_order", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column("approved_by", sa.String(200), nullable=False),
        sa.Column(
            "approved_at", sa.DateTime(timezone=True), nullable=False
        ),
        sa.Column("approval_notes", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_clauses_code", "clauses", ["code"], unique=True)
    op.create_index(
        "ix_clauses_category_current", "clauses", ["category", "is_current"]
    )

    # ── Audit Logs (partitioned by month for performance) ───────────
    # Partitioned tables must be created with raw SQL
    op.execute(
        """
        CREATE TABLE audit_logs (
            id UUID NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            event_category VARCHAR(50) NOT NULL,
            user_id UUID,
            session_id VARCHAR(200),
            ip_address VARCHAR(45),
            user_agent TEXT,
            resource_type VARCHAR(100),
            resource_id UUID,
            details JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
        """
    )

    # Initial partition for February 2026
    op.execute(
        """
        CREATE TABLE audit_logs_2026_02
        PARTITION OF audit_logs
        FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
        """
    )

    # March 2026 partition (pre-created for continuity)
    op.execute(
        """
        CREATE TABLE audit_logs_2026_03
        PARTITION OF audit_logs
        FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
        """
    )

    # Indexes on partitioned table
    op.execute(
        """
        CREATE INDEX ix_audit_logs_event_type
        ON audit_logs (event_type, created_at);
        """
    )
    op.execute(
        """
        CREATE INDEX ix_audit_logs_user_id
        ON audit_logs (user_id, created_at);
        """
    )
    op.execute(
        """
        CREATE INDEX ix_audit_logs_event_category
        ON audit_logs (event_category);
        """
    )

    # ── Audit immutability ──────────────────────────────────────────
    # NOTE: Run these GRANT/REVOKE statements manually after migration
    # against your application database user, e.g.:
    #
    #   REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
    #   GRANT INSERT, SELECT ON audit_logs TO app_user;
    #
    # This ensures the audit_logs table is append-only at the DB level.


def downgrade() -> None:
    """Drop all tables in reverse order."""
    op.execute("DROP TABLE IF EXISTS audit_logs_2026_03")
    op.execute("DROP TABLE IF EXISTS audit_logs_2026_02")
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.drop_table("clauses")
    op.drop_table("consent_records")
