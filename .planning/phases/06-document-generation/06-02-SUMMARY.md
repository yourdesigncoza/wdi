---
phase: 06-document-generation
plan: 02
subsystem: document-generation
tags: [document-service, clause-assembly, variable-extraction, weasyprint, pdf-generation, thread-executor]

dependency-graph:
  requires: [phase-01-clause-library, 06-01-templates]
  provides: [document-generation-service, clause-assembly-pipeline, pdf-generation]
  affects: [06-03-api-endpoints, 06-04-frontend-preview]

tech-stack:
  added: []
  patterns: [clause-assembly-pipeline, variable-extraction-with-safe-defaults, thread-pool-pdf-generation, conditional-clause-inclusion]

key-files:
  created:
    - backend/app/services/document_service.py
    - backend/app/schemas/document.py
  modified: []

key-decisions:
  - id: D-0602-01
    decision: "Safe defaults with '[To be completed]' placeholder for missing JSONB fields"
    rationale: "Defense in depth -- missing data renders visibly rather than crashing PDF generation"
  - id: D-0602-02
    decision: "CLAUSE_ORDER as ordered list with condition evaluators rather than section-keyed dict"
    rationale: "Preserves legal document ordering, handles cross-section conditions (scenario checks), supports each: iteration"
  - id: D-0602-03
    decision: "TEMPLATE_DIR points to templates/ root, template paths prefixed with will/"
    rationale: "Aligns with 06-01 decision D-0601-02 for Jinja2 FileSystemLoader resolution"

patterns-established:
  - "Condition evaluator: always | scenario:X | has:field.sub | has_items:field | each:field | each:field:type"
  - "Safe render fallback: catch ValueError, return user-visible error message instead of crashing"
  - "Module-level ThreadPoolExecutor with max_workers=2 for PDF generation"

duration: 2m 6s
completed: 2026-02-07
---

# Phase 06 Plan 02: Document Generation Service Summary

**DocumentGenerationService with clause assembly pipeline, per-clause variable extraction from JSONB with safe defaults, and WeasyPrint PDF rendering in thread executor**

## Performance

- **Duration:** 2m 6s
- **Tasks:** 1/1 completed
- **Deviations:** 0 (plan executed exactly as written)

## Accomplishments

1. **DocumentGenerationService (470 lines)** -- Core service orchestrating clause assembly, HTML rendering, and PDF generation:
   - `generate_preview()` / `generate_final()` public API with WillService ownership checks
   - `_generate()` pipeline: assemble clauses, build context, render Jinja2 HTML, WeasyPrint in executor
   - `_assemble_clauses()` iterates CLAUSE_ORDER, evaluates conditions, fetches from DB, extracts vars, renders
   - `_safe_render()` wraps ClauseLibraryService.render_clause() with error fallback

2. **CLAUSE_ORDER constant** -- 11 clause codes in legal document order:
   - REVOC-01 (always first), JOINT-01 (conditional), EXEC-01/02, BENEF-01 (each bequest), GUARD-01, TRUST-01, USUF-01, BUS-01/02 (each by type), BENEF-02 (residue, always last)
   - WIT-01 handled by signature page template, not in clause body

3. **Variable extractors** -- Per-clause extraction from will JSONB with safe defaults:
   - `_safe_get()` helper traverses nested dicts safely
   - `_testator_full_name()`, `_extract_guardian_vars()`, `_extract_residue_vars()` helpers
   - All missing fields default to "[To be completed]" rather than raising UndefinedError

4. **Condition evaluator** -- `_should_include_clause()` supports 5 condition types:
   - `always`, `scenario:X`, `has:field.sub`, `has_items:field`, `each:field[:type]`
   - `each:` returns list of items for per-item clause rendering (bequests, business assets)

5. **PDF generation** -- `_render_pdf_sync()` in ThreadPoolExecutor (max_workers=2):
   - Non-blocking async wrapper via `run_in_executor`
   - `base_url` set to TEMPLATE_DIR for font/asset resolution

6. **Document schemas (22 lines)** -- GeneratePreviewRequest (disclaimer_acknowledged) and DocumentInfo (reference, metadata)

## Task Commits

| Task | Name | Commit | Key Change |
|------|------|--------|------------|
| 1 | Document schemas and DocumentGenerationService | `6d0128a` | document_service.py + document.py |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/services/document_service.py` | 470 | Core service: clause assembly, variable extraction, PDF generation |
| `backend/app/schemas/document.py` | 22 | Pydantic schemas for document requests/responses |

## Files Modified

None.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0602-01 | Safe defaults "[To be completed]" for missing JSONB fields | Defense in depth -- renders visibly rather than crashing |
| D-0602-02 | CLAUSE_ORDER as ordered list with condition evaluators | Preserves legal ordering, handles cross-section conditions |
| D-0602-03 | TEMPLATE_DIR at templates/ root, paths prefixed with will/ | Aligns with D-0601-02 Jinja2 FileSystemLoader resolution |

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **Plan 06-03 ready:** DocumentGenerationService provides `generate_preview()` and `generate_final()` methods for API endpoint wiring
- **DI pattern:** `get_document_service` factory function ready for FastAPI `Depends()` injection
- **Data contract:** Service returns `bytes` (PDF content) -- API layer wraps in `Response` with appropriate headers
- **No blockers** for downstream plans

## Self-Check: PASSED
