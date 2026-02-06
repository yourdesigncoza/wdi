# Phase 2: Authentication - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

User registration, email verification, login, password reset, and persistent sessions via Clerk. Clerk handles all auth UI and email flows. Backend validates Clerk sessions. This phase does NOT include user profile editing, role-based access, or admin features.

</domain>

<decisions>
## Implementation Decisions

### Auth + consent flow
- Consent gate (Phase 1) remains independent of auth — anonymous users still see consent modal
- Flow order: Landing → Sign Up/In (Clerk) → POPIA consent (if not yet given) → App
- Existing JWT consent cookie stays separate from Clerk session — they solve different problems
- Users who sign up but haven't consented are blocked from data-collection routes (both gates must pass)

### Sign-in experience
- Use Clerk prebuilt components: `<SignInButton>`, `<SignUpButton>`, `<UserButton>`
- Clerk modal mode (not redirect) to keep users in-app
- Email + password only (no social login for now — will data is sensitive, keep auth simple)
- Clerk's built-in email verification handles the AUTH-02 requirement
- Brand Clerk components to match existing Tailwind theme (colors, fonts)

### Session & protected routes
- All pages except landing/marketing require Clerk auth
- Use `<SignedIn>` / `<SignedOut>` wrappers for conditional rendering
- Backend: Clerk middleware on FastAPI verifies session JWT from Clerk
- Dual gate: Clerk auth + POPIA consent both required for will-related endpoints
- `afterSignOutUrl` redirects to landing page

### User data & local records
- Create local `users` table linked by `clerk_user_id` (Clerk's external ID)
- Store only: `id`, `clerk_user_id`, `email`, `created_at`, `updated_at`
- All profile data (name, avatar) stays in Clerk — no local duplication
- Local user record created on first authenticated API call (lazy creation)
- Audit logs link to local user ID for POPIA compliance

### Clerk SDK integration
- Frontend: `@clerk/clerk-react@latest` with `<ClerkProvider>` in `main.tsx`
- Environment: `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`
- Backend: Clerk's JWKS endpoint to verify session tokens (no Clerk Python SDK needed — just JWT verification)
- Reference: `docs/clerk-react-prompt.md` contains canonical integration pattern

### Claude's Discretion
- Exact placement of auth components in existing layout
- Loading states during auth verification
- Error handling for expired/invalid sessions
- Whether to use Clerk's `useAuth()` or `useUser()` hooks in specific components
- FastAPI middleware implementation details (JWKS caching, etc.)

</decisions>

<specifics>
## Specific Ideas

- Clerk React prompt provided at `docs/clerk-react-prompt.md` — follow its patterns exactly
- Keep auth UI minimal: this is a will-generation tool, not a social platform
- Sensitive data context: email+password only, no social OAuth (reduces attack surface)

</specifics>

<deferred>
## Deferred Ideas

- Social login (Google, Facebook) — evaluate after launch based on user feedback
- Role-based access control (admin, attorney reviewer) — Phase 8+ or separate milestone
- Multi-factor authentication — future security enhancement
- User profile editing page — not needed until post-purchase features (Phase 8)

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-02-06*
