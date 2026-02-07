"""Document generation service for assembling and rendering will PDFs.

Orchestrates clause assembly from will JSONB data, renders HTML via Jinja2,
and generates PDF via WeasyPrint in a thread pool to avoid blocking the
async event loop.
"""

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends
from jinja2 import Environment, FileSystemLoader
from sqlmodel.ext.asyncio.session import AsyncSession
from weasyprint import HTML

from app.database import get_session
from app.models.clause import ClauseCategory, WillType
from app.models.will import Will
from app.services.clause_library import ClauseLibraryService
from app.services.will_service import WillService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level setup
# ---------------------------------------------------------------------------

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

_pdf_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf-gen")

_doc_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=True,
)

# Placeholder for missing data -- renders visibly so users know to complete.
_MISSING = "[To be completed]"

# ---------------------------------------------------------------------------
# Clause assembly order
# ---------------------------------------------------------------------------

CLAUSE_ORDER: list[dict[str, Any]] = [
    {"code": "REVOC-01", "section": None, "condition": "always"},
    {"code": "JOINT-01", "section": "joint_will", "condition": "scenario:joint_will"},
    {"code": "EXEC-01", "section": "executor", "condition": "always"},
    {"code": "EXEC-02", "section": "executor", "condition": "has:executor.backup_name"},
    {"code": "BENEF-01", "section": "bequests", "condition": "each:bequests"},
    {"code": "GUARD-01", "section": "guardians", "condition": "has_items:guardians"},
    {"code": "TRUST-01", "section": "trust_provisions", "condition": "scenario:testamentary_trust"},
    {"code": "USUF-01", "section": "usufruct", "condition": "scenario:usufruct"},
    {"code": "BUS-01", "section": "business_assets", "condition": "each:business_assets:cc_member_interest"},
    {"code": "BUS-02", "section": "business_assets", "condition": "each:business_assets:company_shares"},
    {"code": "BENEF-02", "section": "residue", "condition": "always"},
]


# ---------------------------------------------------------------------------
# Variable extraction helpers
# ---------------------------------------------------------------------------


def _safe_get(data: dict | list | None, *keys: str, default: str = _MISSING) -> Any:
    """Safely traverse nested dict keys, returning *default* on any miss."""
    current: Any = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return default
        if current is None:
            return default
    return current if current else default


def _testator_full_name(will: Will) -> str:
    """Build testator full name from JSONB, with safe default."""
    first = _safe_get(will.testator, "first_name")
    last = _safe_get(will.testator, "last_name")
    if first == _MISSING and last == _MISSING:
        return _MISSING
    parts = []
    if first != _MISSING:
        parts.append(first)
    if last != _MISSING:
        parts.append(last)
    return " ".join(parts)


def _extract_variables(will: Will, clause_code: str, item: dict | None = None) -> dict:
    """Extract template variables for a specific clause from will data.

    Uses safe defaults so that missing fields render as "[To be completed]"
    rather than raising Jinja2 UndefinedError.
    """
    extractors: dict[str, Any] = {
        "REVOC-01": lambda w, _i: {
            "testator_full_name": _testator_full_name(w),
            "testator_id_number": _safe_get(w.testator, "id_number"),
        },
        "JOINT-01": lambda w, _i: {
            "testator_1_name": _testator_full_name(w),
            "testator_1_id": _safe_get(w.testator, "id_number"),
            "testator_2_name": (
                f"{_safe_get(w.joint_will, 'co_testator_first_name')} "
                f"{_safe_get(w.joint_will, 'co_testator_last_name')}"
            ).strip() or _MISSING,
            "testator_2_id": _safe_get(w.joint_will, "co_testator_id_number"),
        },
        "EXEC-01": lambda w, _i: {
            "executor_name": _safe_get(w.executor, "name"),
            "executor_id_number": _MISSING,  # Not in ExecutorSchema
            "executor_address": _MISSING,  # Not in ExecutorSchema
        },
        "EXEC-02": lambda w, _i: {
            "executor_name": _safe_get(w.executor, "name"),
            "alternate_executor_name": _safe_get(w.executor, "backup_name"),
            "alternate_executor_id_number": _MISSING,  # Not in ExecutorSchema
            "alternate_executor_address": _MISSING,  # Not in ExecutorSchema
        },
        "BENEF-01": lambda w, i: {
            "asset_description": _safe_get(i, "item_description") if i else _MISSING,
            "beneficiary_name": _safe_get(i, "recipient_name") if i else _MISSING,
            "beneficiary_id_number": _MISSING,  # Not in BequestSchema
            "alternate_beneficiary_name": "",  # Optional -- empty triggers else branch
        },
        "GUARD-01": lambda w, _i: _extract_guardian_vars(w),
        "TRUST-01": lambda w, _i: {
            "children_names": ", ".join(
                _safe_get(w.trust_provisions, "minor_beneficiaries") or []
            ) or _MISSING,
            "trust_name": _safe_get(w.trust_provisions, "trust_name"),
            "trustee_names": ", ".join(
                t.get("name", _MISSING)
                for t in (_safe_get(w.trust_provisions, "trustees") or [])
                if isinstance(t, dict)
            ) or _MISSING,
            "vesting_age": _safe_get(w.trust_provisions, "vesting_age", default="18"),
        },
        "USUF-01": lambda w, _i: {
            "usufructuary_name": _safe_get(w.usufruct, "usufructuary_name"),
            "usufructuary_id_number": _safe_get(w.usufruct, "usufructuary_id_number"),
            "property_description": _safe_get(w.usufruct, "property_description"),
            "bare_dominium_holders": ", ".join(
                h.get("name", _MISSING)
                for h in (_safe_get(w.usufruct, "bare_dominium_holders") or [])
                if isinstance(h, dict)
            ) or _MISSING,
        },
        "BUS-01": lambda w, i: {
            "percentage_held": _safe_get(i, "percentage_held", default="0") if i else "0",
            "business_name": _safe_get(i, "business_name") if i else _MISSING,
            "registration_number": _safe_get(i, "registration_number") if i else _MISSING,
            "heir_name": _safe_get(i, "heir_name") if i else _MISSING,
        },
        "BUS-02": lambda w, i: {
            "percentage_held": _safe_get(i, "percentage_held", default="0") if i else "0",
            "business_name": _safe_get(i, "business_name") if i else _MISSING,
            "registration_number": _safe_get(i, "registration_number") if i else _MISSING,
            "heir_name": _safe_get(i, "heir_name") if i else _MISSING,
        },
        "BENEF-02": lambda w, _i: _extract_residue_vars(w),
    }

    extractor = extractors.get(clause_code)
    if extractor is None:
        logger.warning("No variable extractor for clause %s", clause_code)
        return {}
    return extractor(will, item)


