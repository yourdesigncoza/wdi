---
phase: "03"
plan: "05"
subsystem: "conversation-service"
tags: ["sse", "streaming", "conversation", "upl-filter", "openai", "fastapi"]

dependency_graph:
  requires: ["03-01", "03-02"]
  provides: ["conversation-service", "sse-streaming-endpoint", "conversation-history-api", "extraction-endpoint"]
  affects: ["03-06", "03-07", "03-08"]

tech_stack:
  added: ["sse-starlette>=2.0.0"]
  patterns: ["dual-event-sse", "rolling-message-window", "di-service-assembly"]

key_files:
  created:
    - "backend/app/services/conversation_service.py"
    - "backend/app/api/conversation.py"
  modified:
    - "backend/requirements.txt"
    - "backend/app/main.py"
    - "backend/app/schemas/conversation.py"

decisions:
  - id: "D-0305-01"
    description: "20-message rolling window for OpenAI API calls to prevent token limit issues"
  - id: "D-0305-02"
    description: "Dual-event SSE pattern: delta events during streaming, filtered/done events after UPL check"
  - id: "D-0305-03"
    description: "UPL-filtered text persisted as assistant message (not original) when filter activates"

metrics:
  duration: "3m 14s"
  completed: "2026-02-06"
---

# Phase 3 Plan 05: Conversation Service Summary

**ConversationService with SSE streaming endpoint orchestrating OpenAI responses, UPL filtering on complete text, per-section conversation persistence with 20-message rolling window, and data extraction endpoint via sse-starlette EventSourceResponse**

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install sse-starlette and create ConversationService | c0ffdaf | services/conversation_service.py, requirements.txt, schemas/conversation.py |
| 2 | Create SSE streaming conversation endpoint | 79b3ea0 | api/conversation.py, main.py |

## What Was Built

### ConversationService (`backend/app/services/conversation_service.py`)
- `get_or_create_conversation(will_id, section)`: queries for existing conversation by will_id+section, creates if not found
- `add_message(conversation, role, content)`: appends {role, content, timestamp} to JSONB messages array with proper mutation for SQLAlchemy change detection
- `get_message_window(conversation, window_size=20)`: returns last N messages as OpenAI-compatible dicts (role+content only)
- `stream_ai_response(will_id, section, user_message, will_context)`: async generator yielding SSE events -- streams delta chunks from OpenAI, runs UPL filter on complete response, yields filtered event if needed, persists assistant message, yields done event
- `extract_data_from_conversation(will_id, section)`: extracts structured will data via OpenAI Structured Outputs from the latest user message
- `get_will_for_user(will_id, user_id)`: ownership verification query
- `get_conversation_service()`: DI function wiring session, OpenAI, clause library, audit, and UPL filter

### SSE Streaming Endpoint (`backend/app/api/conversation.py`)
- `POST /api/conversation/stream`: SSE streaming via EventSourceResponse, extracts user from auth middleware, verifies will ownership, streams AI response with dual-event pattern
- `GET /api/conversation/{will_id}/{section}`: returns full conversation history for section re-entry
- `POST /api/conversation/{will_id}/{section}/extract`: triggers structured data extraction from conversation

### Schema Updates (`backend/app/schemas/conversation.py`)
- Added `will_id` to `ConversationRequest` for ownership verification
- Added `will_id` to `ConversationResponse` for consistency
- Added `ExtractionResponse` schema with `extracted` dict and `has_data` boolean

### Infrastructure
- `sse-starlette>=2.0.0` added to requirements.txt and installed
- Conversation router registered in `main.py`

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0305-01 | 20-message rolling window | Prevents token limit issues while maintaining recent context; aligns with RESEARCH.md recommendation |
| D-0305-02 | Dual-event SSE pattern | delta events enable real-time typing UX; filtered/done events come after UPL check on complete text |
| D-0305-03 | Persist filtered text as assistant message | Users should never see UPL-filtered content in history; filtered version is the canonical record |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added will_id to ConversationRequest schema**
- **Found during:** Task 1
- **Issue:** ConversationRequest schema (from 03-01) lacked `will_id` field, but the streaming endpoint needs it for will ownership verification
- **Fix:** Added `will_id: uuid.UUID` to ConversationRequest, ConversationResponse, and created ExtractionResponse schema
- **Files modified:** `backend/app/schemas/conversation.py`
- **Commit:** c0ffdaf

**2. [Rule 2 - Missing Critical] Added error event for OpenAI streaming failures**
- **Found during:** Task 1
- **Issue:** If OpenAI streaming raises an exception mid-stream, the client receives no indication of failure
- **Fix:** Added try/except around streaming loop, yields `error` event with user-friendly message on failure
- **Files modified:** `backend/app/services/conversation_service.py`
- **Commit:** c0ffdaf

**3. [Rule 2 - Missing Critical] Added client disconnect detection**
- **Found during:** Task 2
- **Issue:** If the client disconnects during streaming, the server would continue generating and filtering uselessly
- **Fix:** Added `request.is_disconnected()` check in event generator loop
- **Files modified:** `backend/app/api/conversation.py`
- **Commit:** 79b3ea0

## Verification Results

1. sse-starlette installed: PASS (v3.2.0)
2. Service imports: PASS (`from app.services.conversation_service import ConversationService`)
3. Router has 3 routes: PASS (stream, history, extract)
4. Main includes conversation router: PASS
5. EventSourceResponse used in endpoint: PASS

## Next Phase Readiness

Downstream plans can now build on:
- Conversation streaming endpoint for frontend chat UI (03-06, 03-07)
- Conversation history API for section re-entry (03-06)
- Extraction endpoint for post-conversation data capture (03-07)
- OPENAI_API_KEY must be set in backend/.env before live API calls
- Migration 003 must be applied before conversation persistence works

## Self-Check: PASSED
