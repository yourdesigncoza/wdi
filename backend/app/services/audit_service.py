"""Audit logging service for POPIA compliance.

Provides a single entry-point for recording audit events to the database.
All methods are async and handle errors gracefully -- a logging failure
must never crash the calling request.
"""

import logging
import uuid
from typing import Optional

from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import async_session
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Writes immutable audit rows to the ``audit_logs`` table."""

    def __init__(self, session: Optional[AsyncSession] = None) -> None:
        self._external_session = session

    async def log_event(
        self,
        event_type: str,
        event_category: str,
        *,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[uuid.UUID] = None,
        details: Optional[dict] = None,
    ) -> Optional[AuditLog]:
        """Persist a single audit event.

        Returns the created ``AuditLog`` on success, ``None`` on failure.
        """
        entry = AuditLog(
            event_type=event_type,
            event_category=event_category,
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
        )

        try:
            if self._external_session:
                self._external_session.add(entry)
                await self._external_session.flush()
            else:
                async with async_session() as session:
                    session.add(entry)
                    await session.commit()
            return entry
        except Exception:
            logger.exception(
                "Failed to write audit event type=%s category=%s",
                event_type,
                event_category,
            )
            return None


async def get_audit_service(
    session: Optional[AsyncSession] = None,
) -> AuditService:
    """FastAPI dependency that provides an AuditService instance."""
    return AuditService(session=session)
