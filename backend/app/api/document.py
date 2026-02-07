"""Document generation endpoints for will PDF preview and download.

POST /api/wills/{will_id}/preview -- Generate watermarked preview PDF
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from app.schemas.document import GeneratePreviewRequest
from app.services.document_service import (
    DocumentGenerationService,
    get_document_service,
)
from app.services.will_service import WillService, get_will_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wills", tags=["document"])

# Statuses that allow document generation.
_GENERATABLE_STATUSES = {"verified", "generated"}


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract authenticated user_id from request state.

    Mirrors the verification API's dev-fallback pattern: when CLERK_JWKS_URL
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


@router.post("/{will_id}/preview")
async def preview_will(
    will_id: uuid.UUID,
    body: GeneratePreviewRequest,
    request: Request,
    service: DocumentGenerationService = Depends(get_document_service),
    will_service: WillService = Depends(get_will_service),
):
    """Generate a watermarked preview PDF for a will.

    Requires:
    - ``disclaimer_acknowledged`` must be True (user accepted legal disclaimer).
    - Will must have status ``verified`` or ``generated`` (verification gate).

    Returns the PDF bytes inline so the browser's native PDF viewer can
    display it in a new tab.
    """
    # 1. Authenticate
    user_id = _extract_user_id(request)

    # 2. Disclaimer gate
    if not body.disclaimer_acknowledged:
        raise HTTPException(
            status_code=422,
            detail="You must acknowledge the legal disclaimer before generating a preview.",
        )

    # 3. Fetch will with ownership check, then verify status
    will = await will_service.get_will(will_id, user_id)

    # 4. Status gate -- must be verified or already generated
    if will.status not in _GENERATABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Will must be verified before generating a document. "
                f"Current status: {will.status}"
            ),
        )

    # 5. Generate watermarked preview PDF
    pdf_bytes = await service.generate_preview(will_id, user_id)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=will-preview.pdf",
            "Cache-Control": "no-store",
        },
    )
