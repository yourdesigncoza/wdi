---
phase: 07-payment-download
plan: 03
subsystem: api
tags: [fastapi, payfast, itn, download, pdf, middleware]

# Dependency graph
requires:
  - phase: 07-payment-download/02
    provides: PayFast service functions, download token service, email service
provides:
  - Payment initiation endpoint (POST /api/payment/initiate)
  - ITN webhook endpoint (POST /api/payment/notify)
  - Payment status polling endpoint (GET /api/payment/{id}/status)
  - Secure download endpoint (GET /api/download/{token})
  - Middleware exemptions for webhook and download paths
affects: [07-payment-download/04, frontend-payment-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [idempotent-webhook, token-based-auth, fire-and-forget-email]

key-files:
  created:
    - backend/app/api/payment.py
    - backend/app/api/download.py
  modified:
    - backend/app/main.py
    - backend/app/middleware/popia_consent.py
    - backend/app/middleware/clerk_auth.py

key-decisions:
  - "D-0703-01: ITN webhook always returns 200 OK per PayFast spec, logs errors internally"
  - "D-0703-02: Download endpoint uses token-based auth (no session required), bypasses both POPIA and Clerk middleware"
  - "D-0703-03: ITN processing is idempotent -- re-processing completed payment is a no-op"

patterns-established:
  - "Idempotent webhook: check payment.status before processing, skip if already completed"
  - "Token-based auth bypass: add path to both middleware EXEMPT sets for external-facing endpoints"
  - "Fire-and-forget email via asyncio.create_task after payment confirmation"

# Metrics
duration: 3min
completed: 2026-02-07
---

# Phase 7 Plan 3: Payment & Download API Summary

**4 REST endpoints connecting PayFast payment flow (initiate, ITN webhook, status polling) and token-secured PDF download**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-07T19:06:33Z
- **Completed:** 2026-02-07T19:09:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Payment initiation creates DB record and returns PayFast-compatible form data with signature
- ITN webhook handles 4-step validation (signature, IP, amount, server confirmation) with idempotent processing
- Download endpoint verifies itsdangerous token and generates final unwatermarked PDF on-the-fly
- Both auth middlewares (Clerk + POPIA) updated to skip webhook and download paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Payment API router (initiate, ITN webhook, status)** - `b87d1d7` (feat)
2. **Task 2: Download API router + main.py registration** - `4ed52fb` (feat)

## Files Created/Modified
- `backend/app/api/payment.py` - Payment initiation, ITN webhook, status polling (3 endpoints)
- `backend/app/api/download.py` - Secure token-based PDF download (1 endpoint)
- `backend/app/main.py` - Router registration for payment and download
- `backend/app/middleware/popia_consent.py` - Added /api/payment/notify and /api/download/ to exempt lists
- `backend/app/middleware/clerk_auth.py` - Added /api/payment/notify and /api/download/ to exempt lists

## Decisions Made
- D-0703-01: ITN webhook always returns 200 OK per PayFast specification, errors logged internally
- D-0703-02: Download endpoint uses token-based auth, bypasses both POPIA consent and Clerk session middleware
- D-0703-03: ITN processing is idempotent -- completed payments are skipped on re-processing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing itsdangerous dependency**
- **Found during:** Task 1 (Payment API import)
- **Issue:** itsdangerous not installed in venv (created in plan 07-02 but not installed locally)
- **Fix:** `pip install itsdangerous`
- **Verification:** Import succeeds
- **Committed in:** b87d1d7 (part of Task 1 commit)

**2. [Rule 3 - Blocking] Installed missing fastapi-mail dependency**
- **Found during:** Task 1 (Payment API import)
- **Issue:** fastapi-mail not installed in venv (created in plan 07-02 but not installed locally)
- **Fix:** `pip install fastapi-mail`
- **Verification:** Import succeeds
- **Committed in:** b87d1d7 (part of Task 1 commit)

**3. [Rule 3 - Blocking] Installed missing weasyprint dependency**
- **Found during:** Task 2 (Download API import)
- **Issue:** weasyprint not installed in venv (created in plan 06 but not installed locally)
- **Fix:** `pip install weasyprint`
- **Verification:** Import succeeds
- **Committed in:** 4ed52fb (part of Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 blocking)
**Impact on plan:** All auto-fixes were pip installs for dependencies created in prior plans. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 endpoints importable and registered on FastAPI app
- Payment flow complete: initiate -> ITN webhook -> status polling -> download
- Ready for plan 07-04: frontend payment integration

---
*Phase: 07-payment-download*
*Completed: 2026-02-07*
