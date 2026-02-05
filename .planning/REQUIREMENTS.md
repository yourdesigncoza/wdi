# Requirements: WillCraft SA

**Defined:** 2026-02-05
**Core Value:** Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: User receives email verification after registration
- [ ] **AUTH-03**: User can log in and stay logged in across sessions
- [ ] **AUTH-04**: User can reset password via email link
- [ ] **AUTH-05**: User can save progress and resume will creation later
- [ ] **AUTH-06**: User can update their will unlimited times after purchase

### Will Creation

- [ ] **WILL-01**: User can create a basic will through guided questionnaire
- [ ] **WILL-02**: User can designate beneficiaries (individuals or charities)
- [ ] **WILL-03**: User can inventory assets (property, vehicles, bank accounts, investments)
- [ ] **WILL-04**: User can nominate primary and backup guardians for minor children
- [ ] **WILL-05**: User can nominate executor(s) for estate administration
- [ ] **WILL-06**: User can specify alternate beneficiaries (if primary predeceases)
- [ ] **WILL-07**: User can specify specific bequests (particular items to particular people)
- [ ] **WILL-08**: User can designate residual estate beneficiaries

### Document Generation

- [ ] **DOC-01**: System generates professionally formatted PDF will document
- [ ] **DOC-02**: PDF includes clear witness signing instructions
- [ ] **DOC-03**: User can preview document before payment
- [ ] **DOC-04**: User must complete payment (PayFast) before downloading PDF
- [ ] **DOC-05**: User receives download link immediately after payment
- [ ] **DOC-06**: User receives email with download link as backup

### Legal Compliance

- [ ] **COMP-01**: User must accept POPIA consent before starting
- [ ] **COMP-02**: Privacy policy clearly explains data handling
- [ ] **COMP-03**: Information Officer contact details are displayed
- [ ] **COMP-04**: User can request data access, correction, or deletion
- [ ] **COMP-05**: Disclaimers clearly state "not legal advice" at key touchpoints
- [ ] **COMP-06**: System recommends attorney review for complex scenarios

### AI Features

- [ ] **AI-01**: AI guides user through will creation conversationally
- [ ] **AI-02**: AI provides real-time explanations of legal terms and concepts
- [ ] **AI-03**: AI handles "I don't know" responses gracefully with follow-up questions
- [ ] **AI-04**: AI validates inputs and catches potential errors
- [ ] **AI-05**: Secondary LLM verifies document completeness before generation

### Complex Scenarios

- [ ] **CMPLX-01**: User can create will with blended family scenarios (step-children, multiple marriages)
- [ ] **CMPLX-02**: User can create testamentary trust provisions (protect minor children's inheritance)
- [ ] **CMPLX-03**: User can add usufruct provisions (spouse keeps home, children inherit)
- [ ] **CMPLX-04**: User can handle business assets (CC member interests, company shares)
- [ ] **CMPLX-05**: User can create joint will with spouse (mutual or mirror wills)

### Additional Documents

- [ ] **ADOC-01**: User can create living will (advance healthcare directive)
- [ ] **ADOC-02**: User can create funeral wishes document

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Storage & Vault

- **VAULT-01**: User can store executed will in secure vault
- **VAULT-02**: User can store related documents (insurance, deeds)
- **VAULT-03**: User can designate keyholders for vault access

### Executor Features

- **EXEC-01**: User can notify designated executor via email
- **EXEC-02**: Executor receives notification instructions upon user's death

### Attorney Integration

- **ATTY-01**: User can purchase attorney review add-on
- **ATTY-02**: Attorney provides feedback within 48 hours

### Enhanced Features

- **ENH-01**: Digital asset inventory (passwords, accounts, crypto)
- **ENH-02**: Messages to beneficiaries (released upon death)
- **ENH-03**: Estate cost calculator

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Electronic/digital signatures | SA Wills Act requires wet-ink signatures; ECTA excludes wills |
| Auto-filing with Master's Office | Premature automation; requires physical documents post-death |
| "Free" will with forced executor | Deceptive bank model; users choose own executor |
| Notarization services | SA wills don't require notarization; adds confusion |
| Real-time human chat support | Too expensive for v1; AI handles most queries |
| Annual subscription model | Feels exploitative; one-time payment with optional updates |
| Blockchain storage | No legal standing in SA; unnecessary complexity |
| Tax advice engine | Requires professional qualification; significant liability |
| Mobile app | Web-first; responsive design covers mobile needs |
| POPIA-compliant SA hosting | Deferred to production; beta hosted anywhere |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 8 | Pending |
| AUTH-06 | Phase 8 | Pending |
| WILL-01 | Phase 3 | Pending |
| WILL-02 | Phase 3 | Pending |
| WILL-03 | Phase 3 | Pending |
| WILL-04 | Phase 3 | Pending |
| WILL-05 | Phase 3 | Pending |
| WILL-06 | Phase 3 | Pending |
| WILL-07 | Phase 3 | Pending |
| WILL-08 | Phase 3 | Pending |
| DOC-01 | Phase 6 | Pending |
| DOC-02 | Phase 6 | Pending |
| DOC-03 | Phase 6 | Pending |
| DOC-04 | Phase 7 | Pending |
| DOC-05 | Phase 7 | Pending |
| DOC-06 | Phase 7 | Pending |
| COMP-01 | Phase 1 | Pending |
| COMP-02 | Phase 1 | Pending |
| COMP-03 | Phase 1 | Pending |
| COMP-04 | Phase 1 | Pending |
| COMP-05 | Phase 6 | Pending |
| COMP-06 | Phase 6 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 5 | Pending |
| CMPLX-01 | Phase 4 | Pending |
| CMPLX-02 | Phase 4 | Pending |
| CMPLX-03 | Phase 4 | Pending |
| CMPLX-04 | Phase 4 | Pending |
| CMPLX-05 | Phase 4 | Pending |
| ADOC-01 | Phase 9 | Pending |
| ADOC-02 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 35 total
- Mapped to phases: 35
- Unmapped: 0

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after roadmap creation*
