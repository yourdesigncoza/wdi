# Roadmap: WillCraft SA

## Overview

WillCraft SA delivers an AI-powered will generation platform for South Africa. The roadmap progresses from legal/compliance foundation through conversational data collection, complex estate handling, dual-LLM verification, document generation, payment integration, and finally post-purchase features. Each phase delivers coherent, verifiable capabilities while maintaining strict boundaries against unauthorized practice of law.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Compliance** - Database, POPIA infrastructure, UPL prevention architecture, clause library
- [x] **Phase 2: Authentication** - User registration, email verification, login, password reset via Clerk, Bearer token injection (completed 2026-02-08)
- [x] **Phase 02.1: DaisyUI Integration** - Install DaisyUI v5, configure themes, migrate existing components (INSERTED)
- [x] **Phase 3: Core Will Conversation** - Basic will questionnaire with AI guidance, data collection, real-time explanations
- [x] **Phase 4: Complex Estate Scenarios** - Blended families, trusts, usufruct, business assets, joint wills
- [x] **Phase 5: AI Verification** - Dual-LLM verification layer (Gemini checks OpenAI), estate logic validation
- [x] **Phase 6: Document Generation** - PDF generation with WeasyPrint, witness instructions, preview, disclaimers (completed 2026-02-07)
- [x] **Phase 7: Payment & Download** - PayFast integration, payment gate, download links, email backup (completed 2026-02-07)
- [x] **Phase 8: Post-Purchase Features** - Save/resume functionality, unlimited will updates (completed 2026-02-07)
- [ ] **Phase 9: Additional Documents** - Living will and funeral wishes document generation

## Phase Details

### Phase 1: Foundation & Compliance
**Goal**: Establish secure infrastructure with POPIA compliance, UPL prevention, and attorney-approved clause library as architectural constraints
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. User must accept POPIA consent before any data collection begins
  2. User can view privacy policy explaining data handling practices
  3. User can see Information Officer contact details
  4. User can request data access, correction, or deletion through a clear process
  5. All legal text comes from attorney-approved clause library (no freeform AI generation)
**Plans**: 5 plans in 3 waves

Plans:
- [x] 01-01-PLAN.md — PostgreSQL schema and migrations (consent, clauses, audit)
- [x] 01-02-PLAN.md — FastAPI with POPIA consent middleware and endpoints
- [x] 01-03-PLAN.md — React app with blocking consent modal
- [x] 01-04-PLAN.md — Clause library service with version control
- [x] 01-05-PLAN.md — UPL filter for AI output compliance

### Phase 2: Authentication
**Goal**: Users can securely create accounts and access the platform via Clerk
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can register with email and password
  2. User receives verification email after registration
  3. User can log in and stay logged in across browser sessions
  4. User can reset forgotten password via email link
**Plans**: 3 plans in 1 wave

Plans:
- [x] 02-01-PLAN.md — Clerk React integration (ClerkProvider, auth UI, authenticated API client)
- [x] 02-02-PLAN.md — FastAPI Clerk middleware (JWKS verification, User model, dual-gate enforcement)
- [x] 02-03-PLAN.md — Wire Bearer token injection into all will API calls (gap closure)

### Phase 02.1: DaisyUI Integration (INSERTED)
**Goal**: Install DaisyUI v5 component library and migrate existing frontend components to DaisyUI classes for consistent, themeable UI before building conversation interface
**Depends on**: Phase 2
**Requirements**: UI consistency, theme support, component standardization
**Success Criteria** (what must be TRUE):
  1. DaisyUI v5 installed and configured with Tailwind CSS v4 via @plugin directive
  2. Theme system configured with appropriate light/dark themes
  3. Existing components (ConsentModal, auth UI, layout) migrated to DaisyUI classes
  4. All existing functionality preserved after migration (no regressions)
  5. Design tokens and component patterns documented for Phase 3+ development
**Plans**: 3 plans in 2 waves

Plans:
- [x] 02.1-01-PLAN.md — Install DaisyUI, configure themes, create ThemeToggle, migrate App.tsx
- [x] 02.1-02-PLAN.md — Migrate ConsentModal, PrivacyPolicy, InfoOfficerContact to DaisyUI
- [x] 02.1-03-PLAN.md — Fix theme init on new tabs and back button fallback navigation (gap closure)

