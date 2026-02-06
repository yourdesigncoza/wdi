"""Pydantic schemas for AI-related endpoints."""

from typing import Optional

from pydantic import BaseModel, Field


class FilterTestRequest(BaseModel):
    """Body for POST /api/ai/filter-test."""

    text: str = Field(
        ...,
        description="AI-generated text to run through the UPL filter.",
        examples=["You should definitely include a trust clause"],
    )
    context: dict = Field(
        default_factory=dict,
        description="Filter context with optional category and will_type.",
        examples=[{"category": "trust", "will_type": "basic"}],
    )


class FilterTestResponse(BaseModel):
    """Result of running text through the UPL filter."""

    action: str = Field(description="Filter action: allow, replace, block, or refer")
    original_text: str
    filtered_text: str
    clause_code: Optional[str] = None
    reason: Optional[str] = None
    patterns_matched: list[str] = Field(default_factory=list)
