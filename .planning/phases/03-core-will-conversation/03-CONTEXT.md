# Phase 3: Core Will Conversation - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Users create a basic will through an AI-guided hybrid interface — structured forms for essential personal details, then conversational AI guidance for beneficiaries, assets, guardians, executor nomination, and estate distribution. Covers data collection, real-time legal explanations, and will data review. Complex estate scenarios (trusts, usufruct, joint wills) are Phase 4. Verification is Phase 5. PDF generation is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Conversation flow (hybrid approach)
- Progressive hybrid: structured form fields first for testator essentials, then AI conversation kicks in once minimum data is captured
- The handoff point from form to AI is at Claude's discretion based on what works best technically
- User can navigate sections in flexible order — not locked into a sequence
- Step indicator always visible showing progress (e.g., Personal > Beneficiaries > Assets > Guardians > Executor > Review)

### AI personality & smart prompting
- Friendly, approachable tone — not legalese, not overly formal
- Smart prompting: AI proactively nudges for legally important items (executor, guardians for minors) but stays quiet on optional ones (specific bequests)
- Plain-language explanations of legal terms when contextually relevant
- Tone handling for sensitive topics at Claude's discretion

### Data entry & editing
- Each section (beneficiaries, assets, guardians, executor) has a dedicated review/edit page accessible from the step indicator or menu
- How the AI captures structured data during conversation (extraction vs mini-forms) at Claude's discretion
- Confirmation patterns (always vs batch) at Claude's discretion

### Progress & completion
- Visible step indicator throughout the process
- Flexible section order — user can jump to any section
- AI-led review at completion: AI walks through a conversational summary of the entire will, asks if anything needs changing
- Plain-language will preview before proceeding to verification — readable summary of what the will actually says, not legal jargon

### Mobile
- Mobile-first design — many SA users access via phone, chat and forms must work great on small screens

### Claude's Discretion
- Form-to-AI handoff point (after which fields the AI takes over)
- Initial form field selection (SA will essentials vs minimal start)
- Data capture pattern during conversation (natural language extraction vs inline mini-forms)
- Confirmation frequency (per-item vs batch)
- Tone calibration for sensitive topics (death, minor children, family conflict)

</decisions>

<specifics>
## Specific Ideas

- "Fixed form fields and as the user progresses past minimum data required (name, surname, etc.) we can start prompting the user" — progressive engagement, not an abrupt switch
- Will preview should be plain language: "Your estate goes 50% to Sarah, 50% to James. If Sarah passes, her share goes to..." — readable, not data tables

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-core-will-conversation*
*Context gathered: 2026-02-06*
