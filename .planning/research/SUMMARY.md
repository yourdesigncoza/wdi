# Project Research Summary

**Project:** WillCraft SA - AI-Powered Will Generation Platform
**Domain:** Legal document generation (online wills, estate planning)
**Market:** South Africa
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

WillCraft SA is an AI-powered conversational platform for generating legally compliant South African wills. Based on comprehensive research, the optimal approach combines a React + Vite frontend with FastAPI backend, dual-LLM strategy (OpenAI for conversation, Gemini for verification), and WeasyPrint for PDF generation. The architecture must enforce critical boundaries: no unauthorized practice of law, no AI hallucinations in legal text, and mandatory wet-ink signature execution.

The recommended approach treats the platform as a "document generation tool" rather than a "legal advice provider" — this distinction is critical for regulatory compliance. A conversational AI interface guides users through data collection, but all legal clauses come from a pre-approved library (never generated freeform). The dual-LLM strategy provides redundancy for legal accuracy while keeping conversation natural and verification rigorous.

Key risks center on regulatory compliance (UPL violations, POPIA data protection), legal document validity (AI hallucinations, execution confusion), and technical complexity (multi-LLM coordination, complex estate handling). These are mitigated through architectural constraints (clause libraries, UPL filters), prominent user education (wet-ink requirements), and clear capability boundaries (referring complex estates to attorneys). The business model gates PDF downloads behind payment but offers unlimited updates — matching competitor expectations while generating revenue.

## Key Findings

### Recommended Stack

The research consistently points toward a modern, async-first stack optimized for AI conversation and PDF generation. React 19 + Vite provides the interactive frontend with new hooks perfect for conversational forms. FastAPI offers async streaming for LLM responses with automatic OpenAPI documentation. PostgreSQL ensures ACID compliance for legal documents while JSONB columns provide flexibility for varied will structures.

**Core technologies:**
- **React 19 + Vite**: Frontend framework — new hooks (useActionState, useOptimistic) ideal for conversational wizards, instant HMR for rapid iteration
- **TypeScript 5.7+**: Type safety — non-negotiable for legal document logic, catches schema mismatches at compile time
- **FastAPI 0.115+**: API backend — async-native for LLM streaming, Pydantic integration for type-safe validation
- **PostgreSQL 16+**: Primary database — ACID compliance critical for legal documents, JSONB for flexible will structures
- **OpenAI SDK (direct)**: Primary LLM — GPT-4o for complex reasoning, direct SDK faster than LangChain for single-purpose apps
- **Gemini 2.0 Flash**: Verification LLM — independent verification, cost-effective secondary opinion, different training catches different errors
- **WeasyPrint + Jinja2**: PDF generation — HTML/CSS templates more maintainable than programmatic drawing (ReportLab), legal formatting requirements demand precise control
- **Clerk**: Authentication — pre-built UI components, handles OAuth + MFA, React and FastAPI SDKs mature

**Critical decisions:**
- **Direct OpenAI SDK over LangChain**: Simpler and faster for single-purpose document generation; LangChain adds unnecessary abstraction
- **Zustand over Redux**: Minimal boilerplate for conversational state management; no Redux ceremony
- **SPA over Next.js**: No SSR/SSG needed for authenticated app; simpler deployment, React + Vite sufficient
- **PostgreSQL over MongoDB**: Legal documents need ACID transactions; JSONB provides flexibility without sacrificing reliability

### Expected Features

Research reveals clear feature tiers: table stakes that users expect from any will platform, differentiators that set WillCraft apart, and anti-features to deliberately avoid.

**Must have (table stakes):**
- **Basic will creation** — questionnaire covering spouse, children, assets, debts; core product purpose
- **PDF generation with signing instructions** — SA Wills Act requires physical wet-ink signatures; printable, professionally formatted document is non-negotiable
- **Witness signing guidance** — 2 witnesses required; step-by-step execution instructions included in download
- **Asset inventory and beneficiary designation** — fundamental will purposes; users need to list what they're bequeathing and to whom
- **Guardian and executor nomination** — standard expectations for users with children; must specify who manages estate
- **Unlimited updates** — life changes, wills must evolve; LegalWills.co.za offers this as standard, competitive necessity
- **POPIA compliance** — legal requirement, ZAR 10M penalty; privacy policy, consent, data handling mandatory
- **Mobile responsive** — 60%+ SA users access via mobile; not just responsive but genuinely usable on small screens

