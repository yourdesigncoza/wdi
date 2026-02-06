"""Shared pytest fixtures for backend tests."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from unittest.mock import AsyncMock

import pytest

from app.models.clause import Clause, ClauseCategory, WillType
from app.services.audit_service import AuditService
from app.services.clause_library import ClauseLibraryService
from app.services.upl_filter import UPLFilterService


def _make_clause(
    code: str,
    name: str,
    category: ClauseCategory,
    template_text: str,
    will_types: Optional[list[str]] = None,
) -> Clause:
    """Build a Clause instance for testing (no DB required)."""
    return Clause(
        id=uuid.uuid4(),
        code=code,
        name=name,
        category=category,
        version=1,
        is_current=True,
        template_text=template_text,
        variables_schema={},
        will_types=will_types or ["basic", "trust"],
        is_required=False,
        display_order=0,
        approved_by="Test Attorney",
        approved_at=datetime.now(timezone.utc),
    )


# Pre-built sample clauses keyed by category value.
SAMPLE_CLAUSES: dict[str, list[Clause]] = {
    ClauseCategory.EXECUTOR.value: [
        _make_clause(
            "EXEC-01",
            "Executor Appointment",
            ClauseCategory.EXECUTOR,
            "I appoint {{ executor_name }} as executor of my estate.",
        ),
    ],
    ClauseCategory.TRUST.value: [
        _make_clause(
            "TRUST-01",
            "Testamentary Trust",
            ClauseCategory.TRUST,
            "A testamentary trust shall be established for the benefit of {{ beneficiary }}.",
        ),
    ],
    ClauseCategory.RESIDUE.value: [
        _make_clause(
            "RES-01",
            "Residue Clause",
            ClauseCategory.RESIDUE,
            "The residue of my estate shall devolve upon {{ residue_beneficiary }}.",
        ),
    ],
}


@pytest.fixture()
def mock_clause_service() -> ClauseLibraryService:
    """ClauseLibraryService with mocked async DB calls."""
    service = AsyncMock(spec=ClauseLibraryService)

    async def _get_by_category(
        category: ClauseCategory,
        will_type: WillType = WillType.BASIC,
    ) -> list[Clause]:
        return SAMPLE_CLAUSES.get(category.value, [])

    service.get_clauses_by_category = AsyncMock(side_effect=_get_by_category)
    return service


@pytest.fixture()
def mock_audit_service() -> AuditService:
    """AuditService that silently accepts all log calls."""
    service = AsyncMock(spec=AuditService)
    service.log_event = AsyncMock(return_value=None)
    return service


@pytest.fixture()
def upl_filter(
    mock_clause_service: ClauseLibraryService,
    mock_audit_service: AuditService,
) -> UPLFilterService:
    """UPLFilterService wired to mock dependencies."""
    return UPLFilterService(
        clause_service=mock_clause_service,
        audit_service=mock_audit_service,
    )
