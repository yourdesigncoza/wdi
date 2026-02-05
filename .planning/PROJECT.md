# WillCraft SA

## What This Is

An AI-powered online will-generation platform for South Africa. Users are guided through a conversational questionnaire to create legally compliant wills for complex estate scenarios (trusts, multiple marriages, business assets, usufruct rights). The platform generates a downloadable PDF that users print, sign with two witnesses, to meet South African legal requirements.

## Core Value

Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User registration and authentication via Clerk
- [ ] AI-powered conversational will creation (blend of guided conversation + structured form)
- [ ] Handle complex estate scenarios (trusts, multiple marriages, business assets, usufruct)
- [ ] Generate legally compliant PDF will document
- [ ] Payment gate before download
- [ ] Capture user data for future engagement
- [ ] POPIA consent and disclaimers (not legal advice, must print/sign with witnesses)
- [ ] LLM verification layer (second model checks document completeness)

### Out of Scope

- Will storage/vault — deferred to v2 monetization
- Executor notification system — deferred to v2
- Attorney review integration — nice-to-have later
- POPIA-compliant SA hosting — beta anywhere, production later
- Mobile app — web-first

## Context

**Legal Framework (South Africa):**
- Wills Act 7 of 1953 requires wet-ink signature by testator + 2 witnesses present
- Electronic wills NOT valid without court intervention (ECTA excludes wills)
- Master of High Court accepts only originals, rejects digital copies
- Platform generates template/draft only — user handles execution offline
- Must include disclaimers: "Not legal advice; print/sign with witnesses required"

**POPIA Compliance:**
- Collecting sensitive personal info (names, ID, assets, beneficiaries)
- Requires: explicit consent, data retention policy, Information Officer, secure storage
- For beta: capture consent, auto-delete option, privacy policy
- For production: SA-hosted servers, full POPIA audit

**Existing Codebase:**
- Legacy PHP application exists with payments, account management, signed-will uploads
- New project is fresh start — legacy code for reference only

**Competitors:**
- LegalWills.co.za: R499-1,299, template questionnaire
- DigiWill.co.za: Free basic, focuses on templates
- Banks/insurers: Assisted will services
- Gap: No AI-conversational approach in SA market

## Constraints

- **Legal**: Must generate printable PDF — cannot claim will is "valid" until wet-signed
- **Disclaimers**: Required at multiple touchpoints — not legal advice, attorney recommended
- **Tech Stack**: React + Tailwind, Python + FastAPI, PostgreSQL, Clerk auth, OpenAI primary
- **LLM Flexibility**: Architecture must support swapping/combining models (OpenAI, Gemini, etc.)
- **Beta Phase**: Host anywhere, defer POPIA-compliant hosting to production

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fresh start over legacy modernization | Legacy PHP too dated, modern stack enables AI features | — Pending |
| PostgreSQL + Clerk (separate concerns) | Easier migration path than all-in-one solutions | — Pending |
| Conversational + structured hybrid | Natural UX but with validation and data capture | — Pending |
| Multi-LLM architecture | OpenAI for conversation, flexibility for verification layer | — Pending |
| Complex wills from v1 | Differentiate from competitors, AI handles complexity | — Pending |
| Pay-per-download model | Captures users, defers storage/subscription to v2 | — Pending |

---
*Last updated: 2025-02-05 after initialization*
