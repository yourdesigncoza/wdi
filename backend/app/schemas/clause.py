"""Pydantic schemas for clause library endpoints."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field

from app.models.clause import ClauseCategory, WillType


class ClauseResponse(BaseModel):
    """Single clause representation returned by the API."""

    id: uuid.UUID
    code: str
    name: str
    category: ClauseCategory
    version: int
    template_text: str
    variables_schema: dict
    will_types: list[str]
    is_required: bool
    display_order: int


class ClauseRenderRequest(BaseModel):
    """Body for POST /api/clauses/render."""

    clause_code: str = Field(
        ...,
        description="Unique code of the clause template to render.",
        examples=["EXEC-01"],
    )
    variables: dict = Field(
        default_factory=dict,
        description="Variable values to substitute into the template.",
        examples=[{"executor_name": "John Smith", "executor_id": "8001015009087"}],
    )


class ClauseRenderResponse(BaseModel):
    """Rendered clause text returned by the API."""

    rendered_text: str
    clause_code: str
    clause_version: int


class ClauseListResponse(BaseModel):
    """Paginated list of clauses."""

    clauses: list[ClauseResponse]
    total: int


class ClauseListParams(BaseModel):
    """Query parameters for GET /api/clauses."""

    category: Optional[ClauseCategory] = None
    will_type: Optional[WillType] = None
