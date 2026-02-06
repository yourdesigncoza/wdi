"""Will CRUD service for section-based will management.

Provides create, read, update, and list operations for user wills.
All methods enforce user ownership -- a will is only accessible to
the user who created it.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.will import Will

logger = logging.getLogger(__name__)

# Sections that can be individually updated.
VALID_SECTIONS: set[str] = {
    "testator",
    "marital",
    "beneficiaries",
    "assets",
    "guardians",
    "executor",
    "bequests",
    "residue",
}

# Valid will status transitions.
VALID_STATUSES: set[str] = {"draft", "review", "verified", "generated"}


class WillService:
    """Section-based CRUD operations for wills with user ownership checks."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_will_for_user(
        self, will_id: uuid.UUID, user_id: uuid.UUID
    ) -> Will:
        """Fetch a will by ID and verify it belongs to the user.

        Raises HTTPException(404) if will not found, HTTPException(403) if
        the will belongs to a different user.
        """
        stmt = select(Will).where(Will.id == will_id)
        result = await self._session.exec(stmt)
        will = result.first()

        if will is None:
            raise HTTPException(status_code=404, detail="Will not found.")

        if will.user_id != user_id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this will.",
            )

        return will

    async def create_will(
        self, user_id: uuid.UUID, will_type: str = "basic"
    ) -> Will:
        """Create a new will draft for the given user."""
        will = Will(user_id=user_id, will_type=will_type)
        self._session.add(will)
        await self._session.flush()
        await self._session.refresh(will)
        return will

    async def get_will(
        self, will_id: uuid.UUID, user_id: uuid.UUID
    ) -> Will:
        """Fetch a single will by ID with ownership check."""
        return await self._get_will_for_user(will_id, user_id)

    async def list_user_wills(self, user_id: uuid.UUID) -> list[Will]:
        """Return all wills for a user, newest first."""
        stmt = (
            select(Will)
            .where(Will.user_id == user_id)
            .order_by(Will.updated_at.desc())  # type: ignore[union-attr]
        )
        result = await self._session.exec(stmt)
        return list(result.all())

    async def update_section(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
        section: str,
        data: Any,
    ) -> Will:
        """Update a specific JSONB section column on the will.

        Validates that *section* is a recognised section name and updates
        the corresponding column with *data*.  Returns the refreshed will.
        """
        if section not in VALID_SECTIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid section '{section}'. Must be one of: {', '.join(sorted(VALID_SECTIONS))}",
            )

        will = await self._get_will_for_user(will_id, user_id)

        setattr(will, section, data)
        will.updated_at = datetime.now(timezone.utc)
        self._session.add(will)
        await self._session.flush()
        await self._session.refresh(will)
        return will

    async def mark_section_complete(
        self, will_id: uuid.UUID, user_id: uuid.UUID, section: str
    ) -> Will:
        """Set sections_complete[section] = True."""
        if section not in VALID_SECTIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid section '{section}'. Must be one of: {', '.join(sorted(VALID_SECTIONS))}",
            )

        will = await self._get_will_for_user(will_id, user_id)

        updated_sections = dict(will.sections_complete)
        updated_sections[section] = True
        will.sections_complete = updated_sections
        will.updated_at = datetime.now(timezone.utc)
        self._session.add(will)
        await self._session.flush()
        await self._session.refresh(will)
        return will

    async def update_will_status(
        self, will_id: uuid.UUID, user_id: uuid.UUID, status: str
    ) -> Will:
        """Update the will's status field."""
        if status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
            )

        will = await self._get_will_for_user(will_id, user_id)

        will.status = status
        will.updated_at = datetime.now(timezone.utc)
        self._session.add(will)
        await self._session.flush()
        await self._session.refresh(will)
        return will


async def get_will_service(
    session: AsyncSession = Depends(get_session),
) -> WillService:
    """FastAPI dependency that provides a WillService instance."""
    return WillService(session=session)
