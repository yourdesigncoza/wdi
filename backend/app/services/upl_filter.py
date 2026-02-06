"""UPL (Unauthorized Practice of Law) filter service.

Prevents the AI from providing legal advice by detecting advice patterns
in generated text and replacing them with attorney-approved clause text
or an attorney referral message.

All legal text must originate from the clause library -- never from
freeform AI generation.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from app.models.clause import Clause, ClauseCategory, WillType
from app.services.audit_service import AuditService
from app.services.clause_library import ClauseLibraryService

logger = logging.getLogger(__name__)


class FilterAction(str, Enum):
    """Possible outcomes of the UPL filter."""

    ALLOW = "allow"
    REPLACE = "replace"
    BLOCK = "block"
    REFER = "refer"


@dataclass
class FilterResult:
    """Result of running text through the UPL filter."""

    action: FilterAction
    original_text: str
    filtered_text: str
    clause_code: Optional[str] = None
    reason: Optional[str] = None
    patterns_matched: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Pattern sets (compiled once at module load)
# ---------------------------------------------------------------------------

_ADVICE_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "directive_include",
        re.compile(
            r"you should\s+(?:definitely\s+)?(?:include|add|create|make)",
            re.IGNORECASE,
        ),
    ),
    (
        "personal_recommendation",
        re.compile(
            r"I (?:recommend|advise|suggest)\s+(?:that\s+)?you",
            re.IGNORECASE,
        ),
    ),
    (
        "best_approach",
        re.compile(
            r"the best (?:way|approach|option)\s+(?:is|would be)",
            re.IGNORECASE,
        ),
    ),
    (
        "obligation_directive",
        re.compile(
            r"you (?:must|need to|have to)\s+(?:do|include|specify)",
            re.IGNORECASE,
        ),
    ),
    (
        "legal_directive",
        re.compile(
            r"legally,?\s+you\s+(?:should|must|need)",
            re.IGNORECASE,
        ),
    ),
    (
        "opinion_as_legal",
        re.compile(
            r"in my (?:legal\s+)?opinion",
            re.IGNORECASE,
        ),
    ),
    (
        "role_claim",
        re.compile(
            r"as your (?:lawyer|attorney|legal advisor)",
            re.IGNORECASE,
        ),
    ),
]

_ATTORNEY_REQUIRED_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "tax_implications",
        re.compile(r"tax\s+(?:implications|consequences|planning)", re.IGNORECASE),
    ),
    (
        "estate_duty",
        re.compile(r"estate\s+duty", re.IGNORECASE),
    ),
    (
        "business_succession",
        re.compile(r"business\s+(?:succession|valuation)", re.IGNORECASE),
    ),
    (
        "offshore_assets",
        re.compile(r"offshore\s+(?:assets|trust)", re.IGNORECASE),
    ),
    (
        "disputed_estate",
        re.compile(r"disputed\s+(?:estate|inheritance|will)", re.IGNORECASE),
    ),
    (
        "litigation",
        re.compile(r"litigation|court\s+order|legal\s+dispute", re.IGNORECASE),
    ),
    # Complex estate scenario patterns
    (
        "trust_tax",
        re.compile(r"trust\s+(?:tax|duty|estate\s+duty|section\s+7[cC])", re.IGNORECASE),
    ),
    (
        "fideicommissum",
        re.compile(r"fideicommiss", re.IGNORECASE),
    ),
    (
        "business_valuation",
        re.compile(r"business\s+(?:valuation|fair\s+market\s+value)", re.IGNORECASE),
    ),
    (
        "complex_trust",
        re.compile(r"(?:special|discretionary|inter\s+vivos)\s+trust", re.IGNORECASE),
    ),
]

FALLBACK_MESSAGE: str = (
    "For this specific situation, we recommend consulting with a qualified "
    "South African attorney who can provide personalized legal advice."
)

# Map context categories to ClauseCategory for replacement lookup.
_CATEGORY_MAP: dict[str, ClauseCategory] = {
    cat.value: cat for cat in ClauseCategory
}


class UPLFilterService:
    """Filters AI-generated text to prevent unauthorized legal advice.

    Replaces detected advice patterns with approved clause text from the
    clause library, or returns an attorney referral for complex scenarios.
    """

    def __init__(
        self,
        clause_service: ClauseLibraryService,
        audit_service: AuditService,
    ) -> None:
        self._clause_service = clause_service
        self._audit_service = audit_service

    async def filter_output(
        self,
        text: str,
        context: dict,
    ) -> FilterResult:
        """Run *text* through the UPL filter.

        Parameters
        ----------
        text:
            The AI-generated output to check.
        context:
            Expects keys ``category`` (str), ``will_type`` (str),
            ``session_id`` (str) for audit correlation.

        Returns
        -------
        FilterResult with the appropriate action and replacement text.
        """
        if not text or not text.strip():
            return FilterResult(
                action=FilterAction.ALLOW,
                original_text=text,
                filtered_text=text,
            )

        # 1. Check attorney-required patterns first (highest priority).
        attorney_matches = self._match_patterns(text, _ATTORNEY_REQUIRED_PATTERNS)
        if attorney_matches:
            result = FilterResult(
                action=FilterAction.REFER,
                original_text=text,
                filtered_text=FALLBACK_MESSAGE,
                reason="Complex legal matter requiring attorney consultation",
                patterns_matched=attorney_matches,
            )
            await self._log_filter_event(result, context)
            return result

        # 2. Check advice patterns.
        advice_matches = self._match_patterns(text, _ADVICE_PATTERNS)
        if advice_matches:
            replacement = await self._find_replacement_clause(context)
            if replacement is not None:
                result = FilterResult(
                    action=FilterAction.REPLACE,
                    original_text=text,
                    filtered_text=replacement.template_text,
                    clause_code=replacement.code,
                    reason="Legal advice replaced with approved clause text",
                    patterns_matched=advice_matches,
                )
            else:
                result = FilterResult(
                    action=FilterAction.BLOCK,
                    original_text=text,
                    filtered_text=FALLBACK_MESSAGE,
                    reason="Legal advice detected but no matching clause available",
                    patterns_matched=advice_matches,
                )
            await self._log_filter_event(result, context)
            return result

        # 3. No patterns matched -- allow through.
        return FilterResult(
            action=FilterAction.ALLOW,
            original_text=text,
            filtered_text=text,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _match_patterns(
        text: str,
        patterns: list[tuple[str, re.Pattern]],
    ) -> list[str]:
        """Return names of all patterns that match *text*."""
        return [name for name, regex in patterns if regex.search(text)]

    async def _find_replacement_clause(
        self,
        context: dict,
    ) -> Optional[Clause]:
        """Look up a replacement clause from the library based on context."""
        category_str = context.get("category")
        if not category_str:
            return None

        category = _CATEGORY_MAP.get(category_str)
        if category is None:
            return None

        will_type_str = context.get("will_type", "basic")
        try:
            will_type = WillType(will_type_str)
        except ValueError:
            will_type = WillType.BASIC

        clauses = await self._clause_service.get_clauses_by_category(
            category, will_type
        )
        return clauses[0] if clauses else None

    async def _log_filter_event(
        self,
        result: FilterResult,
        context: dict,
    ) -> None:
        """Log a non-ALLOW filter activation to the audit trail."""
        await self._audit_service.log_event(
            event_type="upl_filter_activated",
            event_category="compliance",
            session_id=context.get("session_id"),
            details={
                "action": result.action.value,
                "patterns_matched": result.patterns_matched,
                "clause_code": result.clause_code,
                "reason": result.reason,
            },
        )
