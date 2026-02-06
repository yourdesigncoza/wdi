---
phase: 04-complex-estate-scenarios
plan: 01
subsystem: backend-data-layer
tags: [alembic, jsonb, pydantic, scenario-detection, fastapi]
requires:
  - phase-03 (will model, section CRUD, conversation)
provides:
  - 5 new JSONB columns on wills table (trust_provisions, usufruct, business_assets, joint_will, scenarios)
  - Pydantic schemas for 4 complex estate sections
  - ScenarioDetector service for deterministic scenario detection
  - GET /api/wills/{id}/scenarios endpoint
affects:
  - 04-02 (conversation prompts for complex sections)
  - 04-03 (frontend wizard steps for complex scenarios)
  - 04-04 (clause library templates for trust/usufruct/business)
  - 04-05 (integration and testing)
tech-stack:
  added: []
  patterns:
    - frozenset for constant lookup sets (ScenarioDetector._STEP_CHILD_RELATIONSHIPS)
    - Scenario detection as pure function (static method, no DB dependency)
key-files:
  created:
    - backend/alembic/versions/004_add_complex_sections.py
    - backend/app/services/scenario_detector.py
  modified:
    - backend/app/models/will.py
    - backend/app/schemas/will.py
    - backend/app/services/will_service.py
    - backend/app/api/will.py
key-decisions: []
patterns-established:
  - Scenario detection as deterministic pure function (no DB/LLM dependency)
  - Joint will is user-selected (will_type="joint"), not auto-detected
duration: 2m 31s
completed: 2026-02-06
---

# Phase 04 Plan 01: Backend Foundation for Complex Estate Scenarios Summary

Migration 004 adds 5 JSONB columns (trust_provisions, usufruct, business_assets, joint_will, scenarios) with ScenarioDetector auto-detecting blended_family, testamentary_trust, usufruct, and business_assets from existing will data.

## Performance

- Duration: 2m 31s
- Tasks: 2/2 completed
- Files created: 2
- Files modified: 4

## Accomplishments

1. **Migration 004** -- Adds 5 JSONB columns to wills table with correct server_default values (following the `server_default="{}"` pattern for Alembic, `server_default="'{}'"` for SQLModel)
2. **Will model extensions** -- 5 new column fields + sections_complete expanded with trust/usufruct/business/joint keys
3. **Pydantic schemas** -- TrustProvisionSchema, UsufructSchema, BusinessAssetDetailSchema, JointWillSchema, ScenarioListSchema with field-level validation (vesting age 18-25, SA ID regex, percentage 0-100)
4. **ScenarioDetector** -- Pure deterministic detection: blended_family (married+step-children), testamentary_trust (minor beneficiaries), usufruct (property+married), business_assets (business-type assets)
5. **API updates** -- Schema map extended with 4 new sections, business_assets added to list sections, GET /api/wills/{id}/scenarios endpoint persists detected scenarios
6. **VALID_SECTIONS extended** -- Will service accepts all 5 new section names for PATCH updates

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migration 004 + Will model extensions | dc2580d | 004_add_complex_sections.py, will.py (model) |
| 2 | Schemas, scenario detector, API updates | c9a5cbe | will.py (schemas), scenario_detector.py, will_service.py, will.py (api) |

## Files Created

- `backend/alembic/versions/004_add_complex_sections.py` -- Migration adding 5 JSONB columns
- `backend/app/services/scenario_detector.py` -- Deterministic scenario detection service

## Files Modified

- `backend/app/models/will.py` -- 5 new JSONB fields + expanded sections_complete
- `backend/app/schemas/will.py` -- 5 new schema classes + is_minor on BeneficiarySchema + WillResponse updated
- `backend/app/services/will_service.py` -- VALID_SECTIONS extended with 5 new sections
- `backend/app/api/will.py` -- Schema map + list sections + scenarios endpoint

## Decisions Made

None -- plan executed as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added is_minor field to BeneficiarySchema**
- **Found during:** Task 2
- **Issue:** ScenarioDetector checks `b.get("is_minor", False)` for testamentary_trust detection, but BeneficiarySchema lacked the `is_minor` field, meaning validated beneficiary data would never include is_minor=True
- **Fix:** Added `is_minor: bool = False` to BeneficiarySchema
- **Files modified:** backend/app/schemas/will.py
- **Commit:** c9a5cbe

## Issues Encountered

None.

## Next Phase Readiness

- Migration 004 must be applied (`alembic upgrade head`) before complex scenario features work
- ScenarioDetector is ready for integration with conversation prompts (04-02)
- Schemas ready for frontend form integration (04-03)
- Attorney review still needed for testamentary trust and usufruct clause text

## Self-Check: PASSED
