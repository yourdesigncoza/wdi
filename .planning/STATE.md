# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.
**Current focus:** Phase 4 in progress — Complex Estate Scenarios

## Current Position

Phase: 04 of 9 (Complex Estate Scenarios)
Plan: 1 of 5 in current phase
Status: In progress
Last activity: 2026-02-06 - Completed 04-01-PLAN.md (backend foundation for complex scenarios)

Progress: [██████████████████░] ~46% (18 of ~39 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 3m 9s
- Total execution time: 0.95 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5/5 | 18m 56s | 3m 47s |
| 02 | 1/2 | 5m 53s | 5m 53s |
| 02.1 | 3/3 | 5m 50s | 1m 57s |
| 03 | 8/8 | 23m 58s | 3m 0s |
| 04 | 1/5 | 2m 31s | 2m 31s |

**Recent Trend:**
- Last 5 plans: 03-05 (3m 14s), 03-06 (3m 10s), 03-07 (2m 36s), 03-08 (3m 3s), 04-01 (2m 31s)
- Trend: Consistent ~3m per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 9 phases derived from 35 requirements (comprehensive depth)
- Architecture: UPL prevention and clause library must be foundational (Phase 1)
- Architecture: Dual-LLM strategy - OpenAI for conversation, Gemini for verification
- D-0101-01: Partition audit_logs by RANGE on created_at for scalability
- D-0101-02: Linked-list versioning for clauses via previous_version_id
- D-0101-03: JSONB for flexible schema fields (consent_categories, variables_schema, etc.)
- D-0101-04: Composite PK (id, created_at) on audit_logs for partitioning requirement
- D-0102-01: JWT in httpOnly cookie for consent verification (HS256, 365-day expiry)
- D-0102-02: Fire-and-forget audit logging via asyncio.create_task to avoid request latency
- D-0102-03: AuditService supports both external session injection and standalone session creation
- D-0104-01: Jinja2 StrictUndefined for clause rendering - missing variables raise errors
- D-0104-02: Post-query Python filtering for will_types JSONB array
- D-0104-03: BENEF-02 uses RESIDUE category for cleaner separation from specific bequests
- D-0105-01: Regex patterns compiled at module load for performance
- D-0105-02: Attorney-required patterns checked first (REFER takes precedence)
- D-0105-03: Fire-and-forget audit logging for filter test endpoint
- D-0103-01: BrowserRouter with react-router-dom for SPA routing
- D-0103-02: Leave Site redirects to gov.za as neutral destination
- D-0103-03: Consent modal links open privacy/officer pages in new tab
- D-0202-01: PyJWT with PyJWKClient for RS256 JWKS verification (not Clerk SDK)
- D-0202-02: Empty CLERK_JWKS_URL means auth disabled (dev mode graceful fallback)
- D-0202-03: Lazy user creation is non-fatal (auth succeeds even if DB unavailable)
- D-0202-04: Middleware order CORS > ClerkAuth > POPIA > Audit for dual-gate enforcement
- D-0201-01: corporate (light) + business (dark) as DaisyUI theme pair
- D-0301-01: JSONB section columns (not single blob) for per-section queries and partial updates
- D-0301-02: Unique composite index on (will_id, section) enforcing one conversation per will+section
- D-0301-03: CASCADE delete on conversation FK -- deleting a will removes all its conversation history
- D-0302-01: Temperature 0.7 for conversation, 0.2 for extraction
- D-0302-02: Rolling window of last 10 messages for extraction context
- D-0302-03: UPL boundary as separate constant from base personality
- D-0303-01: Zod v4 (4.3.6) over v3 -- npm default, hookform/resolvers supports both
- D-0304-01: Dev mode fallback UUID (all-zeros) when CLERK_JWKS_URL is empty
- D-0304-02: Section-to-schema validation map ensures data integrity before DB write
- D-0305-01: 20-message rolling window for OpenAI API calls to prevent token limit issues
- D-0305-02: Dual-event SSE pattern: delta events during streaming, filtered/done events after UPL check
- D-0305-03: UPL-filtered text persisted as assistant message (not original) when filter activates

### Pending Todos

None yet.

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: DaisyUI Integration (URGENT) — UI component library must be in place before Phase 3 conversation UI work begins
- Phase 02.1 gap closure plan (02.1-03) added to fix UAT issues with theme persistence and back button navigation in new tabs

### Blockers/Concerns

- Phase 1: Attorney-approved clause library text needed before Phase 2 begins
- Phase 1: Privacy policy and info officer contact details are placeholders
- Phase 2: Database migration 002 must be applied before user creation works
- Phase 2: CLERK_JWKS_URL must be set in backend/.env before auth enforcement is active
- Phase 3: OPENAI_API_KEY must be set in backend/.env before live API calls
- Phase 3: Migration 003 must be applied (`alembic upgrade head`) before will/conversation features work
- Phase 4: Migration 004 must be applied (`alembic upgrade head`) before complex scenario features work
- Phase 3-4: SA attorney review needed for testamentary trust, usufruct, business asset clauses
- Phase 7: PayFast sandbox testing required before production
- Audit immutability (REVOKE UPDATE/DELETE) must be applied manually on production DB
- Monthly audit_logs partitions need automated creation or pre-creation in future migrations

### New Blockers

None.

## Session Continuity

Last session: 2026-02-06 12:27 UTC
Stopped at: Completed 04-01-PLAN.md (backend foundation for complex scenarios)
Resume file: None

---
*Next: 04-02-PLAN.md (Complex Estate Scenarios continued)*
