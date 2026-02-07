---
phase: quick-004
plan: 01
subsystem: conversation-pipeline
tags: [extraction, JSONB, persistence, verification]
dependency-graph:
  requires: [phase-03, phase-05]
  provides: [will-data-persistence-pipeline]
  affects: [verification, document-generation]
tech-stack:
  added: []
  patterns: [auto-extraction-after-response, fallback-extraction-on-advance]
key-files:
  created: []
  modified:
    - backend/app/services/conversation_service.py
    - backend/app/api/conversation.py
    - frontend/src/services/api.ts
    - frontend/src/features/will/components/WillWizard.tsx
decisions: []
metrics:
  duration: 1m 27s
  completed: 2026-02-07
---

# Quick Task 004: Fix Verification Missing Beneficiary Data

**One-liner:** Auto-extract and persist AI conversation data to will JSONB columns so verification reads populated data instead of empty defaults.

## Problem

AI conversation data (beneficiaries, assets, guardians, executor, bequests, residue) was extracted by OpenAI but never written to the will's JSONB section columns. The extraction endpoint returned data but did not persist it. The frontend never called the extraction endpoint either. Result: verification always reported "No Beneficiaries Nominated" because the will's `beneficiaries` column remained `[]`.

## Solution

Dual-layer extraction pipeline:

1. **Auto-extraction (per message):** After each AI assistant response in `stream_ai_response`, automatically extract structured data and persist to the will's JSONB column via `save_extracted_to_will`.

2. **Fallback extraction (on advance):** When user clicks "Next Section" from any AI chat section, the frontend triggers a POST to the extract endpoint which also persists data. This covers cases where per-message extraction failed or cumulative context produces better results.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Auto-extract and persist AI data to will JSONB after each response | cbbcb22 | conversation_service.py |
| 2 | Add fallback extraction trigger when user leaves AI section | f68987d | conversation.py, api.ts, WillWizard.tsx |

## Changes Made

### Backend: conversation_service.py
- Added `save_extracted_to_will` method mapping section name to will JSONB column
- Added auto-extraction call after assistant message in `stream_ai_response`
- Extraction failures logged as warnings, never break conversation flow
- Covers all 8 AI sections: beneficiaries, assets, guardians, executor, bequests, trust, usufruct, business

### Backend: conversation.py
- Extract endpoint now calls `save_extracted_to_will` after extraction, persisting data to will JSONB

### Frontend: api.ts
- Added `extractConversationData` function for POST to extract endpoint

### Frontend: WillWizard.tsx
- `handleNextSection` now triggers extraction for AI sections before advancing
- Import added for `extractConversationData`

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
