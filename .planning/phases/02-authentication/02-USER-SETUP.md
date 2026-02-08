# Phase 2: User Setup Required

**Generated:** 2026-02-08
**Phase:** 02-authentication
**Status:** Complete

Complete these items for Clerk authentication to function.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [x] | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard -> API Keys -> Publishable Key (starts with pk_) | `frontend/.env.local` |
| [x] | `CLERK_JWKS_URL` | Clerk Dashboard -> API Keys -> JWKS URL | `backend/.env` |

## Account Setup

- [x] **Create Clerk application**
  - URL: https://dashboard.clerk.com -> Create Application
  - Skip if: Already have Clerk application

## Dashboard Configuration

- [x] **Enable Email+Password authentication (disable social logins)**
  - Location: Clerk Dashboard -> User & Authentication -> Email, Phone, Username
  - Set to: Email address required, password required

- [x] **Configure email verification (enabled by default)**
  - Location: Clerk Dashboard -> User & Authentication -> Email, Phone, Username -> Email address -> Require

## Verification

After completing setup:

```bash
# Check frontend env var
grep VITE_CLERK frontend/.env.local

# Check backend env var
grep CLERK_JWKS_URL backend/.env

# Verify build passes
cd frontend && npm run build
```

Expected: Build passes, Clerk modal appears on landing page.

---

**Once all items complete:** Mark status as "Complete" at top of file.
