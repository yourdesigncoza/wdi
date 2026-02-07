"""Conversation endpoints for AI-guided will creation.

POST /api/conversation/stream  -- SSE streaming conversation with AI
GET  /api/conversation/{will_id}/{section}  -- Retrieve conversation history
POST /api/conversation/{will_id}/{section}/extract  -- Extract will data from conversation
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.schemas.conversation import (
    ConversationRequest,
    ConversationResponse,
    ExtractionResponse,
    MessageSchema,
)
from app.services.conversation_service import (
    ConversationService,
    get_conversation_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversation", tags=["conversation"])


def _extract_user_id(request: Request) -> uuid.UUID:
    """Extract authenticated user_id from request state.

    Mirrors the will API's dev-fallback pattern: when CLERK_JWKS_URL is
    empty the auth middleware doesn't set user_id, so we use a
    deterministic UUID for local development.
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id is None:
        from app.config import settings

        if not settings.CLERK_JWKS_URL:
            return uuid.UUID("00000000-0000-0000-0000-000000000000")
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


@router.post("/stream")
async def stream_conversation(
    request: Request,
    body: ConversationRequest,
    service: ConversationService = Depends(get_conversation_service),
):
    """Stream an AI conversation response via Server-Sent Events.

    Dual-event pattern:
    - ``delta`` events carry text chunks as they arrive from OpenAI
    - ``filtered`` event (if UPL filter activates) carries replacement text
    - ``done`` event signals the response is complete

    Verifies will ownership before allowing conversation access.
    """
    user_id = _extract_user_id(request)

    # Verify will ownership
    will_doc = await service.get_will_for_user(body.will_id, user_id)
    if will_doc is None:
        raise HTTPException(status_code=404, detail="Will not found")

    # Extract the latest user message from the request
    user_messages = [m for m in body.messages if m.role == "user"]
    if not user_messages:
        raise HTTPException(status_code=400, detail="No user message provided")

    latest_user_message = user_messages[-1].content

    async def event_generator():
        async for event in service.stream_ai_response(
            will_id=body.will_id,
            section=body.current_section,
            user_message=latest_user_message,
            will_context=body.will_context,
        ):
            # Check if client disconnected
            if await request.is_disconnected():
                logger.info("Client disconnected during streaming")
                break
            yield event

    return EventSourceResponse(event_generator())


@router.get("/{will_id}/{section}", response_model=ConversationResponse)
async def get_conversation_history(
    will_id: uuid.UUID,
    section: str,
    request: Request,
    service: ConversationService = Depends(get_conversation_service),
):
    """Retrieve conversation history for a will+section.

    Returns all messages in chronological order. Used when the user
    navigates back to a previously visited section.
    """
    user_id = _extract_user_id(request)

    # Verify will ownership
    will_doc = await service.get_will_for_user(will_id, user_id)
    if will_doc is None:
        raise HTTPException(status_code=404, detail="Will not found")

    conversation = await service.get_or_create_conversation(will_id, section)

    messages = [
        MessageSchema(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg.get("timestamp"),
        )
        for msg in (conversation.messages or [])
    ]

    return ConversationResponse(
        will_id=will_id,
        section=section,
        messages=messages,
    )


@router.post("/{will_id}/{section}/extract", response_model=ExtractionResponse)
async def extract_will_data(
    will_id: uuid.UUID,
    section: str,
    request: Request,
    service: ConversationService = Depends(get_conversation_service),
):
    """Extract structured will data from the conversation for a section.

    Triggers OpenAI Structured Output parsing on the latest conversation
    messages to extract beneficiaries, assets, guardians, executor, etc.
    """
    user_id = _extract_user_id(request)

    # Verify will ownership
    will_doc = await service.get_will_for_user(will_id, user_id)
    if will_doc is None:
        raise HTTPException(status_code=404, detail="Will not found")

    extracted = await service.extract_data_from_conversation(will_id, section)

    if extracted is None:
        return ExtractionResponse(extracted={}, has_data=False)

    # Persist extracted data to will JSONB columns
    await service.save_extracted_to_will(will_id, section, extracted)

    return ExtractionResponse(
        extracted=extracted.model_dump(),
        has_data=True,
    )
