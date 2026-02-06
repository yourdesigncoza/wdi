"""Conversation history model for per-section message persistence.

Stores the message history for each will section separately, enabling
context continuity when users switch between sections and return later.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class Conversation(SQLModel, table=True):
    """Per-section conversation history linked to a will."""

    __tablename__ = "conversations"
    __table_args__ = (
        Index(
            "ix_conversations_will_section",
            "will_id",
            "section",
            unique=True,
        ),
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

    # Which will section this conversation belongs to
    section: str = Field(
        sa_column=Column(String(50), nullable=False),
    )

    # Message history as JSONB array of {role, content, timestamp}
    messages: list = Field(
        default_factory=list,
        sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
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
