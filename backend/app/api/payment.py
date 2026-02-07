"""Payment API endpoints for PayFast integration.

POST /api/payment/initiate    -- Create payment record, return PayFast form data
POST /api/payment/notify      -- ITN webhook (called by PayFast servers)
GET  /api/payment/{id}/status -- Poll payment status and download token
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.payment import Payment
from app.models.will import Will
from app.schemas.payment import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentStatusResponse,
)
from app.services.download_service import generate_download_token
from app.services.email_service import send_download_email
from app.services.payfast_service import (
    build_payment_form_data,
    get_payfast_url,
    is_valid_payfast_ip,
    validate_itn_server_confirmation,
    validate_itn_signature,
)
from app.services.will_service import WillService, get_will_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payment", tags=["payment"])

# Statuses that allow payment initiation (must have previewed).
_PAYABLE_STATUSES = {"generated", "verified"}


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract authenticated user_id from request state.

    Mirrors document.py's dev-fallback pattern: when CLERK_JWKS_URL is
    empty the auth middleware doesn't set user_id, so we use a
    deterministic UUID for local development.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        if not settings.CLERK_JWKS_URL:
            return uuid.UUID("00000000-0000-0000-0000-000000000000")
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


# ---------------------------------------------------------------------------
# POST /api/payment/initiate
# ---------------------------------------------------------------------------


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    body: PaymentInitiateRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    will_service: WillService = Depends(get_will_service),
):
    """Create a Payment record and return PayFast form data for checkout."""
    user_id = _extract_user_id(request)
    will_id = uuid.UUID(body.will_id)

    # Validate will exists and belongs to user.
    will = await will_service.get_will(will_id, user_id)

    # Status gate: must have previewed (generated or verified).
    if will.status not in _PAYABLE_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Will must be verified or generated before payment. "
                f"Current status: {will.status}"
            ),
        )

    # Create payment record.
    m_payment_id = f"PAY-{uuid.uuid4().hex[:12]}"
    payment = Payment(
        will_id=will_id,
        user_id=user_id,
        m_payment_id=m_payment_id,
        amount=settings.WILL_PRICE,
        status="pending",
    )
    session.add(payment)
    await session.flush()
    await session.refresh(payment)

    # Extract testator details with safe fallbacks.
    testator = will.testator or {}
    buyer_first = testator.get("first_name", "Customer")
    buyer_last = testator.get("last_name", "")
    buyer_email = testator.get("email", "")

    # Build PayFast form data with signature.
    form_data = build_payment_form_data(
        m_payment_id=m_payment_id,
        amount=settings.WILL_PRICE,
        item_name="WillCraft SA - Last Will and Testament",
        buyer_email=buyer_email,
        buyer_first=buyer_first,
        buyer_last=buyer_last,
    )

    return PaymentInitiateResponse(
        payment_id=str(payment.id),
        m_payment_id=m_payment_id,
        payfast_url=get_payfast_url(),
        form_data=form_data,
    )


# ---------------------------------------------------------------------------
# POST /api/payment/notify  (ITN webhook -- NO auth required)
# ---------------------------------------------------------------------------


@router.post("/notify")
async def payment_notify(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Handle PayFast ITN (Instant Transaction Notification) callback.

    This endpoint is called by PayFast servers after a payment event.
    It ALWAYS returns 200 OK as required by PayFast.
    Processing is idempotent -- re-processing a completed payment is a no-op.
    """
    # 1. Parse POST form data.
    form = await request.form()
    post_data: dict[str, str] = {k: str(v) for k, v in form.items()}

    logger.info("ITN received: m_payment_id=%s", post_data.get("m_payment_id"))

    # 2. Validate signature.
    passphrase = settings.PAYFAST_PASSPHRASE or None
    if not validate_itn_signature(post_data, passphrase):
        logger.warning("ITN signature validation failed for %s", post_data.get("m_payment_id"))
        return JSONResponse(status_code=200, content={"status": "ok"})

    # 3. Validate source IP (log warning only -- may be proxied in dev).
    client_ip = request.client.host if request.client else "unknown"
    if not is_valid_payfast_ip(client_ip):
        logger.warning("ITN from non-PayFast IP: %s", client_ip)

    # 4. Look up payment by merchant payment ID.
    m_payment_id = post_data.get("m_payment_id", "")
    stmt = select(Payment).where(Payment.m_payment_id == m_payment_id)
    result = await session.exec(stmt)
    payment = result.first()

    if payment is None:
        logger.error("ITN for unknown m_payment_id: %s", m_payment_id)
        return JSONResponse(status_code=200, content={"status": "ok"})

    # 5. Idempotency: if already completed, skip processing.
    if payment.status == "completed":
        logger.info("ITN duplicate for already-completed payment %s", payment.id)
        return JSONResponse(status_code=200, content={"status": "ok"})

    # 6. Validate amount matches.
    itn_amount = post_data.get("amount_gross", "")
    if itn_amount and itn_amount != payment.amount:
        logger.error(
            "ITN amount mismatch: expected %s, got %s for payment %s",
            payment.amount, itn_amount, payment.id,
        )
        return JSONResponse(status_code=200, content={"status": "ok"})

    # 7. Server-to-server confirmation (log warning if fails).
    server_valid = await validate_itn_server_confirmation(post_data)
    if not server_valid:
        logger.warning("ITN server confirmation failed for payment %s", payment.id)

    # 8. Process based on payment status from PayFast.
    payment_status = post_data.get("payment_status", "")

    if payment_status == "COMPLETE":
        # Update payment record.
        payment.status = "completed"
        payment.pf_payment_id = post_data.get("pf_payment_id")
        payment.itn_data = post_data
        payment.updated_at = datetime.now(timezone.utc)

        # Generate download token.
        token = generate_download_token(str(payment.will_id), str(payment.id))
        payment.download_token = token

        # Update will paid_at timestamp.
        will_stmt = select(Will).where(Will.id == payment.will_id)
        will_result = await session.exec(will_stmt)
        will = will_result.first()
        if will:
            will.paid_at = datetime.now(timezone.utc)
            session.add(will)

        # Build download URL and fire-and-forget email.
        base_url = settings.PAYFAST_RETURN_URL.rsplit("/payment", 1)[0]
        download_url = f"{base_url}/download/{token}"

        testator = will.testator if will else {}
        testator_name = (
            f"{testator.get('first_name', '')} {testator.get('last_name', '')}".strip()
            or "Customer"
        )
        recipient_email = testator.get("email", "") if testator else ""

        if recipient_email:
            asyncio.create_task(
                send_download_email(recipient_email, testator_name, download_url)
            )
            payment.email_sent = True
            payment.email_sent_at = datetime.now(timezone.utc)

        session.add(payment)
        logger.info("Payment %s completed successfully", payment.id)

    elif payment_status in ("FAILED", "CANCELLED"):
        payment.status = payment_status.lower()
        payment.itn_data = post_data
        payment.updated_at = datetime.now(timezone.utc)
        session.add(payment)
        logger.info("Payment %s marked as %s", payment.id, payment.status)

    return JSONResponse(status_code=200, content={"status": "ok"})


# ---------------------------------------------------------------------------
# GET /api/payment/{payment_id}/status
# ---------------------------------------------------------------------------


@router.get("/{payment_id}/status", response_model=PaymentStatusResponse)
async def payment_status(
    payment_id: uuid.UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Poll payment status and download token (if completed)."""
    user_id = _extract_user_id(request)

    stmt = select(Payment).where(Payment.id == payment_id)
    result = await session.exec(stmt)
    payment = result.first()

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return PaymentStatusResponse(
        payment_id=str(payment.id),
        status=payment.status,
        download_token=payment.download_token if payment.status == "completed" else None,
    )
