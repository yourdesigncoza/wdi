# Phase 6: Document Generation - Research

**Researched:** 2026-02-07
**Domain:** PDF generation from HTML/CSS via WeasyPrint, Jinja2 HTML templates, SA will document formatting
**Confidence:** HIGH

## Summary

Phase 6 transforms collected JSONB section data into professionally formatted PDF will documents. The stack is locked: WeasyPrint for PDF rendering, Jinja2 HTML templates for document layout. WeasyPrint (v68.1, released 2026-02-06) converts HTML+CSS to PDF with full CSS Paged Media support -- `@page` rules, margin boxes, page counters, `break-inside: avoid`, and CSS `position: fixed` for watermarks. The existing codebase already uses Jinja2 with `StrictUndefined` for clause rendering and has 12 seed clauses covering all will sections.

The core challenge is clause assembly: mapping 13 JSONB section columns (testator, marital, beneficiaries, assets, guardians, executor, bequests, residue, trust_provisions, usufruct, business_assets, joint_will, scenarios) to ordered clause selection, variable extraction, and template rendering. The existing `ClauseLibraryService` already handles retrieval by category/will_type and rendering with variable substitution. A new `DocumentGenerationService` will orchestrate: clause assembly, Jinja2 HTML template rendering, WeasyPrint PDF generation, and preview watermarking.

**Primary recommendation:** Build a `DocumentGenerationService` that reuses the existing `ClauseLibraryService` for clause retrieval/rendering, assembles clauses into a Jinja2 HTML will template with CSS Paged Media styling, and generates PDF via `HTML(string=...).write_pdf()` returning bytes. Run WeasyPrint in a thread executor (`run_in_executor`) since it is CPU-bound. Serve preview PDFs with watermark CSS class toggled on; final PDFs without.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Document formatting:**
- Traditional legal style: formal serif font, numbered clauses, dense paragraphs -- looks like a lawyer drafted it
- Hierarchical clause numbering (1, 1.1, 1.1.1) -- main clauses, sub-clauses, sub-sub-clauses
- Full dedicated signature page: testator signature line, 2 witness blocks (name, ID number, address, signature line), date fields
- Formal cover page with "LAST WILL AND TESTAMENT OF [NAME]", date, and document reference number
- Separate witness instruction sheet (not part of the legal document itself) -- explains SA signing requirements, do's and don'ts
- A4 page size with standard ~25mm margins
- Page numbers in "Page X of Y" format
- Testator and witness initials line on every page (standard SA practice to prevent tampering)

**Preview experience:**
- Full PDF with "PREVIEW -- NOT VALID" watermark stamped across each page
- Preview opens in a new browser tab using native browser PDF viewer
- Users can regenerate preview anytime -- go back, edit data, regenerate as many times as needed
- No download until paid -- preview is view-only in browser, prevents users from using watermarked version

**Disclaimer placement:**
- "Not legal advice" disclaimer on cover page only -- keeps the document clean, no per-page footer
- Attorney review always recommended for every will (not just complex scenarios) -- CYA approach
- Attorney recommendation appears on the cover page alongside the disclaimer
- In-app confirmation step before PDF generates -- user must acknowledge "This is not legal advice" (like terms acceptance)
- WillCraft SA branded disclaimer -- "WillCraft SA is not a law firm..." -- professional, builds brand

### Claude's Discretion
- Clause assembly logic: how JSONB sections map to clause selection, ordering, handling of missing/incomplete data
- Exact CSS typography (font family, sizes, line heights) within the "traditional legal" style
- Watermark opacity, positioning, and styling
- Witness instruction sheet content and layout
- Cover page exact layout and decorative elements
- How to handle placeholder clause text (render as-is for now, flag as known limitation)

### Deferred Ideas (OUT OF SCOPE)
- Payment gating, download delivery, and email are Phase 7
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WeasyPrint | >=68.0 | HTML+CSS to PDF conversion | Only serious Python HTML-to-PDF engine with full CSS Paged Media support; already a locked decision |
| Jinja2 | >=3.1.0 | HTML template rendering | Already in requirements.txt and used for clause rendering; FileSystemLoader for template files |
| FastAPI | existing | API endpoints for generate/preview | Already the backend framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| asyncio (run_in_executor) | stdlib | Offload CPU-bound PDF generation | Always -- WeasyPrint is synchronous/CPU-bound, must not block event loop |

