"""AI-related endpoints.

POST /api/ai/filter-test  -- Test the UPL filter with provided text.

This endpoint is for development/testing purposes. In production
(Phase 3+), the filter is integrated into the conversation flow.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.schemas.ai import FilterTestRequest, FilterTestResponse
from app.services.audit_service import AuditService
from app.services.clause_library import ClauseLibraryService
from app.services.upl_filter import UPLFilterService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


@router.post("/api/ai/filter-test", response_model=FilterTestResponse)
async def filter_test(
    body: FilterTestRequest,
    session: AsyncSession = Depends(get_session),
):
    """Run text through the UPL filter and return the result.

    Requires POPIA consent (enforced by middleware).
    """
    clause_service = ClauseLibraryService(session=session)
    audit_service = AuditService(session=session)
    upl_filter = UPLFilterService(
        clause_service=clause_service,
        audit_service=audit_service,
    )

    result = await upl_filter.filter_output(
        text=body.text,
        context=body.context,
    )

    # Log the test invocation itself (fire-and-forget).
    asyncio.create_task(
        audit_service.log_event(
            event_type="upl_filter_test",
            event_category="compliance",
            session_id=body.context.get("session_id"),
            details={
                "action": result.action.value,
                "patterns_matched": result.patterns_matched,
            },
        )
    )

    return FilterTestResponse(
        action=result.action.value,
        original_text=result.original_text,
        filtered_text=result.filtered_text,
        clause_code=result.clause_code,
        reason=result.reason,
        patterns_matched=result.patterns_matched,
    )
