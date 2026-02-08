---
phase: 02-authentication
verified: 2026-02-08T08:23:21Z
status: gaps_found
score: 10/13 must-haves verified
gaps:
  - truth: "API requests from authenticated users include Bearer token"
    status: failed
    reason: "useAuthApi hook exists but is never imported or used. All will API functions (createWill, getWill, listWills, etc.) call request() without tokenGetter, so no Bearer tokens are sent"
    artifacts:
      - path: "frontend/src/hooks/useAuthApi.ts"
        issue: "Hook is defined but orphaned - no imports found in codebase"
      - path: "frontend/src/services/api.ts"
        issue: "Will API functions (lines 177-354) don't use tokenGetter parameter"
    missing:
      - "Update will API functions to accept optional tokenGetter or make them methods on ApiClient"
      - "Import and use useAuthApi hook in WillDashboard, WillWizard, and other components making will API calls"
      - "Alternative: Create authenticated versions of will API functions that use useAuth().getToken internally"
  - truth: "API requests with valid Clerk session token pass through to handlers"
    status: partial
    reason: "Backend middleware works correctly, but cannot fully verify because frontend doesn't send tokens yet (relies on dev mode bypass)"
    artifacts:
      - path: "backend/app/middleware/clerk_auth.py"
        issue: "Works correctly but untested with real tokens due to frontend gap"
    missing:
      - "Fix frontend token injection first, then verify backend receives and validates tokens"
  - truth: "First authenticated API call creates a local user record"
    status: partial
    reason: "Service logic is correct but cannot verify end-to-end because tokens aren't being sent"
    artifacts:
      - path: "backend/app/services/user_service.py"
        issue: "Implemented correctly but cannot test lazy creation until frontend sends tokens"
    missing:
      - "Fix frontend token injection, then verify user creation on first authenticated call"
---

# Phase 2: Authentication Verification Report

**Phase Goal:** Users can securely create accounts and access the platform via Clerk
**Verified:** 2026-02-08T08:23:21Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Unauthenticated user sees Sign In and Sign Up buttons | ✓ VERIFIED | SignInButton/SignUpButton in App.tsx lines 53-62, modal mode confirmed |
| 2 | Clicking Sign In opens Clerk modal (not redirect) | ✓ VERIFIED | mode="modal" attribute present on both buttons (lines 53, 58) |
| 3 | Authenticated user sees UserButton with their avatar/initials | ✓ VERIFIED | UserButton imported and rendered in WillDashboard, PaymentPages, DownloadPage |
| 4 | Authenticated user sees the main app content | ✓ VERIFIED | SignedIn/SignedOut gating in App.tsx, MainContent wrapped in AuthGatedContent |
| 5 | Signing out redirects to landing page with Sign In/Sign Up buttons | ✓ VERIFIED | afterSignOutUrl="/" in ClerkProvider (main.tsx:20) |
| 6 | API requests from authenticated users include Bearer token | ✗ FAILED | useAuthApi hook exists but never used; will API functions don't inject tokens |
| 7 | API requests without valid Clerk session token receive 401 | ✓ VERIFIED | ClerkAuthMiddleware returns 401 for missing/invalid tokens (clerk_auth.py:82-103) |
| 8 | API requests with valid Clerk session token pass through to handlers | ⚠️ PARTIAL | Middleware logic correct, but frontend doesn't send tokens (dev mode bypass active) |
| 9 | First authenticated API call creates a local user record | ⚠️ PARTIAL | get_or_create_user() implemented correctly, but cannot verify end-to-end |
| 10 | Subsequent calls reuse existing local user record | ⚠️ PARTIAL | DB lookup by clerk_user_id exists, but cannot verify without frontend tokens |
| 11 | Consent-only endpoints still work without Clerk auth | ✓ VERIFIED | /api/consent paths in EXEMPT_PATHS (clerk_auth.py:22-29) |
| 12 | Health, docs, consent, privacy endpoints remain exempt from auth | ✓ VERIFIED | All exempt paths listed in clerk_auth.py:22-34 |
| 13 | Audit logs include local user_id when user is authenticated | ✓ VERIFIED | user_id stored in request.state (clerk_auth.py:123) for audit middleware |

