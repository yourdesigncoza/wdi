"""User model linked to Clerk authentication.

Stores only the minimal local record -- profile data stays in Clerk.
Created lazily on first authenticated API call.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """Local user record linked by Clerk external user ID."""

    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_clerk_user_id", "clerk_user_id", unique=True),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )

    # Clerk external user ID (e.g. "user_2x...")
    clerk_user_id: str = Field(
        sa_column=Column(String(255), nullable=False, unique=True),
    )

    # Email synced from Clerk on creation
    email: str = Field(
        sa_column=Column(String(320), nullable=False),
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
