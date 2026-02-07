---
phase: 06-document-generation
plan: 01
subsystem: document-generation
tags: [weasyprint, pdf, html-templates, css-paged-media, jinja2, will-document]

dependency-graph:
  requires: [phase-01-clause-library]
  provides: [will-pdf-templates, weasyprint-dependency]
  affects: [06-02-document-service, 06-03-api-endpoints, 06-04-frontend-preview]

tech-stack:
  added: [weasyprint-68.1]
  patterns: [css-paged-media, jinja2-template-includes, fixed-position-watermark]

key-files:
  created:
    - backend/app/templates/will/base.html
    - backend/app/templates/will/cover_page.html
    - backend/app/templates/will/will_body.html
    - backend/app/templates/will/signature_page.html
    - backend/app/templates/will/instruction_sheet.html
  modified:
    - backend/requirements.txt

key-decisions:
  - id: D-0601-01
    decision: "WeasyPrint position:fixed for watermark (repeats on every page)"
    rationale: "WeasyPrint treats fixed positioning as repeat-per-page, ideal for PREVIEW watermark"
  - id: D-0601-02
    decision: "Include paths prefixed with will/ subdirectory for Jinja2 template resolution"
    rationale: "Jinja2 FileSystemLoader resolves from templates root, so includes need full subpath"

patterns-established:
  - "CSS Paged Media @page rules with @bottom-center and @bottom-right margin boxes"
  - "Jinja2 include-based template composition (base includes partials)"
  - "Conditional watermark via is_preview flag"

duration: 2m 30s
completed: 2026-02-07
---

# Phase 06 Plan 01: WeasyPrint Templates Summary

**WeasyPrint with CSS Paged Media templates for SA will PDF generation — A4 layout, page numbers, initials lines, conditional watermark, 5 HTML templates**

## Performance

- **Duration:** 2m 30s
- **Tasks:** 2/2 completed
- **Deviations:** 0 (plan executed exactly as written)

## Accomplishments

1. **WeasyPrint 68.1 installed** in backend venv with `weasyprint>=68.0` in requirements.txt
2. **base.html (274 lines)** — Master template with full CSS Paged Media:
   - A4 page size with 25mm margins (30mm bottom)
   - @bottom-center: page X of Y counter
   - @bottom-right: initials lines for testator + 2 witnesses
   - @page :first suppresses footer on cover page
   - Typography: Liberation Serif, 12pt, 1.5 line-height
   - Conditional PREVIEW watermark (position:fixed, 72pt, rotated -35deg, red at 12% opacity)
   - Page break helpers for signature page, instruction sheet, witness blocks
3. **cover_page.html (32 lines)** — Centered layout with WillCraft SA branding, testator name, document reference, disclaimer, attorney review recommendation
4. **will_body.html (29 lines)** — Hierarchical clause rendering with 3-level numbering (clause.sub.subsub), loops over `clauses` variable
5. **signature_page.html (86 lines)** — Testator declaration with page count, signature line, 2 witness blocks (name, ID, address, date fields), witness preamble
6. **instruction_sheet.html (66 lines)** — SA Wills Act requirements: who can witness, how to sign, important requirements (wet ink, original, safe storage), Do NOT list, WillCraft SA footer

## Task Commits

| Task | Name | Commit | Key Change |
|------|------|--------|------------|
| 1 | Install WeasyPrint and create base HTML template | `721a45d` | requirements.txt + base.html with CSS Paged Media |
| 2 | Create cover, body, signature, instruction templates | `7c1726c` | 4 partial templates for Jinja2 include |

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `backend/app/templates/will/base.html` | 274 | Master template with CSS and includes |
| `backend/app/templates/will/cover_page.html` | 32 | Cover page with disclaimer |
| `backend/app/templates/will/will_body.html` | 29 | Clause rendering loop |
| `backend/app/templates/will/signature_page.html` | 86 | Testator + 2 witness blocks |
| `backend/app/templates/will/instruction_sheet.html` | 66 | SA signing requirements |

## Files Modified

| File | Change |
|------|--------|
| `backend/requirements.txt` | Added `weasyprint>=68.0` |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0601-01 | WeasyPrint position:fixed for watermark | Repeats on every page in WeasyPrint, ideal for PREVIEW overlay |
| D-0601-02 | Include paths prefixed with `will/` subdirectory | Jinja2 FileSystemLoader resolves from templates root |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- **Plan 06-02 ready:** Templates provide the rendering foundation for DocumentGenerationService
- **Data contract:** Templates expect `testator_name`, `document_reference`, `clauses` (list with number/name/rendered_text/sub_clauses), `is_preview`, `page_count`, `generation_date`, `id_number`
- **No blockers** for downstream plans

## Self-Check: PASSED