**Score:** 10/13 truths verified (3 partial, 1 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| frontend/src/main.tsx | ClerkProvider wrapping entire app | ✓ VERIFIED | 24 lines, ClerkProvider with publishableKey and afterSignOutUrl |
| frontend/src/App.tsx | Auth-gated routing with SignedIn/SignedOut | ✓ VERIFIED | 138 lines, LandingPage for SignedOut, AuthGatedContent wrapper |
| frontend/src/hooks/useAuthApi.ts | Hook injecting Clerk session token into API calls | ⚠️ ORPHANED | 13 lines, exports useAuthApi but never imported/used anywhere |
| frontend/src/services/api.ts | API client accepting optional auth token | ⚠️ PARTIAL | 354 lines, has TokenGetter pattern and createAuthenticatedApi, but will API functions don't use it |
| backend/app/middleware/clerk_auth.py | Clerk session JWT verification via JWKS | ✓ VERIFIED | 149 lines (>40 min), has ClerkAuthMiddleware class with JWKS verification |
| backend/app/models/user.py | User SQLModel linked by clerk_user_id | ✓ VERIFIED | 46 lines, User model with clerk_user_id unique column |
| backend/app/services/user_service.py | Lazy user creation and lookup | ✓ VERIFIED | 69 lines, get_or_create_user method implemented |
| backend/app/config.py | CLERK_JWKS_URL setting | ✓ VERIFIED | Contains CLERK_JWKS_URL: str = "" (line 32) |
| backend/app/main.py | Updated middleware stack with Clerk auth | ✓ VERIFIED | ClerkAuthMiddleware registered (line 63) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| frontend/src/main.tsx | @clerk/clerk-react | ClerkProvider with publishableKey | ✓ WIRED | publishableKey from env, afterSignOutUrl set |
| frontend/src/App.tsx | @clerk/clerk-react | SignedIn/SignedOut conditional rendering | ✓ WIRED | Both components imported and used correctly |
| frontend/src/hooks/useAuthApi.ts | frontend/src/services/api.ts | createAuthenticatedApi with token from useAuth | ✗ NOT_WIRED | Hook never imported, will API calls don't use createAuthenticatedApi |
| backend/app/middleware/clerk_auth.py | backend/app/config.py | CLERK_JWKS_URL for key fetching | ✓ WIRED | settings.CLERK_JWKS_URL used in _get_jwks_client() |
| backend/app/middleware/clerk_auth.py | backend/app/services/user_service.py | Lazy user creation on valid auth | ✓ WIRED | get_or_create_user called after JWT validation (line 122) |
| backend/app/main.py | backend/app/middleware/clerk_auth.py | Middleware registration | ✓ WIRED | app.add_middleware(ClerkAuthMiddleware) present |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| AUTH-01: User can register with email and password | ✓ SATISFIED | Clerk SignUpButton provides registration flow |
| AUTH-02: User receives verification email after registration | ⚠️ NEEDS HUMAN | Clerk handles this, requires real registration test |
| AUTH-03: User can log in and stay logged in across sessions | ⚠️ NEEDS HUMAN | Clerk session persistence, requires manual test |
| AUTH-04: User can reset password via email link | ⚠️ NEEDS HUMAN | Clerk provides "Forgot password?" link, needs manual test |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| frontend/src/hooks/useAuthApi.ts | 1-13 | Orphaned hook - never imported or used | 🛑 Blocker | Authenticated API calls don't send Bearer tokens |
| frontend/src/services/api.ts | 177-354 | Will API functions bypass tokenGetter | 🛑 Blocker | All will endpoints receive unauthenticated requests |
| backend/.env | N/A | CLERK_JWKS_URL not configured | ⚠️ Warning | Auth bypassed in dev mode, must be set for production |

### Human Verification Required

#### 1. Email Verification Flow

**Test:** Register new account with real email address
**Expected:** Receive verification email from Clerk, click link, account becomes verified
**Why human:** External email delivery and Clerk dashboard integration

#### 2. Session Persistence

**Test:** Sign in, close browser completely, reopen app
**Expected:** Still signed in, don't need to re-authenticate
**Why human:** Browser session/cookie behavior across restarts

#### 3. Password Reset Flow

**Test:** Click "Sign In", then "Forgot password?", enter email, receive reset link
**Expected:** Email arrives with password reset link, clicking it allows setting new password
**Why human:** External email delivery and Clerk-hosted reset flow

### Gaps Summary

**Critical Gap: Frontend token injection is incomplete.**

The architecture is well-designed:
- ClerkProvider wraps the app ✓
- useAuthApi hook exists to inject tokens ✓
- createAuthenticatedApi factory accepts tokenGetter ✓
- Backend middleware verifies tokens ✓

**BUT the wiring is broken:**
- useAuthApi hook is never imported anywhere
- All will API functions (createWill, getWill, listWills, updateWillSection, etc.) are standalone functions that call `request()` directly without passing a tokenGetter
- This means authenticated API calls are made WITHOUT Bearer tokens

**Current state:** Works in dev mode because CLERK_JWKS_URL is empty, so backend bypasses auth. In production with CLERK_JWKS_URL set, all will API calls would return 401.

**Fix required:** Either:
1. Refactor will API functions to be methods on ApiClient (returned by createAuthenticatedApi), OR
2. Make will API functions accept an optional tokenGetter parameter and update all call sites to use useAuthApi, OR
3. Create a React Context that provides an authenticated API client globally

**Impact:** Phase goal is partially achieved. Users CAN register, verify email, log in, and reset password (Clerk handles this). But the backend integration is incomplete - authenticated API calls don't send tokens, so the dual-gate enforcement (Clerk + POPIA) only works because of dev mode bypass.

---

_Verified: 2026-02-08T08:23:21Z_
_Verifier: Claude (gsd-verifier)_
