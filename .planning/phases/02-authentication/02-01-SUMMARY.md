---
phase: 02-authentication
plan: 01
subsystem: auth
tags: [clerk, react, jwt, modal, auth-gating]

requires:
  - phase: 01-foundation
    provides: POPIA consent middleware and cookie-based consent gate
provides:
  - ClerkProvider wrapping entire app with publishableKey from env
  - Auth-gated UI with SignedIn/SignedOut conditional rendering
  - Landing page with modal Sign In/Sign Up buttons
  - UserButton in authenticated header for profile/signout
  - Authenticated API client factory (createAuthenticatedApi) with Bearer token injection
  - useAuthApi hook for Clerk session token injection
  - Public routes (/privacy-policy, /info-officer) accessible without auth
affects: [03-core-will-conversation, api-client, auth-middleware]

tech-stack:
  added: ["@clerk/clerk-react@5.60.0"]
  patterns: ["ClerkProvider at root", "SignedIn/SignedOut gating", "TokenGetter lazy token injection", "Modal auth (not redirect)"]

key-files:
  created:
    - frontend/src/hooks/useAuthApi.ts
  modified:
    - frontend/src/main.tsx
    - frontend/src/App.tsx
    - frontend/src/services/api.ts

key-decisions:
  - "D-0201-01: Modal mode for SignInButton/SignUpButton (keeps users in-app)"
  - "D-0201-02: Email+password only (no social logins)"
  - "D-0201-03: Lazy token getter pattern — getToken() called per-request for freshness"
  - "D-0201-04: Public routes outside auth gate (/privacy-policy, /info-officer)"

patterns-established:
  - "Auth gating: SignedIn/SignedOut at route level, not component level"
  - "API auth: TokenGetter function passed to buildApi factory, called lazily per-request"
  - "Dual gate enforcement: Clerk auth (JWT) + POPIA consent (cookie) both required for protected routes"

duration: ~5min
completed: 2026-02-06
---

# Phase 02 Plan 01: Clerk React Integration Summary

**Clerk auth with modal sign-in/sign-up, auth-gated routing, and Bearer token API client using @clerk/clerk-react**

## Performance

- **Duration:** ~5 min (recovered from power failure bulk commit)
- **Started:** 2026-02-06
- **Completed:** 2026-02-06
- **Tasks:** 2 auto + 1 checkpoint
- **Files modified:** 4

## Accomplishments
- ClerkProvider wraps entire app in main.tsx with publishableKey from VITE_CLERK_PUBLISHABLE_KEY
- Landing page with DaisyUI-styled Sign In/Sign Up buttons in modal mode
- Auth-gated routing: SignedOut shows landing, SignedIn shows ConsentProvider + app content
- UserButton in authenticated pages for profile management and sign-out
- API client refactored with TokenGetter pattern for Bearer token injection
- useAuthApi hook provides Clerk-token-injected API instance via useAuth().getToken
- Public routes (/privacy-policy, /info-officer) remain accessible without authentication

## Task Commits

Implementation was part of a recovery commit after power failure:

1. **Task 1: Install Clerk and wrap app in ClerkProvider** - `3f5c80f` (recovery)
2. **Task 2: Auth-gated UI with Clerk components and authenticated API client** - `3f5c80f` (recovery)

**Note:** Original per-task commits lost in power failure; work recovered in bulk commit.

## Files Created/Modified
- `frontend/src/main.tsx` - ClerkProvider wrapping app with publishableKey and afterSignOutUrl
- `frontend/src/App.tsx` - LandingPage, AuthGatedContent, SignedIn/SignedOut routing
- `frontend/src/services/api.ts` - TokenGetter type, buildApi factory, createAuthenticatedApi export
- `frontend/src/hooks/useAuthApi.ts` - Hook using useAuth().getToken for lazy token injection

## Decisions Made
- Modal mode for sign-in/sign-up (not redirect) — keeps users in-app context
- Email+password only authentication (no social logins)
- Lazy token getter pattern — getToken() called per-request ensures fresh tokens
- Public routes outside auth gate for POPIA compliance (privacy policy accessible to all)
- AuthGatedContent wrapper component for reusable auth gating across routes

## Deviations from Plan

None - plan executed as specified (implementation matches all must-have artifacts).

## Issues Encountered
- Original per-task commits lost in power failure; all work recovered in bulk recovery commit `3f5c80f`

## User Setup Required

**External services require manual configuration.** See [02-USER-SETUP.md](./02-USER-SETUP.md) for:
- VITE_CLERK_PUBLISHABLE_KEY in frontend/.env.local
- CLERK_JWKS_URL in backend/.env
- Clerk Dashboard configuration (email+password, email verification)

## Next Phase Readiness
- Clerk auth integration complete, all must-have artifacts verified
- Phase 02 complete (both plans: 02-01 Clerk React, 02-02 FastAPI middleware)
- Ready for Phase 3+ (already completed through Phase 8)

---
*Phase: 02-authentication*
*Completed: 2026-02-06*
