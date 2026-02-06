"""Privacy policy and information officer endpoints.

GET  /api/privacy-policy -- Return POPIA privacy policy
GET  /api/info-officer   -- Return Information Officer contact details
POST /api/data-request   -- Submit a data subject request
"""

import uuid

from fastapi import APIRouter, Request

from app.config import settings
from app.schemas.consent import DataRequestBody, DataRequestResponse
from app.services.audit_service import AuditService

router = APIRouter(tags=["privacy"])

# Placeholder text -- will be replaced with attorney-approved copy.
_PRIVACY_POLICY = {
    "version": settings.PRIVACY_POLICY_VERSION,
    "effective_date": "2026-01-01",
    "title": "WillCraft SA Privacy Policy",
    "sections": [
        {
            "heading": "1. Introduction",
            "body": (
                "WillCraft SA (\"we\", \"us\", \"our\") is committed to protecting "
                "your personal information in compliance with the Protection of "
                "Personal Information Act 4 of 2013 (POPIA). This policy explains "
                "how we collect, use, store, and share your personal information."
            ),
        },
        {
            "heading": "2. Purpose of Processing",
            "body": (
                "We process your personal information for the sole purpose of "
                "generating a legally compliant South African will. Categories of "
                "data collected include: full legal name, identification number, "
                "marital status, beneficiary details, asset descriptions, and "
                "testamentary wishes."
            ),
        },
        {
            "heading": "3. Legal Basis",
            "body": (
                "Processing is based on your explicit consent (POPIA Section 11). "
                "You may withdraw consent at any time via the consent management "
                "interface, after which we will cease processing and delete your "
                "personal information within 30 days."
            ),
        },
        {
            "heading": "4. Data Retention",
            "body": (
                "Will documents are retained for the minimum period required by "
                "the Administration of Estates Act 66 of 1965. Consent records and "
                "audit logs are retained indefinitely for compliance evidence."
            ),
        },
        {
            "heading": "5. Your Rights",
            "body": (
                "Under POPIA you have the right to: access your personal information, "
                "request correction or deletion, object to processing, and lodge a "
                "complaint with the Information Regulator. Submit requests via the "
                "/api/data-request endpoint or contact the Information Officer."
            ),
        },
    ],
}

_INFO_OFFICER = {
    "name": "Information Officer",
    "organisation": "WillCraft SA (Pty) Ltd",
    "email": "privacy@willcraft.co.za",
    "phone": "+27 (0) 00 000 0000",
    "address": "To be confirmed",
    "regulator": {
        "name": "Information Regulator (South Africa)",
        "email": "inforeg@justice.gov.za",
        "phone": "+27 (0) 12 406 4818",
        "website": "https://inforegulator.org.za",
    },
}


@router.get("/api/privacy-policy")
async def privacy_policy():
    """Return the current POPIA privacy policy."""
    return _PRIVACY_POLICY


@router.get("/api/info-officer")
async def info_officer():
    """Return Information Officer contact details."""
    return _INFO_OFFICER


@router.post("/api/data-request", response_model=DataRequestResponse)
async def submit_data_request(body: DataRequestBody, request: Request):
    """Record a POPIA data subject request (access / correction / deletion)."""
    reference_id = uuid.uuid4()

    audit = AuditService()
    await audit.log_event(
        event_type="data_request_submitted",
        event_category="data_request",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        details={
            "reference_id": str(reference_id),
            "request_type": body.request_type,
            "details": body.details,
        },
    )

    return DataRequestResponse(
        reference_id=reference_id,
        request_type=body.request_type,
        message=(
            f"Your {body.request_type} request has been received. "
            f"Reference: {reference_id}. We will respond within 30 days "
            "as required by POPIA."
        ),
    )
