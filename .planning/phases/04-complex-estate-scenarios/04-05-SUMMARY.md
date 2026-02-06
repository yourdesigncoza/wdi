# Plan 04-05 Summary: Wizard Integration

**Status:** COMPLETE
**Duration:** ~8m (including checkpoint fixes)
**Commits:** 8678406, a7027ab, ed6729f

## What Was Built

1. **ScenarioDetector component** — Transitional interstitial shown after basic sections. Calls `detectScenarios()`, displays applicable scenarios with explanations, allows opt-in to undetected sections, navigates to first complex section or review.

2. **Dynamic useWillProgress** — Section list dynamically built from active scenarios. Trust shown when testamentary_trust or blended_family active. Returns `activeComplexSections` for WillWizard.

3. **WillWizard extension** — Imports all complex components + ScenarioDetector. Conditional rendering based on detected scenarios. Scenario detection interstitial triggers after residue. `handleNextSection` callback marks section complete and advances.

4. **SectionReview updates** — 4 new review renderers for trust, usufruct, business, joint data.

5. **Next Section button** — "Next Section →" button added to ChatSection below input area. Wired through all complex section wrappers. Section boundary prompt updated to reference the button.

## Checkpoint Fixes Applied

- **Migration 004**: Applied `alembic upgrade head` for new JSONB columns
- **Section boundary**: Added SECTION BOUNDARY instruction to system prompts preventing AI from crossing section topics
- **Next Section navigation**: Added `onNext` prop and button to ChatSection, wired through WillWizard and all complex wrappers

## Files Modified

- `frontend/src/features/will/components/ScenarioDetector.tsx` (created)
- `frontend/src/features/will/components/WillWizard.tsx` (extended)
- `frontend/src/features/will/hooks/useWillProgress.ts` (dynamic sections)
- `frontend/src/features/will/components/SectionReview.tsx` (complex section review)
- `frontend/src/features/will/components/ChatSection.tsx` (Next Section button, headings)
- `frontend/src/features/will/components/TrustSection.tsx` (onNext passthrough)
- `frontend/src/features/will/components/UsufructSection.tsx` (onNext passthrough)
- `frontend/src/features/will/components/BusinessAssetsSection.tsx` (onNext passthrough)
- `frontend/src/features/will/components/JointWillSetup.tsx` (onNext passthrough)
- `backend/app/prompts/system.py` (section boundary instruction)

## Deviations

- Added "Next Section →" button (not in original plan) — needed for clear UX navigation
- Added section headings for complex sections in SECTION_HEADINGS map
- Section boundary prompt instruction added to prevent AI cross-section drift