### Phase 3: Core Will Conversation
**Goal**: Users can create a basic will through AI-guided conversation
**Depends on**: Phase 2
**Requirements**: WILL-01, WILL-02, WILL-03, WILL-04, WILL-05, WILL-06, WILL-07, WILL-08, AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. User can complete basic will questionnaire through conversational AI interface
  2. User can designate beneficiaries (individuals or charities) with alternate beneficiaries
  3. User can inventory assets (property, vehicles, accounts, investments)
  4. User can nominate guardians for minor children (primary and backup)
  5. User can nominate executor(s) for estate administration
  6. User can specify specific bequests and residual estate distribution
  7. AI explains legal terms and concepts in plain language when asked
  8. AI handles uncertain responses gracefully with follow-up questions
**Plans**: 8 plans in 4 waves

Plans:
- [x] 03-01-PLAN.md — Will data model, Pydantic schemas, Alembic migration 003
- [x] 03-02-PLAN.md — OpenAI service with system prompts and extraction schemas (TDD)
- [x] 03-03-PLAN.md — Frontend foundation: Zustand store, types, Zod schemas, dependencies
- [x] 03-04-PLAN.md — Will CRUD service and API endpoints
- [x] 03-05-PLAN.md — Conversation service with SSE streaming and UPL filtering
- [x] 03-06-PLAN.md — Wizard shell, step indicator, personal/marital forms
- [x] 03-07-PLAN.md — Chat UI with SSE streaming hook and DaisyUI chat bubbles
- [x] 03-08-PLAN.md — Section review, will preview, mobile verification (checkpoint)

### Phase 4: Complex Estate Scenarios
**Goal**: Users can handle advanced estate planning situations
**Depends on**: Phase 3
**Requirements**: CMPLX-01, CMPLX-02, CMPLX-03, CMPLX-04, CMPLX-05
**Success Criteria** (what must be TRUE):
  1. User can create will accounting for blended family (step-children, multiple marriages)
  2. User can create testamentary trust provisions to protect minor children's inheritance
  3. User can add usufruct provisions (spouse keeps home, children inherit remainder)
  4. User can include business assets (CC member interests, company shares)
  5. User can create joint will with spouse (mutual or mirror wills)
**Plans**: 5 plans in 3 waves

Plans:
- [x] 04-01-PLAN.md — Backend foundation: migration 004, Will model, schemas, scenario detector, API
- [x] 04-02-PLAN.md — Frontend foundation: types, Zustand store, Zod schemas, scenario hook
- [x] 04-03-PLAN.md — AI prompts, extraction models, UPL filter patterns, clause seeds
- [x] 04-04-PLAN.md — Complex section UI components (trust, usufruct, business, joint)
- [x] 04-05-PLAN.md — Wizard integration: scenario detector, conditional sections, review updates

### Phase 5: AI Verification
**Goal**: Dual-LLM system verifies document completeness and legal compliance before generation
**Depends on**: Phase 4
**Requirements**: AI-05
**Success Criteria** (what must be TRUE):
  1. Secondary LLM (Gemini) independently verifies document completeness
  2. System catches inconsistencies between collected data and generated clauses
  3. User sees clear verification status before proceeding to generation
  4. Complex estates trigger appropriate warnings or attorney referrals
**Plans**: 4 plans in 3 waves

Plans:
- [x] 05-01-PLAN.md — Gemini SDK setup, config, Will model verification columns, migration 005
- [x] 05-02-PLAN.md — Verification Pydantic schemas and SA Wills Act rules/prompts
- [x] 05-03-PLAN.md — Verification service (Gemini + OpenAI fallback) and API endpoints
- [x] 05-04-PLAN.md — Frontend verification UI, SSE hook, wizard integration (checkpoint)

### Phase 6: Document Generation
**Goal**: Users can generate and preview professionally formatted PDF will documents
**Depends on**: Phase 5
**Requirements**: DOC-01, DOC-02, DOC-03, COMP-05, COMP-06
**Success Criteria** (what must be TRUE):
  1. System generates professionally formatted PDF will document
  2. PDF includes clear witness signing instructions (2 witnesses, wet-ink signature)
  3. User can preview document before payment
  4. Disclaimers clearly state "not legal advice" at document generation touchpoint
  5. System recommends attorney review for complex scenarios
