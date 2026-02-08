"""Payment model for tracking PayFast payment lifecycle.

Tracks payment state from initiation through ITN confirmation,
download token generation, and email delivery.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class Payment(SQLModel, table=True):
    """Payment record linked to a will and user."""

    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_will_id", "will_id"),
        Index("ix_payments_m_payment_id", "m_payment_id", unique=True),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )
    will_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("wills.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id"),
            nullable=False,
        ),
    )

    # Merchant payment reference (e.g., "PAY-{uuid4_short}")
    m_payment_id: str = Field(
        sa_column=Column(String(100), nullable=False),
    )
    # PayFast's payment ID (populated from ITN callback)
    pf_payment_id: str | None = Field(
        default=None,
        sa_column=Column(String(100), nullable=True),
    )

    # Amount as decimal string "XXX.XX" (ZAR, 2 decimal places)
    amount: str = Field(
        sa_column=Column(String(20), nullable=False),
    )

    # Payment lifecycle: pending -> completed | cancelled | failed
    status: str = Field(
        default="pending",
        sa_column=Column(String(20), nullable=False, server_default="pending"),
    )

    # Full ITN POST data for audit trail
    itn_data: dict | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )

    # Download token generated after successful ITN confirmation
    download_token: str | None = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # Email delivery tracking
    email_sent: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default="false"),
    )
    email_sent_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default="now()"
        ),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True), nullable=False, server_default="now()"
        ),
    )
