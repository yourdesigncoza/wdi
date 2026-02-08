---
phase: 09-additional-documents
plan: 01
subsystem: api
tags: [fastapi, sqlmodel, jsonb, weasyprint, jinja2, pdf, living-will, funeral-wishes]

# Dependency graph
requires:
  - phase: 06-document-generation
    provides: "WeasyPrint+Jinja2 PDF pipeline, thread pool executor pattern"
  - phase: 01-foundation
    provides: "User model, POPIA consent, audit middleware"
provides:
  - "AdditionalDocument model with JSONB content column"
  - "LivingWillContent and FuneralWishesContent Pydantic schemas"
  - "AdditionalDocumentService with CRUD + PDF generation"
  - "7 API endpoints under /api/additional-documents"
  - "6 Jinja2 PDF templates (living will + funeral wishes)"
affects: [09-02, 09-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additional document JSONB content pattern (single content column, type-specific schema)"
    - "Separate PDF template directories per document type"

key-files:
  created:
    - backend/app/models/additional_document.py
    - backend/alembic/versions/008_add_additional_documents.py
    - backend/app/schemas/additional_document.py
    - backend/app/services/additional_document_service.py
    - backend/app/api/additional_documents.py
    - backend/app/templates/living_will/base.html
    - backend/app/templates/living_will/body.html
    - backend/app/templates/living_will/signature_page.html
    - backend/app/templates/funeral_wishes/base.html
    - backend/app/templates/funeral_wishes/body.html
    - backend/app/templates/funeral_wishes/signature_page.html
  modified:
    - backend/app/main.py

key-decisions:
  - "D-0901-01: Single JSONB content column per document (not typed columns) for schema flexibility"
  - "D-0901-02: server_default='{}' (not server_default=\"'{}'\") matching JSONB gotcha from project memory"
  - "D-0901-03: will_id FK with ondelete=SET NULL (optional link, not required)"

patterns-established:
  - "AdditionalDocument model: single content JSONB + document_type discriminator"
  - "PDF template directories: one per document type with base/body/signature_page structure"
  - "Service pre-population: extract testator data from linked will on create"

# Metrics
duration: 4m 31s
completed: 2026-02-08
---

# Phase 9 Plan 1: Additional Documents Backend Summary

**AdditionalDocument model with JSONB content, CRUD service with WeasyPrint PDF generation, 7 API endpoints, and 6 Jinja2 templates for living will and funeral wishes**

## Performance

- **Duration:** 4m 31s
- **Started:** 2026-02-08T09:25:34Z
- **Completed:** 2026-02-08T09:30:05Z
- **Tasks:** 3
- **Files created:** 11
- **Files modified:** 1

## Accomplishments
- AdditionalDocument SQLModel with JSONB content, user_id/will_id FKs, user_id index
- LivingWillContent (treatment prefs, trigger conditions, proxy, organ donation) and FuneralWishesContent (disposition, ceremony, music, budget, messages) Pydantic schemas
- AdditionalDocumentService with CRUD, ownership checks, will data pre-population, and PDF generation via WeasyPrint thread pool
- Living will PDF: declaration of intent, trigger conditions, treatment preferences table, healthcare proxy, personal values, organ donation, revocation clause, two witness signature page
- Funeral wishes PDF: personal details, body disposition (burial/cremation conditional sections), ceremony, music, attendees, budget, additional wishes, messages, single witness signature page
- 7 API endpoints registered under /api/additional-documents with proper auth handling

## Task Commits

Each task was committed atomically:

1. **Task 1: AdditionalDocument model, migration 008, and Pydantic schemas** - `69b1446` (feat)
2. **Task 2: AdditionalDocumentService with PDF generation and Jinja2 templates** - `e782eb0` (feat)
3. **Task 3: API endpoints and router registration** - `2bffe5b` (feat)

## Files Created/Modified
- `backend/app/models/additional_document.py` - AdditionalDocument SQLModel with JSONB content
- `backend/alembic/versions/008_add_additional_documents.py` - Migration creating additional_documents table
- `backend/app/schemas/additional_document.py` - LivingWillContent, FuneralWishesContent, API schemas
- `backend/app/services/additional_document_service.py` - CRUD + PDF generation service with DI
- `backend/app/api/additional_documents.py` - 7 FastAPI endpoints with StreamingResponse for PDFs
- `backend/app/main.py` - Router registration for additional_documents
- `backend/app/templates/living_will/base.html` - Living will PDF base with CSS paged media
- `backend/app/templates/living_will/body.html` - Declaration, treatment table, proxy, values sections
- `backend/app/templates/living_will/signature_page.html` - Declarant + 2 recommended witnesses
- `backend/app/templates/funeral_wishes/base.html` - Funeral wishes PDF base with CSS paged media
- `backend/app/templates/funeral_wishes/body.html` - Disposition, ceremony, music, messages sections
- `backend/app/templates/funeral_wishes/signature_page.html` - Author + 1 optional witness

## Decisions Made
- D-0901-01: Single JSONB content column per document (not typed columns) -- matches Will model pattern, allows schema evolution without migrations
- D-0901-02: Used `server_default="{}"` (not `server_default="'{}'"`) -- correct JSONB default per project gotcha
- D-0901-03: will_id FK with `ondelete="SET NULL"` -- document survives will deletion, optional link

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- Migration 008 must be applied (`alembic upgrade head`) before additional document features work.

## Next Phase Readiness
- Complete backend pipeline ready for frontend consumption (Plan 09-02, 09-03)
- All 7 API endpoints available at /api/additional-documents
- PDF generation tested via import verification
- Templates match professional formatting of main will PDF

## Self-Check: PASSED

- All 11 created files verified present
- All 3 task commits verified (69b1446, e782eb0, 2bffe5b)

---
*Phase: 09-additional-documents*
*Completed: 2026-02-08*
