"""Seed the clause library with placeholder attorney-approved clauses.

IMPORTANT: These are PLACEHOLDER clauses for development and testing only.
Real clauses must be drafted and approved by a qualified South African attorney
before any production use.

Usage:
    cd backend
    python -m scripts.seed_clauses
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import async_session
from app.models.clause import Clause, ClauseCategory, WillType

logger = logging.getLogger(__name__)

# All will types shorthand for clauses applicable everywhere.
_ALL_TYPES = [t.value for t in WillType]
_BASIC_ONLY = [WillType.BASIC.value]
_BASIC_TRUST = [WillType.BASIC.value, WillType.TRUST.value]

SEED_CLAUSES: list[dict] = [
    # ── REVOCATION ──────────────────────────────────────────────
    {
        "code": "REVOC-01",
        "name": "Revocation of Previous Wills",
        "category": ClauseCategory.REVOCATION,
        "template_text": (
            "I, {{ testator_full_name }}, Identity Number {{ testator_id_number }}, "
            "hereby revoke all previous wills, codicils, and testamentary dispositions "
            "made by me at any time before the date of this will, and declare this to be "
            "my last will and testament."
        ),
        "variables_schema": {
            "testator_full_name": {"type": "string", "required": True, "label": "Full legal name"},
            "testator_id_number": {"type": "string", "required": True, "label": "SA ID number"},
        },
        "will_types": _ALL_TYPES,
        "is_required": True,
        "display_order": 10,
    },
    # ── EXECUTOR ────────────────────────────────────────────────
    {
        "code": "EXEC-01",
        "name": "Primary Executor Appointment",
        "category": ClauseCategory.EXECUTOR,
        "template_text": (
            "I nominate and appoint {{ executor_name }}, Identity Number "
            "{{ executor_id_number }}, residing at {{ executor_address }}, "
            "as the Executor of this my last will and testament. I direct that "
            "my Executor shall not be required to furnish security to the "
            "Master of the High Court."
        ),
        "variables_schema": {
            "executor_name": {"type": "string", "required": True, "label": "Executor full name"},
            "executor_id_number": {"type": "string", "required": True, "label": "Executor SA ID number"},
            "executor_address": {"type": "string", "required": True, "label": "Executor residential address"},
        },
        "will_types": _ALL_TYPES,
        "is_required": True,
        "display_order": 20,
    },
    {
        "code": "EXEC-02",
        "name": "Alternate Executor Appointment",
        "category": ClauseCategory.EXECUTOR,
        "template_text": (
            "Should {{ executor_name }} be unable or unwilling to act as Executor, "
            "I nominate and appoint {{ alternate_executor_name }}, Identity Number "
            "{{ alternate_executor_id_number }}, residing at "
            "{{ alternate_executor_address }}, as the alternate Executor of this "
            "my last will and testament."
        ),
        "variables_schema": {
            "executor_name": {"type": "string", "required": True, "label": "Primary executor name"},
            "alternate_executor_name": {"type": "string", "required": True, "label": "Alternate executor full name"},
            "alternate_executor_id_number": {"type": "string", "required": True, "label": "Alternate executor SA ID number"},
            "alternate_executor_address": {"type": "string", "required": True, "label": "Alternate executor residential address"},
        },
        "will_types": _ALL_TYPES,
        "is_required": False,
        "display_order": 25,
    },
    # ── BENEFICIARY ─────────────────────────────────────────────
    {
        "code": "BENEF-01",
        "name": "Specific Bequest",
        "category": ClauseCategory.BENEFICIARY,
        "template_text": (
            "I bequeath {{ asset_description }} to {{ beneficiary_name }}, "
            "Identity Number {{ beneficiary_id_number }}. Should "
            "{{ beneficiary_name }} predecease me, this bequest shall "
            "{% if alternate_beneficiary_name %}"
            "devolve upon {{ alternate_beneficiary_name }}."
            "{% else %}"
            "form part of the residue of my estate."
            "{% endif %}"
        ),
        "variables_schema": {
            "asset_description": {"type": "string", "required": True, "label": "Description of the asset"},
            "beneficiary_name": {"type": "string", "required": True, "label": "Beneficiary full name"},
            "beneficiary_id_number": {"type": "string", "required": True, "label": "Beneficiary SA ID number"},
            "alternate_beneficiary_name": {"type": "string", "required": False, "label": "Alternate beneficiary name"},
        },
        "will_types": _ALL_TYPES,
        "is_required": False,
        "display_order": 30,
    },
    {
        "code": "BENEF-02",
        "name": "Residue of Estate",
        "category": ClauseCategory.RESIDUE,
        "template_text": (
            "I bequeath the rest and residue of my estate, of whatsoever nature "
            "and wheresoever situated, to {{ residue_beneficiary_name }}, "
            "Identity Number {{ residue_beneficiary_id_number }}."
        ),
        "variables_schema": {
            "residue_beneficiary_name": {"type": "string", "required": True, "label": "Residue beneficiary full name"},
            "residue_beneficiary_id_number": {"type": "string", "required": True, "label": "Residue beneficiary SA ID number"},
        },
        "will_types": _ALL_TYPES,
        "is_required": True,
        "display_order": 40,
    },
    # ── GUARDIAN ─────────────────────────────────────────────────
    {
        "code": "GUARD-01",
        "name": "Guardian Appointment for Minor Children",
        "category": ClauseCategory.GUARDIAN,
        "template_text": (
            "In the event of my death, I nominate and appoint "
            "{{ guardian_name }}, Identity Number {{ guardian_id_number }}, "
            "residing at {{ guardian_address }}, as the guardian of my minor "
            "{% if children_names %}"
            "{{ children_names }}."
            "{% else %}"
            "children."
            "{% endif %}"
            " I request that the guardian care for, maintain, and educate my "
            "children as if they were their own."
        ),
        "variables_schema": {
            "guardian_name": {"type": "string", "required": True, "label": "Guardian full name"},
            "guardian_id_number": {"type": "string", "required": True, "label": "Guardian SA ID number"},
            "guardian_address": {"type": "string", "required": True, "label": "Guardian residential address"},
            "children_names": {"type": "string", "required": False, "label": "Names of minor children"},
        },
        "will_types": _ALL_TYPES,
        "is_required": False,
        "display_order": 50,
    },
    # ── WITNESS / SIGNING ───────────────────────────────────────
    {
        "code": "WIT-01",
        "name": "Signing and Witness Clause",
        "category": ClauseCategory.WITNESS,
        "template_text": (
            "SIGNED at {{ signing_location }} on this {{ signing_date }}, "
            "in the presence of the undersigned witnesses, who have signed this "
            "will at the request of the Testator, in the presence of the Testator "
            "and in the presence of each other.\n\n"
            "TESTATOR: ________________________\n"
            "{{ testator_full_name }}\n\n"
            "WITNESS 1: ________________________\n"
            "{{ witness_1_name }}\n"
            "Identity Number: {{ witness_1_id_number }}\n\n"
            "WITNESS 2: ________________________\n"
            "{{ witness_2_name }}\n"
            "Identity Number: {{ witness_2_id_number }}"
        ),
        "variables_schema": {
            "signing_location": {"type": "string", "required": True, "label": "Place of signing"},
            "signing_date": {"type": "string", "required": True, "label": "Date of signing"},
            "testator_full_name": {"type": "string", "required": True, "label": "Testator full name"},
            "witness_1_name": {"type": "string", "required": True, "label": "First witness full name"},
            "witness_1_id_number": {"type": "string", "required": True, "label": "First witness SA ID number"},
            "witness_2_name": {"type": "string", "required": True, "label": "Second witness full name"},
            "witness_2_id_number": {"type": "string", "required": True, "label": "Second witness SA ID number"},
        },
        "will_types": _ALL_TYPES,
        "is_required": True,
        "display_order": 100,
    },
]


async def seed_clauses(session: AsyncSession) -> int:
    """Insert seed clauses if they do not already exist.

    Returns the number of newly inserted clauses. Existing clauses
    (matched by ``code``) are skipped to ensure idempotency.
    """
    inserted = 0
    now = datetime.now(timezone.utc)

    for clause_data in SEED_CLAUSES:
        code = clause_data["code"]

        # Check if clause already exists.
        stmt = select(Clause).where(Clause.code == code)
        result = await session.exec(stmt)
        existing = result.first()

        if existing is not None:
            logger.info("Clause %s already exists, skipping.", code)
            continue

        clause = Clause(
            code=code,
            name=clause_data["name"],
            category=clause_data["category"],
            version=1,
            is_current=True,
            template_text=clause_data["template_text"],
            variables_schema=clause_data["variables_schema"],
            will_types=clause_data["will_types"],
            is_required=clause_data["is_required"],
            display_order=clause_data["display_order"],
            approved_by="PLACEHOLDER - Pending Attorney Review",
            approved_at=now,
            approval_notes=(
                "Development placeholder. Must be reviewed and approved by "
                "a qualified South African attorney before production use."
            ),
        )
        session.add(clause)
        inserted += 1
        logger.info("Inserted clause %s: %s", code, clause_data["name"])

    if inserted > 0:
        await session.commit()
    return inserted


async def _main() -> None:
    """Entry point for running the seed script directly."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    async with async_session() as session:
        count = await seed_clauses(session)
        logger.info("Seeded %d new clause(s) (%d total defined).", count, len(SEED_CLAUSES))


if __name__ == "__main__":
    asyncio.run(_main())