def _extract_guardian_vars(will: Will) -> dict:
    """Extract guardian clause variables from the guardians list."""
    guardians = will.guardians or []
    # Find primary guardian
    primary = None
    for g in guardians:
        if isinstance(g, dict) and g.get("is_primary", True):
            primary = g
            break
    if not primary and guardians:
        primary = guardians[0] if isinstance(guardians[0], dict) else None

    if not primary:
        return {
            "guardian_name": _MISSING,
            "guardian_id_number": _MISSING,
            "guardian_address": _MISSING,
            "children_names": "",
        }

    return {
        "guardian_name": primary.get("full_name", _MISSING),
        "guardian_id_number": primary.get("id_number", "") or _MISSING,
        "guardian_address": _MISSING,  # Not in GuardianSchema
        "children_names": "",  # Will use generic "children" fallback in template
    }


def _extract_residue_vars(will: Will) -> dict:
    """Extract residue clause variables from the residue dict."""
    residue = will.residue or {}
    beneficiaries = residue.get("beneficiaries", [])

    if beneficiaries and isinstance(beneficiaries[0], dict):
        primary = beneficiaries[0]
        return {
            "residue_beneficiary_name": primary.get("name", _MISSING),
            "residue_beneficiary_id_number": _MISSING,  # Not in ResidueSchema
        }

    return {
        "residue_beneficiary_name": _MISSING,
        "residue_beneficiary_id_number": _MISSING,
    }


# ---------------------------------------------------------------------------
# Condition evaluation
# ---------------------------------------------------------------------------


def _should_include_clause(will: Will, entry: dict) -> bool | list:
    """Evaluate whether a clause should be included for this will.

    Returns:
        True/False for single inclusion, or a list of items for
        ``each:`` conditions (one clause instance per item).
    """
    condition: str = entry["condition"]

    if condition == "always":
        return True

    if condition.startswith("scenario:"):
        scenario_name = condition[len("scenario:"):]
        scenarios = will.scenarios or []
        return scenario_name in scenarios

    if condition.startswith("has:"):
        field_path = condition[len("has:"):]
        parts = field_path.split(".")
        current: Any = will
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            elif hasattr(current, part):
                current = getattr(current, part)
            else:
                return False
            if current is None:
                return False
        return bool(current)

    if condition.startswith("has_items:"):
        field = condition[len("has_items:"):]
        items = getattr(will, field, None)
        if isinstance(items, list):
            return len(items) > 0
        return False

    if condition.startswith("each:"):
        parts = condition[len("each:"):].split(":")
        field = parts[0]
        items = getattr(will, field, None)
        if not isinstance(items, list) or not items:
            return False
        # Filter by business_type if a type filter is specified
        if len(parts) > 1:
            type_filter = parts[1]
            return [
                item for item in items
                if isinstance(item, dict) and item.get("business_type") == type_filter
            ] or False
        return items

    logger.warning("Unknown condition type: %s", condition)
    return False


# ---------------------------------------------------------------------------
# Synchronous PDF rendering (runs in thread pool)
# ---------------------------------------------------------------------------


def _render_pdf_sync(html_string: str) -> bytes:
    """Render HTML to PDF bytes via WeasyPrint.

    This is CPU-bound and must be called in a thread executor.
    """
    return HTML(
        string=html_string,
        base_url=str(TEMPLATE_DIR),
    ).write_pdf()


