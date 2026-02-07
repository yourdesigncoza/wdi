"""Conversation service orchestrating AI responses with UPL filtering.

Manages conversation history persistence, message windowing, streaming
AI responses via OpenAI, and post-response UPL compliance filtering.
This is the core integration point connecting OpenAI, UPL filter, and
conversation history into a single streaming flow.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy import and_
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.conversation import Conversation
from app.models.will import Will
from app.prompts.extraction import ExtractedWillData
from app.services.audit_service import AuditService
from app.services.clause_library import ClauseLibraryService
from app.services.openai_service import OpenAIService
from app.services.upl_filter import FilterAction, UPLFilterService

logger = logging.getLogger(__name__)

# Rolling window size for messages sent to OpenAI API
_MESSAGE_WINDOW_SIZE = 20


class ConversationService:
    """Orchestrates AI conversation with UPL filtering and history persistence.

    Responsibilities:
    - Persist conversation history per will+section in the database
    - Apply rolling message window to prevent token limit issues
    - Stream AI responses via OpenAI and accumulate for UPL filtering
    - Filter complete responses through the UPL filter before final event
    - Extract structured will data from conversation messages
    """

    def __init__(
        self,
        session: AsyncSession,
        openai_service: OpenAIService,
        upl_filter: UPLFilterService,
    ) -> None:
        self._session = session
        self._openai = openai_service
        self._upl_filter = upl_filter

    async def get_or_create_conversation(
        self,
        will_id: uuid.UUID,
        section: str,
    ) -> Conversation:
        """Retrieve or create a conversation for a will+section pair.

        The unique composite index on (will_id, section) ensures only one
        conversation exists per section per will.
        """
        stmt = select(Conversation).where(
            and_(
                Conversation.will_id == will_id,
                Conversation.section == section,
            )
        )
        result = await self._session.exec(stmt)
        conversation = result.first()

        if conversation is not None:
            return conversation

        conversation = Conversation(
            will_id=will_id,
            section=section,
            messages=[],
        )
        self._session.add(conversation)
        await self._session.flush()
        await self._session.refresh(conversation)
        return conversation

    async def add_message(
        self,
        conversation: Conversation,
        role: str,
        content: str,
    ) -> None:
        """Append a message to the conversation history and persist.

        Each message is stored as a dict with role, content, and ISO timestamp.
        """
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        # JSONB array mutation requires reassignment for SQLAlchemy change detection
        updated_messages = list(conversation.messages) + [message]
        conversation.messages = updated_messages
        conversation.updated_at = datetime.now(timezone.utc)
        self._session.add(conversation)
        await self._session.flush()

    def get_message_window(
        self,
        conversation: Conversation,
        window_size: int = _MESSAGE_WINDOW_SIZE,
    ) -> list[dict]:
        """Return the last ``window_size`` messages as OpenAI-compatible dicts.

        This implements the rolling window to prevent token limit issues.
        Only role and content are included (timestamps excluded).
        """
        messages = conversation.messages or []
        windowed = messages[-window_size:]
        return [
            {"role": msg["role"], "content": msg["content"]}
            for msg in windowed
        ]

    async def stream_ai_response(
        self,
        will_id: uuid.UUID,
        section: str,
        user_message: str,
        will_context: dict,
    ) -> AsyncGenerator[dict, None]:
        """Stream an AI response with UPL filtering and history persistence.

        Flow:
        1. Get or create conversation for this will+section
        2. Add the user message to conversation history
        3. Get rolling message window (last 20 messages)
        4. Stream response from OpenAI, yielding delta events
        5. After stream completes, run UPL filter on full response
        6. If filtered, yield a filtered event with replacement text
        7. Persist the assistant message (filtered text if applicable)
        8. Yield done event

        Yields dicts with 'event' and 'data' keys for SSE serialisation.
        """
        conversation = await self.get_or_create_conversation(will_id, section)

        # Persist user message
        await self.add_message(conversation, "user", user_message)

        # Build message window for OpenAI
        message_window = self.get_message_window(conversation)

        # Stream from OpenAI, accumulating the full response
        full_response = ""
        try:
            async for chunk in self._openai.stream_response(
                messages=message_window,
                section=section,
                will_context=will_context,
            ):
                full_response += chunk
                yield {
                    "event": "delta",
                    "data": json.dumps({"content": chunk}),
                }
        except Exception as exc:
            logger.error("OpenAI streaming error: %s", exc)
            yield {
                "event": "error",
                "data": json.dumps({"message": "An error occurred while generating a response."}),
            }
            return

        # Run UPL filter on the complete response
        filter_result = await self._upl_filter.filter_output(
            text=full_response,
            context={"category": section, "will_type": "basic"},
        )

        # Determine the final text to persist
        final_text = full_response
        if filter_result.action != FilterAction.ALLOW:
            final_text = filter_result.filtered_text
            yield {
                "event": "filtered",
                "data": json.dumps({
                    "action": filter_result.action.value,
                    "content": filter_result.filtered_text,
                }),
            }

        # Persist assistant message (filtered version if applicable)
        await self.add_message(conversation, "assistant", final_text)

        # Auto-extract structured data and persist to will JSONB
        try:
            extracted = await self.extract_data_from_conversation(will_id, section)
            if extracted is not None:
                await self.save_extracted_to_will(will_id, section, extracted)
        except Exception as exc:
            logger.warning("Auto-extraction failed for will %s section %s: %s", will_id, section, exc)

        yield {
            "event": "done",
            "data": json.dumps({"complete": True}),
        }

    async def extract_data_from_conversation(
        self,
        will_id: uuid.UUID,
        section: str,
    ) -> ExtractedWillData | None:
        """Extract structured will data from the latest conversation messages.

        Uses the OpenAI extraction endpoint with the last user message and
        recent conversation history for context.

        Returns None if no conversation exists or no user messages found.
        """
        conversation = await self.get_or_create_conversation(will_id, section)
        messages = conversation.messages or []

        if not messages:
            return None

        # Find the latest user message
        user_messages = [m for m in messages if m["role"] == "user"]
        if not user_messages:
            return None

        latest_user_message = user_messages[-1]["content"]
        history = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]

        return await self._openai.extract_will_data(
            conversation_history=history,
            latest_message=latest_user_message,
        )

    async def save_extracted_to_will(
        self,
        will_id: uuid.UUID,
        section: str,
        extracted: ExtractedWillData,
    ) -> None:
        """Persist extracted conversation data to the will's JSONB section columns.

        Maps the flat ExtractedWillData fields to the correct will section column
        based on the current conversation section. Only updates if extracted data
        is non-empty to avoid overwriting existing data with blanks.
        """
        stmt = select(Will).where(Will.id == will_id)
        result = await self._session.exec(stmt)
        will = result.first()
        if will is None:
            return

        changed = False

        # Map section -> extraction field -> will column
        if section == "beneficiaries" and extracted.beneficiaries:
            will.beneficiaries = [b.model_dump() for b in extracted.beneficiaries]
            changed = True
        elif section == "assets" and extracted.assets:
            will.assets = [a.model_dump() for a in extracted.assets]
            changed = True
        elif section == "guardians" and extracted.guardians:
            will.guardians = [g.model_dump() for g in extracted.guardians]
            changed = True
        elif section == "executor" and extracted.executor:
            will.executor = extracted.executor.model_dump()
            changed = True
        elif section == "bequests" and extracted.bequests:
            will.bequests = [b.model_dump() for b in extracted.bequests]
            changed = True
        elif section == "residue" and extracted.residue:
            will.residue = extracted.residue.model_dump()
            changed = True
        elif section == "trust" and extracted.trust:
            will.trust_provisions = extracted.trust.model_dump()
            changed = True
        elif section == "usufruct" and extracted.usufruct_data:
            will.usufruct = extracted.usufruct_data.model_dump()
            changed = True
        elif section == "business" and extracted.business_data:
            will.business_assets = [b.model_dump() for b in extracted.business_data]
            changed = True

        if changed:
            will.updated_at = datetime.now(timezone.utc)
            self._session.add(will)
            await self._session.flush()
            logger.info("Saved extracted %s data to will %s", section, will_id)

    async def get_will_for_user(
        self,
        will_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Will | None:
        """Retrieve a will only if it belongs to the given user.

        Used for ownership verification before allowing conversation access.
        """
        stmt = select(Will).where(
            and_(
                Will.id == will_id,
                Will.user_id == user_id,
            )
        )
        result = await self._session.exec(stmt)
        return result.first()


def get_conversation_service(
    session: AsyncSession = Depends(get_session),
) -> ConversationService:
    """FastAPI dependency that assembles a ConversationService.

    Wires together the database session, OpenAI service, and UPL filter
    service via dependency injection.
    """
    openai_service = OpenAIService(
        api_key=settings.OPENAI_API_KEY,
        model=settings.OPENAI_MODEL,
    )
    clause_service = ClauseLibraryService(session=session)
    audit_service = AuditService(session=session)
    upl_filter = UPLFilterService(
        clause_service=clause_service,
        audit_service=audit_service,
    )
    return ConversationService(
        session=session,
        openai_service=openai_service,
        upl_filter=upl_filter,
    )
