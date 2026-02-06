---
phase: 01-foundation-compliance
plan: 04
subsystem: clause-library
tags: [clauses, jinja2, templates, legal-text, sa-law]
depends_on: ["01-01"]
provides:
  - ClauseLibraryService with async retrieval and Jinja2 rendering
  - Clause API endpoints (list, get, render)
  - Seed script with 7 placeholder clauses for all will sections
affects:
  - Phase 2 (conversation engine will consume clause library)
  - Phase 3 (advanced clauses for trusts, usufruct, business assets)
tech-stack:
  added: [Jinja2]
  patterns: [service-layer-with-DI, jinja2-sandboxed-rendering, idempotent-seeding]
key-files:
  created:
    - backend/app/services/clause_library.py
    - backend/app/api/clauses.py
    - backend/app/schemas/clause.py
    - backend/scripts/__init__.py
    - backend/scripts/seed_clauses.py
  modified:
    - backend/requirements.txt
    - backend/app/services/__init__.py
    - backend/app/schemas/__init__.py
decisions:
  - id: D-0104-01
    summary: Jinja2 StrictUndefined for template rendering - missing variables raise errors rather than producing blank output
  - id: D-0104-02
    summary: JSONB will_types filtering in Python (post-query) since PostgreSQL JSONB array containment queries add complexity without benefit at this scale
  - id: D-0104-03
    summary: Clause seed data uses RESIDUE category for BENEF-02 (residue clause) since the model has a dedicated RESIDUE category
metrics:
  duration: "3m 34s"
  completed: "2026-02-06"
---

# Phase 01 Plan 04: Clause Library Service Summary

Clause library service providing single source of truth for attorney-approved legal text with Jinja2 sandboxed template rendering and versioned clause management.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Clause library service | 83d6776 | services/clause_library.py, requirements.txt |
| 2 | Clause API endpoints | c540843, 007d683 | api/clauses.py, schemas/clause.py |
| 3 | Seed initial clauses | 1b0abb1 | scripts/seed_clauses.py |

## What Was Built

### ClauseLibraryService (`backend/app/services/clause_library.py`)

Five core methods:
- **get_clause_by_code** - Retrieves clause by unique code, defaults to current version
- **get_clauses_by_category** - Filters by category and will type, ordered by display_order
- **get_required_clauses** - Returns all required clauses for a will type
- **render_clause** - Jinja2 sandboxed rendering with StrictUndefined (no blank output on missing vars)
- **create_new_version** - Creates new version with linked-list pattern, marks previous as non-current

FastAPI dependency: `get_clause_service(session)` for DI.

### Clause API (`backend/app/api/clauses.py`)

Three endpoints:
- `GET /api/clauses` - List current clauses with optional category/will_type filters
- `GET /api/clauses/{code}` - Get specific clause with optional version parameter
- `POST /api/clauses/render` - Render clause template with provided variables

### Seed Script (`backend/scripts/seed_clauses.py`)

7 placeholder clauses covering all will sections:
- REVOC-01: Revocation of previous wills (required)
- EXEC-01: Primary executor appointment (required)
- EXEC-02: Alternate executor appointment
- BENEF-01: Specific bequest
- BENEF-02: Residue of estate (required)
- GUARD-01: Guardian appointment for minor children
- WIT-01: Signing and witness clause (required)

All marked as PLACEHOLDER pending attorney review. Idempotent (checks by code before insert).

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0104-01 | Jinja2 StrictUndefined mode | Missing variables must raise errors, not produce blank legal text |
| D-0104-02 | Post-query Python filtering for will_types | JSONB array containment adds complexity without benefit at expected scale |
| D-0104-03 | BENEF-02 uses RESIDUE category | Model has dedicated RESIDUE category; cleaner separation from specific bequests |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Re-added clause schema exports after parallel plan conflict**
- **Found during:** Task 2 commit
- **Issue:** Parallel plan 01-02 modified schemas/__init__.py and removed clause exports
- **Fix:** Re-applied clause schema exports in separate commit (007d683)
- **Files modified:** backend/app/schemas/__init__.py

## Verification Results

All checks passed:
1. ClauseLibraryService importable
2. Seed script defines 7 clauses
3. API router has 3 routes
4. All schemas importable
5. Jinja2 template rendering works correctly

## Next Phase Readiness

- Clause library is ready for consumption by Phase 2 conversation engine
- Router not yet added to main.py (deferred to avoid conflict with parallel 01-02)
- Attorney-reviewed clause text needed before production (all clauses marked PLACEHOLDER)

## Self-Check: PASSED
