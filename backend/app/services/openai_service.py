"""OpenAI service for will creation conversations.

Provides streaming AI responses and structured data extraction using
section-aware system prompts tailored to South African will creation.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI

from app.prompts.extraction import (
    EXTRACTION_SYSTEM_PROMPT,
    ExtractedWillData,
)
from app.prompts.system import build_system_prompt

logger = logging.getLogger(__name__)

# Temperature settings
_CONVERSATION_TEMPERATURE = 0.7
_EXTRACTION_TEMPERATURE = 0.2

# Token limits
_STREAM_MAX_TOKENS = 1024
_EXTRACT_MAX_TOKENS = 512


class OpenAIService:
    """Manages OpenAI interactions for will creation conversations.

    Responsibilities:
    - Stream conversational AI responses with section-specific prompts
    - Extract structured will data from natural language via Structured Outputs
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def stream_response(
        self,
        messages: list[dict],
        section: str,
        will_context: dict,
    ) -> AsyncGenerator[str, None]:
        """Stream an AI response for the given conversation section.

        Parameters
        ----------
        messages:
            Conversation history as list of {role, content} dicts.
        section:
            Current will section (beneficiaries, assets, guardians, etc.).
        will_context:
            Current will data for system prompt context.

        Yields
        ------
        Text chunks as they arrive from the streaming API.
        """
        system_prompt = build_system_prompt(section, will_context)

        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            stream=True,
            temperature=_CONVERSATION_TEMPERATURE,
            max_tokens=_STREAM_MAX_TOKENS,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def extract_will_data(
        self,
        conversation_history: list[dict],
        latest_message: str,
    ) -> ExtractedWillData:
        """Extract structured will data from the full conversation.

        Uses OpenAI Structured Outputs (response_format with Pydantic model)
        for guaranteed schema-valid extraction. Sends the full conversation
        history so the model can compile data stated across multiple messages.

        Parameters
        ----------
        conversation_history:
            Full conversation messages for extraction context.
        latest_message:
            The most recent user message (unused, kept for API compat).

        Returns
        -------
        ExtractedWillData with all will-related data found in the conversation.
        """
        completion = await self._client.chat.completions.parse(
            model=self._model,
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                *conversation_history[-20:],  # Full conversation window
            ],
            response_format=ExtractedWillData,
            temperature=_EXTRACTION_TEMPERATURE,
            max_tokens=_EXTRACT_MAX_TOKENS,
        )

        return completion.choices[0].message.parsed
