# Roadmap: WillCraft SA

## Overview

WillCraft SA delivers an AI-powered will generation platform for South Africa. The roadmap progresses from legal/compliance foundation through conversational data collection, complex estate handling, dual-LLM verification, document generation, payment integration, and finally post-purchase features. Each phase delivers coherent, verifiable capabilities while maintaining strict boundaries against unauthorized practice of law.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Compliance** - Database, POPIA infrastructure, UPL prevention architecture, clause library
- [ ] **Phase 2: Authentication** - User registration, email verification, login, password reset via Clerk
- [ ] **Phase 3: Core Will Conversation** - Basic will questionnaire with AI guidance, data collection, real-time explanations
- [ ] **Phase 4: Complex Estate Scenarios** - Blended families, trusts, usufruct, business assets, joint wills
- [ ] **Phase 5: AI Verification** - Dual-LLM verification layer (Gemini checks OpenAI), estate logic validation
- [ ] **Phase 6: Document Generation** - PDF generation with WeasyPrint, witness instructions, preview, disclaimers
- [ ] **Phase 7: Payment & Download** - PayFast integration, payment gate, download links, email backup
- [ ] **Phase 8: Post-Purchase Features** - Save/resume functionality, unlimited will updates
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
- [ ] 01-01-PLAN.md — PostgreSQL schema and migrations (consent, clauses, audit)
- [ ] 01-02-PLAN.md — FastAPI with POPIA consent middleware and endpoints
- [ ] 01-03-PLAN.md — React app with blocking consent modal
- [ ] 01-04-PLAN.md — Clause library service with version control
- [ ] 01-05-PLAN.md — UPL filter for AI output compliance

### Phase 2: Authentication
**Goal**: Users can securely create accounts and access the platform
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can register with email and password
  2. User receives verification email after registration
  3. User can log in and stay logged in across browser sessions
  4. User can reset forgotten password via email link
**Plans**: TBD

Plans:
- [ ] 02-01: Clerk integration (React frontend)
- [ ] 02-02: Clerk middleware (FastAPI backend)
- [ ] 02-03: User session and state management

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
**Plans**: TBD

Plans:
- [ ] 03-01: OpenAI service with SA will-drafting prompts
- [ ] 03-02: Conversation API endpoints
- [ ] 03-03: React conversation/wizard UI
- [ ] 03-04: Will data model and JSONB storage
- [ ] 03-05: Input validation and error handling
- [ ] 03-06: Mobile-responsive design

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
**Plans**: TBD

Plans:
- [ ] 04-01: Complex scenario detection and flow routing
- [ ] 04-02: Testamentary trust clause logic
- [ ] 04-03: Usufruct provision handling
- [ ] 04-04: Business asset questionnaire and clauses
- [ ] 04-05: Joint/mirror will workflow

### Phase 5: AI Verification
**Goal**: Dual-LLM system verifies document completeness and legal compliance before generation
**Depends on**: Phase 4
**Requirements**: AI-05
**Success Criteria** (what must be TRUE):
  1. Secondary LLM (Gemini) independently verifies document completeness
  2. System catches inconsistencies between collected data and generated clauses
  3. User sees clear verification status before proceeding to generation
  4. Complex estates trigger appropriate warnings or attorney referrals
**Plans**: TBD

Plans:
- [ ] 05-01: Gemini service integration
- [ ] 05-02: Estate logic validator with SA Wills Act rules
- [ ] 05-03: Verification API and UI
- [ ] 05-04: Attorney handoff triggers

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
**Plans**: TBD

Plans:
- [ ] 06-01: Jinja2 will templates (basic, trust, usufruct variants)
- [ ] 06-02: WeasyPrint PDF generation service
- [ ] 06-03: Document preview UI
- [ ] 06-04: Witness instruction generator
- [ ] 06-05: Disclaimer integration and attorney recommendation logic

### Phase 7: Payment & Download
**Goal**: Users can pay and download their completed will document
**Depends on**: Phase 6
**Requirements**: DOC-04, DOC-05, DOC-06
**Success Criteria** (what must be TRUE):
  1. User must complete PayFast payment before downloading PDF
  2. User receives download link immediately after successful payment
  3. User receives email with download link as backup
  4. Download links are secure and time-limited
**Plans**: TBD

Plans:
- [ ] 07-01: PayFast service integration
- [ ] 07-02: Payment flow UI (redirect to PayFast, return handling)
- [ ] 07-03: Webhook handlers for payment confirmation
- [ ] 07-04: Download endpoint with secure tokens
- [ ] 07-05: Post-payment email with download link

### Phase 8: Post-Purchase Features
**Goal**: Users can save progress, resume later, and update their will after purchase
**Depends on**: Phase 7
**Requirements**: AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. User can save progress at any point during will creation
  2. User can resume will creation from where they left off
  3. User can update their will unlimited times after initial purchase
  4. Updates generate new PDF versions without additional payment
**Plans**: TBD

Plans:
- [ ] 08-01: Auto-save and session persistence
- [ ] 08-02: Resume flow UI
- [ ] 08-03: Will versioning and update workflow
- [ ] 08-04: Re-generation without payment (for purchased wills)

### Phase 9: Additional Documents
**Goal**: Users can create supplementary estate planning documents
**Depends on**: Phase 6
**Requirements**: ADOC-01, ADOC-02
**Success Criteria** (what must be TRUE):
  1. User can create living will (advance healthcare directive)
  2. User can create funeral wishes document
  3. Additional documents follow same professional formatting as main will
**Plans**: TBD

Plans:
- [ ] 09-01: Living will questionnaire and clauses
- [ ] 09-02: Funeral wishes questionnaire and clauses
- [ ] 09-03: Additional document templates and PDF generation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phase 9 depends only on Phase 6, can potentially run in parallel with Phases 7-8.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Compliance | 0/5 | Planned | - |
| 2. Authentication | 0/3 | Not started | - |
| 3. Core Will Conversation | 0/6 | Not started | - |
| 4. Complex Estate Scenarios | 0/5 | Not started | - |
| 5. AI Verification | 0/4 | Not started | - |
| 6. Document Generation | 0/5 | Not started | - |
| 7. Payment & Download | 0/5 | Not started | - |
| 8. Post-Purchase Features | 0/4 | Not started | - |
| 9. Additional Documents | 0/3 | Not started | - |

---
*Roadmap created: 2026-02-05*
*Depth: Comprehensive (9 phases, 40 plans)*
*Requirements coverage: 35/35 (100%)*
