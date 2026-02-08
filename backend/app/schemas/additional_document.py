"""Pydantic schemas for additional documents (living will + funeral wishes).

Defines content shapes for JSONB storage and API request/response models.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# JSONB content shapes
# ---------------------------------------------------------------------------


class LivingWillContent(BaseModel):
    """Living will (advance healthcare directive) JSONB content shape."""

    # Personal details
    full_name: str = ""
    id_number: str = ""
    date_of_birth: str = ""
    address: str = ""

    # Treatment preferences (default: refuse most, accept pain management)
    life_support: bool = False
    artificial_ventilation: bool = False
    artificial_nutrition: bool = False
    resuscitation_cpr: bool = False
    antibiotics_terminal: bool = False
    pain_management: bool = True

    # Trigger conditions (when directive applies)
    terminal_illness: bool = True
    permanent_vegetative_state: bool = True
    permanent_unconsciousness: bool = True

    # Healthcare proxy
    proxy_name: str | None = None
    proxy_id_number: str | None = None
    proxy_phone: str | None = None
    proxy_relationship: str | None = None
    alternate_proxy_name: str | None = None

    # Values and wishes
    personal_values: str | None = None
    religious_considerations: str | None = None
    organ_donation: bool | None = None
    organ_donation_details: str | None = None


class FuneralWishesContent(BaseModel):
    """Funeral wishes document JSONB content shape."""

    # Personal details
    full_name: str = ""
    id_number: str = ""

    # Body disposition
    disposition: str = ""  # "burial" | "cremation"
    embalming: bool | None = None

    # Burial specifics
    cemetery_name: str | None = None
    burial_location_details: str | None = None
    casket_preference: str | None = None

    # Cremation specifics
    ashes_instruction: str | None = None  # "scatter" | "urn" | "other"
    ashes_details: str | None = None

    # Ceremony preferences
    ceremony_type: str | None = None  # "religious" | "secular" | "celebration_of_life" | "none"
    ceremony_location: str | None = None
    religious_denomination: str | None = None
    officiant_preference: str | None = None

    # Music and readings
    music_preferences: str | None = None
    readings_or_poems: str | None = None

    # Attendees and notifications
    specific_attendees: str | None = None

    # Budget
    budget_preference: str | None = None  # "economical" | "moderate" | "elaborate"

    # Additional wishes
    additional_wishes: str | None = None
    messages_to_family: str | None = None


# ---------------------------------------------------------------------------
# API request / response schemas
# ---------------------------------------------------------------------------


class AdditionalDocumentCreate(BaseModel):
    """Request body for creating a new additional document."""

    document_type: str
    will_id: str | None = None


class AdditionalDocumentUpdate(BaseModel):
    """Request body for updating additional document content."""

    content: dict
    status: str | None = None


class AdditionalDocumentResponse(BaseModel):
    """API response for additional document."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    will_id: uuid.UUID | None
    document_type: str
    status: str
    content: dict
    created_at: datetime
    updated_at: datetime
