"""Pydantic schemas for consent endpoints."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConsentRequest(BaseModel):
    """Body for POST /api/consent."""

    categories: list[str] = Field(
        ...,
        min_length=1,
        description="List of POPIA processing categories the user consents to.",
        examples=[["will_generation", "data_storage", "ai_processing"]],
    )


class ConsentResponse(BaseModel):
    """Returned after successfully recording consent."""

    consent_id: uuid.UUID
    accepted_at: datetime
    consent_version: str
    consent_token: str = ""


class ConsentStatusResponse(BaseModel):
    """Returned by GET /api/consent/status."""

    has_valid_consent: bool
    consent_version: Optional[str] = None
    consent_token: Optional[str] = None


class DataRequestBody(BaseModel):
    """Body for POST /api/data-request."""

    request_type: str = Field(
        ...,
        description="Type of data subject request.",
        examples=["access", "correction", "deletion"],
    )
    details: Optional[str] = Field(
        default=None,
        description="Additional details about the request.",
    )


class DataRequestResponse(BaseModel):
    """Confirmation of a data subject request."""

    reference_id: uuid.UUID
    request_type: str
    status: str = "received"
    message: str
