---
phase: 03
plan: 02
subsystem: ai-conversation
tags: [openai, prompts, extraction, pydantic, streaming, tdd]
dependency_graph:
  requires: [01-05]
  provides: [openai-service, system-prompts, extraction-schemas]
  affects: [03-03, 03-04, 03-05]
tech_stack:
  added: [openai>=1.60.0]
  patterns: [async-streaming, structured-outputs, section-aware-prompts]
key_files:
  created:
    - backend/app/services/openai_service.py
    - backend/app/prompts/__init__.py
    - backend/app/prompts/system.py
    - backend/app/prompts/extraction.py
    - backend/tests/test_openai_service.py
  modified:
    - backend/requirements.txt
    - backend/app/config.py
decisions:
  - id: D-0302-01
    decision: "Temperature 0.7 for conversation, 0.2 for extraction"
    rationale: "Higher creativity for natural conversation, lower for precise data extraction"
  - id: D-0302-02
    decision: "Rolling window of last 10 messages for extraction context"
    rationale: "Prevents token bloat while maintaining recent conversation context"
  - id: D-0302-03
    decision: "UPL boundary as separate constant from base personality"
    rationale: "Allows testing and reuse of UPL instruction independently"
metrics:
  duration: 4m 2s
  completed: 2026-02-06
  tests: 49 new (72 total, 0 regressions)
---

# Phase 3 Plan 02: OpenAI Service TDD Summary

**OpenAIService with section-aware system prompts, streaming response, and Pydantic extraction schemas for SA will conversations via gpt-4o-mini**

## What Was Built

### OpenAI Service (`backend/app/services/openai_service.py`)
- `OpenAIService` class with `AsyncOpenAI` client
- `stream_response()`: async generator yielding text chunks from streaming completion
- `extract_will_data()`: structured output parsing via `client.chat.completions.parse()` with `ExtractedWillData` response_format
- Temperature: 0.7 conversation, 0.2 extraction; max_tokens: 1024 stream, 512 extraction

### System Prompts (`backend/app/prompts/system.py`)
- `BASE_PERSONALITY`: friendly, approachable, empathetic tone with "passing" not "dying"
- `UPL_BOUNDARY`: explicit instruction to never give legal advice
- `SECTION_PROMPTS`: dict with guidance for beneficiaries, assets, guardians, executor, bequests, residue
- `build_system_prompt(section, will_context)`: assembles base + UPL + section + will state + no-reask
- `format_will_summary(will_context)`: renders collected will data as concise text for system prompt

### Extraction Schemas (`backend/app/prompts/extraction.py`)
- `ExtractedBeneficiary`: full_name, relationship, id_number?, share_percent?, is_charity
- `ExtractedAsset`: asset_type, description, details?
- `ExtractedGuardian`: full_name, relationship, is_primary (default True)
- `ExtractedExecutor`: name, relationship?, is_professional, backup_name?
- `ExtractedWillData`: composite model with all above + bequests[] + needs_clarification[]
- `EXTRACTION_SYSTEM_PROMPT`: constant for extraction system message

### Configuration
- `OPENAI_API_KEY` and `OPENAI_MODEL` added to `Settings` in `backend/app/config.py`
- `openai>=1.60.0` added to `backend/requirements.txt`

## TDD Cycle

| Phase | Tests | Commit | Description |
|-------|-------|--------|-------------|
| RED | 49 failing | 7011d15 | Tests for prompt building, will summary, schemas, service |
| GREEN | 49 passing | 8b3d1eb | Full implementation, all tests green |
| REFACTOR | -- | skipped | Code already clean and DRY |

## Task Commits

| # | Type | Hash | Description |
|---|------|------|-------------|
| 1 | test | 7011d15 | Failing tests for OpenAI service and prompts |
| 2 | feat | 8b3d1eb | Implement OpenAI service with SA will prompts and extraction |

## Decisions Made

1. **D-0302-01**: Temperature 0.7 for conversation, 0.2 for extraction -- higher creativity for natural chat, precision for data parsing
2. **D-0302-02**: Rolling window of last 10 messages for extraction -- prevents token bloat while keeping recent context
3. **D-0302-03**: UPL boundary as separate constant -- enables independent testing and reuse across prompts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Empty testator dict treated as falsy**
- **Found during:** GREEN phase
- **Issue:** `will_context.get("testator")` returns `{}` which is falsy, so empty testator was silently skipped instead of rendering "Testator: ? ?"
- **Fix:** Changed to explicit `"testator" in will_context and will_context["testator"] is not None` check
- **Files modified:** `backend/app/prompts/system.py`
- **Commit:** 8b3d1eb (included in GREEN commit)

## Verification Results

1. Tests pass: `python -m pytest tests/test_openai_service.py -v` -- 49/49 passed
2. Service imports: `from app.services.openai_service import OpenAIService` -- OK
3. Prompts import: `from app.prompts.system import build_system_prompt; from app.prompts.extraction import ExtractedWillData` -- OK
4. Regression check: all 72 tests pass (49 new + 23 existing)

## Next Phase Readiness

- OpenAI service is ready for integration with conversation endpoints (Plan 03-03)
- OPENAI_API_KEY must be set in backend/.env before live API calls
- Extraction schemas ready for use with SSE streaming endpoint

## Self-Check: PASSED