# ---------------------------------------------------------------------------
# Document reference generation
# ---------------------------------------------------------------------------


def _generate_document_reference(will_id: uuid.UUID) -> str:
    """Generate a human-readable document reference.

    Format: WC-{short_id}-{timestamp}
    """
    short_id = str(will_id)[:8].upper()
    ts = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"WC-{short_id}-{ts}"


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------


class DocumentGenerationService:
    """Assembles clauses from will data, renders HTML, and generates PDF.

    Uses ClauseLibraryService for clause retrieval and rendering,
    WillService for will retrieval with ownership checks, and runs
    WeasyPrint PDF generation in a thread executor.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._clause_svc = ClauseLibraryService(session=session)
        self._will_svc = WillService(session=session)

    async def generate_preview(
        self, will_id: uuid.UUID, user_id: uuid.UUID
    ) -> bytes:
        """Generate a watermarked preview PDF for a will."""
        will = await self._will_svc.get_will(will_id, user_id)
        return await self._generate(will, is_preview=True)

    async def generate_final(
        self, will_id: uuid.UUID, user_id: uuid.UUID
    ) -> bytes:
        """Generate a final (no watermark) PDF for a will."""
        will = await self._will_svc.get_will(will_id, user_id)
        return await self._generate(will, is_preview=False)

    async def _generate(self, will: Will, is_preview: bool) -> bytes:
        """Core generation pipeline: assemble clauses, render HTML, produce PDF.

        1. Assemble ordered clause list from will JSONB data
        2. Build template context with testator info, clauses, metadata
        3. Render HTML via Jinja2
        4. Generate PDF in thread executor (non-blocking)
        """
        # 1. Assemble clauses
        clauses = await self._assemble_clauses(will)

        # 2. Build template context
        testator_name = _testator_full_name(will)
        document_reference = _generate_document_reference(will.id)

        context = {
            "testator_name": testator_name,
            "document_reference": document_reference,
            "id_number": _safe_get(will.testator, "id_number", default=""),
            "clauses": clauses,
            "is_preview": is_preview,
            "page_count": "____",  # Placeholder -- actual count unknown pre-render
            "generation_date": datetime.now(timezone.utc).strftime("%d %B %Y"),
            "signing_year": datetime.now(timezone.utc).strftime("%Y"),
        }

        # 3. Render HTML
        template = _doc_jinja_env.get_template("will/base.html")
        html_string = template.render(**context)

        # 4. Generate PDF in thread pool
        loop = asyncio.get_event_loop()
        pdf_bytes: bytes = await loop.run_in_executor(
            _pdf_executor, _render_pdf_sync, html_string
        )

        logger.info(
            "Generated %s PDF for will %s (%d bytes)",
            "preview" if is_preview else "final",
            will.id,
            len(pdf_bytes),
        )

        return pdf_bytes

    async def _assemble_clauses(self, will: Will) -> list[dict]:
        """Assemble ordered clause list from will data.

        Iterates through CLAUSE_ORDER, evaluates conditions, fetches
        clause templates from the database, extracts variables, and
        renders each clause. Returns a list of dicts suitable for
        the Jinja2 template.
        """
        assembled: list[dict] = []
        clause_number = 1

        for entry in CLAUSE_ORDER:
            code = entry["code"]
            result = _should_include_clause(will, entry)

            if result is False:
                continue

            # Fetch clause template from DB
            clause = await self._clause_svc.get_clause_by_code(code)
            if clause is None:
                logger.warning("Clause %s not found in database, skipping", code)
                continue

            # Handle "each:" conditions -- one clause per item
            if isinstance(result, list):
                for item in result:
                    variables = _extract_variables(will, code, item=item)
                    rendered = self._safe_render(clause, variables, code)
                    assembled.append({
                        "number": clause_number,
                        "name": clause.name,
                        "rendered_text": rendered,
                        "sub_clauses": [],
                    })
                    clause_number += 1
            else:
                # Single clause inclusion
                variables = _extract_variables(will, code)
                rendered = self._safe_render(clause, variables, code)
                assembled.append({
                    "number": clause_number,
                    "name": clause.name,
                    "rendered_text": rendered,
                    "sub_clauses": [],
                })
                clause_number += 1

        return assembled

    def _safe_render(self, clause: Any, variables: dict, code: str) -> str:
        """Render clause with error fallback.

        If rendering fails (missing variable despite safe defaults),
        returns a fallback message rather than crashing the entire
        PDF generation.
        """
        try:
            return self._clause_svc.render_clause(clause, variables)
        except ValueError as exc:
            logger.error(
                "Failed to render clause %s: %s. Using fallback.", code, exc
            )
            return f"[Clause {code} could not be rendered. Please review your will data.]"


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------


def get_document_service(
    session: AsyncSession = Depends(get_session),
) -> DocumentGenerationService:
    """FastAPI dependency that provides a DocumentGenerationService instance."""
    return DocumentGenerationService(session=session)
