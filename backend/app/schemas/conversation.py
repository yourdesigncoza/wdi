"""Pydantic schemas for conversation endpoints.

Covers message format, conversation request/response payloads,
and SSE event structure for streaming AI responses.
"""

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class MessageSchema(BaseModel):
    """Single message in a conversation."""

    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None


class ConversationRequest(BaseModel):
    """Request body for the conversation streaming endpoint."""

    will_id: uuid.UUID
    messages: list[MessageSchema]
    current_section: str
    will_context: dict


class ConversationResponse(BaseModel):
    """Non-streaming conversation response (section history)."""

    will_id: uuid.UUID
    section: str
    messages: list[MessageSchema]


class ExtractionResponse(BaseModel):
    """Response from the data extraction endpoint."""

    extracted: dict
    has_data: bool


class SSEEvent(BaseModel):
    """Server-Sent Event payload."""

    event: str
    data: dict
