"""Gemini service for will verification (dual-LLM layer).

Provides async structured-output API calls to Google Gemini
for independent verification of AI-generated will data.
"""

from __future__ import annotations

import logging
from typing import TypeVar

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Verification should be deterministic
_VERIFICATION_TEMPERATURE = 0.1


class GeminiService:
    """Thin async wrapper around Google Gemini for structured verification.

    Responsibilities:
    - Make async API calls with Pydantic structured output
    - Availability checking (graceful fallback when API key missing)
    """

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash") -> None:
        self._api_key = api_key
        self._model = model
        self._client = genai.Client(api_key=api_key) if api_key else None

    async def verify(
        self,
        will_data: dict,
        prompt: str,
        response_schema: type[T],
    ) -> T:
        """Verify will data using Gemini structured output.

        Parameters
        ----------
        will_data:
            Will section data to verify as dict.
        prompt:
            Verification prompt instructing the model what to check.
        response_schema:
            Pydantic model class for the structured response.

        Returns
        -------
        Parsed Pydantic object matching response_schema.

        Raises
        ------
        RuntimeError:
            If service is not available (no API key).
        Exception:
            On Gemini API errors (caller handles fallback).
        """
        if not self._client:
            raise RuntimeError("GeminiService unavailable: no API key configured")

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=f"{prompt}\n\nWill data:\n{will_data}",
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=_VERIFICATION_TEMPERATURE,
            ),
        )

        return response.parsed

    async def is_available(self) -> bool:
        """Check if Gemini API is reachable and authenticated.

        Returns False if API key is empty or API call fails.
        """
        if not self._api_key or not self._client:
            return False

        try:
            await self._client.aio.models.generate_content(
                model=self._model,
                contents="Reply with exactly: ok",
                config=types.GenerateContentConfig(
                    max_output_tokens=5,
                    temperature=0.0,
                ),
            )
            return True
        except Exception:
            logger.warning("Gemini availability check failed", exc_info=True)
            return False
