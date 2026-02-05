# Phase 1: Foundation & Compliance - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish secure infrastructure with POPIA compliance, UPL prevention, and attorney-approved clause library as architectural constraints. This phase creates the foundational systems that all subsequent phases depend on — no user-facing features, purely backend infrastructure and compliance architecture.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion

User has delegated all Phase 1 decisions to Claude. This is appropriate because Phase 1 is infrastructure/compliance foundation with no user-facing features. Claude should apply best practices for:

**POPIA Consent Flow:**
- Blocking modal before any data collection (standard pattern)
- Clear, plain-language explanation of data handling
- Granular consent where legally required
- Easy consent withdrawal mechanism
- Audit trail for all consent events

**Clause Library Structure:**
- Hierarchical organization by will section (executors, beneficiaries, guardians, etc.)
- Version control for attorney-approved text
- Metadata for clause applicability (basic/trust/usufruct/joint)
- English only for MVP (Afrikaans can be Phase 10+)

**UPL Filter Behavior:**
- Silent replacement with approved clause text (no user confusion)
- Logging of all filter activations for compliance audit
- Hard block on freeform legal advice generation
- Graceful fallback to "consult an attorney" for edge cases

**Data Subject Rights:**
- Contact form approach (not full self-service for MVP)
- Clear Information Officer contact details
- Response time aligned with POPIA requirements (reasonable period)
- Audit logging of all data subject requests

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraints from requirements:

- PostgreSQL for database (per tech stack)
- FastAPI for backend (per tech stack)
- React for frontend (per tech stack)
- Attorney approval required for clause library content before Phase 2

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-compliance*
*Context gathered: 2026-02-05*
