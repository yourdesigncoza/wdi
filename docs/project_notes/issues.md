# Completed Work Log

## 2026-02-07: Fix verification false negatives (Quick Fix 006)

**Problem:** Verification reported "No Beneficiaries Nominated", "No Executor Nominated", "No Residue Clause" despite users completing AI conversations for those sections.

**Root cause:** OpenAI Structured Outputs rejected `list[dict]` types in extraction schema (silent 400 errors). Plus no residue extraction support.

**Changes:**
- `backend/app/prompts/extraction.py` -- 5 new Pydantic models replacing bare dict types + residue support
- `backend/app/services/conversation_service.py` -- residue save handler + bequests model_dump() fix
- `backend/app/config.py` -- removed hardcoded Gemini API key (moved to .env)

**Commits:**
- `3450243` fix: replace bare dict types in extraction schema for OpenAI compatibility
- `b0fcf06` style: update chat avatars for both users and accent Next Section button

**Verified:** End-to-end test confirmed beneficiaries (Sannie vd. Walt), executor (Peter Pots), and residue (Round Table of SA) all extract, persist, and pass verification.

---

## 2026-02-07: Quick Fix 005 - Extraction prompt and pre-verification extraction

**Changes:**
- Extraction prompt now reads full conversation history (not just last message)
- Pre-verification extraction fallback for sections with empty JSONB columns

**Commits:**
- `b4d2d53` fix: extraction prompt reads full conversation + pre-verify extraction fallback
- `09cd079` docs(quick-005): Fix extraction prompt and pre-verification extraction

---

## 2026-02-07: Quick Fix 004 - Auto-extract and persist AI data

**Changes:**
- Auto-extraction after each AI response in `stream_ai_response`
- Fallback extraction when user clicks "Next Section"
- `save_extracted_to_will` method for persisting to JSONB columns

**Commits:**
- `579aa96` docs(quick-004): complete fix verification missing beneficiary data
- `cb00621` docs(quick-004): Add plan for fix verification missing beneficiary data
