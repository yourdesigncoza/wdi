# Phase 6: Document Generation - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate professionally formatted PDF will documents from collected JSONB section data, using WeasyPrint and Jinja2 HTML templates. Includes cover page, numbered clauses, witness signing page, separate instruction sheet, preview with watermark, and disclaimers. Payment gating, download delivery, and email are Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Document formatting
- Traditional legal style: formal serif font, numbered clauses, dense paragraphs — looks like a lawyer drafted it
- Hierarchical clause numbering (1, 1.1, 1.1.1) — main clauses, sub-clauses, sub-sub-clauses
- Full dedicated signature page: testator signature line, 2 witness blocks (name, ID number, address, signature line), date fields
- Formal cover page with "LAST WILL AND TESTAMENT OF [NAME]", date, and document reference number
- Separate witness instruction sheet (not part of the legal document itself) — explains SA signing requirements, do's and don'ts
- A4 page size with standard ~25mm margins
- Page numbers in "Page X of Y" format
- Testator and witness initials line on every page (standard SA practice to prevent tampering)

### Preview experience
- Full PDF with "PREVIEW — NOT VALID" watermark stamped across each page
- Preview opens in a new browser tab using native browser PDF viewer
- Users can regenerate preview anytime — go back, edit data, regenerate as many times as needed
- No download until paid — preview is view-only in browser, prevents users from using watermarked version

### Disclaimer placement
- "Not legal advice" disclaimer on cover page only — keeps the document clean, no per-page footer
- Attorney review always recommended for every will (not just complex scenarios) — CYA approach
- Attorney recommendation appears on the cover page alongside the disclaimer
- In-app confirmation step before PDF generates — user must acknowledge "This is not legal advice" (like terms acceptance)
- WillCraft SA branded disclaimer — "WillCraft SA is not a law firm..." — professional, builds brand

### Claude's Discretion
- Clause assembly logic: how JSONB sections map to clause selection, ordering, handling of missing/incomplete data
- Exact CSS typography (font family, sizes, line heights) within the "traditional legal" style
- Watermark opacity, positioning, and styling
- Witness instruction sheet content and layout
- Cover page exact layout and decorative elements
- How to handle placeholder clause text (render as-is for now, flag as known limitation)

</decisions>

<specifics>
## Specific Ideas

- Every page must have initials lines — this is standard SA practice for will execution
- The witness instruction sheet is a separate document/page, NOT embedded in the will itself — it's a companion guide
- The preview watermark must be prominent enough to prevent misuse but not obscure readability
- Confirmation step in the app before generating: user explicitly acknowledges the legal disclaimer before seeing the PDF

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-document-generation*
*Context gathered: 2026-02-07*
