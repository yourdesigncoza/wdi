# Bugs Fixed

## BUG-008: Review section CORS error / 500 race condition (2026-02-09)

**Issue:** Navigating to the will review section briefly shows content then disappears. Browser console shows CORS error on `GET /api/conversation/{will_id}/review`.

**Root Cause:** Race condition in `get_or_create_conversation()`. When user enters the review section, two concurrent requests fire simultaneously:
1. `useConversation` useEffect → `GET /api/conversation/{willId}/review` (load history)
2. `ReviewChat` useEffect → `POST /api/conversation/stream` (auto-send review greeting)

Both call `get_or_create_conversation(will_id, 'review')`, both SELECT and find no existing row, both try to INSERT. The second one crashes with `UniqueViolationError` on the `ix_conversations_will_section` unique index. The 500 response lacks CORS headers (Starlette CORS middleware doesn't add headers to unhandled exceptions), so the browser reports it as a CORS error.

**Solution:** Wrapped the INSERT in `begin_nested()` (SQLAlchemy savepoint). On `IntegrityError`, the savepoint rolls back only the failed INSERT while keeping the outer transaction valid, then re-SELECTs the existing row that the winning request created.

**Files:** `backend/app/services/conversation_service.py`

**Prevention:**
- Any `get_or_create` pattern with a unique constraint must handle `IntegrityError` — use savepoint + retry SELECT
- When debugging CORS errors on Railway, always check backend logs first — 500s masquerade as CORS because error responses lack CORS headers
- Frontend components that fire multiple requests on mount for the same resource will trigger this race

---

## BUG-006: Verification false negatives for beneficiaries, executor, residue (2026-02-07)

**Issue:** Verification always reported "No Beneficiaries Nominated", "No Executor Nominated", and "No Residue Clause" even though users had completed AI conversations for those sections.

**Root Cause (dual):**

1. **OpenAI Structured Outputs 400 rejection:** The `ExtractedWillData` Pydantic schema used three bare `list[dict]` fields (`trustees`, `bare_dominium_holders`, `bequests`). OpenAI's Structured Outputs strict mode requires every object type to have explicit property definitions with `additionalProperties: false`. Using bare `dict` produces a schema that fails validation, causing a 400 error on every extraction call. These errors were silently swallowed by `except Exception` blocks in both auto-extraction (`stream_ai_response`) and pre-verification fallback (`_extract_missing_sections`). Result: no AI conversation data was ever persisted to the will's JSONB columns.

2. **Missing residue extraction support:** `ExtractedWillData` had no `residue` field, and `save_extracted_to_will` had `pass` for `section == "residue"`. Residue data could never be extracted or saved.

**Why user thought data was saved:** The Zustand persisted store (localStorage) showed data in the frontend, but the database JSONB columns were empty. Verification reads from the database.

**Solution:**
- Replaced `list[dict]` with proper Pydantic models: `ExtractedTrustee`, `ExtractedBareDominiumHolder`, `ExtractedBequest`
- Added `ExtractedResidueData` + `ExtractedResidueBeneficiary` models
- Added `residue` field to `ExtractedWillData` and residue handler in `save_extracted_to_will`
- Fixed bequests save to use `model_dump()` serialization

**Files:** `backend/app/prompts/extraction.py`, `backend/app/services/conversation_service.py`

**Prevention:**
- Never use bare `dict` in Pydantic models intended for OpenAI Structured Outputs
- All nested types must be explicit Pydantic BaseModel classes
- Silent `except Exception` blocks on extraction should at minimum log the full traceback, not just the message
- Test extraction end-to-end against a real OpenAI call before considering it working

---

## BUG-007: Hardcoded Gemini API key in config.py (2026-02-07)

**Issue:** Gemini API key was hardcoded in `backend/app/config.py` default value instead of `.env`.

**Root Cause:** Developer convenience during testing, never moved to env var.

**Solution:** Moved key to `backend/.env` (gitignored), reset config.py default to empty string.

**Prevention:** API keys must always go in `.env`, never in source code defaults.
