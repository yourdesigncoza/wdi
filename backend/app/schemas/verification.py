"""Pydantic schemas for AI verification results.

Defines structured output schemas for Gemini verification AND API response
models. Schemas are kept flat with Literal types (not Python Enum classes)
for Gemini structured output compatibility.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ── Gemini Structured Output Schemas ─────────────────────────────────
# These models define what Gemini returns. Keep flat for compatibility.

IssueSeverity = Literal["error", "warning", "info"]
SectionStatus = Literal["pass", "warning", "error"]
OverallStatus = Literal["pass", "warning", "error"]


class VerificationIssue(BaseModel):
    """A single verification issue found in the will."""

    code: str = Field(
        description="Machine-readable issue code, e.g. 'MISSING_TESTATOR'"
    )
    severity: IssueSeverity = Field(
        description="Issue severity: error (blocks), warning (needs ack), info (tip)"
    )
    section: str = Field(
        description="Will section this relates to, e.g. 'testator', 'beneficiaries'"
    )
    title: str = Field(
        description="Short human-readable title for the issue"
    )
    explanation: str = Field(
        description="Plain-language explanation of WHY this is a problem"
    )
    suggestion: str = Field(
        description="What the user should do to fix this issue"
    )


class SectionResult(BaseModel):
    """Verification result for a single will section."""

    section: str = Field(description="Section name")
    status: SectionStatus = Field(description="Section status: pass, warning, or error")
    issues: list[VerificationIssue] = Field(
        default_factory=list,
        description="Issues found in this section (empty list = pass)",
    )


class AttorneyReferral(BaseModel):
    """Attorney consultation recommendation."""

    recommended: bool = Field(
        description="Whether attorney consultation is recommended"
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="Reasons for recommendation, e.g. 'Testamentary trust provisions detected'",
    )


class VerificationResult(BaseModel):
    """Complete verification result from Gemini structured output.

    This is the primary schema used as Gemini's response_schema parameter.
    """

    overall_status: OverallStatus = Field(
        description="Worst severity found: pass (no issues), warning, or error"
    )
    sections: list[SectionResult] = Field(
        description="Per-section verification results"
    )
    attorney_referral: AttorneyReferral = Field(
        description="Attorney consultation recommendation"
    )
    summary: str = Field(
        description="One-paragraph plain-language summary of verification findings"
    )


# ── API Response Models ──────────────────────────────────────────────
# These wrap the Gemini result with API-specific metadata.
# NOT sent to Gemini as response_schema.


class VerificationResponse(BaseModel):
    """API response wrapping a verification result with metadata."""

    overall_status: OverallStatus
    sections: list[SectionResult]
    attorney_referral: AttorneyReferral
    summary: str
    verified_at: str = Field(description="ISO 8601 timestamp of verification")
    has_blocking_errors: bool = Field(
        description="True if any error-severity issues exist (blocks PDF generation)"
    )


class AcknowledgeWarningsRequest(BaseModel):
    """Request body to acknowledge warning-level issues."""

    warning_codes: list[str] = Field(
        description="List of warning codes the user acknowledges"
    )


class AcknowledgeWarningsResponse(BaseModel):
    """Response after acknowledging warnings."""

    acknowledged: list[str] = Field(
        description="Warning codes that were successfully acknowledged"
    )
    can_proceed: bool = Field(
        description="True if all blocking issues resolved and warnings acknowledged"
    )
