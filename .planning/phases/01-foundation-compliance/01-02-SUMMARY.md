---
phase: 01-foundation-compliance
plan: 02
subsystem: api
tags: [fastapi, popia, consent, middleware, audit]

dependency-graph:
  requires: ["01-01"]
  provides: ["FastAPI app", "POPIA consent middleware", "consent endpoints", "privacy endpoints", "audit service"]
  affects: ["01-03", "01-04", "01-05"]

tech-stack:
  added: []
  patterns: ["middleware chain", "JWT consent cookie", "fire-and-forget audit", "dependency injection"]

key-files:
  created:
    - backend/app/main.py
    - backend/app/middleware/__init__.py
    - backend/app/middleware/popia_consent.py
    - backend/app/middleware/audit.py
    - backend/app/api/__init__.py
    - backend/app/api/consent.py
    - backend/app/api/privacy.py
    - backend/app/api/health.py
    - backend/app/schemas/__init__.py
    - backend/app/schemas/consent.py
    - backend/app/services/__init__.py
    - backend/app/services/audit_service.py
  modified: []

decisions:
  - id: D-0102-01
    summary: "JWT in httpOnly cookie for consent verification (HS256, 365-day expiry)"
  - id: D-0102-02
    summary: "Fire-and-forget audit logging via asyncio.create_task to avoid request latency"
  - id: D-0102-03
    summary: "AuditService supports both external session injection and standalone session creation"

metrics:
  duration: "3m 27s"
  completed: "2026-02-06"
---

# Phase 01 Plan 02: POPIA Consent Middleware Summary

**FastAPI app with POPIA consent-gate middleware, consent/privacy endpoints, and async audit service**

## What Was Built

### FastAPI Application (main.py)
- App with title "WillCraft SA API", lifespan manager that verifies DB on startup
- CORS middleware configured for localhost:3000 and localhost:5173
- POPIAConsentMiddleware blocks protected routes without valid consent JWT
- AuditMiddleware logs all non-trivial requests via fire-and-forget

### POPIA Consent Middleware
- `POPIAConsentMiddleware` validates `popia_consent` httpOnly cookie on every request
- JWT signed with SECRET_KEY, verified with python-jose (HS256)
- Exempt paths: /api/health, /api/consent, /api/privacy-policy, /api/info-officer, /docs, etc.
- Returns 403 `{error: "consent_required", consent_url: "/api/consent"}` when blocked

### API Endpoints
| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| /api/health | GET | No | Liveness probe |
| /api/consent | POST | No | Record consent, issue JWT cookie |
| /api/consent/status | GET | No | Check consent cookie validity |
| /api/consent/withdraw | POST | No | Withdraw consent, clear cookie |
| /api/privacy-policy | GET | No | POPIA privacy policy text |
| /api/info-officer | GET | No | Information Officer details |
| /api/data-request | POST | No | Submit data subject request |

### Audit Service
- `AuditService.log_event()` writes to audit_logs table
- Supports external session injection (for transactional consistency) or standalone
- Graceful error handling: logging failures are caught and logged, never crash requests
- Event types: consent_granted, consent_withdrawn, data_request_submitted, api_request

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | FastAPI app with POPIA middleware | aeb4f65 | main.py, middleware/ |
| 2 | Consent and privacy API endpoints | ab8f84e | api/, schemas/ |
| 3 | Audit logging service | 905fe40 | services/ |
| fix | Remove premature clause schema imports | 11d1fc0 | schemas/__init__.py |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Linter auto-adding non-existent clause schema imports**
- **Found during:** Task 2 and Task 3
- **Issue:** An external linter repeatedly added `from app.schemas.clause import ...` to `schemas/__init__.py`, referencing a module that does not exist (belongs to plan 01-04)
- **Fix:** Reverted the broken imports each time; committed final fix as 11d1fc0
- **Files modified:** backend/app/schemas/__init__.py

**2. [Rule 3 - Blocking] Linter auto-adding non-existent clause_library service import**
- **Found during:** Task 2
- **Issue:** Linter added `from app.services.clause_library import ...` to `services/__init__.py`
- **Fix:** Reverted the broken import inline
- **Files modified:** backend/app/services/__init__.py

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0102-01 | JWT in httpOnly cookie (HS256, 365d expiry) | httpOnly prevents XSS theft; HS256 is fast for symmetric signing; 1-year matches annual re-consent cycle |
| D-0102-02 | Fire-and-forget audit via asyncio.create_task | Audit logging must never add latency to user requests; failures are logged not raised |
| D-0102-03 | AuditService dual-mode sessions | Allows transactional audit within endpoint sessions or standalone for middleware/background use |

## Next Phase Readiness

- All consent and privacy endpoints are ready for integration testing (plan 01-05)
- Privacy policy text is placeholder -- needs attorney-approved copy before production
- Information Officer contact details are placeholder
- Middleware is wired and will block any new protected endpoints automatically

## Self-Check: PASSED
