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


EXTRACTION_SYSTEM_PROMPT: str = (
    "Extract any will-related data from the user's message. "
    "Only extract data that was explicitly stated by the user. "
    "Do not infer or assume information that was not mentioned. "
    "If something is unclear or ambiguous, add it to needs_clarification. "
    "For South African wills, pay attention to: beneficiary names and "
    "relationships, SA ID numbers (13 digits), asset descriptions, "
    "guardian nominations for minor children, and executor appointments."
)
