"""Additional documents API endpoints (living will + funeral wishes).

CRUD operations and PDF generation for additional estate planning documents.
"""

import io
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from app.schemas.additional_document import (
    AdditionalDocumentCreate,
    AdditionalDocumentResponse,
    AdditionalDocumentUpdate,
)
from app.services.additional_document_service import (
    AdditionalDocumentService,
    get_additional_document_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/additional-documents",
    tags=["additional-documents"],
)


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract authenticated user_id from request state.

    Falls back to dev UUID when Clerk auth is disabled.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        from app.config import settings

        if not settings.CLERK_JWKS_URL:
            return uuid.UUID("00000000-0000-0000-0000-000000000000")
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/", response_model=AdditionalDocumentResponse, status_code=201)
async def create_document(
    body: AdditionalDocumentCreate,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Create a new additional document (living will or funeral wishes)."""
    user_id = _extract_user_id(request)
    will_id = uuid.UUID(body.will_id) if body.will_id else None
    doc = await service.create(
        user_id=user_id,
        document_type=body.document_type,
        will_id=will_id,
    )
    return doc


@router.get("/", response_model=list[AdditionalDocumentResponse])
async def list_documents(
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """List all additional documents for the authenticated user."""
    user_id = _extract_user_id(request)
    return await service.list_by_user(user_id)


@router.get("/{doc_id}", response_model=AdditionalDocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Get a single additional document by ID."""
    user_id = _extract_user_id(request)
    return await service.get(doc_id, user_id)


@router.patch("/{doc_id}", response_model=AdditionalDocumentResponse)
async def update_document(
    doc_id: uuid.UUID,
    body: AdditionalDocumentUpdate,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Update additional document content and optionally status."""
    user_id = _extract_user_id(request)
    return await service.update(
        doc_id=doc_id,
        user_id=user_id,
        content=body.content,
        status=body.status,
    )


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: uuid.UUID,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Delete an additional document."""
    user_id = _extract_user_id(request)
    await service.delete(doc_id, user_id)
    return Response(status_code=204)


@router.post("/{doc_id}/preview")
async def preview_document(
    doc_id: uuid.UUID,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Generate a watermarked preview PDF for an additional document."""
    user_id = _extract_user_id(request)
    pdf_bytes = await service.generate_pdf(doc_id, user_id, is_preview=True)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=document-preview.pdf",
            "Cache-Control": "no-store",
        },
    )


@router.post("/{doc_id}/generate")
async def generate_document(
    doc_id: uuid.UUID,
    request: Request,
    service: AdditionalDocumentService = Depends(get_additional_document_service),
):
    """Generate the final PDF (no watermark) and update status to 'generated'."""
    user_id = _extract_user_id(request)
    pdf_bytes = await service.generate_pdf(doc_id, user_id, is_preview=False)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=document.pdf",
            "Cache-Control": "no-store",
        },
    )
