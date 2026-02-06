---
phase: "04"
plan: "03"
subsystem: "ai-conversation"
tags: ["system-prompts", "extraction-models", "upl-filter", "clause-library", "trust", "usufruct", "business", "joint-will"]
depends_on:
  requires: ["01-04", "01-05", "03-02", "04-01"]
  provides: ["AI prompts for 4 complex sections", "3 extraction models", "4 UPL patterns", "5 clause templates"]
  affects: ["04-04", "04-05", "05-xx"]
tech_stack:
  added: []
  patterns: ["Section-specific system prompts with UPL boundaries", "Pydantic extraction models for structured output"]
key_files:
  created: []
  modified:
    - "backend/app/prompts/system.py"
    - "backend/app/prompts/extraction.py"
    - "backend/app/services/upl_filter.py"
    - "backend/scripts/seed_clauses.py"
    - "backend/app/models/clause.py"
decisions:
  - id: "D-0403-01"
    description: "Added BUSINESS and JOINT to ClauseCategory enum for proper clause categorization"
metrics:
  duration: "3m 8s"
  completed: "2026-02-06"
---

# Phase 4 Plan 3: AI Prompts, Extraction, UPL, and Clauses for Complex Scenarios Summary

**One-liner:** 4 system prompts with SA law context, 3 extraction models, 4 UPL attorney-required patterns, 5 clause templates for trust/usufruct/business/joint

## Task Commits

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | System prompts and extraction models | `58f47b7` | 4 SECTION_PROMPTS, 3 extraction Pydantic models, format_will_summary extension |
| 2 | UPL filter patterns and clause seeds | `38065a4` | 4 attorney-required patterns, 5 clause templates, ClauseCategory enum extension |

## What Was Done

### Task 1: System Prompts and Extraction Models

**System prompts** -- Added 4 new entries to `SECTION_PROMPTS`:

- `trust`: Testamentary trust for minor children, asks about vesting age/trustees/maintenance income, UPL boundary on tax/structure advice
- `usufruct`: Usufruct over property, explains use-vs-own distinction, warns against fideicommissum confusion
- `business`: Business assets covering CC s35 consent and Pty Ltd MOI restrictions, asks about buy-sell agreements
- `joint`: Joint/mutual will with irrevocability warning, presents mirror wills as alternative

**Will summary** -- Extended `format_will_summary()` to include trust_provisions, usufruct, business_assets, and joint_will data in the system prompt context.

**Extraction models** -- Added 3 new Pydantic models:

- `ExtractedTrustData`: trust_name, minor_beneficiaries, vesting_age, trustees, income_for_maintenance, capital_for_education
- `ExtractedUsufructData`: property_description, usufructuary_name, bare_dominium_holders, duration
- `ExtractedBusinessData`: business_name, business_type, registration_number, percentage_held, heir_name, has_buy_sell_agreement, has_association_agreement

Extended `ExtractedWillData` with optional trust, usufruct_data, and business_data fields. Updated `EXTRACTION_SYSTEM_PROMPT` to mention trust/usufruct/business extraction.

### Task 2: UPL Filter Patterns and Clause Seeds

**UPL filter** -- Added 4 new attorney-required patterns (total now 10):

- `trust_tax`: Catches "trust tax", "trust duty", "trust estate duty", "trust section 7C"
- `fideicommissum`: Catches any mention of fideicommissum
- `business_valuation`: Catches "business valuation", "business fair market value"
- `complex_trust`: Catches "special trust", "discretionary trust", "inter vivos trust"

**Clause templates** -- Added 5 new seed clauses (total now 12):

- `TRUST-01`: Testamentary trust for minor children (variables: children_names, trust_name, trustee_names, vesting_age)
- `USUF-01`: Usufruct over immovable property (variables: usufructuary_name, usufructuary_id_number, property_description, bare_dominium_holders)
- `BUS-01`: CC member interest bequest with s35 consent clause
- `BUS-02`: Company shares bequest with MOI/Shareholders Agreement reference
- `JOINT-01`: Joint will mutual bequest declaration (is_required: True)

**Enum extension** -- Added `BUSINESS` and `JOINT` to `ClauseCategory` enum for proper clause categorization.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added BUSINESS and JOINT to ClauseCategory enum**

- **Found during:** Task 2
- **Issue:** BUS-01, BUS-02 and JOINT-01 clauses need proper categories but ClauseCategory only had TRUST and USUFRUCT for complex scenarios
- **Fix:** Added BUSINESS = "business" and JOINT = "joint" to ClauseCategory enum
- **Files modified:** backend/app/models/clause.py
- **Commit:** 38065a4

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0403-01 | Added BUSINESS and JOINT to ClauseCategory enum | Business and joint will clauses need distinct categories for clause library lookup and UPL replacement mapping |

## Success Criteria Verification

- [x] SECTION_PROMPTS has entries for "trust", "usufruct", "business", "joint"
- [x] ExtractedWillData includes trust, usufruct_data, business_data fields
- [x] UPL filter has 10 attorney-required patterns (was 6, now 10)
- [x] SEED_CLAUSES has 12 entries (was 7, now 12)

## Next Phase Readiness

- Migration 004 must include any DB changes for new ClauseCategory values (enum types in PostgreSQL need ALTER TYPE)
- Attorney review needed for all 5 new clause templates (all marked PLACEHOLDER)
- Seed script must be re-run to insert new clauses: `python -m scripts.seed_clauses`

## Self-Check: PASSED
