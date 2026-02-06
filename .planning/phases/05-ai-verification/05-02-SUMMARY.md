---
phase: "05"
plan: "02"
subsystem: "ai-verification"
tags: ["pydantic", "gemini", "verification", "sa-wills-act", "prompts"]

dependency_graph:
  requires: ["01-04", "03-02"]
  provides: ["verification-schemas", "verification-prompt", "sa-wills-act-rules"]
  affects: ["05-03", "05-04"]

tech_stack:
  added: []
  patterns: ["Literal-types-for-gemini-compatibility", "rules-dict-by-severity", "prompt-builder-pattern"]

key_files:
  created:
    - "backend/app/schemas/verification.py"
    - "backend/app/prompts/verification.py"
  modified: []

decisions:
  - id: "D-0502-01"
    description: "Literal types instead of Python Enum classes for Gemini structured output compatibility"
  - id: "D-0502-02"
    description: "Rules organized as dict[severity][code] -> description for easy prompt embedding and code lookup"

metrics:
  duration: "2m 15s"
  completed: "2026-02-06"
---

# Phase 5 Plan 2: Verification Schemas and SA Wills Act Rules Summary

Pydantic verification schemas with Literal types for Gemini structured output, and SA Wills Act verification prompt with 19 rules across 3 severity levels plus 9 attorney referral triggers.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Verification Pydantic schemas | 6f52dd8 | backend/app/schemas/verification.py |
| 2 | Verification prompt with SA Wills Act rules | 72ac2af | backend/app/prompts/verification.py |

## What Was Built

### Verification Schemas (backend/app/schemas/verification.py)
- **VerificationIssue**: code, severity (Literal["error","warning","info"]), section, title, explanation, suggestion
- **SectionResult**: section name, status (pass/warning/error), list of issues
- **AttorneyReferral**: recommended bool + reasons list
- **VerificationResult**: overall_status, sections, attorney_referral, summary (Gemini response_schema)
- **VerificationResponse**: API wrapper with verified_at timestamp and has_blocking_errors flag
- **AcknowledgeWarningsRequest/Response**: Warning acknowledgment flow models

### Verification Prompt (backend/app/prompts/verification.py)
- **VERIFICATION_RULES**: dict organized by severity level
  - 9 errors: MISSING_TESTATOR, INVALID_ID_NUMBER, TESTATOR_UNDER_16, NO_BENEFICIARIES, NO_EXECUTOR, NO_RESIDUE_CLAUSE, PERCENTAGES_EXCEED_100, RESIDUE_PERCENTAGES_INVALID, MINOR_NO_PROVISION
  - 7 warnings: NO_BACKUP_EXECUTOR, NO_ALTERNATE_BENEFICIARY, NO_GUARDIANS_WITH_MINORS, COMMUNITY_PROPERTY_HALF, JOINT_WILL_IRREVOCABLE, NO_SIMULTANEOUS_DEATH, BUSINESS_NO_BUY_SELL
  - 3 info: RECOMMEND_PROFESSIONAL_EXECUTOR, TRUST_VESTING_AGE, KEEP_WILL_UPDATED
- **ATTORNEY_REFERRAL_TRIGGERS**: 9 triggers covering complex scenarios (trust, usufruct, business, international, disinheriting) and unusual patterns (unequal distribution, no family, no executor, large estate)
- **build_verification_prompt()**: Generates ~8.7K char system instruction embedding all rules, will data as JSON, completeness/consistency/compliance check instructions, and UPL boundaries

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0502-01 | Literal types instead of Enum classes | Gemini structured output has limited support for complex Python Enum types; Literal["error","warning","info"] is flat and compatible |
| D-0502-02 | Rules as dict[severity][code] -> description | Enables easy prompt formatting, programmatic code lookup, and iteration by severity level |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

All 5 verification criteria passed:
1. All Pydantic schemas import and instantiate correctly
2. VerificationResult serializes to JSON for Gemini response_schema
3. build_verification_prompt contains all 19 rule codes
4. 9 attorney referral triggers defined
5. Prompt includes UPL boundary language

## Next Phase Readiness

- Schemas ready for Gemini service (05-03) to use as response_schema
- Prompt builder ready for verification service to call with will data
- API response models ready for verification endpoint

## Self-Check: PASSED
