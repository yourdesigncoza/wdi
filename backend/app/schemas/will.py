"""Pydantic schemas for will section data and API payloads.

Covers all SA will data fields including basic will sections (testator,
marital, beneficiaries, assets, guardians, executor, bequests, residue)
and complex estate scenario sections (trust provisions, usufruct,
business assets, joint will).
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
    is_minor: bool = False


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


# ── Complex Estate Scenario Schemas ──────────────────────────────────


class TrustProvisionSchema(BaseModel):
    """Testamentary trust provision for minor beneficiaries."""

    trust_name: str
    minor_beneficiaries: list[str] = Field(default_factory=list)
    vesting_age: int = Field(default=18, ge=18, le=25)
    trustees: list[dict] = Field(
        default_factory=list,
        description="List of dicts with 'name', 'id_number', 'relationship' keys",
    )
    income_for_maintenance: bool = True
    capital_for_education: bool = True


class UsufructSchema(BaseModel):
    """Usufruct provision granting use-and-enjoyment rights."""

    property_description: str
    usufructuary_name: str
    usufructuary_id_number: Optional[str] = None
    bare_dominium_holders: list[dict] = Field(
        default_factory=list,
        description="List of dicts with 'name', 'id_number', 'share_percent' keys",
    )
    duration: str = "lifetime"


class BusinessAssetDetailSchema(BaseModel):
    """Detailed business asset entry for estate planning."""

    business_name: str
    business_type: str = Field(
        description="cc_member_interest | company_shares | partnership",
    )
    registration_number: Optional[str] = None
    percentage_held: Optional[float] = Field(default=None, ge=0, le=100)
    heir_name: Optional[str] = None
    heir_relationship: Optional[str] = None
    has_buy_sell_agreement: bool = False
    has_association_agreement: bool = False
    notes: Optional[str] = None


class JointWillSchema(BaseModel):
    """Joint will configuration for married couples."""

    co_testator_first_name: str
    co_testator_last_name: str
    co_testator_id_number: str = Field(pattern=r"^\d{13}$")
    will_structure: str = "mutual"  # mutual | mirror
    massing: bool = False
    irrevocability_acknowledged: bool = False


class ScenarioListSchema(BaseModel):
    """Active scenario list for a will."""

    scenarios: list[str] = Field(default_factory=list)


# ── API Payloads ─────────────────────────────────────────────────────


class WillCreateRequest(BaseModel):
    """Request body to create a new will."""

    will_type: str = "basic"


class WillSectionUpdate(BaseModel):
    """Generic section update payload."""

    section: str
    data: Any


class CurrentSectionUpdate(BaseModel):
    """Request body for updating the user's current wizard section."""

    current_section: str


class WillResponse(BaseModel):
    """Full will response for API output."""

    id: uuid.UUID
    user_id: uuid.UUID
    will_type: str
    status: str
    version: int = 1
    current_section: str = "personal"
    paid_at: Optional[datetime] = None
    testator: dict
    marital: dict
    beneficiaries: list
    assets: list
    guardians: list
    executor: dict
    bequests: list
    residue: dict
    trust_provisions: dict
    usufruct: dict
    business_assets: list
    joint_will: dict
    scenarios: list
    sections_complete: dict
    created_at: datetime
    updated_at: datetime