### Already Available (no new install)
| Library | Purpose | Status |
|---------|---------|--------|
| Jinja2 | Template rendering | In requirements.txt (>=3.1.0) |
| sse-starlette | SSE streaming if needed | In requirements.txt |
| Pango/HarfBuzz | WeasyPrint system deps | Already installed on system (verified: libpango-1.0-0, libpangoft2-1.0-0, libharfbuzz0b) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WeasyPrint | ReportLab | Lower-level, no HTML/CSS, manual layout -- far more code |
| WeasyPrint | wkhtmltopdf | External binary, Chromium-based, heavier -- less Pythonic |
| WeasyPrint | Playwright/Puppeteer | Full browser engine, overkill, heavy dependency |

**Installation:**
```bash
pip install weasyprint>=68.0
# System deps already installed (libpango, libharfbuzz)
# May need: apt install libharfbuzz-subset0 (for newer WeasyPrint)
```

**Note:** `libharfbuzz-subset0` is NOT currently installed. WeasyPrint 68.x lists it as a dependency on Debian/Ubuntu. This may need to be installed: `sudo apt install libharfbuzz-subset0`. If the package is not available on Ubuntu 22.04 (Jammy), WeasyPrint may still work without it -- test during implementation.

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── services/
│   └── document_service.py       # DocumentGenerationService (orchestrator)
├── templates/
│   └── will/
│       ├── base.html             # Base HTML template with CSS
│       ├── cover_page.html       # Cover page partial
│       ├── will_body.html        # Main will body with clause blocks
│       ├── signature_page.html   # Signature/witness page partial
│       └── instruction_sheet.html # Separate witness instructions
├── api/
│   └── document.py               # API endpoints (generate, preview)
└── schemas/
    └── document.py               # Request/response schemas
```

### Pattern 1: Clause Assembly Pipeline
**What:** Transform JSONB section data into ordered, rendered clause text via the existing ClauseLibraryService.
**When to use:** Every document generation request.

```python
# Clause assembly maps sections -> clause codes -> rendered text
SECTION_TO_CLAUSES = {
    # Always included (required clauses)
    "revocation": ["REVOC-01"],          # Always first
    "executor": ["EXEC-01", "EXEC-02"],  # EXEC-02 only if backup exists
    "beneficiaries": ["BENEF-01"],       # One per bequest
    "residue": ["BENEF-02"],             # Always required
    "guardians": ["GUARD-01"],           # Only if guardians exist
    # Complex scenario clauses (conditional)
    "trust_provisions": ["TRUST-01"],    # Only if trust scenario
    "usufruct": ["USUF-01"],            # Only if usufruct scenario
    "business_assets": ["BUS-01", "BUS-02"],  # Per business type
    "joint_will": ["JOINT-01"],          # Only if joint will
    # Always last
    "witness": ["WIT-01"],              # Always last clause
}

async def assemble_clauses(will: Will, clause_svc: ClauseLibraryService) -> list[dict]:
    """Assemble ordered clause list from will data.

    Returns list of {code, name, rendered_text, category, display_order}
    """
    assembled = []
    will_type = WillType(will.will_type)

    # 1. Required clauses (revocation, executor, residue, witness)
    required = await clause_svc.get_required_clauses(will_type)

    # 2. Conditional clauses based on section data
    # 3. Extract variables from JSONB, render each clause
    # 4. Sort by display_order

    return assembled
```

### Pattern 2: Variable Extraction from JSONB
**What:** Extract Jinja2 template variables from will JSONB columns to feed into clause rendering.
**When to use:** During clause assembly.

```python
def extract_clause_variables(will: Will, clause_code: str) -> dict:
    """Map will JSONB data to clause template variables."""
    extractors = {
        "REVOC-01": lambda w: {
            "testator_full_name": f"{w.testator.get('first_name', '')} {w.testator.get('last_name', '')}",
            "testator_id_number": w.testator.get("id_number", ""),
        },
        "EXEC-01": lambda w: {
            "executor_name": w.executor.get("name", ""),
            "executor_id_number": "",  # Not in current schema -- placeholder
            "executor_address": "",    # Not in current schema -- placeholder
        },
        # ... one extractor per clause code
    }
    extractor = extractors.get(clause_code)
    if extractor is None:
        return {}
    return extractor(will)
