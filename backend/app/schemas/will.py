"""Pydantic schemas for will section data and API payloads.

Covers all SA will data fields for a basic will: testator details,
marital status, beneficiaries, assets, guardians, executor, bequests,
and residual estate distribution.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────────


class MaritalStatus(str, Enum):
    """South African marital status categories."""

    SINGLE = "single"
    MARRIED_IN_COMMUNITY = "married_in_community"
    MARRIED_ANC = "married_anc"  # ante-nuptial contract
    MARRIED_COP = "married_cop"  # community of property
    DIVORCED = "divorced"
    WIDOWED = "widowed"


class Province(str, Enum):
    """South African provinces."""

    EASTERN_CAPE = "EC"
    FREE_STATE = "FS"
    GAUTENG = "GP"
    KWAZULU_NATAL = "KZN"
    LIMPOPO = "LP"
    MPUMALANGA = "MP"
    NORTHERN_CAPE = "NC"
    NORTH_WEST = "NW"
    WESTERN_CAPE = "WC"


class AssetType(str, Enum):
    """Asset categories for will inventory."""

    PROPERTY = "property"
    VEHICLE = "vehicle"
    BANK_ACCOUNT = "bank_account"
    INVESTMENT = "investment"
    INSURANCE = "insurance"
    BUSINESS = "business"
    OTHER = "other"


# ── Section Schemas ──────────────────────────────────────────────────


class TestatorSchema(BaseModel):
    """Testator (will-maker) personal details."""

    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    id_number: str = Field(pattern=r"^\d{13}$")  # SA ID: 13 digits
    date_of_birth: str  # ISO format YYYY-MM-DD
    address: str
    city: str
    province: Province
    postal_code: str = Field(pattern=r"^\d{4}$")
    phone: Optional[str] = None
    email: Optional[str] = None


class MaritalSchema(BaseModel):
    """Marital status and spouse details."""

    status: MaritalStatus
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_id_number: Optional[str] = None
    married_outside_sa: bool = False
    marriage_country: Optional[str] = None


class BeneficiarySchema(BaseModel):
    """Will beneficiary (person or charity)."""

    full_name: str
    relationship: str
    id_number: Optional[str] = None
    share_percent: Optional[float] = Field(default=None, ge=0, le=100)
    alternate_beneficiary: Optional[str] = None
    is_charity: bool = False


class AssetSchema(BaseModel):
    """Estate asset entry."""

    asset_type: AssetType
    description: str
    details: Optional[dict] = None  # Flexible for type-specific details


class GuardianSchema(BaseModel):
    """Guardian nomination for minor children."""

    full_name: str
    relationship: str
    id_number: Optional[str] = None
    is_primary: bool = True  # False = backup guardian


class ExecutorSchema(BaseModel):
    """Estate executor nomination."""

    name: str
    relationship: Optional[str] = None
    is_professional: bool = False  # Professional executor (attorney/bank)
    backup_name: Optional[str] = None
    backup_relationship: Optional[str] = None


class BequestSchema(BaseModel):
    """Specific bequest of an item to a named recipient."""

    item_description: str
    recipient_name: str
    recipient_relationship: Optional[str] = None


class ResidueSchema(BaseModel):
    """Residual estate distribution."""

    beneficiaries: list[dict] = Field(
        default_factory=list,
        description="List of dicts with 'name' and 'share_percent' keys",
    )
    simultaneous_death_clause: Optional[str] = None


# ── API Payloads ─────────────────────────────────────────────────────


class WillCreateRequest(BaseModel):
    """Request body to create a new will."""

    will_type: str = "basic"


class WillSectionUpdate(BaseModel):
    """Generic section update payload."""

    section: str
    data: Any


class WillResponse(BaseModel):
    """Full will response for API output."""

    id: uuid.UUID
    user_id: uuid.UUID
    will_type: str
    status: str
    testator: dict
    marital: dict
    beneficiaries: list
    assets: list
    guardians: list
    executor: dict
    bequests: list
    residue: dict
    sections_complete: dict
    created_at: datetime
    updated_at: datetime
