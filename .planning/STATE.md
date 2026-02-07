# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-05)

**Core value:** Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.
**Current focus:** Phase 8 in progress — Post-Purchase Features

## Current Position

Phase: 08 of 9 (Post-Purchase Features)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-07 - Completed plan 08-03: Will Dashboard
Progress: [████████████████████████████████████] ~92% (36 of ~39 total plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 36
- Average duration: 2m 35s
- Total execution time: ~1.57 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5/5 | 18m 56s | 3m 47s |
| 02 | 1/2 | 5m 53s | 5m 53s |
| 02.1 | 3/3 | 5m 50s | 1m 57s |
| 03 | 8/8 | 23m 58s | 3m 0s |
| 04 | 5/5 | 16m 32s | 3m 18s |
| 05 | 4/4 | ~11m 26s | ~2m 52s |
| 06 | 4/4 | ~14m 24s | ~3m 36s |
| 07 | 4/4 | ~11m 20s | ~2m 50s |
| 08 | 3/4 | 6m 14s | 2m 5s |

**Recent Trend:**
- Last 5 plans: 07-04 (~4m incl. checkpoint), 08-01 (2m 33s), 08-02 (2m 6s), 08-03 (1m 35s)
- Trend: Consistent ~2m per auto plan

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
- D-0402-01: Complex sections added to WILL_SECTIONS before review, conditionally shown by wizard
- D-0403-01: Added BUSINESS and JOINT to ClauseCategory enum for proper clause categorization
- D-0501-01: Gemini 2.5 Flash as default verification model (cost-effective)
- D-0501-02: Temperature 0.1 for verification (deterministic)
- D-0501-03: Empty GEMINI_API_KEY means verification disabled (graceful fallback)
- D-0502-01: Literal types instead of Enum classes for Gemini structured output compatibility
- D-0502-02: Rules organized as dict[severity][code] -> description for prompt embedding
- D-0601-01: WeasyPrint position:fixed for watermark (repeats on every page)
- D-0601-02: Include paths prefixed with will/ subdirectory for Jinja2 template resolution
- D-0602-01: Safe defaults "[To be completed]" for missing JSONB fields in variable extraction
- D-0602-02: CLAUSE_ORDER as ordered list with condition evaluators (always/scenario/has/each)
- D-0602-03: TEMPLATE_DIR at templates/ root, paths prefixed with will/ for FileSystemLoader
- D-0603-01: WillService injected separately for status check rather than exposing get_will on DocumentGenerationService
- D-0603-02: Content-Disposition inline (not attachment) for browser PDF viewer display
- D-0604-01: Blob-based PDF preview opens in new browser tab (not inline embed)
- D-0604-02: Clause category field uses explicit String(50) sa_column to match Alembic-created VARCHAR column
- D-0702-01: Pure functions (not class) for PayFast service — stateless operations
- D-0702-02: ITN validation preserves received POST field order (differs from checkout signature ordering)
- D-0703-01: ITN webhook always returns 200 OK per PayFast spec, logs errors internally
- D-0703-02: Download endpoint uses token-based auth, bypasses both POPIA and Clerk middleware
- D-0703-03: ITN processing is idempotent -- completed payments skipped on re-processing
- D-0704-01: localStorage for payment_id persistence across PayFast redirect
- D-0704-02: Blob-based download via temporary anchor element for browser PDF download
- D-0801-01: version (Integer, default 1) tracks regeneration count; current_section (String(50), default "personal") tracks wizard resume position
- D-0801-02: Regenerate endpoint requires both paid_at (402) and verified status (400) before allowing re-generation
- D-0801-03: Regenerate reuses existing completed Payment record, generating a fresh download token
- D-0802-01: Fire-and-forget pattern for section sync -- backend failures logged but do not block UI navigation
- D-0802-02: 2-second debounce default for auto-save -- balances responsiveness with network efficiency

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
- Phase 5: Migration 005 must be applied (`alembic upgrade head`) before verification features work
- Phase 5: GEMINI_API_KEY must be set in backend/.env for live verification calls
- Phase 3-4: SA attorney review needed for testamentary trust, usufruct, business asset clauses
- Phase 7: Migration 006 must be applied (`alembic upgrade head`) before payment features work
- Phase 7: PayFast sandbox testing required before production
- Phase 7: Production deployment requires public URL for PayFast ITN webhook
- Phase 8: Migration 007 must be applied (`alembic upgrade head`) before will versioning features work
- Audit immutability (REVOKE UPDATE/DELETE) must be applied manually on production DB
- Monthly audit_logs partitions need automated creation or pre-creation in future migrations

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix Back to Personal button navigation | 2026-02-07 | 3d7d0ce | [001-back-to-personal](./quick/001-back-to-personal-button-not-navigating/) |
| 002 | Fix Proceed button to navigate to verification | 2026-02-07 | 955387e | [002-fix-proceed-button](./quick/002-fix-proceed-button-navigate-verification/) |
| 003 | Sync testator/marital form data to backend | 2026-02-07 | cf467c7 | [003-sync-form-data](./quick/003-sync-testator-marital-to-backend/) |
| 004 | Fix verification missing beneficiary data | 2026-02-07 | f68987d | [004-fix-verification](./quick/004-fix-verification-missing-beneficiary-data/) |
| 005 | Fix extraction prompt and pre-verification extraction | 2026-02-07 | b4d2d53 | [005-fix-extraction](./quick/005-fix-extraction-prompt-and-pre-verify/) |
| 006 | Fix SA ID Luhn verification prompt | 2026-02-07 | dd50523 | [006-fix-sa-id-luhn](./quick/006-fix-sa-id-luhn-verification/) |
| 007 | Fix DaisyUI chat styling (@source inline) | 2026-02-07 | a3ba34c | [007-fix-daisyui-chat](./quick/007-fix-daisyui-chat-styling/) |
| 008 | Colorful step indicator by importance | 2026-02-07 | 0b1ba3d | [008-colorful-step](./quick/008-colorful-step-indicator-by-importance/) |

### New Blockers

None.

## Session Continuity

Last session: 2026-02-07T20:03:07Z
Stopped at: Phase 8, plan 3 complete
Resume file: .planning/phases/08-post-purchase-features/08-04-PLAN.md

---
*Next: Phase 8 Plan 4 (final plan in post-purchase features)*
