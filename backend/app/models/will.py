"""Will model with JSONB section-based storage.

Each section of the will (testator, beneficiaries, assets, etc.) is stored
as a separate JSONB column for flexible schema evolution and per-section
queries without requiring database migrations for field changes.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class Will(SQLModel, table=True):
    """User's will document with section-based JSONB storage."""

    __tablename__ = "wills"
    __table_args__ = (
        Index("ix_wills_user_id", "user_id"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id"),
            nullable=False,
        ),
    )

    # Will metadata
    will_type: str = Field(
        default="basic",
        sa_column=Column(String(50), nullable=False, server_default="basic"),
    )
    status: str = Field(
        default="draft",
        sa_column=Column(String(50), nullable=False, server_default="draft"),
    )  # draft | review | verified | generated

    # Section data (JSONB for flexibility)
    testator: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    marital: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    beneficiaries: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )
    assets: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )
    guardians: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )
    executor: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    bequests: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )
    residue: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )

    # Complex estate scenario sections (JSONB)
    trust_provisions: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    usufruct: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    business_assets: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )
    joint_will: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    scenarios: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )

    # Verification
    verification_result: dict | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    verified_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    acknowledged_warnings: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
    )

    # Payment gating
    paid_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Section completion tracking
    sections_complete: dict = Field(
        default_factory=lambda: {
            "personal": False,
            "beneficiaries": False,
            "assets": False,
            "guardians": False,
            "executor": False,
            "bequests": False,
            "residue": False,
            "trust": False,
            "usufruct": False,
            "business": False,
            "joint": False,
        },
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
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
