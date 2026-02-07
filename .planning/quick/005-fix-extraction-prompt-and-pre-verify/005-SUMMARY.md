# Quick Task 005: Fix Extraction Prompt and Pre-Verification Extraction

## Problem
Verification reported "No Beneficiaries Nominated" despite beneficiary data existing in the AI conversation. Quick-004 added auto-extraction hooks but the underlying extraction was still failing.

## Root Cause (3 issues)

1. **Extraction prompt focused on latest message only** — The system prompt said "Extract from the user's message" (singular). When the user's last message was a confirmation like "yes that's fine", extraction returned empty beneficiaries.

2. **Latest message duplicated in extraction call** — `openai_service.extract_will_data()` appended `latest_message` as a separate user role message AFTER the conversation history, which already contained it. This confused the model about which message to extract from.

3. **No pre-verification fallback** — Verification read will JSONB columns directly. If auto-extraction or Next Section extraction failed for any reason, verification had no way to recover.

## Fix

### 1. extraction.py — Prompt rewrite
Changed from "Extract from the user's message" to "Extract ALL will-related data from the ENTIRE conversation below. Consider every message in the conversation, not just the last one."

### 2. openai_service.py — Remove duplication
Removed the redundant `latest_message` appended to extraction messages. Increased window from 10 to 20 messages to match conversation service window size.

### 3. verification_service.py — Pre-verification extraction
Added `_extract_missing_sections()` method called before verification runs. For each AI section (beneficiaries, assets, guardians, executor, bequests, residue), if the will's JSONB column is empty but a conversation exists, it triggers extraction and saves the data. This is a belt-and-suspenders fallback.

## Files Changed
- `backend/app/prompts/extraction.py`
- `backend/app/services/openai_service.py`
- `backend/app/services/verification_service.py`

## Commit
b4d2d53
