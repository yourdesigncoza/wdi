# Phase 5: AI Verification - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Dual-LLM verification layer where Gemini independently checks the will data collected by OpenAI. Runs once when user completes all sections. Catches incompleteness, inconsistencies, and SA Wills Act compliance issues. Blocks PDF generation until errors resolved. Does NOT include PDF generation itself (Phase 6) or payment (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Verification Scope
- Full validation: completeness + consistency + SA Wills Act rule checks
- Hybrid rule approach: Gemini evaluates all rules for now, architecture ready to add hardcoded deterministic checks later
- Verification runs once at the end (after all sections complete), not incrementally

### Claude's Discretion (Scope)
- Whether Gemini receives JSONB data only or JSONB + conversation history — balance cost vs thoroughness

### User Experience
- Live checklist progress during verification (checks appear as they complete)
- Results: top-level summary card (green/yellow/red) + expandable section-by-section breakdown
- Blocking gate: user CANNOT generate PDF until all errors resolved. Warnings can be acknowledged and bypassed
- Re-verification approach (manual button vs auto) — Claude decides balancing UX and API cost

### Failure Handling
- Three severity levels: Error (blocks), Warning (needs acknowledgment), Info (helpful tips)
- Issues link back to relevant section — user navigates back to fix via AI conversation
- Each issue includes plain-language explanation of WHY it's a problem
- If Gemini unavailable: fall back to OpenAI (base LLM) for verification instead

### Attorney Referral Triggers
- Conservative and non-blocking — notification style, never a gate
- Triggers on complex scenarios (trusts, usufruct, business succession, international assets, disinheriting dependents) AND unusual patterns (very unequal distributions, leaving everything to non-family, no executor, extremely large estates)
- Generic recommendation language: "We recommend consulting a qualified attorney" — no specific referral services
- Notification appears on verification results page AND as a note in the final PDF document

</decisions>

<specifics>
## Specific Ideas

- Checklist progress should feel thorough — user sees each check completing in real-time
- Attorney notification is a soft nudge, not a scare tactic
- Error explanations reference SA law where applicable (e.g., "SA Wills Act requires executors to be 18+")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ai-verification*
*Context gathered: 2026-02-06*
