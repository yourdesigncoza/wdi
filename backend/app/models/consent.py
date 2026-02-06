"""POPIA consent record model."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class ConsentRecord(SQLModel, table=True):
    """
    Records a user's POPIA consent decision.
    Each row represents one consent event (grant or withdrawal).
    """

    __tablename__ = "consent_records"
    __table_args__ = (
        Index("ix_consent_records_accepted_at", "accepted_at"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )

    # Consent versioning -- triggers re-consent when bumped
    consent_version: str = Field(max_length=50)
    privacy_policy_version: str = Field(max_length=50)

    # Timestamps
    accepted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    withdrawn_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Request metadata
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None)

    # Granular consent categories as JSONB list
    consent_categories: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )

    # Record creation timestamp
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
