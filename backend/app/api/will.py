"""Will CRUD endpoints.

POST   /api/wills                                  -- Create new will draft
GET    /api/wills                                   -- List user's wills
GET    /api/wills/{will_id}                         -- Get specific will
DELETE /api/wills/{will_id}                         -- Delete a will
PATCH  /api/wills/{will_id}/sections/{section}      -- Update a section
POST   /api/wills/{will_id}/sections/{section}/complete -- Mark section done
GET    /api/wills/{will_id}/scenarios               -- Detect applicable scenarios
PATCH  /api/wills/{will_id}/current-section         -- Update wizard position
POST   /api/wills/{will_id}/regenerate              -- Regenerate paid will
"""

import logging
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from pydantic import ValidationError

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.payment import Payment
from app.schemas.will import (
    AssetSchema,
    BeneficiarySchema,
    BequestSchema,
    BusinessAssetDetailSchema,
    CurrentSectionUpdate,
    ExecutorSchema,
    GuardianSchema,
    JointWillSchema,
    MaritalSchema,
    ResidueSchema,
    TestatorSchema,
    TrustProvisionSchema,
    UsufructSchema,
    WillCreateRequest,
    WillResponse,
)
from app.services.download_service import generate_download_token
from app.services.scenario_detector import ScenarioDetector
from app.services.will_service import WillService, get_will_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["wills"])

# Maps section names to their Pydantic validation schemas.
# Sections whose model column is a list use list[Schema], others use Schema.
_SECTION_SCHEMA_MAP: dict[str, type] = {
    "testator": TestatorSchema,
    "marital": MaritalSchema,
    "beneficiaries": BeneficiarySchema,
    "assets": AssetSchema,
    "guardians": GuardianSchema,
    "executor": ExecutorSchema,
    "bequests": BequestSchema,
    "residue": ResidueSchema,
    "trust_provisions": TrustProvisionSchema,
    "usufruct": UsufructSchema,
    "business_assets": BusinessAssetDetailSchema,
    "joint_will": JointWillSchema,
}

# Sections stored as JSON arrays (list[Schema]) rather than single objects.
_LIST_SECTIONS: set[str] = {
    "beneficiaries",
    "assets",
    "guardians",
    "bequests",
    "business_assets",
}


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract the authenticated user_id from request state.

    In dev mode (no CLERK_JWKS_URL), user_id may not be set on
    request.state.  We use a deterministic fallback UUID so that
    development works without auth infrastructure.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        # Dev fallback -- deterministic UUID for local development.
        from app.config import settings

        if not settings.CLERK_JWKS_URL:
            return uuid.UUID("00000000-0000-0000-0000-000000000000")
        raise HTTPException(
            status_code=401, detail="Authentication required."
        )
    return user_id


def _validate_section_data(section: str, data: Any) -> Any:
    """Validate incoming data against the section's Pydantic schema.

    Returns the validated data as a dict (or list of dicts) on success.
    Raises HTTPException(422) with validation details on failure.
    """
    schema_cls = _SECTION_SCHEMA_MAP.get(section)
    if schema_cls is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown section '{section}'.",
        )

    try:
        if section in _LIST_SECTIONS:
            if not isinstance(data, list):
                raise HTTPException(
                    status_code=422,
                    detail=f"Section '{section}' expects a list of items.",
                )
            validated = [schema_cls.model_validate(item) for item in data]
            return [item.model_dump() for item in validated]
        else:
            validated = schema_cls.model_validate(data)
            return validated.model_dump()
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())


# ── Endpoints ───────────────────────────────────────────────────────


