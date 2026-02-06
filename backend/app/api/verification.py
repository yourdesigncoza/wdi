"""Verification endpoints for AI-powered will verification.

POST /api/wills/{will_id}/verify          -- SSE streaming verification
GET  /api/wills/{will_id}/verification    -- Retrieve last verification result
POST /api/wills/{will_id}/acknowledge-warnings -- Acknowledge warning codes
"""

import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from app.schemas.verification import (
    AcknowledgeWarningsRequest,
    AcknowledgeWarningsResponse,
    VerificationResponse,
    VerificationResult,
)
from app.services.verification_service import (
    VerificationService,
    get_verification_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wills", tags=["verification"])


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract authenticated user_id from request state.

    Mirrors the conversation API's dev-fallback pattern: when CLERK_JWKS_URL
    is empty the auth middleware doesn't set user_id, so we use a
    deterministic UUID for local development.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        from app.config import settings

        if not settings.CLERK_JWKS_URL:
            return uuid.UUID("00000000-0000-0000-0000-000000000000")
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/{will_id}/verify")
async def verify_will(
    will_id: uuid.UUID,
    request: Request,
    service: VerificationService = Depends(get_verification_service),
):
    """Stream will verification progress via Server-Sent Events.

    Event types:
    - ``check`` -- progress updates (collecting_data, verifying, fallback, analyzing_results)
    - ``section_result`` -- per-section verification status
    - ``done`` -- final event with complete VerificationResult JSON
    - ``error`` -- if verification fails

    Verifies will ownership before starting verification.
    """
    user_id = _extract_user_id(request)

    async def event_generator():
        async for event in service.run_verification(will_id, user_id):
            if await request.is_disconnected():
                logger.info("Client disconnected during verification streaming")
                break
            yield event

    return EventSourceResponse(event_generator())


@router.get("/{will_id}/verification", response_model=VerificationResponse)
async def get_verification_result(
    will_id: uuid.UUID,
    request: Request,
    service: VerificationService = Depends(get_verification_service),
):
    """Retrieve the last saved verification result for a will.

    Returns the full verification result with metadata including
    has_blocking_errors flag and verified_at timestamp.
    Returns 404 if the will has not been verified yet.
    """
    user_id = _extract_user_id(request)

    result_data = await service.get_verification_result(will_id, user_id)
    if result_data is None:
        raise HTTPException(
            status_code=404,
            detail="No verification result found for this will",
        )

    # Parse stored JSONB back to typed model for computing derived fields
    result = VerificationResult.model_validate(result_data)
    has_errors = any(
        issue.severity == "error"
        for section in result.sections
        for issue in section.issues
    )

    return VerificationResponse(
        overall_status=result.overall_status,
        sections=result.sections,
        attorney_referral=result.attorney_referral,
        summary=result.summary,
        verified_at=result_data.get("verified_at", ""),
        has_blocking_errors=has_errors,
    )


@router.post(
    "/{will_id}/acknowledge-warnings",
    response_model=AcknowledgeWarningsResponse,
)
async def acknowledge_warnings(
    will_id: uuid.UUID,
    body: AcknowledgeWarningsRequest,
    request: Request,
    service: VerificationService = Depends(get_verification_service),
):
    """Acknowledge warning-level verification issues.

    Accepts a list of warning codes the user has reviewed and accepted.
    Returns the full acknowledged list and whether all blocking issues
    are resolved (can_proceed flag).
    """
    user_id = _extract_user_id(request)

    try:
        result = await service.acknowledge_warnings(
            will_id=will_id,
            user_id=user_id,
            warning_codes=body.warning_codes,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Will not found")

    return AcknowledgeWarningsResponse(
        acknowledged=result["acknowledged"],
        can_proceed=result["can_proceed"],
    )