```

### Pattern 3: WeasyPrint in Thread Executor
**What:** Run CPU-bound WeasyPrint PDF generation off the async event loop.
**When to use:** Every PDF generation call.

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor
from weasyprint import HTML, CSS

_pdf_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf")

def _generate_pdf_sync(html_string: str, css_string: str, is_preview: bool) -> bytes:
    """Synchronous PDF generation (runs in thread pool)."""
    stylesheets = [CSS(string=css_string)]
    if is_preview:
        stylesheets.append(CSS(string=WATERMARK_CSS))
    return HTML(string=html_string, base_url=".").write_pdf(stylesheets=stylesheets)

async def generate_pdf(html_string: str, css_string: str, is_preview: bool = True) -> bytes:
    """Async wrapper for PDF generation."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _pdf_executor,
        _generate_pdf_sync,
        html_string, css_string, is_preview,
    )
```

### Pattern 4: Watermark via CSS (Preview vs Final)
**What:** Toggle watermark on/off via CSS class, not separate templates.
**When to use:** Preview PDFs get watermark; final (paid) PDFs do not.

```css
/* Watermark -- applied only for preview */
.watermark-overlay {
    position: fixed;
    top: 35%;
    left: 10%;
    width: 80%;
    text-align: center;
    font-size: 72pt;
    color: rgba(200, 0, 0, 0.12);
    transform: rotate(-35deg);
    z-index: 1000;
    pointer-events: none;
    font-weight: bold;
    letter-spacing: 8px;
}
```

```html
<!-- In base template, conditionally included -->
{% if is_preview %}
<div class="watermark-overlay">PREVIEW -- NOT VALID</div>
{% endif %}
```

### Pattern 5: CSS Paged Media for Legal Document
**What:** Use CSS @page rules for A4, margins, headers, footers, page numbers, initials lines.
**When to use:** The will document CSS.

```css
@page {
    size: A4;
    margin: 25mm 25mm 30mm 25mm;  /* top right bottom left */

    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        font-family: "Times New Roman", serif;
    }

    @bottom-right {
        content: "Initials: ________ / ________ / ________";
        font-size: 8pt;
        font-family: "Times New Roman", serif;
    }
}

@page :first {
    /* Cover page -- no page number, no initials */
    @bottom-center { content: none; }
    @bottom-right { content: none; }
}
```

### Pattern 6: Streaming PDF to Browser
**What:** Return PDF bytes as StreamingResponse with `Content-Disposition: inline` for browser preview, or `attachment` for download.
**When to use:** Preview endpoint opens in new tab; download endpoint triggers save dialog.

```python
from fastapi.responses import Response

@router.post("/api/wills/{will_id}/preview")
async def preview_will(will_id: uuid.UUID, ...):
    pdf_bytes = await doc_service.generate_preview(will_id, user_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=will-preview.pdf",
            "Cache-Control": "no-store",  # Prevent caching of preview
        },
    )
```

### Anti-Patterns to Avoid
- **Generating HTML in Python strings:** Use Jinja2 FileSystemLoader and template files, not f-strings or string concatenation for HTML.
- **Blocking the event loop with WeasyPrint:** Always use `run_in_executor`. WeasyPrint renders fonts and layouts synchronously; blocking the event loop will freeze all other requests.
- **Separate templates for preview vs final:** Use a single template with a conditional watermark block. DRY -- avoids divergence.
- **Storing PDFs on disk permanently:** Return bytes directly. Phase 7 may add storage, but Phase 6 generates on-demand.
- **Embedding fonts as base64 in CSS:** Use `@font-face` with file paths relative to `base_url`. WeasyPrint resolves them automatically.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML-to-PDF conversion | Custom renderer | WeasyPrint `HTML(string=...).write_pdf()` | Full CSS Paged Media spec, page breaks, counters, margin boxes |
| Page numbering | Manual counter logic | CSS `counter(page)` / `counter(pages)` in `@page` margin boxes | WeasyPrint handles this natively via CSS Paged Media |
| Clause template rendering | String formatting | Existing `ClauseLibraryService.render_clause()` with Jinja2 StrictUndefined | Already built, tested, handles errors properly |
| PDF watermarks | Image overlay library | CSS `position: fixed` + `transform: rotate()` + low `opacity` | Pure CSS, no extra dependency, toggleable via template flag |
| Document reference numbers | Complex UUID scheme | `WC-{will_id_short}-{timestamp}` format | Simple, human-readable, unique enough for document reference |

