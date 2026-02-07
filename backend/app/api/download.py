"""Secure download endpoint for paid will documents.

GET /api/download/{token} -- Verify token and return final unwatermarked PDF
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.payment import Payment
from app.services.document_service import (
    DocumentGenerationService,
    get_document_service,
)
from app.services.download_service import verify_download_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/download", tags=["download"])


@router.get("/{token}")
async def download_will(
    token: str,
    session: AsyncSession = Depends(get_session),
    doc_service: DocumentGenerationService = Depends(get_document_service),
):
    """Download the final unwatermarked will PDF using a secure token.

    The token IS the authentication -- no session/JWT required.
    Tokens are time-limited (default 24 hours) and encode will_id + payment_id.
    """
    # 1. Verify and decode token.
    data = verify_download_token(token)
    if data is None:
        raise HTTPException(status_code=403, detail="Invalid or expired download link")

    will_id = uuid.UUID(data["will_id"])
    payment_id = uuid.UUID(data["payment_id"])

    # 2. Verify payment exists, is completed, and token matches.
    stmt = select(Payment).where(Payment.id == payment_id)
    result = await session.exec(stmt)
    payment = result.first()

    if payment is None:
        raise HTTPException(status_code=403, detail="Invalid or expired download link")

    if payment.status != "completed" or payment.download_token != token:
        raise HTTPException(status_code=403, detail="Invalid or expired download link")

    # 3. Generate final (unwatermarked) PDF.
    user_id = payment.user_id
    pdf_bytes = await doc_service.generate_final(will_id, user_id)

    # 4. Return as attachment download.
    will_id_short = str(will_id)[:8].upper()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="WillCraft-SA-Will-{will_id_short}.pdf"',
            "Cache-Control": "no-store",
        },
    )
