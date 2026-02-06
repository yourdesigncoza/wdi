"""Clause library endpoints.

GET  /api/clauses          -- List all current clauses (filterable)
GET  /api/clauses/{code}   -- Get a specific clause by code
POST /api/clauses/render   -- Render a clause template with variables
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.clause import ClauseCategory, WillType
from app.schemas.clause import (
    ClauseListResponse,
    ClauseRenderRequest,
    ClauseRenderResponse,
    ClauseResponse,
)
from app.services.clause_library import ClauseLibraryService, get_clause_service

router = APIRouter(tags=["clauses"])


def _clause_to_response(clause) -> ClauseResponse:
    """Map a Clause model instance to a ClauseResponse schema."""
    return ClauseResponse(
        id=clause.id,
        code=clause.code,
        name=clause.name,
        category=clause.category,
        version=clause.version,
        template_text=clause.template_text,
        variables_schema=clause.variables_schema,
        will_types=clause.will_types,
        is_required=clause.is_required,
        display_order=clause.display_order,
    )


@router.get("/api/clauses", response_model=ClauseListResponse)
async def list_clauses(
    category: Optional[ClauseCategory] = Query(
        default=None, description="Filter by clause category"
    ),
    will_type: Optional[WillType] = Query(
        default=None, description="Filter by will type"
    ),
    svc: ClauseLibraryService = Depends(get_clause_service),
):
    """List all current clauses, optionally filtered by category and will type."""
    effective_will_type = will_type or WillType.BASIC

    if category:
        clauses = await svc.get_clauses_by_category(category, effective_will_type)
    else:
        # Gather clauses from all categories for the given will type.
        all_clauses: list = []
        for cat in ClauseCategory:
            all_clauses.extend(
                await svc.get_clauses_by_category(cat, effective_will_type)
            )
        # Sort by display_order for consistent ordering.
        all_clauses.sort(key=lambda c: c.display_order)
        clauses = all_clauses

    return ClauseListResponse(
        clauses=[_clause_to_response(c) for c in clauses],
        total=len(clauses),
    )


@router.get("/api/clauses/{code}", response_model=ClauseResponse)
async def get_clause(
    code: str,
    version: Optional[int] = Query(
        default=None, description="Specific version (defaults to current)"
    ),
    svc: ClauseLibraryService = Depends(get_clause_service),
):
    """Get a specific clause by its unique code."""
    clause = await svc.get_clause_by_code(code, version=version)
    if clause is None:
        raise HTTPException(status_code=404, detail=f"Clause '{code}' not found")
    return _clause_to_response(clause)


@router.post("/api/clauses/render", response_model=ClauseRenderResponse)
async def render_clause(
    body: ClauseRenderRequest,
    svc: ClauseLibraryService = Depends(get_clause_service),
):
    """Render a clause template with the provided variables."""
    clause = await svc.get_clause_by_code(body.clause_code)
    if clause is None:
        raise HTTPException(
            status_code=404,
            detail=f"Clause '{body.clause_code}' not found",
        )

    try:
        rendered = svc.render_clause(clause, body.variables)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ClauseRenderResponse(
        rendered_text=rendered,
        clause_code=clause.code,
        clause_version=clause.version,
    )
