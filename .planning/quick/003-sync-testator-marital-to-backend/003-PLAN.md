# Quick Task 003: Sync testator/marital Zustand data to backend

## Problem
PersonalForm and MaritalForm save data only to Zustand (localStorage). The backend `will.testator` and `will.marital` JSONB columns stay `{}`. When Gemini verification reads from the DB, it sees empty testator data and reports "Testator Details Incomplete" even though the data exists in the frontend.

## Root Cause
- Form-based sections (personal, marital) update Zustand store only
- AI-driven sections get data persisted via conversation extraction
- No code path syncs form data to the backend's PATCH /api/wills/{id}/sections/{section} endpoint
- The `updateWillSection` API function exists but is never called

## Fix
1. In WillWizard, after will creation (`ensureWillExists`), sync testator + marital from Zustand to backend
2. Also sync when entering verification (safety net in case will existed before form data was entered)

## Files
- `frontend/src/features/will/components/WillWizard.tsx` — add sync logic after will creation + before verification
