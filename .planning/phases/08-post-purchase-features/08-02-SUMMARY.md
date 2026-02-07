---
phase: 08-post-purchase-features
plan: 02
subsystem: ui, api
tags: [zustand, auto-save, debounce, hydration, snake-case, react-hooks]

# Dependency graph
requires:
  - phase: 08-01
    provides: version and current_section columns on will model
provides:
  - useAutoSave debounced hook with flush for form section persistence
  - loadFromServer Zustand action for server-to-store hydration
  - snakeToCamel utility for DB-to-frontend key conversion
  - listWills, updateCurrentSection, regenerateWill API functions
  - WillWizard backend sync for section completion and navigation
affects: [08-03, 08-04, will-resume, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget backend sync, debounced auto-save with flush, snake-to-camel hydration]

key-files:
  created:
    - frontend/src/features/will/hooks/useAutoSave.ts
  modified:
    - frontend/src/services/api.ts
    - frontend/src/features/will/types/will.ts
    - frontend/src/features/will/store/useWillStore.ts
    - frontend/src/features/will/components/WillWizard.tsx

key-decisions:
  - "D-0802-01: Fire-and-forget pattern for section sync -- backend failures logged but do not block UI navigation"
  - "D-0802-02: 2-second debounce default for auto-save -- balances responsiveness with network efficiency"

patterns-established:
  - "Fire-and-forget sync: markSectionCompleteApi and updateCurrentSection called with .catch() for non-blocking backend persistence"
  - "Debounced auto-save: useAutoSave hook with configurable delay and flush for immediate save before navigation"
  - "Server hydration: loadFromServer maps all snake_case WillResponse fields to camelCase Zustand state via snakeToCamel"

# Metrics
duration: 2m 6s
completed: 2026-02-07
---

# Phase 08 Plan 02: Auto-Save & Zustand-DB Sync Summary

**Debounced auto-save hook with flush, loadFromServer hydration via snakeToCamel, and fire-and-forget WillWizard backend sync for section completion and navigation**

## Performance

- **Duration:** 2m 6s
- **Started:** 2026-02-07T19:56:20Z
- **Completed:** 2026-02-07T19:58:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created useAutoSave hook with debounced saves (2s default) and flush for immediate save before navigation
- Added loadFromServer action that hydrates all 16 Zustand fields from server WillResponse using snakeToCamel conversion
- WillWizard now syncs markSectionComplete and setCurrentSection to backend on every navigation event
- Added listWills, updateCurrentSection, regenerateWill API client functions
- Extended WillResponse interface with version, current_section, paid_at, and all complex section fields

## Task Commits

Each task was committed atomically:

1. **Task 1: API functions, snakeToCamel utility, and WillResponse update** - `8c3a6c2` (feat)
2. **Task 2: loadFromServer store action, useAutoSave hook, and WillWizard sync** - `ae8732b` (feat)

## Files Created/Modified
- `frontend/src/features/will/hooks/useAutoSave.ts` - Debounced auto-save hook with flush capability (53 lines)
- `frontend/src/services/api.ts` - snakeToCamel utility, WillResponse extended, listWills/updateCurrentSection/regenerateWill API functions
- `frontend/src/features/will/types/will.ts` - loadFromServer added to WillActions interface
- `frontend/src/features/will/store/useWillStore.ts` - loadFromServer action hydrating all 16 state fields from WillResponse
- `frontend/src/features/will/components/WillWizard.tsx` - Backend sync for markSectionComplete and setCurrentSection via fire-and-forget calls

## Decisions Made
- D-0802-01: Fire-and-forget pattern for section sync -- backend failures are logged but do not block UI navigation, keeping the user experience smooth
- D-0802-02: 2-second debounce default for auto-save -- balances responsiveness with network efficiency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auto-save infrastructure ready for form sections to consume via useAutoSave hook
- loadFromServer enables will resume from any device/browser
- Backend sync ensures current_section and sections_complete are persisted for resume
- Ready for plan 08-03 (will dashboard/resume UI) and 08-04 (remaining post-purchase features)

## Self-Check: PASSED

All files exist, all commits verified, all content patterns confirmed. useAutoSave.ts: 52 lines (min 25).

---
*Phase: 08-post-purchase-features*
*Completed: 2026-02-07*
