---
phase: 07-payment-download
plan: 04
subsystem: ui
tags: [react, payfast, payment, pdf-download, wizard, daisyui, blob, localstorage]

# Dependency graph
requires:
  - phase: 07-payment-download/03
    provides: Payment initiation, status polling, and download API endpoints
provides:
  - PaymentPage with hidden-form PayFast redirect
  - PaymentReturnPage with status polling and download link
  - PaymentCancelPage with retry option
  - DownloadPage with token-based blob PDF download
  - DocumentPreviewPage "Proceed to Payment" button
  - WillWizard payment section integration
  - App.tsx routes for /payment/return, /payment/cancel, /download/:token
affects: [08-post-purchase, frontend-payment-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [hidden-form-redirect, localStorage-persistence, blob-download, polling-with-timeout]

key-files:
  created:
    - frontend/src/features/will/components/PaymentPage.tsx
    - frontend/src/features/will/components/PaymentReturnPage.tsx
    - frontend/src/features/will/components/PaymentCancelPage.tsx
    - frontend/src/features/will/components/DownloadPage.tsx
  modified:
    - frontend/src/features/will/components/DocumentPreviewPage.tsx
    - frontend/src/features/will/components/WillWizard.tsx
    - frontend/src/features/will/types/will.ts
    - frontend/src/services/api.ts
    - frontend/src/App.tsx

key-decisions:
  - "D-0704-01: localStorage for payment_id persistence across PayFast redirect"
  - "D-0704-02: Blob-based download via temporary anchor element for browser PDF download"

patterns-established:
  - "Hidden form redirect: render invisible form with PayFast data, auto-submit via formRef"
  - "Polling with timeout: poll every 3s for up to 30s, graceful timeout message with email fallback"
  - "Blob download: fetch as blob, create temporary object URL, trigger download via anchor element"
  - "Cross-redirect persistence: store payment_id in localStorage before PayFast redirect, read on return"

# Metrics
duration: 4min
completed: 2026-02-07
---

# Phase 7 Plan 4: Frontend Payment Flow Summary

**Frontend payment flow with PayFast hidden-form redirect, status polling, token-based PDF download, and wizard integration**

## Performance

- **Duration:** ~4 min (including checkpoint wait)
- **Started:** 2026-02-07T19:10:00Z
- **Completed:** 2026-02-07T19:14:00Z
- **Tasks:** 3 (2 auto + 1 checkpoint, approved)
- **Files modified:** 9

## Accomplishments
- PaymentPage initiates payment via API and auto-redirects to PayFast sandbox via hidden form submission
- PaymentReturnPage polls payment status every 3s (up to 30s) and displays download link on confirmation
- DownloadPage fetches final unwatermarked PDF as blob and triggers browser download
- PaymentCancelPage provides retry option back to will wizard
- DocumentPreviewPage shows "Proceed to Payment - R199.00" button after preview generation
- WillWizard handles 'payment' section with full navigation between document preview and payment
- App.tsx routes registered for PayFast return/cancel callbacks and download token page

## Task Commits

Each task was committed atomically:

1. **Task 1: API functions, types, PaymentPage, return/cancel/download pages** - `126be68` (feat)
2. **Task 2: DocumentPreviewPage update, WillWizard integration, App routes** - `5cb19ec` (feat)
3. **Task 3: Human verification checkpoint** - approved by user (no commit)

## Files Created/Modified
- `frontend/src/features/will/components/PaymentPage.tsx` - PayFast hidden form redirect with payment summary
- `frontend/src/features/will/components/PaymentReturnPage.tsx` - Post-payment polling and download link display
- `frontend/src/features/will/components/PaymentCancelPage.tsx` - Payment cancelled message with retry option
- `frontend/src/features/will/components/DownloadPage.tsx` - Token-based PDF download via blob
- `frontend/src/features/will/components/DocumentPreviewPage.tsx` - Added onProceedToPayment prop and button
- `frontend/src/features/will/components/WillWizard.tsx` - Payment section rendering and navigation
- `frontend/src/features/will/types/will.ts` - Added 'payment' to WILL_SECTIONS
- `frontend/src/services/api.ts` - Added initiatePayment, getPaymentStatus, downloadWill functions
- `frontend/src/App.tsx` - Routes for /payment/return, /payment/cancel, /download/:token

## Decisions Made
- D-0704-01: localStorage for payment_id persistence across PayFast redirect (survives external redirect)
- D-0704-02: Blob-based download via temporary anchor element for browser PDF download (no iframe/embed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ITN webhook cannot reach localhost in dev, so payment status polling times out (expected behavior - requires public URL for production). Users will receive email backup link once ITN processes.

## User Setup Required
None - no additional external service configuration required beyond existing PayFast sandbox credentials (configured in plan 07-01).

## Next Phase Readiness
- Phase 7 complete: full payment and download flow operational
- End-to-end flow: Document Preview -> Payment -> PayFast -> Return -> Download
- Ready for Phase 8: Post-Purchase Features (save/resume, will updates)
- Note: Production deployment requires public URL for PayFast ITN webhook

---
*Phase: 07-payment-download*
*Completed: 2026-02-07*
