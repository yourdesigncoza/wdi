---
status: resolved
trigger: "Verification reports 'No Beneficiaries Nominated', 'No Executor Nominated', and 'No Residue Clause' even though the data IS persisted in the will's JSONB columns"
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: End-to-end extraction test with actual DB conversations
expecting: All three sections extract correctly
next_action: Archive session

## Symptoms

expected: Verification should pass for beneficiaries, executor, and residual estate when data exists in the will's JSONB columns
actual: Verification always reports these as errors - "No Beneficiaries Nominated", "No Executor Nominated", "No Residue Clause"
errors: 3 false-negative verification errors on sections that have data
reproduction: Complete a will through AI chat sections (beneficiaries, executor, residue), then run verification
started: Persisted since Quick Fix 004 and Quick Fix 005. Data persistence works but verification still fails.

## Eliminated

- hypothesis: Data format mismatch between JSONB storage and verification expectations
  evidence: Verification prompt and service correctly collect and pass will data. The real issue is UPSTREAM -- data never reaches the JSONB columns at all.
  timestamp: 2026-02-07T00:00:30Z

- hypothesis: Verification service not reading will data correctly
  evidence: _collect_will_data() correctly reads all JSONB columns. build_verification_prompt() correctly serializes to JSON. Problem is the columns are empty.
  timestamp: 2026-02-07T00:00:30Z

## Evidence

- timestamp: 2026-02-07T00:00:10Z
  checked: Database JSONB columns for will 79bc89f6
  found: ALL AI-extracted sections are empty (beneficiaries=[], executor={}, residue={}, assets=[], etc.) despite testator/marital having data (from forms)
  implication: Extraction is failing for ALL sections, not just residue

- timestamp: 2026-02-07T00:00:15Z
  checked: Conversations table for will 79bc89f6
  found: Rich conversation data exists - beneficiaries (12 msgs), executor (6 msgs), residue (6 msgs), assets (6 msgs)
  implication: Data exists in conversations but extraction never persists it to will columns

- timestamp: 2026-02-07T00:00:20Z
  checked: Manual OpenAI extraction call with ExtractedWillData schema
  found: 400 error: "In context=('properties', 'trustees', 'items'), 'additionalProperties' is required to be supplied and to be false"
  implication: OpenAI Structured Outputs rejects the schema. EVERY extraction call fails silently.

- timestamp: 2026-02-07T00:00:25Z
  checked: ExtractedWillData and nested models for bare dict types
  found: 3 fields use list[dict]: trustees, bare_dominium_holders, bequests. OpenAI requires explicit property definitions.
  implication: Schema is incompatible with OpenAI Structured Outputs strict mode

- timestamp: 2026-02-07T00:00:30Z
  checked: ExtractedWillData for residue field
  found: No residue field exists in ExtractedWillData, and no residue handler in save_extracted_to_will
  implication: Even if extraction worked, residue data would never be extracted or saved

- timestamp: 2026-02-07T00:01:30Z
  checked: Post-fix extraction test with actual DB conversations
  found: All 3 sections extract correctly from real conversations. Beneficiaries returns Sannie vd. Walt (80%, sister). Executor returns Peter Pots (friend). Residue returns Round Table of South Africa (100%, charity).
  implication: Fix is verified working with real data

## Resolution

root_cause: |
  TWO root causes:
  1. CRITICAL: OpenAI Structured Outputs rejects ExtractedWillData schema because 3 fields use bare `list[dict]` (trustees, bare_dominium_holders, bequests). OpenAI strict mode requires all objects to have explicit properties with `additionalProperties: false`. This causes a 400 error on EVERY extraction call, silently caught by except blocks. Result: ALL AI conversation data never gets persisted to will JSONB columns.
  2. MISSING: No `residue` field in ExtractedWillData and no `residue` handler in save_extracted_to_will. Residue data can never be extracted or saved even if extraction worked.

  Combined effect: ALL AI sections have empty JSONB columns, so verification correctly reports missing data. The "false negatives" are actually true negatives against empty data.

fix: |
  1. Replaced bare `list[dict]` with proper Pydantic models:
     - `trustees: list[dict]` -> `trustees: list[ExtractedTrustee]` (new model)
     - `bare_dominium_holders: list[dict]` -> `bare_dominium_holders: list[ExtractedBareDominiumHolder]` (new model)
     - `bequests: list[dict]` -> `bequests: list[ExtractedBequest]` (new model)
  2. Added residue extraction support:
     - New models: ExtractedResidueBeneficiary, ExtractedResidueData
     - Added `residue: Optional[ExtractedResidueData]` to ExtractedWillData
     - Added `residue` handler in save_extracted_to_will
     - Updated EXTRACTION_SYSTEM_PROMPT to mention residue
  3. Updated bequests save to use model_dump() (was passing raw list before)

verification: |
  - Reproduced original 400 error with bare dict schema
  - After fix: extraction succeeds for beneficiaries, executor, and residue
  - Tested with actual DB conversations from will 79bc89f6
  - All 3 sections produce correct structured output
  - Pre-verification extraction pathway (_extract_missing_sections) will now populate empty JSONB columns

files_changed:
  - backend/app/prompts/extraction.py
  - backend/app/services/conversation_service.py
