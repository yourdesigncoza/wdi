# Architecture Decision Records

## ADR-001: JWT consent cookie (D-0102-01)
- **Context:** POPIA consent tracking mechanism
- **Decision:** JWT httpOnly cookie (HS256, 365d) over session-based
- **Status:** Accepted

## ADR-002: Jinja2 StrictUndefined (D-0104-01)
- **Context:** Clause template rendering behavior on missing vars
- **Decision:** Errors over blank text
- **Status:** Accepted

## ADR-003: Attorney-required before advice patterns (D-0105-02)
- **Context:** UPL filter pattern matching order
- **Decision:** Check attorney-required patterns first
- **Status:** Accepted

## ADR-004: JSONB section columns (D-0301-01)
- **Context:** Will data storage strategy
- **Decision:** Separate JSONB columns per section, not single blob
- **Status:** Accepted

## ADR-005: Conversation temperature split (D-0302-01)
- **Context:** OpenAI temperature settings
- **Decision:** 0.7 for conversation, 0.2 for extraction
- **Status:** Accepted

## ADR-006: Dual-event SSE pattern (D-0305-02)
- **Context:** Streaming response delivery
- **Decision:** Delta events during stream, filtered/done after UPL check
- **Status:** Accepted

## ADR-007: No bare dict in OpenAI Structured Outputs schemas (2026-02-07)
- **Context:** OpenAI's Structured Outputs strict mode rejects `list[dict]` -- requires explicit Pydantic models with typed properties and `additionalProperties: false`
- **Decision:** All nested types in extraction schemas must be explicit Pydantic BaseModel classes. Never use `dict`, `list[dict]`, or `Any` in schemas passed to `client.beta.chat.completions.parse()`
- **Consequence:** Added `ExtractedTrustee`, `ExtractedBareDominiumHolder`, `ExtractedBequest`, `ExtractedResidueData`, `ExtractedResidueBeneficiary` models
- **Status:** Accepted

## ADR-008: Savepoint pattern for get_or_create race conditions (2026-02-09)
- **Context:** `get_or_create_conversation()` suffers race conditions when frontend fires concurrent requests on mount (e.g. GET history + POST stream). Both SELECT, find nothing, both INSERT -- second crashes with `UniqueViolationError`
- **Decision:** Use `begin_nested()` (savepoint) around INSERT + `IntegrityError` catch + re-SELECT. Savepoint isolates the failed INSERT without rolling back the outer transaction
- **Consequence:** Any future `get_or_create` patterns in the codebase must follow this same savepoint + retry approach
- **Status:** Accepted
