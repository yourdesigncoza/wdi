---
phase: "05"
plan: "03"
subsystem: "backend-verification"
tags: ["verification", "gemini", "openai", "sse", "fallback", "service", "api"]

dependency_graph:
  requires: ["05-01", "05-02"]
  provides: ["verification-service", "verification-api-endpoints"]
  affects: ["05-04"]

tech_stack:
  added: []
  patterns: ["dual-llm-fallback", "sse-progress-streaming", "di-service-factory"]

key_files:
  created:
    - "backend/app/services/verification_service.py"
    - "backend/app/api/verification.py"
  modified:
    - "backend/app/main.py"

decisions: []

metrics:
  duration: "2m 23s"
  completed: "2026-02-06"
---

# Phase 5 Plan 3: Verification Service and API Endpoints Summary

VerificationService orchestrating Gemini-first verification with OpenAI fallback, SSE progress streaming (check/section_result/done events), DB persistence of results, and will status gating; three REST/SSE endpoints registered.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Verification service with Gemini + OpenAI fallback | 4ea1faa | backend/app/services/verification_service.py |
| 2 | Verification API endpoints and router registration | c5e6483 | backend/app/api/verification.py, backend/app/main.py |

## What Was Built

### VerificationService (`backend/app/services/verification_service.py`, 274 lines)
- **Constructor:** Takes AsyncSession (DI), creates GeminiService and AsyncOpenAI client from settings
- **run_verification():** Async generator yielding SSE events through the full flow:
  1. Load will with user ownership check
  2. Collect all 15 JSONB section columns into verification dict
  3. Build prompt via `build_verification_prompt()`
  4. Try Gemini structured output first
  5. On Gemini failure, fall back to OpenAI `beta.chat.completions.parse()`
  6. Yield per-section results with issue counts
  7. Persist `verification_result` JSONB and `verified_at` timestamp
  8. Transition `will.status` to "verified" when no error-severity issues
- **get_verification_result():** Returns stored JSONB verification result or None
- **acknowledge_warnings():** Merges warning codes with deduplication, computes `can_proceed`
- **get_verification_service():** Standard FastAPI DI factory

### Verification API (`backend/app/api/verification.py`, 145 lines)
- **POST `/api/wills/{will_id}/verify`:** SSE streaming endpoint via EventSourceResponse, client disconnect handling
- **GET `/api/wills/{will_id}/verification`:** Returns VerificationResponse with computed `has_blocking_errors`
- **POST `/api/wills/{will_id}/acknowledge-warnings`:** Accepts AcknowledgeWarningsRequest, returns AcknowledgeWarningsResponse
- All endpoints use `_extract_user_id()` with dev fallback pattern (matching conversation.py)

### Router Registration (`backend/app/main.py`)
- `verification` module imported alongside existing API modules
- Router included between conversation and will routers

## Decisions Made

No new decisions -- followed established patterns from 05-01/05-02.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

All 6 verification criteria passed:
1. VerificationService imports without errors
2. All three endpoints registered in FastAPI app (verify, verification, acknowledge-warnings)
3. SSE endpoint returns EventSourceResponse
4. Verification result persisted to Will.verification_result JSONB
5. OpenAI fallback activates when Gemini is unavailable (_verify_with_openai method)
6. Will status transitions to "verified" when no blocking errors

## Next Phase Readiness

- Verification service ready for frontend integration (Phase 05-04)
- SSE events match established dual-event pattern for frontend consumption
- GEMINI_API_KEY must be set for live Gemini verification
- OPENAI_API_KEY provides fallback if Gemini is unavailable

## Self-Check: PASSED
