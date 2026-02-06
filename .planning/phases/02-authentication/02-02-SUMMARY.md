---
phase: 02-authentication
plan: 02
subsystem: backend-auth
tags: [clerk, jwt, jwks, rs256, middleware, user-model, pyjwt]
requires:
  - 01-01 (database schema)
  - 01-02 (popia middleware pattern)
provides:
  - Clerk JWT verification middleware (RS256 via JWKS)
  - User model with clerk_user_id
  - Lazy user creation service
  - Dual-gate middleware stack (Clerk + POPIA)
affects:
  - 02-01 (frontend sends Bearer token this middleware verifies)
  - 03-xx (all conversation endpoints require auth)
  - All future protected endpoints
tech-stack:
  added: [PyJWT[crypto]]
  patterns: [JWKS verification, lazy user creation, dual-gate middleware]
key-files:
  created:
    - backend/app/middleware/clerk_auth.py
    - backend/app/models/user.py
    - backend/app/services/user_service.py
    - backend/alembic/versions/002_add_user_table.py
  modified:
    - backend/app/config.py
    - backend/app/main.py
    - backend/app/middleware/__init__.py
    - backend/app/models/__init__.py
    - backend/alembic/env.py
    - backend/requirements.txt
key-decisions:
  - D-0202-01: PyJWT with PyJWKClient for RS256 JWKS verification (not Clerk SDK)
  - D-0202-02: Empty CLERK_JWKS_URL means auth disabled (dev mode graceful fallback)
  - D-0202-03: Lazy user creation is non-fatal (auth succeeds even if DB unavailable)
  - D-0202-04: Middleware order CORS > ClerkAuth > POPIA > Audit for dual-gate enforcement
duration: 5m 53s
completed: 2026-02-06
---

# Phase 02 Plan 02: FastAPI Clerk Middleware Summary

Clerk RS256 JWT verification via JWKS with lazy user creation and dual-gate middleware stack (Clerk auth + POPIA consent required for protected endpoints).

## Performance

| Metric | Value |
|--------|-------|
| Duration | 5m 53s |
| Start | 2026-02-06T07:57:05Z |
| End | 2026-02-06T08:02:58Z |
| Tasks | 2/2 |
| Files created | 4 |
| Files modified | 6 |

## Accomplishments

1. **ClerkAuthMiddleware** -- Verifies Clerk session JWTs using RS256 public keys fetched via JWKS. PyJWKClient handles key caching (1-hour TTL) and automatic rotation. Exempt paths (health, consent, privacy, docs) pass through without auth. When CLERK_JWKS_URL is empty, auth is skipped entirely for dev mode.

2. **User model** -- Minimal local record linked by `clerk_user_id` (Clerk's external ID). Stores only id, clerk_user_id, email, created_at, updated_at. All profile data stays in Clerk.

3. **UserService** -- `get_or_create_user()` lazily creates a local user record on first authenticated API call. Supports both injected session (DI) and standalone session creation, matching the AuditService pattern.

4. **Dual-gate middleware stack** -- Updated middleware registration order: CORS (outermost) > ClerkAuth > POPIA > Audit (innermost). Protected endpoints require both a valid Clerk session JWT AND a POPIA consent cookie. Exempt endpoints remain accessible without either gate.

5. **Alembic migration** -- Migration 002 creates the `users` table with unique index on `clerk_user_id`. Chains correctly from 001_initial.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Clerk auth middleware with JWKS verification | 98da621 | clerk_auth.py, config.py, requirements.txt |
| 2 | User model, lazy creation service, middleware stack | 0654623 | user.py, user_service.py, main.py, 002_add_user_table.py |

## Files Created

- `backend/app/middleware/clerk_auth.py` -- ClerkAuthMiddleware with JWKS RS256 verification
- `backend/app/models/user.py` -- User SQLModel linked by clerk_user_id
- `backend/app/services/user_service.py` -- UserService with get_or_create_user
- `backend/alembic/versions/002_add_user_table.py` -- Migration for users table

## Files Modified

- `backend/app/config.py` -- Added CLERK_JWKS_URL setting
- `backend/app/main.py` -- Added ClerkAuthMiddleware to middleware stack
- `backend/app/middleware/__init__.py` -- Added ClerkAuthMiddleware export
- `backend/app/models/__init__.py` -- Added User to model exports
- `backend/alembic/env.py` -- Added User import for autogenerate
- `backend/requirements.txt` -- Added PyJWT[crypto] dependency

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0202-01 | PyJWT with PyJWKClient for JWKS verification | Clerk uses RS256; PyJWKClient handles key rotation and caching automatically. No Clerk SDK needed. |
| D-0202-02 | Empty CLERK_JWKS_URL = auth disabled | Graceful dev mode fallback; no auth enforcement when Clerk isn't configured. |
| D-0202-03 | Lazy user creation is non-fatal | Auth succeeds even if DB is temporarily unavailable; user record created on next call. |
| D-0202-04 | Middleware order: CORS > Clerk > POPIA > Audit | Audit logs all requests (including auth failures). Both Clerk and POPIA gates must pass for protected endpoints. |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

1. **Database connection unavailable for autogenerate** -- Alembic `--autogenerate` requires a live database connection. Since the database wasn't accessible during execution, the migration was written manually following the exact pattern of 001_initial_schema.py. Migration chain verified correct (002_add_user -> 001_initial -> None).

2. **Migration not applied** -- `alembic upgrade head` could not run due to database auth. The migration file is ready; run `cd backend && alembic upgrade head` when the database is accessible.

## User Setup Required

### Clerk JWKS URL

The backend needs `CLERK_JWKS_URL` to verify Clerk session tokens.

1. Go to Clerk Dashboard -> API Keys -> Advanced
2. Copy the JWKS URL (format: `https://{instance}.clerk.accounts.dev/.well-known/jwks.json`)
3. Set in `backend/.env`:
   ```
   CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
   ```

Without this, auth is disabled (all requests pass through as in dev mode).

## Next Phase Readiness

- **Ready for 02-01:** Frontend Clerk integration can now send Bearer tokens that this middleware verifies
- **Blocker:** Database migration must be applied before user creation works
- **Blocker:** CLERK_JWKS_URL must be set before auth enforcement is active

## Self-Check: PASSED
