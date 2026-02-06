"""Clause library service for retrieving and rendering attorney-approved legal text.

Provides the single source of truth for all legal text used in wills.
No freeform AI generation is allowed -- only approved clause templates
with variable substitution.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends
from jinja2 import BaseLoader, Environment, TemplateSyntaxError, UndefinedError
from sqlalchemy import and_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.clause import Clause, ClauseCategory, WillType

logger = logging.getLogger(__name__)

# Jinja2 environment configured for clause template rendering.
# Sandboxed with no filesystem access (BaseLoader) and undefined=strict.
_jinja_env = Environment(
    loader=BaseLoader(),
    autoescape=False,
    undefined=__import__("jinja2").StrictUndefined,
)


class ClauseLibraryService:
    """Retrieves and renders attorney-approved clause templates."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_clause_by_code(
        self,
        code: str,
        version: Optional[int] = None,
    ) -> Optional[Clause]:
        """Retrieve a clause by its unique code.

        By default returns the current version. If *version* is specified,
        returns that exact version regardless of ``is_current`` flag.
        """
        stmt = select(Clause).where(Clause.code == code)
        if version is not None:
            stmt = stmt.where(Clause.version == version)
        else:
            stmt = stmt.where(Clause.is_current == True)  # noqa: E712
        result = await self._session.exec(stmt)
        return result.first()

    async def get_clauses_by_category(
        self,
        category: ClauseCategory,
        will_type: WillType = WillType.BASIC,
    ) -> list[Clause]:
        """Return all current clauses in a category applicable to *will_type*.

        Results are ordered by ``display_order`` for consistent rendering.
        """
        stmt = (
            select(Clause)
            .where(
                and_(
                    Clause.category == category,
                    Clause.is_current == True,  # noqa: E712
                )
            )
            .order_by(Clause.display_order)
        )
        result = await self._session.exec(stmt)
        clauses = list(result.all())

        # Filter to clauses whose will_types list includes the requested type.
        return [c for c in clauses if will_type.value in c.will_types]

    async def get_required_clauses(
        self,
        will_type: WillType = WillType.BASIC,
    ) -> list[Clause]:
        """Return all required current clauses for the given will type."""
        stmt = (
            select(Clause)
            .where(
                and_(
                    Clause.is_required == True,  # noqa: E712
                    Clause.is_current == True,  # noqa: E712
                )
            )
            .order_by(Clause.display_order)
        )
        result = await self._session.exec(stmt)
        clauses = list(result.all())
        return [c for c in clauses if will_type.value in c.will_types]

    def render_clause(self, clause: Clause, variables: dict) -> str:
        """Render a clause template with the given variables.

        Uses Jinja2 for safe template rendering with strict undefined
        checking -- missing variables raise an error rather than producing
        blank output.

        Raises:
            ValueError: If the template contains syntax errors or
                required variables are missing.
        """
        try:
            template = _jinja_env.from_string(clause.template_text)
            return template.render(**variables)
        except TemplateSyntaxError as exc:
            logger.error(
                "Template syntax error in clause %s v%d: %s",
                clause.code,
                clause.version,
                exc,
            )
            raise ValueError(
                f"Invalid template syntax in clause {clause.code}: {exc}"
            ) from exc
        except UndefinedError as exc:
            logger.error(
                "Missing variable for clause %s v%d: %s",
                clause.code,
                clause.version,
                exc,
            )
            raise ValueError(
                f"Missing required variable for clause {clause.code}: {exc}"
            ) from exc

    async def create_new_version(
        self,
        clause_id: uuid.UUID,
        template_text: str,
        approved_by: str,
        approval_notes: Optional[str] = None,
    ) -> Clause:
        """Create a new version of an existing clause.

        Marks the previous version as non-current and creates a new row
        linked via ``previous_version_id``.
        """
        # Fetch current clause
        stmt = select(Clause).where(Clause.id == clause_id)
        result = await self._session.exec(stmt)
        current = result.first()
        if current is None:
            raise ValueError(f"Clause {clause_id} not found")

        # Mark current version as non-current
        current.is_current = False
        current.updated_at = datetime.now(timezone.utc)
        self._session.add(current)

        # Create new version
        new_clause = Clause(
            code=current.code,
            name=current.name,
            category=current.category,
            version=current.version + 1,
            is_current=True,
            previous_version_id=current.id,
            template_text=template_text,
            variables_schema=current.variables_schema,
            will_types=current.will_types,
            is_required=current.is_required,
            display_order=current.display_order,
            approved_by=approved_by,
            approved_at=datetime.now(timezone.utc),
            approval_notes=approval_notes,
        )
        self._session.add(new_clause)
        await self._session.flush()
        await self._session.refresh(new_clause)
        return new_clause


def get_clause_service(
    session: AsyncSession = Depends(get_session),
) -> ClauseLibraryService:
    """FastAPI dependency that provides a ClauseLibraryService instance."""
    return ClauseLibraryService(session=session)
