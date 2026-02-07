---
phase: 08-post-purchase-features
plan: 01
subsystem: backend-will-versioning
tags: [will-model, migration, api-endpoints, versioning, session-persistence]
dependency_graph:
  requires: [phase-07-payment-download]
  provides: [will-versioning-model, current-section-tracking, regenerate-endpoint]
  affects: [will-api, will-service, will-schema]
tech_stack:
  added: []
  patterns: [version-counter, wizard-position-tracking, payment-gated-regeneration]
key_files:
  created:
    - backend/alembic/versions/007_add_will_versioning.py
  modified:
    - backend/app/models/will.py
    - backend/app/schemas/will.py
    - backend/app/services/will_service.py
    - backend/app/api/will.py
key_decisions:
  - id: D-0801-01
    description: "version column (Integer, default 1) tracks regeneration count; current_section (String(50), default 'personal') tracks wizard resume position"
  - id: D-0801-02
    description: "Regenerate endpoint requires both paid_at (402) and verified status (400) before allowing re-generation"
  - id: D-0801-03
    description: "Regenerate reuses existing completed Payment record, generating a fresh download token rather than creating a new payment"
metrics:
  duration: 2m 33s
  completed: 2026-02-07T19:53:19Z
---

# Phase 8 Plan 1: Will Versioning and Session Persistence Summary

Backend will versioning with version counter, wizard position tracking, and post-purchase regeneration endpoint with payment + status gates.

## Performance

- Duration: 2m 33s
- Tasks: 2/2 completed
- Deviations: None

## Accomplishments

1. **Will model extended** with `version` (int, default 1) and `current_section` (str, default "personal") columns placed after `paid_at` and before `sections_complete`
2. **Migration 007** created following existing pattern (op.add_column/op.drop_column) with correct server_default values
3. **WillResponse schema** now exposes `version`, `current_section`, and `paid_at` fields; new `CurrentSectionUpdate` request schema added
4. **WillService** gained `update_current_section` (validates against VALID_SECTIONS + wizard steps) and `regenerate_will` (enforces paid_at + verified status, increments version)
5. **Two new API endpoints**: PATCH current-section for wizard resume, POST regenerate for post-purchase re-generation with fresh download token

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migration 007 and Will model updates | 880e322 | backend/app/models/will.py, backend/alembic/versions/007_add_will_versioning.py |
| 2 | Schema, service, and API endpoint updates | a11babb | backend/app/schemas/will.py, backend/app/services/will_service.py, backend/app/api/will.py |

## Files Created/Modified

### Created
- `backend/alembic/versions/007_add_will_versioning.py` -- Migration adding version and current_section columns

### Modified
- `backend/app/models/will.py` -- Added Integer import, version and current_section fields
- `backend/app/schemas/will.py` -- Added CurrentSectionUpdate schema; version, current_section, paid_at to WillResponse
- `backend/app/services/will_service.py` -- Added update_current_section and regenerate_will methods
- `backend/app/api/will.py` -- Added PATCH current-section and POST regenerate endpoints; imported Payment, generate_download_token, select, AsyncSession

## Decisions Made

- **D-0801-01**: version (Integer, default 1) tracks regeneration count; current_section (String(50), default "personal") tracks wizard resume position
- **D-0801-02**: Regenerate endpoint requires both paid_at (402 Payment required) and verified status (400 Must be re-verified) before allowing re-generation
- **D-0801-03**: Regenerate reuses the most recent completed Payment record, generating a fresh download token rather than creating a new payment

## Deviations from Plan

None -- plan executed exactly as written.

## Issues

- Migration 007 must be applied (`alembic upgrade head`) before will versioning features work

## Next Phase Readiness

- Will versioning model is in place for all Phase 8 plans that depend on it
- Current-section tracking enables save/resume functionality (08-02 and beyond)
- Regenerate endpoint provides foundation for post-purchase update flow

## Self-Check: PASSED

All 5 files verified present. Both commit hashes (880e322, a11babb) confirmed in git log.
