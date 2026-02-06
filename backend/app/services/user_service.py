"""User lookup and lazy creation service.

Creates a local user record on first authenticated API call.
Subsequent calls reuse the existing record via clerk_user_id lookup.
"""

import logging
from typing import Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import async_session
from app.models.user import User

logger = logging.getLogger(__name__)


class UserService:
    """Provides get-or-create semantics for local user records."""

    def __init__(self, session: Optional[AsyncSession] = None) -> None:
        self._external_session = session

    async def get_or_create_user(
        self, clerk_user_id: str, email: str = ""
    ) -> User:
        """Return existing user or create a new one.

        Args:
            clerk_user_id: Clerk's external user ID (JWT ``sub`` claim).
            email: Email from JWT claims; empty string if not available.

        Returns:
            The local User record.
        """
        if self._external_session:
            return await self._get_or_create(
                self._external_session, clerk_user_id, email
            )

        async with async_session() as session:
            user = await self._get_or_create(session, clerk_user_id, email)
            await session.commit()
            return user

    async def _get_or_create(
        self, session: AsyncSession, clerk_user_id: str, email: str
    ) -> User:
        """Core logic: query then insert if absent."""
        statement = select(User).where(User.clerk_user_id == clerk_user_id)
        result = await session.exec(statement)
        user = result.first()

        if user is not None:
            return user

        user = User(clerk_user_id=clerk_user_id, email=email)
        session.add(user)
        await session.flush()
        logger.info("Created local user %s for Clerk ID %s", user.id, clerk_user_id)
        return user


async def get_user_service(
    session: Optional[AsyncSession] = None,
) -> UserService:
    """FastAPI dependency that provides a UserService instance."""
    return UserService(session=session)