**Key insight:** WeasyPrint's CSS Paged Media support eliminates the need for manual page layout code. Headers, footers, page numbers, page breaks, and margin content are all pure CSS. The complexity is in clause assembly and variable extraction, not in PDF rendering.

## Common Pitfalls

### Pitfall 1: WeasyPrint Blocking the Event Loop
**What goes wrong:** PDF generation takes 1-5 seconds (CPU-bound). If called directly in an async endpoint, all other requests are blocked.
**Why it happens:** WeasyPrint is synchronous. FastAPI's async endpoints share a single event loop thread.
**How to avoid:** Always use `asyncio.get_event_loop().run_in_executor(executor, fn)` with a `ThreadPoolExecutor`.
**Warning signs:** Other API requests timing out during PDF generation.

### Pitfall 2: Missing Template Variables (StrictUndefined)
**What goes wrong:** Jinja2 with StrictUndefined raises `UndefinedError` when a clause template references a variable not provided in the context.
**Why it happens:** JSONB columns may have incomplete data (user didn't fill everything). Clause templates expect specific variables.
**How to avoid:** Build variable extractors that provide sensible defaults or empty strings. Validate completeness BEFORE attempting generation. The verification step (Phase 5) should have caught missing data, but add a pre-generation check.
**Warning signs:** 500 errors during PDF generation with "UndefinedError" in logs.

### Pitfall 3: Executor/Guardian/Beneficiary Data Gaps
**What goes wrong:** Clause templates need fields that aren't in the current JSONB schemas (e.g., EXEC-01 needs `executor_id_number` and `executor_address`, but ExecutorSchema only has `name`, `relationship`, `is_professional`).
**Why it happens:** Schemas were designed for AI conversation data collection, not for clause template rendering. Some fields were collected conversationally but not stored in structured schema fields.
**How to avoid:** Either (a) add missing fields to the extraction prompts/schemas, or (b) make clause templates tolerant of missing fields with Jinja2 `{% if var %}` conditionals, or (c) use placeholder text like "[ID Number]" for missing fields. Recommendation: option (c) for now since all clauses are PLACEHOLDER anyway; proper field mapping when real clauses are drafted.
**Warning signs:** Variables_schema in clause seeds listing fields not present in will schemas.

### Pitfall 4: Watermark Not Appearing on All Pages
**What goes wrong:** CSS `position: fixed` watermark only shows on first page.
**Why it happens:** In WeasyPrint, `position: fixed` elements repeat on every page (unlike browser rendering where fixed = viewport-fixed). However, if the element is inside a specific page context or has `page-break` issues, it may not render consistently.
**How to avoid:** Place the watermark `<div>` at the top level of `<body>`, outside any section containers. Test with multi-page documents. WeasyPrint's `position: fixed` behaves as "repeated on every page" which is exactly what we want.
**Warning signs:** Watermark visible on page 1 only in preview PDF.

### Pitfall 5: System Dependencies Missing
**What goes wrong:** WeasyPrint import fails with cryptic errors about missing shared libraries.
**Why it happens:** WeasyPrint 68.x requires `libharfbuzz-subset0` which is not installed. Pango and base HarfBuzz are present but the subset library may be needed.
**How to avoid:** Test `import weasyprint` after installation. If it fails, install: `sudo apt install libharfbuzz-subset0`. On older Ubuntu (22.04/Jammy), this package may not exist -- check `apt-cache search harfbuzz`.
**Warning signs:** ImportError or OSError on `import weasyprint`.

### Pitfall 6: Font Rendering Differences
**What goes wrong:** PDF looks different from HTML preview in browser. Font substitution makes the document look unprofessional.
**Why it happens:** WeasyPrint uses system fonts via fontconfig. If "Times New Roman" is not installed, it falls back to a different serif font.
**How to avoid:** Either (a) install `ttf-mscorefonts-installer` for Microsoft fonts, or (b) use a freely available serif font like "Liberation Serif" (metrically compatible with Times New Roman) which is commonly available on Linux, or (c) bundle a font file and use `@font-face` in CSS. Recommendation: use "Liberation Serif" as primary with "Times New Roman" as fallback.
**Warning signs:** Font names in CSS don't match installed system fonts.

## Code Examples

### Complete Document Generation Service Skeleton
```python
# Source: Pattern assembled from WeasyPrint docs + existing codebase patterns
import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import Depends
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML, CSS
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_session
from app.models.will import Will
from app.services.clause_library import ClauseLibraryService
from app.services.will_service import WillService

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "will"
_pdf_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf-gen")

# Jinja2 environment for HTML document templates (separate from clause rendering)
_doc_jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_DIR)),
    autoescape=True,
)


class DocumentGenerationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._clause_svc = ClauseLibraryService(session=session)
        self._will_svc = WillService(session=session)

    async def generate_preview(self, will_id: uuid.UUID, user_id: uuid.UUID) -> bytes:
        """Generate a watermarked preview PDF."""
        will = await self._will_svc.get_will(will_id, user_id)
        return await self._generate(will, is_preview=True)

    async def _generate(self, will: Will, is_preview: bool) -> bytes:
        # 1. Assemble clauses
        clauses = await self._assemble_clauses(will)

        # 2. Render HTML from Jinja2 template
        template = _doc_jinja_env.get_template("base.html")
        html_string = template.render(
            will=will,
            clauses=clauses,
            is_preview=is_preview,
            testator_name=f"{will.testator.get('first_name', '')} {will.testator.get('last_name', '')}",
            # ... more context variables
        )

        # 3. Generate PDF in thread pool
        loop = asyncio.get_event_loop()
        pdf_bytes = await loop.run_in_executor(
            _pdf_executor,
            self._render_pdf_sync,
            html_string,
        )
        return pdf_bytes

    @staticmethod
    def _render_pdf_sync(html_string: str) -> bytes:
        """Synchronous PDF rendering (called in thread pool)."""
        return HTML(
            string=html_string,
            base_url=str(TEMPLATE_DIR),
        ).write_pdf()
```

### CSS Paged Media for SA Will Document
```css
/* Source: WeasyPrint CSS Paged Media docs + SA will formatting conventions */
@page {
    size: A4;
    margin: 25mm;

    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-family: "Liberation Serif", "Times New Roman", serif;
        font-size: 9pt;
        color: #666;
    }

    @bottom-right {
        content: "Initials: ______ / ______ / ______";
        font-family: "Liberation Serif", "Times New Roman", serif;
        font-size: 8pt;
        color: #999;
    }
}

/* Cover page: no page number or initials */
@page :first {
    @bottom-center { content: none; }
    @bottom-right { content: none; }
}

body {
    font-family: "Liberation Serif", "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
}

/* Hierarchical clause numbering */
.clause { margin-bottom: 12pt; }
.clause-number { font-weight: bold; }
.sub-clause { margin-left: 20pt; }
.sub-sub-clause { margin-left: 40pt; }

/* Signature page */
.signature-page { page-break-before: always; }
.signature-line {
    border-bottom: 1px solid #000;
    width: 60%;
    margin: 30pt 0 5pt 0;
}

/* Keep signature blocks together */
.witness-block { page-break-inside: avoid; }
```

### API Endpoint with Disclaimer Acknowledgment
```python
# Source: Pattern from existing verification endpoint + CONTEXT.md requirements
from pydantic import BaseModel

class GeneratePreviewRequest(BaseModel):
    disclaimer_acknowledged: bool  # User must check "not legal advice" box

@router.post("/api/wills/{will_id}/preview")
async def preview_will(
    will_id: uuid.UUID,
    body: GeneratePreviewRequest,
    request: Request,
    service: DocumentGenerationService = Depends(get_document_service),
):
    if not body.disclaimer_acknowledged:
        raise HTTPException(
            status_code=422,
            detail="You must acknowledge the legal disclaimer before generating a preview.",
        )
    user_id = _extract_user_id(request)
    pdf_bytes = await service.generate_preview(will_id, user_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=will-preview.pdf",
            "Cache-Control": "no-store",
        },
    )
```

### Frontend: Open PDF Preview in New Tab
```typescript
// Source: Standard browser PDF viewer pattern
async function openPreview(willId: string): Promise<void> {
    const response = await fetch(`/api/wills/${willId}/preview`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclaimer_acknowledged: true }),
    })
    if (!response.ok) throw new Error('Preview generation failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Cleanup after a delay (browser needs time to load)
    setTimeout(() => URL.revokeObjectURL(url), 60000)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| wkhtmltopdf (Chromium-based) | WeasyPrint (pure Python) | WeasyPrint 53+ (2021) | No external binary, better CSS support, lighter |
| Manual page layout (ReportLab) | CSS Paged Media (@page rules) | CSS Paged Media spec maturity | Declarative page layout in CSS, not imperative Python |
| position:absolute for watermarks | position:fixed (repeats per page) | WeasyPrint CSS2/3 support | Fixed elements repeat on every page in print context |
| counter-increment hacks | counter(page)/counter(pages) | CSS Paged Media Level 3 | Native "Page X of Y" support |

**Deprecated/outdated:**
- WeasyPrint <52: Older API, different dependency chain (cairo-based)
- wkhtmltopdf: Abandoned upstream, security issues, requires headless Chromium

## Discretionary Recommendations

### Clause Assembly Logic
**Recommendation:** Ordered pipeline with conditional inclusion.

1. **Always first:** REVOC-01 (revocation of previous wills) -- legally required opening
2. **Executor block:** EXEC-01 (always), EXEC-02 (only if `executor.backup_name` exists)
3. **Beneficiary block:** BENEF-01 rendered once per item in `bequests[]` list
4. **Guardian block:** GUARD-01 (only if `guardians[]` is non-empty)
5. **Complex blocks (conditional on `scenarios[]`):**
   - TRUST-01 (if `testamentary_trust` in scenarios)
   - USUF-01 (if `usufruct` in scenarios)
   - BUS-01/BUS-02 (if `business_assets` in scenarios, matched by `business_type`)
   - JOINT-01 (if `joint_will` data present)
6. **Residue:** BENEF-02 (always required -- residual estate)
7. **Always last:** WIT-01 (signing/witness clause) -- legally required closing

**Missing data handling:** If a required variable is missing, render the clause with `[MISSING: field_name]` placeholder text rather than failing. Log a warning. The verification step (Phase 5) should have caught this, but defense in depth.

### CSS Typography
**Recommendation:** Traditional legal serif with clear hierarchy.

```
Body: Liberation Serif, 12pt, 1.5 line-height
Headings (clause numbers): 12pt bold
Sub-clauses: 12pt normal, 20pt left indent
Cover title: 18pt bold, centered, uppercase
Page numbers: 9pt, centered footer
Initials line: 8pt, right footer
```

### Watermark Styling
**Recommendation:** Diagonal red text, low opacity, centered.

- Text: "PREVIEW -- NOT VALID"
- Font size: 72pt bold
- Color: `rgba(200, 0, 0, 0.12)` (red at 12% opacity -- visible but readable)
- Rotation: -35 degrees
- Position: fixed, centered vertically and horizontally
- Repeats on every page via WeasyPrint's fixed positioning

### Witness Instruction Sheet
**Recommendation:** Separate HTML page rendered as part of the same PDF (after the will) with a forced page break. Content covers:

1. **Who can witness:** Any person 14+ years old, competent to give evidence, not a beneficiary or spouse of beneficiary
2. **How to sign:** Testator signs first in presence of both witnesses, then witnesses sign in presence of testator and each other
3. **Every page:** Testator and both witnesses must initial every page
4. **Same time:** All three (testator + 2 witnesses) must be present simultaneously
5. **Wet ink only:** Electronic signatures are NOT valid for SA wills (ECTA exclusion)
6. **Do NOT:** Don't use correcting fluid, don't cross out text, don't sign in advance

### Cover Page Layout
**Recommendation:** Centered formal layout.

```
[WillCraft SA logo/brand mark -- optional, small]

LAST WILL AND TESTAMENT
OF
[TESTATOR FULL NAME (uppercase)]

Date of Execution: _______________
Document Reference: WC-XXXXXX

---

DISCLAIMER
WillCraft SA is not a law firm and does not provide legal advice.
This document was generated using WillCraft SA's guided will
creation service. We strongly recommend that you have this will
reviewed by a qualified South African attorney before signing.
This document does not constitute legal advice.

---
```

### Placeholder Clause Handling
**Recommendation:** Render placeholder clauses as-is. All 12 seed clauses are marked "PLACEHOLDER - Pending Attorney Review" but have reasonable template text. Render them normally for now. Add a note in the cover page disclaimer: "This document uses template legal language pending attorney review." This is a known limitation documented in MEMORY.md.

## Open Questions

1. **Executor ID number and address gaps**
   - What we know: EXEC-01 clause needs `executor_id_number` and `executor_address` but the ExecutorSchema only has `name`, `relationship`, `is_professional`
   - What's unclear: Whether these fields are collected during AI conversation but not stored in structured schema, or truly missing
   - Recommendation: Use placeholder text `[To be completed]` for missing fields for now. Phase 8 (updates) or a future schema migration can add these fields

2. **Font availability on production**
   - What we know: "Liberation Serif" is commonly available on Linux, "Times New Roman" requires Microsoft font packages
   - What's unclear: What fonts are available on the eventual production server
   - Recommendation: Use Liberation Serif as primary (free, metrically compatible with Times New Roman). Include a font availability check in the service startup

3. **libharfbuzz-subset0 requirement**
   - What we know: WeasyPrint 68.x lists it as a dependency. It's NOT currently installed on this system. Base libharfbuzz0b IS installed
   - What's unclear: Whether WeasyPrint will work without it or fail on import
   - Recommendation: Try installing WeasyPrint first; if import fails, install `libharfbuzz-subset0` or pin WeasyPrint to a version that doesn't require it

4. **Will status transition**
   - What we know: Current statuses are `draft | review | verified | generated`. Phase 5 transitions to `verified` after successful verification
   - What's unclear: Should PDF generation require `verified` status, or should `generated` be a new status set after first successful generation?
   - Recommendation: Require `verified` status (or `generated` for re-generation). Set status to `generated` after first successful PDF creation. This gates document generation behind verification completion

## Sources

### Primary (HIGH confidence)
- `/websites/doc_courtbouillon_weasyprint_stable` (Context7) -- WeasyPrint API, CSS @page rules, page counters, break properties, font configuration, HTML class API
- `/websites/jinja_palletsprojects_en_stable` (Context7) -- Template inheritance, FileSystemLoader, blocks, macros
- Existing codebase: `backend/app/services/clause_library.py`, `backend/scripts/seed_clauses.py`, `backend/app/models/will.py`, `backend/app/models/clause.py`

### Secondary (MEDIUM confidence)
- [WeasyPrint PyPI](https://pypi.org/project/weasyprint/) -- Version 68.1, latest release 2026-02-06
- [WeasyPrint first_steps docs](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html) -- Installation, system dependencies
- [WeasyPrint Tips & Tricks](https://www.naveenmk.me/blog/weasyprint/) -- Headers/footers, page breaks, watermark approaches
- [SA Will Requirements - LexisNexis](https://www.lexisnexis.co.za/blogs-data/categories/rule-of-law/requirements-for-a-valid-will) -- Witness signing, initials requirements
- [Legal Aid SA Will Template](https://legal-aid.co.za/wp-content/uploads/2018/09/Example-of-a-Single-Individual-Last-will-and-Testament.pdf) -- SA will format reference
- [SA Wills Act requirements - GoLegal](https://www.golegal.co.za/requirements-valid-will-south-africa/) -- Signing formalities

### Tertiary (LOW confidence)
- WebSearch: WeasyPrint + FastAPI async patterns -- confirmed with official FastAPI concurrency docs
- WebSearch: CSS watermark diagonal text approach -- confirmed with WeasyPrint CSS support docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WeasyPrint and Jinja2 are locked decisions, verified via Context7 and PyPI
- Architecture: HIGH - Patterns derived from existing codebase conventions (service layer, DI, async) and verified WeasyPrint API
- Clause assembly: MEDIUM - Logic is sound but depends on JSONB data completeness and variable mapping that hasn't been tested end-to-end
- Pitfalls: HIGH - Verified via official docs (event loop blocking, StrictUndefined, system deps)
- CSS Paged Media: HIGH - Verified via Context7 WeasyPrint docs (page counters, @page rules, break properties)
- Font rendering: MEDIUM - Liberation Serif recommendation based on Linux ecosystem knowledge, not verified on this specific system

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable domain, 30-day validity)
