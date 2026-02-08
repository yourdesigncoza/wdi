---
phase: 02-authentication
plan: 03
subsystem: frontend-api-auth
tags: [bearer-token, clerk, api-client, context, hooks]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["authenticated-api-calls"]
  affects: ["all-will-features"]
tech_stack:
  added: []
  patterns: ["React Context for API client injection", "getToken() on ApiClient for SSE hooks"]
key_files:
  created:
    - frontend/src/contexts/AuthApiContext.tsx
  modified:
    - frontend/src/services/api.ts
    - frontend/src/App.tsx
    - frontend/src/features/will/components/WillWizard.tsx
    - frontend/src/features/will/components/WillDashboard.tsx
    - frontend/src/features/will/components/PaymentPage.tsx
    - frontend/src/features/will/components/PaymentReturnPage.tsx
    - frontend/src/features/will/components/DownloadPage.tsx
    - frontend/src/features/will/components/VerificationPage.tsx
    - frontend/src/features/will/components/DocumentPreviewPage.tsx
    - frontend/src/features/will/components/ChatSection.tsx
    - frontend/src/features/will/components/ReviewChat.tsx
    - frontend/src/features/will/hooks/useConversation.ts
    - frontend/src/features/will/hooks/useAutoSave.ts
    - frontend/src/features/will/hooks/useVerification.ts
key_decisions: []
metrics:
  duration: "8m 15s"
  completed: "2026-02-08"
---

# Phase 02 Plan 03: Bearer Token Injection Summary

Bearer token injection via AuthApiContext + useApi hook across all 16 will API endpoints and 2 SSE streaming hooks

## Performance

- Duration: 8m 15s
- Tasks: 2/2 complete
- Build: passes (vite build + tsc)
- Zero new type errors introduced (all remaining are pre-existing)

## Accomplishments

1. **Consolidated 16 standalone API functions into buildApi factory** -- createWill, getWill, listWills, updateWillSection, markSectionComplete, updateCurrentSection, getConversationHistory, extractConversationData, getVerificationResult, acknowledgeWarnings, generatePreview, regenerateWill, initiatePayment, getPaymentStatus, downloadWill, and getToken are now methods on ApiClient with automatic Bearer token injection via tokenGetter.

2. **Added requestBlob helper** -- PDF endpoints (generatePreview, downloadWill) use a dedicated requestBlob function that injects Bearer token into blob-returning fetch calls.

3. **Created AuthApiContext** -- React Context with AuthApiProvider + useApi hook provides the authenticated ApiClient to the entire authenticated React tree.

4. **Wired AuthApiProvider into App.tsx** -- Provider wraps authenticated routes inside SignedIn, outside ConsentProvider, ensuring Clerk's useAuth() is available.

5. **Migrated all 9 components to useApi()** -- WillWizard, WillDashboard, PaymentPage, PaymentReturnPage, DownloadPage, VerificationPage, DocumentPreviewPage, ChatSection, ReviewChat all use the context-provided authenticated client.

6. **Updated SSE streaming hooks with Bearer token injection** -- useConversation and useVerification accept ApiClient parameter and call api.getToken() to inject Authorization header into raw fetch SSE requests.

7. **Updated useAutoSave hook** -- Accepts ApiClient parameter for authenticated section persistence.

8. **Preserved unauthenticated API access** -- The `api` export (no tokenGetter) remains unchanged for ConsentProvider, PrivacyPolicy, and InfoOfficerContact.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Consolidate API functions into buildApi + create AuthApiContext | 0e3fa7d | api.ts, AuthApiContext.tsx |
| 2 | Wire AuthApiProvider + update all call sites | 7945de3 | App.tsx, 9 components, 3 hooks |

## Files Created

| File | Purpose |
|------|---------|
| frontend/src/contexts/AuthApiContext.tsx | React Context providing authenticated ApiClient via useApi() hook |

## Files Modified

| File | Changes |
|------|---------|
| frontend/src/services/api.ts | Moved 16 standalone functions into buildApi factory; added requestBlob helper; added getToken() method |
| frontend/src/App.tsx | Added AuthApiProvider wrapping SignedIn content |
| frontend/src/features/will/components/WillWizard.tsx | Replaced 6 standalone API imports with useApi() |
| frontend/src/features/will/components/WillDashboard.tsx | Replaced listWills/getWill imports with useApi() |
| frontend/src/features/will/components/PaymentPage.tsx | Replaced initiatePayment import with useApi() |
| frontend/src/features/will/components/PaymentReturnPage.tsx | Replaced getPaymentStatus import with useApi() |
| frontend/src/features/will/components/DownloadPage.tsx | Replaced downloadWill import with useApi() |
| frontend/src/features/will/components/VerificationPage.tsx | Replaced acknowledgeWarnings import with useApi(); pass api to useVerification |
| frontend/src/features/will/components/DocumentPreviewPage.tsx | Replaced generatePreview/regenerateWill imports with useApi() |
| frontend/src/features/will/components/ChatSection.tsx | Pass api to useConversation |
| frontend/src/features/will/components/ReviewChat.tsx | Pass api to useConversation |
| frontend/src/features/will/hooks/useConversation.ts | Accept ApiClient param; inject Bearer token into SSE fetch |
| frontend/src/features/will/hooks/useAutoSave.ts | Accept ApiClient param for authenticated updateWillSection |
| frontend/src/features/will/hooks/useVerification.ts | Accept ApiClient param; inject Bearer token into SSE fetch |

## Decisions Made

None -- plan executed as designed. AuthApiProvider placement (inside SignedIn, outside ConsentProvider) follows the established pattern from 02-01.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None. All pre-existing type errors in useWillStore.ts and StepIndicator.tsx remain unchanged.

## Next Phase Readiness

Phase 02 authentication is now fully complete:
- 02-01: Clerk React integration (SignedIn/SignedOut, useAuth, modal sign-in)
- 02-02: Backend JWT verification middleware (JWKS, user creation, auth middleware)
- 02-03: Bearer token injection (all API calls send Authorization header)

No blockers for Phase 9.

## Self-Check: PASSED

- All 15 key files: FOUND
- Commit 0e3fa7d (Task 1): FOUND
- Commit 7945de3 (Task 2): FOUND
- Frontend build: passes
- Zero standalone will API function imports remain