**Should have (competitive differentiators):**
- **Conversational AI guide** — reduces intimidation factor; explains concepts as it goes rather than rigid questionnaire
- **Complex scenario handling** — addresses gaps competitors miss: blended families, multiple marriages, business assets, usufruct rights
- **Real-time explanations** — AI explains each concept in plain language contextually ("What is an executor?" answered when asked)
- **Testamentary trust creation** — protect minor children's inheritance; auto-generates trust provisions within will
- **Usufruct provisions** — common SA need (spouse keeps home, children inherit); proper legal language for Deeds Office registration
- **Progress saving + resume** — complex wills take multiple sessions; auto-save every answer

**Defer (v2+):**
- Living will / advance directive — separate document type, adds complexity
- Document vault — infrastructure complexity, not core to MVP
- Attorney review add-on — requires partner network, LegalWills charges R999 for this
- Estate cost calculator — nice-to-have, not differentiating
- Multi-currency assets — expat complexity, defer until proven demand

**Anti-features (deliberately avoid):**
- **Electronic signatures** — SA Wills Act requires wet-ink; digital signatures invalid, creates false sense of completion
- **Legal advice claims** — platform provides "guidance and document preparation" not legal advice; UPL liability risk
- **"Free" will with forced executor** — banks do this, feels deceptive; transparent pricing, user chooses executor
- **Real-time human chat support** — expensive, 24/7 expectation; AI-first support sufficient
- **Annual subscription model** — feels exploitative for one-time document; one-time fee + optional update periods

### Architecture Approach

The architecture follows a multi-tier pattern with clear separation: conversational UI layer (React), API Gateway (FastAPI), AI Orchestration (dual-model), Document Generation engine, and Data Persistence (PostgreSQL). This separation allows independent scaling and maintains security boundaries between user interaction, business logic, AI processing, and data storage.

**Major components:**

1. **Conversation UI Layer** — React wizard with multi-step form, chat interface, progress tracking; handles user input collection and validation before sending to backend

2. **API Gateway Layer** — FastAPI with Auth Middleware (Clerk JWT validation), Session Management (will state tracking), Will Data API (CRUD operations), Conversation API (routes to AI), Payment Integration (PayFast), Document Generation API (PDF creation)

3. **AI Orchestration Layer** — OpenAI Service (conversation, data extraction), Gemini Service (legal verification, consistency checks), Estate Logic Validator (SA-specific business rules for Wills Act compliance, trusts, usufruct)

4. **Document Generation Layer** — Template Engine (Jinja2 for variable substitution, conditional clauses), PDF Generator (WeasyPrint for HTML-to-PDF conversion), File Storage (PostgreSQL BYTEA or S3-compatible)

5. **Data Persistence Layer** — PostgreSQL with tables for Users, Will Sessions, Will Data (JSONB), Generated PDFs, Audit Logs, Payments

**Key patterns:**
- **Repository Pattern**: Separate database operations from business logic via repository classes
- **Service Layer**: Encapsulate business logic in service classes with dependency injection
- **Event-Driven Audit**: Log all significant actions for POPIA compliance and debugging
- **Clause Library Architecture**: All legal text pre-approved by attorney, stored in database; AI selects/arranges clauses, never generates freeform legal language

**Data flows:**
- **Authentication**: Clerk UI → Clerk API → JWT Token → Backend validates via JWKS → User context injected
- **Conversation**: User input → FastAPI validates session → OpenAI API with SA will prompt → Response parsed → Will session updated → Next question returned
- **Verification**: Complete data → Parallel verification (Gemini legal review + Estate Logic rules) → Issues flagged or ready for generation
- **Generation**: Verified data → Template Engine selects template → Applies formatting → WeasyPrint PDF → Stored → Download link with token
- **Payment**: User clicks complete → Payment intent created → Redirect to PayFast → Webhook verifies payment → Unlock download

### Critical Pitfalls

Research identified multiple regulatory, legal, and technical risks specific to AI-powered legal document generation in South Africa.

1. **Unauthorized Practice of Law (UPL)** — Platform must stay on "document generation tool" side of line, never cross into "legal advice provider." FTC fined DoNotPay $193,000 in 2025 for UPL violations. Prevention: Every AI output passes through UPL filter; hardcode prohibition of advice-giving language; explicit framing "I help you fill out a template, not provide legal advice"; never answer "what should I do?" questions.

