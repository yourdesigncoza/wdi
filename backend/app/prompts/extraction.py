"""Pydantic models for OpenAI Structured Output extraction.

These models define the schema for extracting structured will data from
natural language conversation turns. Used with client.chat.completions.parse()
for guaranteed schema-valid JSON responses.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ExtractedBeneficiary(BaseModel):
    """Beneficiary data extracted from conversation."""

    full_name: str = Field(description="Full name of the beneficiary")
    relationship: str = Field(
        description="Relationship to testator (spouse, child, sibling, friend, charity, etc.)"
    )
    id_number: Optional[str] = Field(
        default=None, description="SA ID number if mentioned"
    )
    share_percent: Optional[float] = Field(
        default=None, description="Percentage share if specified"
    )
    is_charity: bool = Field(
        default=False,
        description="Whether this is a charity or organisation rather than an individual",
    )


class ExtractedAsset(BaseModel):
    """Asset data extracted from conversation."""

    asset_type: str = Field(
        description=(
            "Type of asset: property, vehicle, bank_account, investment, "
            "insurance, business, other"
        )
    )
    description: str = Field(description="Description of the asset")
    details: Optional[str] = Field(
        default=None,
        description="Additional details (registration, policy number, etc.)",
    )


class ExtractedGuardian(BaseModel):
    """Guardian data extracted from conversation."""

    full_name: str = Field(description="Full name of the guardian")
    relationship: str = Field(description="Relationship to testator")
    is_primary: bool = Field(
        default=True,
        description="True for primary guardian, False for backup",
    )


class ExtractedExecutor(BaseModel):
    """Executor data extracted from conversation."""

    name: str = Field(description="Name of the executor (person or firm)")
    relationship: Optional[str] = Field(
        default=None,
        description="Relationship to testator, if personal executor",
    )
    is_professional: bool = Field(
        default=False,
        description="Whether this is a professional executor (attorney, bank, trust company)",
    )
    backup_name: Optional[str] = Field(
        default=None, description="Name of backup executor if mentioned"
    )


class ExtractedTrustData(BaseModel):
    """Testamentary trust data extracted from conversation."""

    trust_name: Optional[str] = Field(
        default=None, description="Name of the testamentary trust"
    )
    minor_beneficiaries: list[str] = Field(
        default_factory=list,
        description="Names of minor children who are trust beneficiaries",
    )
    vesting_age: Optional[int] = Field(
        default=None,
        description="Age at which beneficiaries receive assets outright (18, 21, or 25)",
    )
    trustees: list[dict] = Field(
        default_factory=list,
        description="Trustee nominations: [{name, relationship, is_independent}]",
    )
    income_for_maintenance: Optional[bool] = Field(
        default=None,
        description="Whether trust income may be used for maintenance and education",
    )
    capital_for_education: Optional[bool] = Field(
        default=None,
        description="Whether trustee may use capital for education if income insufficient",
    )


class ExtractedUsufructData(BaseModel):
    """Usufruct details extracted from conversation."""

    property_description: Optional[str] = Field(
        default=None, description="Description of the property subject to usufruct"
    )
    usufructuary_name: Optional[str] = Field(
        default=None, description="Name of the person who receives usage rights"
    )
    bare_dominium_holders: list[dict] = Field(
        default_factory=list,
        description="Ownership holders: [{name, share}]",
    )
    duration: Optional[str] = Field(
        default=None,
        description="Duration of usufruct (e.g. 'lifetime', '10 years')",
    )


class ExtractedBusinessData(BaseModel):
    """Business asset data extracted from conversation."""

    business_name: Optional[str] = Field(
        default=None, description="Registered name of the business"
    )
    business_type: Optional[str] = Field(
        default=None,
        description="Entity type: CC, Pty Ltd, partnership, sole_proprietor",
    )
    registration_number: Optional[str] = Field(
        default=None, description="Company or CC registration number"
    )
    percentage_held: Optional[float] = Field(
        default=None, description="Percentage of shares or member interest held"
    )
    heir_name: Optional[str] = Field(
        default=None, description="Name of person who should inherit the interest"
    )
    has_buy_sell_agreement: Optional[bool] = Field(
        default=None, description="Whether a buy-sell agreement is in place"
    )
    has_association_agreement: Optional[bool] = Field(
        default=None, description="Whether an Association Agreement exists (for CCs)"
    )


class ExtractedWillData(BaseModel):
    """Composite structured data extracted from a conversation turn.

    Used as response_format with OpenAI Structured Outputs to parse
    natural language into will data fields.
    """

    beneficiaries: list[ExtractedBeneficiary] = Field(default_factory=list)
    assets: list[ExtractedAsset] = Field(default_factory=list)
    guardians: list[ExtractedGuardian] = Field(default_factory=list)
    executor: Optional[ExtractedExecutor] = None
    bequests: list[dict] = Field(
        default_factory=list,
        description="Specific bequests: [{item, recipient, details}]",
    )
    needs_clarification: list[str] = Field(
        default_factory=list,
        description="Items that need follow-up questions from the user",
    )
    # Complex estate scenario fields
    trust: Optional[ExtractedTrustData] = Field(
        default=None, description="Testamentary trust provisions if discussed"
    )
    usufruct_data: Optional[ExtractedUsufructData] = Field(
        default=None, description="Usufruct details if discussed"
    )
    business_data: list[ExtractedBusinessData] = Field(
        default_factory=list,
        description="Business asset information if discussed",
    )


EXTRACTION_SYSTEM_PROMPT: str = (
    "Extract ALL will-related data from the ENTIRE conversation below. "
    "Consider every message in the conversation, not just the last one. "
    "Compile a complete picture of what the user has stated across all their messages. "
    "Only extract data that was explicitly stated by the user. "
    "Do not infer or assume information that was not mentioned. "
    "If something is unclear or ambiguous, add it to needs_clarification. "
    "For South African wills, pay attention to: beneficiary names and "
    "relationships, SA ID numbers (13 digits), asset descriptions, "
    "guardian nominations for minor children, and executor appointments. "
    "Also extract trust provisions (trust name, vesting age, trustees), "
    "usufruct details (property, usufructuary, bare dominium holders), "
    "and business asset information (business name, type, registration "
    "number, percentage held, heir) when discussed."
)
