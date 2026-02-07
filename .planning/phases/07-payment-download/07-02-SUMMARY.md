---
phase: 07-payment-download
plan: 02
subsystem: payments
tags: [payfast, md5, itsdangerous, fastapi-mail, email, download-tokens, itn]

requires:
  - phase: 07-payment-download/01
    provides: Payment model, PayFast config settings, SMTP email config
provides:
  - PayFast signature generation and ITN validation service
  - Time-limited download token management service
  - Async email notification service with HTML templates
affects: [07-payment-download/03, 07-payment-download/04]

tech-stack:
  added: [itsdangerous, fastapi-mail]
  patterns: [pure-function services, fire-and-forget email, URL-safe timed tokens]

key-files:
  created:
    - backend/app/services/payfast_service.py
    - backend/app/services/download_service.py
    - backend/app/services/email_service.py
    - backend/app/templates/email/download_ready.html
  modified: []

key-decisions:
  - "Pure functions for PayFast service (no class needed — stateless operations)"
  - "ITN validation preserves received field order (differs from checkout signature)"

patterns-established:
  - "PayFast signature: ordered fields, URL-encoded, MD5 hex digest"
  - "Download tokens: itsdangerous URLSafeTimedSerializer with salt='will-download'"
  - "Email: fire-and-forget via asyncio.create_task, SUPPRESS_SEND in dev"

duration: 2min 21s
completed: 2026-02-07
---

# Phase 7 Plan 02: Payment Services Summary

**PayFast MD5 signature generation with 4-step ITN validation, itsdangerous download tokens with 24h expiry, and fastapi-mail email service with HTML template**

## Performance

- **Duration:** 2 min 21s
- **Started:** 2026-02-07T19:01:03Z
- **Completed:** 2026-02-07T19:03:24Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- PayFast service with MD5 signature generation matching PayFast's algorithm, form data builder, ITN signature validation (timing-safe), IP range validation, and async server confirmation
- Download token service using itsdangerous URLSafeTimedSerializer with configurable 24-hour expiry and salt-based separation
- Email notification service with fastapi-mail, Jinja2 templates, and SUPPRESS_SEND dev mode support
- Professional HTML email template with download button, 24h expiry notice, and SA Wills Act signing reminder

## Task Commits

Each task was committed atomically:

1. **Task 1: PayFast service** - `8f7a03f` (feat)
2. **Task 2: Download + Email services + template** - `61fab60` (feat)

## Files Created/Modified

- `backend/app/services/payfast_service.py` - PayFast signature generation, form data builder, ITN validation (signature, IP, server confirm)
- `backend/app/services/download_service.py` - URL-safe timed token generation and verification via itsdangerous
- `backend/app/services/email_service.py` - Async email sending with fastapi-mail, Jinja2 templates, SUPPRESS_SEND support
- `backend/app/templates/email/download_ready.html` - Professional HTML email with download link, expiry notice, signing reminder

## Decisions Made

- Pure functions (not class) for PayFast service — all operations are stateless, no shared state needed
- ITN validation preserves received POST field order (PayFast spec differs from checkout signature field ordering)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing itsdangerous and fastapi-mail packages**
- **Found during:** Task 2 (download service verification)
- **Issue:** itsdangerous and fastapi-mail listed in requirements.txt but not installed in venv
- **Fix:** `pip install itsdangerous>=2.2.0 fastapi-mail>=1.4.0`
- **Verification:** Both services import and function correctly
- **Committed in:** 61fab60 (part of Task 2 commit, no requirements.txt change needed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Dependency installation required for verification. No scope creep.

## Issues Encountered

None beyond the dependency installation above.

## User Setup Required

None - no external service configuration required. PayFast sandbox credentials are pre-configured. Email SUPPRESS_SEND is True by default.

## Next Phase Readiness

- All three services ready for API endpoint integration (Plan 03)
- PayFast form data builder returns complete hidden-form dict for frontend
- Download token service provides generate/verify pair for post-payment flow
- Email service ready for fire-and-forget usage via asyncio.create_task

---
*Phase: 07-payment-download*
*Completed: 2026-02-07*