2. **AI Hallucinations in Legal Content** — LLMs are "confidently wrong" and will fabricate legal clauses, wrong terminology, or misapplied concepts. Stanford HAI found 1 in 6 legal queries hallucinate. Prevention: RAG architecture mandatory (retrieve from verified clause library, never generate freeform); dual-LLM verification; human-approved clause library with all text pre-approved by SA attorney; constrained generation (AI selects from options).

3. **Electronic Signature Confusion** — Users believe online-completed will is legally valid without wet-ink signatures. SA Wills Act requires physical signing with 2 witnesses. Prevention: Execution flow mandatory (don't call "complete" until confirmed); post-download email sequence guiding printing/signing; execution checklist tracking; clear status labels ("Draft generated" vs "Awaiting execution"); witness finder feature; prominent SA Wills Act explainer.

4. **POPIA Non-Compliance** — Will data is "special personal information" under POPIA (family details, assets, health, relationships). Fines up to R10M, criminal prosecution possible. Prevention: POPIA audit before launch; data minimization; granular informed consent; LLM providers must not train on user data; appoint Information Officer; breach response plan documented; prefer SA-based storage.

5. **Complex Estate Oversimplification** — Platform attempts to handle complex estates (trusts, usufruct, multiple marriages, cross-border) with same simple flow as basic wills, producing incorrect/incomplete documents. Prevention: Complexity scoring early in questionnaire; hard boundaries on what platform cannot handle; attorney handoff for complex cases; progressive disclosure; prominent warnings when situation exceeds capability.

6. **Multi-LLM Coordination Failures** — OpenAI + Gemini coordination creates issues: inconsistent outputs, verification failures, state sync problems. Prevention: Architectural constraints over prompt engineering; verified clause library as single source of truth; deterministic verification via rules where possible; graceful degradation if service fails; comprehensive logging.

7. **Inadequate Disclaimers** — Generic SaaS disclaimers don't address legal document generation context, fail to provide protection under SA consumer law. Prevention: SA attorney drafts Terms; contextual disclaimers at critical moments (before generation, before download); Consumer Protection Act compliance; professional indemnity insurance; technical limits preventing high-stakes use.

8. **Questionnaire Drop-Off** — Users abandon mid-process due to length/complexity, leaving incomplete drafts or causing poor conversion rates. Prevention: Progressive commitment (easy questions first); auto-save everywhere; time estimates; explain why each question matters; allow skip and return; minimal viable will first, then enhance.

## Implications for Roadmap

Based on research dependencies, regulatory requirements, and architectural constraints, I recommend a 6-phase roadmap structured around critical path requirements and risk mitigation.

### Phase 1: Foundation & Compliance
**Rationale:** Cannot proceed without authentication, database, and POPIA compliance infrastructure. UPL prevention and clause library architecture must be foundational — impossible to retrofit later.

**Delivers:**
- PostgreSQL schema with migrations (Users, WillSessions, ClauseLibrary, AuditLog tables)
- FastAPI project structure with Clerk authentication middleware
- React app with Clerk authentication UI
- POPIA compliance infrastructure (consent mechanisms, Information Officer appointment, privacy policy)
- Clause Library system with SA attorney-approved legal text
- UPL filter architecture for all AI outputs
- Audit logging service

**Addresses:**
- Pitfall #1 (UPL) — architecture prevents advice-giving from day one
- Pitfall #4 (POPIA) — compliance built into foundation
- Table stakes: Secure data storage, account system

**Critical:** All legal text must be attorney-approved before Phase 2 begins. No freeform AI generation permitted.

---

### Phase 2: Core Conversation & Data Collection
**Rationale:** With foundation in place, build the conversational AI questionnaire that collects will data. This is the core user experience and must handle SA-specific scenarios (marriage regimes, community of property).

**Delivers:**
- OpenAI service integration with SA will-drafting prompts
- Conversation API endpoints (send message, get response, extract data)
- React conversation/wizard UI with progress tracking
- Will data model and storage (JSONB for flexible structures)
- Basic validation (required fields, data types)
- Save and resume functionality
- Mobile-responsive design

**Uses:**
- React 19 hooks (useActionState for conversation state)
- Zustand for client-side state management
- React Hook Form + Zod for validation
- OpenAI SDK with streaming for responsive conversation

**Implements:**
- Conversation UI Layer component
- API Gateway Layer (Conversation API)
- AI Orchestration Layer (OpenAI Service)

**Addresses:**
- Table stakes: Basic will creation, asset inventory, beneficiary designation, guardian/executor nomination
- Pitfall #8 (Questionnaire drop-off) — progress saving, time estimates, skip/return
- Pitfall #10 (Mobile) — mobile-first design from start

**Avoids:**
- Pitfall #2 (Hallucinations) — data extraction only, no clause generation yet
- Pitfall #9 (Over-engineering) — focus on efficient data collection, not chatbot personality

---

### Phase 3: Verification & Estate Logic
**Rationale:** Before generating documents, must verify collected data for legal compliance and logical consistency. SA-specific rules (Wills Act requirements, trust structures, usufruct) need encoding.

**Delivers:**
- Gemini service integration for verification
- Estate Logic Validator with SA Wills Act rules
- Verification API endpoints
- React verification UI showing issues/warnings
- Complex estate detection and attorney handoff triggers
- Testamentary trust logic
- Usufruct provision logic

**Implements:**
- AI Orchestration Layer (Gemini Service, Estate Logic Validator)
- Multi-model coordination pattern

**Addresses:**
- Differentiators: Complex scenario handling, testamentary trusts, usufruct provisions
- Pitfall #5 (Complex estate oversimplification) — complexity scoring, hard boundaries
- Pitfall #6 (Multi-LLM coordination) — verified clause library as source of truth

**Avoids:**
- Pitfall #2 (Hallucinations) — verification catches inconsistencies before generation

**Needs deeper research:**
- Testamentary trust legal requirements (Trust Property Control Act)
- Usufruct Deeds Office registration language
- Business asset succession considerations

---

### Phase 4: Document Generation & Download
**Rationale:** With verified data, generate legally formatted PDF documents. This unlocks core value proposition — users can print, sign, and have valid will.

**Delivers:**
- Jinja2 will templates (basic_will.html, trust_will.html, usufruct_will.html)
- WeasyPrint PDF generation service
- Document Generation API endpoints
- React document preview UI
- Download endpoints with time-limited tokens
- Execution instruction generator
- Witness signing checklist

**Implements:**
- Document Generation Layer (Template Engine, PDF Generator)

**Addresses:**
- Table stakes: PDF generation, witness signing instructions
- Differentiator: Document preview
- Pitfall #3 (Wet-ink confusion) — execution flow mandatory, prominent signing instructions

**Avoids:**
- Pitfall #11 (Template versioning) — version all templates, track which version used for each will

**Critical path dependency:** Cannot launch without this phase. This is what users pay for.

---

### Phase 5: Payment Integration
**Rationale:** Monetization gate. PayFast integration enables one-time payment model before PDF download. SA-specific payment gateway required (Stripe not available).

**Delivers:**
- PayFast service integration
- Payment flow UI (redirect to hosted page)
- Webhook handlers for payment confirmation
- License unlocking logic
- Receipt generation
- Payment audit logging

**Implements:**
- API Gateway Layer (Payment Integration component)

**Addresses:**
- Business model: Gate PDF downloads behind payment
- Differentiator: One-time fee (vs bank "free" with executor lock-in)

**PayFast specifics:**
- Redirect-based flow (user leaves site, returns after payment)
- Webhook confirmation critical (don't trust redirect alone)
- Test thoroughly with PayFast sandbox

---

### Phase 6: Polish, Monitoring & Launch Prep
**Rationale:** Production readiness, error handling, performance optimization, security hardening. Prepare for real users and real wills.

**Delivers:**
- Error handling and user-friendly error messages
- Performance optimization (API response times, PDF generation speed)
- Security hardening (rate limiting, input sanitization, SQL injection prevention)
- Monitoring and alerting (Sentry for errors, log aggregation)
- Professional indemnity insurance procurement
- Terms of Service finalization with SA attorney
- Marketing site and user documentation
- Launch checklist completion

**Addresses:**
- Pitfall #7 (Inadequate disclaimers) — SA-specific Terms, contextual disclaimers
- All minor pitfalls (monitoring, optimization, security)

**Launch blockers:**
- Attorney review of all templates and prompts
- POPIA compliance verification
- Professional indemnity insurance active
- Terms of Service and Privacy Policy published

---

### Phase Ordering Rationale

**Why this order:**
- **Phase 1 first (Foundation)**: Authentication, database, POPIA compliance, and clause library are prerequisites for everything else. UPL prevention must be architectural, not an add-on.
- **Phase 2 second (Conversation)**: Cannot verify data before collecting it. Conversation is core UX that defines product feel.
- **Phase 3 before Phase 4 (Verification before Generation)**: Must verify legal compliance before generating documents users will rely on. Dual-LLM coordination complexity needs addressing before production.
- **Phase 4 before Phase 5 (Document before Payment)**: Cannot charge for product that doesn't exist. PDF generation is the deliverable users pay for.
- **Phase 5 before Phase 6 (Payment before Polish)**: Core revenue model must work before launch. Polish without monetization is premature.

**How this avoids pitfalls:**
- UPL prevention (Pitfall #1) addressed in Phase 1 architecture
- Hallucinations (Pitfall #2) prevented by clause library (Phase 1) and verification (Phase 3)
- Wet-ink confusion (Pitfall #3) handled in Phase 4 execution flow
- POPIA compliance (Pitfall #4) built into Phase 1 infrastructure
- Complex estates (Pitfall #5) scoped in Phase 3 with handoff triggers
- Multi-LLM coordination (Pitfall #6) tested in Phase 3 before launch
- Disclaimers (Pitfall #7) finalized in Phase 6 with attorney review

**Parallelization opportunities:**
- Phase 4 polish and Phase 5 payment integration can run partially in parallel
- Template design (Phase 4) can start during Phase 3
- Marketing site (Phase 6) can develop alongside Phases 3-5

---

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 3 (Verification & Estate Logic):**
  - Testamentary trust legal requirements under Trust Property Control Act
  - Usufruct language for Deeds Office registration compliance
  - Business asset succession (CC member interests, company shares, shareholder agreements)
  - Multiple marriage estate implications (community of property, accrual, ante-nuptial contracts)
  - Call `/gsd:research-phase` before detailed planning

- **Phase 4 (Document Generation):**
  - PDF template legal formatting standards (Court requirements if will is contested)
  - Witness signature block layout requirements
  - Commissioner of oaths vs general witnesses (when is CoO required?)
  - Call `/gsd:research-phase` for template design

- **Phase 5 (Payment Integration):**
  - PayFast webhook security best practices
  - PayFast sandbox testing procedures
  - PCI compliance requirements (if any)
  - Standard patterns well-documented, likely skip research

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Foundation):** Authentication (Clerk), database (PostgreSQL), POPIA compliance templates available
- **Phase 2 (Conversation):** OpenAI SDK integration well-documented, React form patterns standard
- **Phase 6 (Polish):** Error handling, monitoring, security hardening are standard practices

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | HIGH | All technologies verified via Context7 and official documentation. React 19, FastAPI, PostgreSQL, OpenAI SDK, Gemini SDK, WeasyPrint all production-ready with extensive documentation. |
| **Features** | MEDIUM-HIGH | Table stakes clear from competitor analysis. Differentiators validated against LegalWills.co.za, DigiWill, bank offerings. Anti-features based on industry pitfalls. Some SA-specific features (usufruct, trusts) need legal validation. |
| **Architecture** | HIGH | Multi-tier pattern standard for AI-powered document generation. Component boundaries verified through multiple sources. Data flows match established patterns. Clause library approach proven in legal tech. |
| **Pitfalls** | HIGH | Critical pitfalls (UPL, hallucinations, wet-ink, POPIA) well-documented with case law and regulatory guidance. DoNotPay FTC case provides clear UPL boundaries. Stanford HAI research quantifies hallucination risk. |

**Overall confidence:** HIGH

Research sources are primarily official documentation (Context7-verified libraries), authoritative legal resources (Wills Act, POPIA guidance, SA case law), and established architectural patterns. Confidence reduced slightly for SA-specific legal features (testamentary trusts, usufruct) which need attorney validation during Phase 3.

### Gaps to Address

**Legal validation required:**
- **Testamentary trust provisions**: Need SA attorney to review trust creation language within wills, Trust Property Control Act compliance, trustee appointment clauses
- **Usufruct legal language**: Deeds Office registration requirements, proper usufructuary vs remainder beneficiary language
- **Business asset clauses**: Close corporation member interests, private company shares, shareholder agreement interactions
- **Multiple marriage scenarios**: Community of property, accrual system, ante-nuptial contract implications for estate distribution

**How to handle:** Engage SA estate attorney for legal review during Phase 3 planning. Budget R15,000-25,000 for comprehensive template and clause review.

**Technical validation needed:**
- **PayFast webhook security**: Best practices for signature verification, replay attack prevention
- **Multi-LLM coordination failure modes**: Test what happens when Gemini disagrees with OpenAI, or when one service is unavailable
- **PDF generation performance**: WeasyPrint speed with complex wills (10+ beneficiaries, trust provisions, usufruct)

**How to handle:** Phase 3 includes prototyping for LLM coordination. Phase 5 includes PayFast sandbox testing. Phase 6 performance testing addresses PDF speed.

**Market validation assumptions:**
- **Pricing positioning** (R499-999): Based on LegalWills.co.za pricing, but willingness-to-pay for AI-powered platform unvalidated
- **Conversational UI preference**: Assumption that AI conversation reduces intimidation vs traditional forms
- **Complex estate demand**: Unknown what % of users need trusts/usufruct vs basic wills

**How to handle:** MVP focuses on basic wills (highest volume). Monitor analytics for complex estate triggers to inform Phase 3 prioritization. Consider user interviews before Phase 2 for conversation flow validation.

## Sources

### Primary (HIGH confidence)

**Context7-verified libraries:**
- `/websites/fastapi_tiangolo` — FastAPI documentation, async patterns, Pydantic integration
- `/websites/zustand_pmnd_rs` — Zustand v5 state management
- `/tanstack/query` — TanStack Query v5 for server state
- `/colinhacks/zod` — Zod v4 schema validation
- `/openai/openai-python` — OpenAI SDK, streaming, structured outputs
- `/websites/ai_google_dev_api` — Gemini SDK documentation
- `/websites/doc_courtbouillon_weasyprint_stable` — WeasyPrint PDF generation
- `/clerk/clerk-docs` — Clerk authentication for React and FastAPI
- `/pydantic/pydantic` — Pydantic v2 validation

**Official documentation:**
- React 19 Release (https://react.dev/blog/2024/12/05/react-19)
- Vite Getting Started (https://vite.dev/guide/)
- Tailwind CSS v4 Upgrade Guide (https://tailwindcss.com/docs/upgrade-guide)

**Regulatory/Legal:**
- POPIA Official Site (https://popia.co.za/)
- SA Wills Act Formalities (https://schoemanlaw.co.za/the-wills-act-formalities/)
- FTC DoNotPay Order Feb 2025 (https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)

### Secondary (MEDIUM confidence)

**Architecture patterns:**
- FastAPI + OpenAI Streaming Best Practices (https://blog.gopenai.com/how-to-stream-llm-responses-in-real-time-using-fastapi-and-sse-d2a5a30f2928)
- Building LLM apps with FastAPI (https://agentsarcade.com/blog/building-llm-apps-with-fastapi-best-practices)
- Clerk + FastAPI Integration (https://blog.lamona.tech/how-to-authenticate-api-requests-with-clerk-and-fastapi-6ac5196cace7)
- WeasyPrint + Jinja2 PDF Generation (https://medium.com/@engineering_holistic_ai/using-weasyprint-and-jinja2-to-create-pdfs-from-html-and-css-267127454dbd)

**Competitor analysis:**
- LegalWills.co.za Features (https://www.legalwills.co.za/features)
- DigiWill.co.za (https://www.digiwill.co.za/)
- Capital Legacy (https://www.capitallegacy.co.za/)

**Domain pitfalls:**
- Stanford HAI: Legal AI Hallucination Rates (https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries)
- ABA: Re-Regulating UPL in the Age of AI (https://www.americanbar.org/groups/law_practice/resources/law-practice-magazine/2025/march-april-2025/re-regulating-upl-in-the-age-of-ai/)
- Anthropic: Multi-Agent Research System (https://www.anthropic.com/engineering/multi-agent-research-system)

### Tertiary (LOW-MEDIUM confidence)

**SA legal specifics:**
- Testamentary Trusts (https://www.legalwise.co.za/help-yourself/legal-articles/testamentary-trusts-created-your-will)
- Usufruct in SA Property Law (https://www.bartermckellar.law/property-law-explained/demystifying-usufruct-in-south-african-property-law-a-comprehensive-guide)
- Electronic Signatures SA (https://legalese.co.za/what-are-the-requirements-for-electronic-signatures-in-south-africa/)
- Business Assets in Estates (https://www.benaters.com/news-and-insights/2021/5/13/death-of-a-close-corporation-member-or-shareholder-of-a-private-company-pty-ltd-now-what)

**Industry insights:**
- Best Online Will Makers 2026 (https://www.ncoa.org/product-resources/estate-planning/best-online-will-makers/)
- AI Estate Planning Risks (https://www.dorceylaw.com/blog/2025/february/why-ai-driven-diy-estate-planning-can-put-your-l/)

---

*Research completed: 2026-02-05*
*Ready for roadmap: YES*
