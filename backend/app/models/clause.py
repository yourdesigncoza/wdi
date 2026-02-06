"""Versioned clause library model for attorney-approved legal text."""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlalchemy import Column, DateTime, Index
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class ClauseCategory(str, Enum):
    """Will clause categories aligned with SA testamentary law."""

    REVOCATION = "revocation"
    EXECUTOR = "executor"
    BENEFICIARY = "beneficiary"
    GUARDIAN = "guardian"
    TRUST = "trust"
    USUFRUCT = "usufruct"
    RESIDUE = "residue"
    WITNESS = "witness"
    SIGNATURE = "signature"


class WillType(str, Enum):
    """Types of wills supported by the platform."""

    BASIC = "basic"
    TRUST = "trust"
    USUFRUCT = "usufruct"
    JOINT = "joint"


class Clause(SQLModel, table=True):
    """
    Attorney-approved clause template.
    Versioned with a linked-list pattern (previous_version_id).
    Only clauses with is_current=True are served to users.
    """

    __tablename__ = "clauses"
    __table_args__ = (
        Index("ix_clauses_code", "code", unique=True),
        Index("ix_clauses_category_current", "category", "is_current"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )

    # Identification
    code: str = Field(max_length=50)  # e.g. "EXEC-01", "BENEF-02"
    name: str = Field(max_length=200)
    category: ClauseCategory

    # Version control
    version: int = Field(default=1)
    is_current: bool = Field(default=True)
    previous_version_id: Optional[uuid.UUID] = Field(default=None)

    # Content -- Jinja2 template with {{ variables }}
    template_text: str

    # Variable schema for template rendering (JSONB)
    variables_schema: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False),
    )

    # Which will types this clause applies to (JSONB list)
    will_types: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False),
    )

    # Clause properties
    is_required: bool = Field(default=False)
    display_order: int = Field(default=0)

    # Attorney approval tracking
    approved_by: str = Field(max_length=200)
    approved_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    approval_notes: Optional[str] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
