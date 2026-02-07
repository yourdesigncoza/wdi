---
phase: 06-document-generation
plan: 03
subsystem: api
tags: [fastapi, pdf, preview, disclaimer, status-gating]

# Dependency graph
requires:
  - phase: 06-01
    provides: WeasyPrint templates and CSS for PDF rendering
  - phase: 06-02
    provides: DocumentGenerationService with generate_preview method
  - phase: 05
    provides: Verification status gating (will must be verified)
provides:
  - POST /api/wills/{will_id}/preview endpoint returning inline PDF
  - Disclaimer acknowledgment gate (422 if not acknowledged)
  - Status gate (400 if will not verified/generated)
  - Document router registered in FastAPI app
affects: [06-04, 07-payment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disclaimer acknowledgment gate before document generation"
    - "Status gating: verified/generated required for PDF generation"
    - "WillService DI for ownership + status check, DocumentService DI for generation"

key-files:
  created:
    - backend/app/api/document.py
  modified:
    - backend/app/main.py

key-decisions:
  - "D-0603-01: WillService injected separately for status check rather than exposing get_will on DocumentGenerationService"
  - "D-0603-02: Content-Disposition inline (not attachment) for browser PDF viewer display"

patterns-established:
  - "Disclaimer gate pattern: require body.disclaimer_acknowledged=true before document operations"
  - "Status gate pattern: check will.status against allowed set before generation"

# Metrics
duration: 1m 54s
completed: 2026-02-07
---

# Phase 6 Plan 3: Preview API Endpoint Summary

**POST /api/wills/{will_id}/preview with disclaimer gate, status gating, and inline PDF response via FastAPI**

## Performance

- **Duration:** 1m 54s
- **Started:** 2026-02-07T14:41:42Z
- **Completed:** 2026-02-07T14:43:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Preview API endpoint at POST /api/wills/{will_id}/preview returning watermarked PDF bytes inline
- Disclaimer acknowledgment gate: rejects with 422 if disclaimer_acknowledged is false
- Status gate: rejects with 400 if will status is not verified or generated
- Document router registered in FastAPI app alongside existing routers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create document API endpoint with disclaimer and status gating** - `02296df` (feat)
2. **Task 2: Register document router in main.py** - `861fee3` (feat)

## Files Created/Modified
- `backend/app/api/document.py` - Preview endpoint with disclaimer validation, status gating, user ownership check, inline PDF response (94 lines)
- `backend/app/main.py` - Added document import and router registration

## Decisions Made
- D-0603-01: Injected WillService as separate dependency for the status pre-check rather than adding a get_will method to DocumentGenerationService -- cleaner separation of concerns
- D-0603-02: Used Content-Disposition: inline (not attachment) so the browser's native PDF viewer opens the preview in a new tab

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None -- no external service configuration required.

## Next Phase Readiness
- Preview endpoint ready for frontend integration (plan 06-04)
- Endpoint returns PDF bytes with Cache-Control: no-store to prevent caching
- Phase 7 payment gating will need to add download endpoint (Content-Disposition: attachment)

## Self-Check: PASSED

---
*Phase: 06-document-generation*
*Completed: 2026-02-07*
