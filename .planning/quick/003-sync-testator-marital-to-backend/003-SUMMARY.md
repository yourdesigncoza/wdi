# Quick Task 003 Summary

## Fix: Sync testator/marital form data to backend before verification

**File changed:** `frontend/src/features/will/components/WillWizard.tsx`

**Root cause:** Form-based sections (personal, marital) saved data only to Zustand store (localStorage) via `updateTestator()` and `updateMarital()`. The backend's JSONB columns (`will.testator`, `will.marital`) remained `{}` because no frontend code called the `updateWillSection` API. When Gemini verification read from the DB, it correctly found empty testator data and reported "Testator Details Incomplete".

**Fix applied:**
1. Added `toSnakeCase()` utility to convert frontend camelCase keys to backend snake_case
2. Added `syncFormSections()` callback that PATCHes testator + marital data to the backend
3. Sync triggered in two places:
   - After will creation (syncs data collected before will existed)
   - When entering verification or review sections (captures any edits since initial sync)
4. Guard: only syncs if testator has `firstName` (meaningful data exists)
5. Guard: only syncs marital if `status` is set (schema requires it)
6. `syncedRef` prevents duplicate API calls, reset on re-entry to verification/review

**Commit:** cf467c7
