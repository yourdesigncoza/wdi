# WillCraft SA

## What This Is

An AI-powered online will-generation platform for South Africa. Users are guided through a conversational questionnaire powered by OpenAI to create legally compliant wills for complex estate scenarios (trusts, multiple marriages, business assets, usufruct rights). A secondary LLM (Gemini) independently verifies document completeness against SA Wills Act rules. The platform generates a downloadable PDF that users print, sign with two witnesses, to meet South African legal requirements. Supplementary documents (living will, funeral wishes) are also available.

## Core Value

Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.

## Requirements

### Validated

- User registration and authentication via Clerk — v1.0
- AI-powered conversational will creation (blend of guided conversation + structured form) — v1.0
- Handle complex estate scenarios (trusts, multiple marriages, business assets, usufruct) — v1.0
- Generate legally compliant PDF will document — v1.0
- Payment gate before download (PayFast) — v1.0
- Capture user data for future engagement — v1.0
- POPIA consent and disclaimers (not legal advice, must print/sign with witnesses) — v1.0
- LLM verification layer (Gemini checks OpenAI document completeness) — v1.0
- Save/resume will creation and unlimited post-purchase updates — v1.0
- Living will and funeral wishes supplementary documents — v1.0

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- Will storage/vault — deferred to v2 monetization
- Executor notification system — deferred to v2
- Attorney review integration — nice-to-have later
- POPIA-compliant SA hosting — beta anywhere, production later
- Mobile app — web-first (responsive design covers mobile)
- Electronic/digital signatures — SA Wills Act requires wet-ink
- Annual subscription model — one-time payment with optional updates

## Context

**Current State (v1.0 shipped 2026-02-08):**
- ~20,200 LOC (Python + TypeScript + HTML templates)
- Tech stack: React 19 + Vite + Tailwind CSS 4 + DaisyUI v5, FastAPI + SQLModel + PostgreSQL, Clerk auth, OpenAI GPT-4o-mini, Gemini 2.5 Flash, WeasyPrint, PayFast
- 10 phases, 43 plans, 153 commits across 4 days
- 35/35 requirements shipped, 0 dropped
- 8 quick fixes applied post-build

**Legal Framework (South Africa):**
- Wills Act 7 of 1953 requires wet-ink signature by testator + 2 witnesses present
- Electronic wills NOT valid without court intervention (ECTA excludes wills)
- Master of High Court accepts only originals, rejects digital copies
- Platform generates template/draft only — user handles execution offline
- Must include disclaimers: "Not legal advice; print/sign with witnesses required"

**Known Issues / Technical Debt:**
- All 12 clause library entries are PLACEHOLDER text (attorney approval needed)
- Privacy policy and info officer details are placeholders
- Monthly audit_logs partitions need automated creation
- Audit immutability (REVOKE UPDATE/DELETE) must be applied on production DB
- PayFast sandbox testing required before production
- Production deployment requires public URL for PayFast ITN webhook

**Competitors:**
- LegalWills.co.za: R499-1,299, template questionnaire
- DigiWill.co.za: Free basic, focuses on templates
- Banks/insurers: Assisted will services
- Gap: No AI-conversational approach in SA market

## Constraints

- **Legal**: Must generate printable PDF — cannot claim will is "valid" until wet-signed
- **Disclaimers**: Required at multiple touchpoints — not legal advice, attorney recommended
- **Tech Stack**: React + Tailwind + DaisyUI, Python + FastAPI, PostgreSQL, Clerk auth, OpenAI + Gemini
- **LLM Flexibility**: Architecture supports swapping/combining models (OpenAI, Gemini, etc.)
- **Beta Phase**: Host anywhere, defer POPIA-compliant hosting to production

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh start over legacy modernization | Legacy PHP too dated, modern stack enables AI features | Good |
| PostgreSQL + Clerk (separate concerns) | Easier migration path than all-in-one solutions | Good |
| Conversational + structured hybrid | Natural UX but with validation and data capture | Good |
| Multi-LLM architecture | OpenAI for conversation, Gemini for verification | Good |
| Complex wills from v1 | Differentiate from competitors, AI handles complexity | Good |
| Pay-per-download model | Captures users, defers storage/subscription to v2 | Good |
| JWT httpOnly cookie for POPIA consent | Stateless verification, 365-day expiry | Good |
| Jinja2 StrictUndefined for clauses | Missing variables raise errors, not blank text | Good |
| JSONB section columns for will data | Per-section queries and partial updates | Good |
| Dual-event SSE pattern | Delta during stream, filtered/done after UPL check | Good |
| WeasyPrint for PDF | CSS paged media, Jinja2 templates, professional output | Good |
| PayFast integration | SA-native payment gateway, ITN webhooks | Good |
| DaisyUI v5 with Tailwind 4 | Consistent theming, component library, light/dark modes | Good |
| Single JSONB content for additional docs | Schema flexibility without migrations | Good |

---
*Last updated: 2026-02-08 after v1.0 milestone*
