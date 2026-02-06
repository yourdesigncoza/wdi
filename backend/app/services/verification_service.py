"""Verification service orchestrating Gemini verification with OpenAI fallback.

Manages the full verification flow: collecting will data, calling Gemini
(or falling back to OpenAI), streaming SSE progress events, persisting
results, and gating will status transitions.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import Depends
from openai import AsyncOpenAI
from sqlalchemy import and_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.will import Will
from app.prompts.verification import build_verification_prompt
from app.schemas.verification import VerificationResult
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class VerificationService:
    """Orchestrates AI verification of will data with dual-LLM fallback.

    Responsibilities:
    - Collect all will JSONB section data into a single verification payload
    - Call Gemini for structured verification (primary)
    - Fall back to OpenAI if Gemini is unavailable or errors
    - Stream SSE progress events throughout the verification flow
    - Persist verification results to the Will model
    - Gate will status transitions (draft -> verified)
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._gemini = GeminiService(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )
        self._openai_client = (
            AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            if settings.OPENAI_API_KEY
            else None
        )

    async def _get_will_for_user(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Will | None:
        """Retrieve a will only if it belongs to the given user."""
        stmt = select(Will).where(
            and_(Will.id == will_id, Will.user_id == user_id)
        )
        result = await self._session.exec(stmt)
        return result.first()

    def _collect_will_data(self, will: Will) -> dict:
        """Collect all JSONB section data into a single verification dict."""
        return {
            "testator": will.testator,
            "marital": will.marital,
            "beneficiaries": will.beneficiaries,
            "assets": will.assets,
            "guardians": will.guardians,
            "executor": will.executor,
            "bequests": will.bequests,
            "residue": will.residue,
            "trust_provisions": will.trust_provisions,
            "usufruct": will.usufruct,
            "business_assets": will.business_assets,
            "joint_will": will.joint_will,
            "scenarios": will.scenarios,
            "will_type": will.will_type,
            "sections_complete": will.sections_complete,
        }

    async def _verify_with_openai(self, prompt: str) -> VerificationResult:
        """Fallback verification via OpenAI structured output.

        Uses the beta chat.completions.parse endpoint with
        VerificationResult as response_format for guaranteed schema.
        """
        if not self._openai_client:
            raise RuntimeError("OpenAI fallback unavailable: no API key configured")

        completion = await self._openai_client.beta.chat.completions.parse(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": prompt},
            ],
            response_format=VerificationResult,
            temperature=0.1,
        )
        return completion.choices[0].message.parsed

    def _has_blocking_errors(self, result: VerificationResult) -> bool:
        """Check if verification result contains any error-severity issues."""
        for section in result.sections:
            for issue in section.issues:
                if issue.severity == "error":
                    return True
        return False

    async def run_verification(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AsyncGenerator[dict, None]:
        """Run full verification flow, yielding SSE progress events.

        Event types:
        - check: progress updates (collecting_data, verifying, fallback, analyzing_results)
        - section_result: per-section verification status
        - done: final event with complete VerificationResult
        - error: if both Gemini and OpenAI fail

        Yields dicts with 'event' and 'data' keys for SSE serialisation.
        """
        # Load will with ownership check
        will = await self._get_will_for_user(will_id, user_id)
        if will is None:
            yield {
                "event": "error",
                "data": json.dumps({"message": "Will not found"}),
            }
            return

        # Step 1: Collect will data
        yield {
            "event": "check",
            "data": json.dumps({"step": "collecting_data", "message": "Collecting will data..."}),
        }
        will_data = self._collect_will_data(will)

        # Step 2: Build verification prompt
        prompt = build_verification_prompt(will_data)

        # Step 3: Verify with AI (Gemini first, OpenAI fallback)
        yield {
            "event": "check",
            "data": json.dumps({"step": "verifying", "message": "Verifying with AI..."}),
        }

        result: VerificationResult | None = None

        # Try Gemini first
        try:
            result = await self._gemini.verify(
                will_data=will_data,
                prompt=prompt,
                response_schema=VerificationResult,
            )
            logger.info("Verification completed via Gemini for will %s", will_id)
        except Exception as exc:
            logger.warning("Gemini verification failed, falling back to OpenAI: %s", exc)
            yield {
                "event": "check",
                "data": json.dumps({"step": "fallback", "message": "Switching to backup verification..."}),
            }

            # Try OpenAI fallback
            try:
                result = await self._verify_with_openai(prompt)
                logger.info("Verification completed via OpenAI fallback for will %s", will_id)
            except Exception as fallback_exc:
                logger.error("Both Gemini and OpenAI verification failed: %s", fallback_exc)
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "message": "Verification temporarily unavailable. Please try again later.",
                    }),
                }
                return

        # Step 4: Analyze results
        yield {
            "event": "check",
            "data": json.dumps({"step": "analyzing_results", "message": "Analyzing results..."}),
        }

        # Yield per-section results
        for section in result.sections:
            yield {
                "event": "section_result",
                "data": json.dumps({
                    "section": section.section,
                    "status": section.status,
                    "issue_count": len(section.issues),
                }),
            }

        # Step 5: Persist results to Will model
        result_dict = result.model_dump()
        will.verification_result = result_dict
        will.verified_at = datetime.now(timezone.utc)
        will.updated_at = datetime.now(timezone.utc)

        # Transition status if no blocking errors
        if not self._has_blocking_errors(result):
            will.status = "verified"

        self._session.add(will)
        await self._session.flush()

        # Step 6: Final result event
        yield {
            "event": "done",
            "data": json.dumps(result_dict),
        }

    async def get_verification_result(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict | None:
        """Return the last saved verification result, or None if not verified."""
        will = await self._get_will_for_user(will_id, user_id)
        if will is None:
            return None
        return will.verification_result

    async def acknowledge_warnings(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
        warning_codes: list[str],
    ) -> dict:
        """Acknowledge warning codes and check if user can proceed.

        Merges new codes with previously acknowledged ones (deduplicates).
        Returns the full acknowledged list and whether proceeding is possible
        (no unacknowledged error-severity issues remain).
        """
        will = await self._get_will_for_user(will_id, user_id)
        if will is None:
            raise ValueError("Will not found")

        # Merge and deduplicate
        existing = set(will.acknowledged_warnings or [])
        existing.update(warning_codes)
        will.acknowledged_warnings = sorted(existing)
        will.updated_at = datetime.now(timezone.utc)

        # Check if can proceed: no error-severity issues in verification
        can_proceed = True
        if will.verification_result:
            result = VerificationResult.model_validate(will.verification_result)
            can_proceed = not self._has_blocking_errors(result)

        self._session.add(will)
        await self._session.flush()

        return {
            "acknowledged": will.acknowledged_warnings,
            "can_proceed": can_proceed,
        }


async def get_verification_service(
    session: AsyncSession = Depends(get_session),
) -> VerificationService:
    """FastAPI dependency that assembles a VerificationService."""
    return VerificationService(session=session)
