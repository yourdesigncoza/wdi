"""Immutable audit log model for compliance tracking."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    """
    Immutable audit log for POPIA compliance.

    This table is partitioned by month (created_at) in the migration
    and should have UPDATE/DELETE revoked for the application database user.
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_event_type", "event_type", "created_at"),
        Index("ix_audit_logs_user_id", "user_id", "created_at"),
        Index("ix_audit_logs_event_category", "event_category"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )

    # Event identification
    event_type: str = Field(max_length=100)
    event_category: str = Field(max_length=50)

    # Actor information
    user_id: Optional[uuid.UUID] = Field(default=None)
    session_id: Optional[str] = Field(default=None, max_length=200)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None)

    # Resource context
    resource_type: Optional[str] = Field(default=None, max_length=100)
    resource_id: Optional[uuid.UUID] = Field(default=None)

    # Flexible event payload
    details: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )

    # Timestamp (timezone-aware for legal compliance)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