**Plans**: 4 plans in 3 waves

Plans:
- [x] 06-01-PLAN.md — WeasyPrint install + Jinja2 HTML/CSS will templates (cover, body, signature, instructions, watermark)
- [x] 06-02-PLAN.md — DocumentGenerationService (clause assembly, variable extraction, PDF generation)
- [x] 06-03-PLAN.md — Document preview API endpoint with disclaimer and status gating
- [x] 06-04-PLAN.md — Frontend: disclaimer confirmation, preview page, wizard integration (checkpoint)

### Phase 7: Payment & Download
**Goal**: Users can pay and download their completed will document
**Depends on**: Phase 6
**Requirements**: DOC-04, DOC-05, DOC-06
**Success Criteria** (what must be TRUE):
  1. User must complete PayFast payment before downloading PDF
  2. User receives download link immediately after successful payment
  3. User receives email with download link as backup
  4. Download links are secure and time-limited
**Plans**: 4 plans in 4 waves

Plans:
- [x] 07-01-PLAN.md — Payment model, migration 006, config settings, Pydantic schemas
- [x] 07-02-PLAN.md — PayFast service, download token service, email service + template
- [x] 07-03-PLAN.md — Payment API (initiate, ITN webhook, status) + download API endpoint
- [x] 07-04-PLAN.md — Frontend: PaymentPage, return/cancel/download pages, wizard integration (checkpoint)

### Phase 8: Post-Purchase Features
**Goal**: Users can save progress, resume later, and update their will after purchase
**Depends on**: Phase 7
**Requirements**: AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can save progress at any point during will creation
  2. User can resume will creation from where they left off
  3. User can update their will unlimited times after initial purchase
  4. Updates generate new PDF versions without additional payment
**Plans**: 4 plans in 4 waves

Plans:
- [x] 08-01-PLAN.md — Backend foundation: migration 007 (version, current_section), new API endpoints
- [x] 08-02-PLAN.md — Frontend auto-save, Zustand-DB sync, loadFromServer, useAutoSave hook
- [x] 08-03-PLAN.md — WillDashboard component, resume flow, updated App.tsx routing
- [x] 08-04-PLAN.md — Post-purchase update flow: paid will editing, re-generation without payment

### Phase 9: Additional Documents
**Goal**: Users can create supplementary estate planning documents
**Depends on**: Phase 6
**Requirements**: ADOC-01, ADOC-02
**Success Criteria** (what must be TRUE):
  1. User can create living will (advance healthcare directive)
  2. User can create funeral wishes document
  3. Additional documents follow same professional formatting as main will
**Plans**: 3 plans in 3 waves

Plans:
- [ ] 09-01-PLAN.md -- Backend: model, migration, schemas, service, templates, API endpoints
- [ ] 09-02-PLAN.md -- Frontend: API client, types, Zod schemas, Zustand store, form components
- [ ] 09-03-PLAN.md -- Dashboard, preview, routing, WillDashboard integration (checkpoint)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 2.1 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phase 9 depends only on Phase 6, can potentially run in parallel with Phases 7-8.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Compliance | 5/5 | Complete | 2026-02-06 |
| 2. Authentication | 3/3 | Complete | 2026-02-08 |
| 02.1 DaisyUI Integration | 3/3 | Complete | 2026-02-06 |
| 3. Core Will Conversation | 8/8 | Complete | 2026-02-06 |
| 4. Complex Estate Scenarios | 5/5 | Complete | 2026-02-06 |
| 5. AI Verification | 4/4 | Complete | 2026-02-06 |
| 6. Document Generation | 4/4 | Complete | 2026-02-07 |
| 7. Payment & Download | 4/4 | Complete | 2026-02-07 |
| 8. Post-Purchase Features | 4/4 | Complete | 2026-02-07 |
| 9. Additional Documents | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-05*
*Depth: Comprehensive (9 phases, 39 plans)*
*Requirements coverage: 35/35 (100%)*