@router.post("/api/wills", response_model=WillResponse, status_code=201)
async def create_will(
    body: WillCreateRequest,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Create a new will draft for the authenticated user."""
    user_id = _extract_user_id(request)
    will = await service.create_will(user_id, body.will_type)
    return will


@router.get("/api/wills", response_model=list[WillResponse])
async def list_wills(
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """List all wills for the authenticated user."""
    user_id = _extract_user_id(request)
    return await service.list_user_wills(user_id)


@router.get("/api/wills/{will_id}", response_model=WillResponse)
async def get_will(
    will_id: uuid.UUID,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Retrieve a specific will by ID."""
    user_id = _extract_user_id(request)
    return await service.get_will(will_id, user_id)


@router.delete("/api/wills/{will_id}", status_code=204)
async def delete_will(
    will_id: uuid.UUID,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Delete a will and all associated data (conversations, etc.)."""
    user_id = _extract_user_id(request)
    await service.delete_will(will_id, user_id)
    return Response(status_code=204)


@router.patch(
    "/api/wills/{will_id}/sections/{section}",
    response_model=WillResponse,
)
async def update_section(
    will_id: uuid.UUID,
    section: str,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Update a specific section of the will.

    Request body must match the section's Pydantic schema:
    - testator: TestatorSchema (object)
    - marital: MaritalSchema (object)
    - beneficiaries: list[BeneficiarySchema]
    - assets: list[AssetSchema]
    - guardians: list[GuardianSchema]
    - executor: ExecutorSchema (object)
    - bequests: list[BequestSchema]
    - residue: ResidueSchema (object)
    """
    user_id = _extract_user_id(request)
    raw_data = await request.json()
    validated_data = _validate_section_data(section, raw_data)
    return await service.update_section(will_id, user_id, section, validated_data)


@router.post(
    "/api/wills/{will_id}/sections/{section}/complete",
    response_model=WillResponse,
)
async def mark_section_complete(
    will_id: uuid.UUID,
    section: str,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Mark a section as completed in the will's progress tracker."""
    user_id = _extract_user_id(request)
    return await service.mark_section_complete(will_id, user_id, section)


@router.get("/api/wills/{will_id}/scenarios")
async def detect_scenarios(
    will_id: uuid.UUID,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Detect applicable complex estate scenarios from will data.

    Analyses the will's marital status, beneficiaries, and assets to
    determine which scenarios apply (blended_family, testamentary_trust,
    usufruct, business_assets). Updates the will's scenarios column and
    returns the detected list.
    """
    user_id = _extract_user_id(request)
    will = await service.get_will(will_id, user_id)

    will_data = {
        "marital": will.marital,
        "beneficiaries": will.beneficiaries,
        "assets": will.assets,
    }
    detected = ScenarioDetector.detect(will_data)

    # Persist detected scenarios on the will
    await service.update_section(will_id, user_id, "scenarios", detected)

    return {"scenarios": detected}


@router.patch(
    "/api/wills/{will_id}/current-section",
    response_model=WillResponse,
)
async def update_current_section(
    will_id: uuid.UUID,
    body: CurrentSectionUpdate,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Update the user's current wizard section for save/resume."""
    user_id = _extract_user_id(request)
    return await service.update_current_section(
        will_id, user_id, body.current_section
    )


@router.post("/api/wills/{will_id}/regenerate")
async def regenerate_will(
    will_id: uuid.UUID,
    request: Request,
    service: WillService = Depends(get_will_service),
    session: AsyncSession = Depends(get_session),
):
    """Regenerate a paid will after post-purchase edits.

    Validates that the will has been paid for and is currently verified,
    increments the version counter, and generates a fresh download token.
    """
    user_id = _extract_user_id(request)

    # Validate paid_at + status and increment version
    will = await service.regenerate_will(will_id, user_id)

    # Find the most recent completed payment for this will
    stmt = (
        select(Payment)
        .where(Payment.will_id == will_id)
        .where(Payment.status == "completed")
        .order_by(Payment.created_at.desc())  # type: ignore[union-attr]
    )
    result = await session.exec(stmt)
    payment = result.first()

    if payment is None:
        raise HTTPException(
            status_code=400, detail="No completed payment found"
        )

    # Generate fresh download token and update payment
    new_token = generate_download_token(str(will_id), str(payment.id))
    payment.download_token = new_token
    session.add(payment)
    await session.flush()

    return {"download_token": new_token, "version": will.version}
