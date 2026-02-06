---
phase: "03"
plan: "04"
subsystem: "will-persistence"
tags: ["fastapi", "sqlmodel", "crud", "jsonb", "pydantic-validation", "will-service"]

dependency_graph:
  requires: ["03-01"]  # Will/Conversation models + schemas
  provides: ["will-service", "will-api", "section-updates"]
  affects: ["03-05", "03-06", "03-07", "03-08"]

tech_stack:
  added: []
  patterns: ["service-layer-with-DI", "section-level-jsonb-updates", "user-ownership-verification", "schema-validated-section-writes"]

key_files:
  created:
    - backend/app/services/will_service.py
    - backend/app/api/will.py
  modified:
    - backend/app/main.py

decisions:
  - id: "D-0304-01"
    description: "Dev mode fallback UUID (all-zeros) when CLERK_JWKS_URL is empty"
  - id: "D-0304-02"
    description: "Section-to-schema validation map ensures data integrity before DB write"

metrics:
  duration: "1m 55s"
  completed: "2026-02-06"
---

# Phase 03 Plan 04: Will CRUD Service Summary

**One-liner:** WillService with section-level JSONB updates, Pydantic validation, user ownership checks, and 5 REST endpoints.

## What Was Done

### Task 1: Create WillService with CRUD operations (4efb527)

Created `backend/app/services/will_service.py` implementing:

- **create_will** -- Creates a new Will with default empty sections
- **get_will** -- Fetches will by ID with user ownership verification (403 on mismatch)
- **list_user_wills** -- Returns all wills for a user, ordered by updated_at desc
- **update_section** -- Validates section name, updates the specific JSONB column, bumps updated_at
- **mark_section_complete** -- Sets sections_complete[section] = True
- **update_will_status** -- Validates status is one of: draft, review, verified, generated

Every method that accesses a will verifies user_id ownership via `_get_will_for_user` helper. DI via `get_will_service` dependency.

### Task 2: Create Will API endpoints and register router (1dabba7)

Created `backend/app/api/will.py` with 5 endpoints:

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/wills | Create new will draft |
| GET | /api/wills | List user's wills |
| GET | /api/wills/{will_id} | Get specific will |
| PATCH | /api/wills/{will_id}/sections/{section} | Update section data |
| POST | /api/wills/{will_id}/sections/{section}/complete | Mark section complete |

Key implementation details:
- **Section schema mapping** validates incoming data against the correct Pydantic schema (TestatorSchema, MaritalSchema, etc.) before passing to the service layer
- **List sections** (beneficiaries, assets, guardians, bequests) expect JSON arrays and validate each item
- **Dev mode fallback** uses a deterministic all-zeros UUID when Clerk auth is not configured
- Router registered in `main.py` via `app.include_router(will.router)`

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create WillService with CRUD operations | 4efb527 | backend/app/services/will_service.py |
| 2 | Create Will API endpoints and register router | 1dabba7 | backend/app/api/will.py, backend/app/main.py |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0304-01 | Dev mode fallback UUID (all-zeros) when auth disabled | Allows local development without Clerk infrastructure; matches ClerkAuth middleware's skip-when-unconfigured pattern |
| D-0304-02 | Section-to-schema validation map in API layer | Ensures data integrity before reaching service/DB; provides clear 422 errors with Pydantic validation details |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. Service imports: `from app.services.will_service import WillService, get_will_service` -- OK
2. Router routes: 5 (matches 5 endpoints)
3. Main includes will router: `app.include_router(will.router)` -- confirmed
4. Section validation: TestatorSchema, BeneficiarySchema and all others present in schema mapping

## Next Phase Readiness

- Migration 003 must be applied (`alembic upgrade head`) before these endpoints work against a real database
- The conversation endpoints (03-05, 03-06) can now use WillService to persist extracted will data
- Section-level updates are ready for both structured forms and AI conversation extraction

## Self-Check: PASSED
