"""Consent management endpoints.

POST /api/consent          -- Record consent, issue signed cookie
GET  /api/consent/status   -- Check if caller has valid consent
POST /api/consent/withdraw -- Withdraw consent, clear cookie
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Request, Response
from jose import jwt

from app.config import settings
from app.database import async_session
from app.middleware.popia_consent import CONSENT_COOKIE_NAME, JWT_ALGORITHM
from app.models.consent import ConsentRecord
from app.schemas.consent import ConsentRequest, ConsentResponse, ConsentStatusResponse
from app.services.audit_service import AuditService

router = APIRouter(tags=["consent"])

# Consent cookie lifetime: 365 days.
_CONSENT_MAX_AGE = 60 * 60 * 24 * 365


def _build_consent_token(consent_id: str) -> str:
    """Create a signed JWT representing valid POPIA consent."""
    now = datetime.now(timezone.utc)
    payload = {
        "type": "popia_consent",
        "consent_id": consent_id,
        "consent_version": settings.CONSENT_VERSION,
        "iat": now,
        "exp": now + timedelta(days=365),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


@router.post("/api/consent", response_model=ConsentResponse)
async def grant_consent(body: ConsentRequest, request: Request, response: Response):
    """Record POPIA consent and issue a signed cookie."""
    async with async_session() as session:
        record = ConsentRecord(
            consent_version=settings.CONSENT_VERSION,
            privacy_policy_version=settings.PRIVACY_POLICY_VERSION,
            consent_categories=body.categories,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)

    # Audit trail.
    audit = AuditService()
    await audit.log_event(
        event_type="consent_granted",
        event_category="popia",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        resource_type="consent_record",
        resource_id=record.id,
        details={
            "consent_version": settings.CONSENT_VERSION,
            "categories": body.categories,
        },
    )

    # Set httpOnly cookie with signed JWT.
    token = _build_consent_token(str(record.id))
    is_production = not settings.DEBUG
    response.set_cookie(
        key=CONSENT_COOKIE_NAME,
        value=token,
        max_age=_CONSENT_MAX_AGE,
        httponly=True,
        samesite="none" if is_production else "lax",
        secure=is_production,
    )

    return ConsentResponse(
        consent_id=record.id,
        accepted_at=record.accepted_at,
        consent_version=record.consent_version,
    )


@router.get("/api/consent/status", response_model=ConsentStatusResponse)
async def consent_status(request: Request):
    """Check whether the caller has a valid consent cookie."""
    token = request.cookies.get(CONSENT_COOKIE_NAME)
    if not token:
        return ConsentStatusResponse(has_valid_consent=False)

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM]
        )
        if payload.get("type") != "popia_consent":
            return ConsentStatusResponse(has_valid_consent=False)
        return ConsentStatusResponse(
            has_valid_consent=True,
            consent_version=payload.get("consent_version"),
        )
    except Exception:
        return ConsentStatusResponse(has_valid_consent=False)


@router.post("/api/consent/withdraw")
async def withdraw_consent(request: Request, response: Response):
    """Mark consent as withdrawn and clear the cookie."""
    token = request.cookies.get(CONSENT_COOKIE_NAME)
    consent_id = None

    if token:
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM]
            )
            consent_id = payload.get("consent_id")
        except Exception:
            pass

    # Attempt to mark the DB record as withdrawn.
    if consent_id:
        from sqlmodel import select
        from uuid import UUID

        async with async_session() as session:
            stmt = select(ConsentRecord).where(ConsentRecord.id == UUID(consent_id))
            result = await session.exec(stmt)
            record = result.first()
            if record and record.withdrawn_at is None:
                record.withdrawn_at = datetime.now(timezone.utc)
                session.add(record)
                await session.commit()

    # Audit trail.
    audit = AuditService()
    await audit.log_event(
        event_type="consent_withdrawn",
        event_category="popia",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={"consent_id": consent_id},
    )

    # Clear the cookie (must match set_cookie attributes for browser to delete).
    is_production = not settings.DEBUG
    response.delete_cookie(
        key=CONSENT_COOKIE_NAME,
        samesite="none" if is_production else "lax",
        secure=is_production,
    )

    return {"status": "withdrawn", "message": "Your consent has been withdrawn."}
