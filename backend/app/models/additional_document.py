"""AdditionalDocument model for living will and funeral wishes.

Stores supplementary estate planning documents as JSONB content,
separate from the main will model. Each document has its own
lifecycle (draft -> completed -> generated) and optional link
to the user's main will.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class AdditionalDocument(SQLModel, table=True):
    """Supplementary document (living will or funeral wishes)."""

    __tablename__ = "additional_documents"
    __table_args__ = (
        Index("ix_additional_documents_user_id", "user_id"),
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
    will_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("wills.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    document_type: str = Field(
        sa_column=Column(String(50), nullable=False),
    )
    status: str = Field(
        default="draft",
        sa_column=Column(String(50), nullable=False, server_default="draft"),
    )
    content: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="{}"),
    )
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
