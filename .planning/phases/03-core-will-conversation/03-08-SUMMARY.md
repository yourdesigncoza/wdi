---
phase: "03"
plan: "08"
subsystem: "frontend-will-review"
tags: ["review", "ai-chat", "daisyui", "section-review", "sse", "conversation-ui", "system-prompt"]

dependency_graph:
  requires: ["03-06", "03-07"]
  provides: ["section-review", "review-chat", "review-system-prompt", "complete-wizard-flow"]
  affects: ["05"]

tech_stack:
  added: []
  patterns: ["AI-led conversational review with full will context", "Collapsible section cards for quick-reference", "Section-specific renderers with DRY DataRow helper"]

key_files:
  created:
    - "frontend/src/features/will/components/SectionReview.tsx"
    - "frontend/src/features/will/components/ReviewChat.tsx"
  modified:
    - "frontend/src/features/will/components/WillWizard.tsx"
    - "backend/app/prompts/system.py"

decisions: []

metrics:
  duration: "3m 3s"
  completed: "2026-02-06"
---

# Phase 3 Plan 8: Section Review and AI-Led Will Review Summary

SectionReview component displaying per-section data cards with edit buttons, ReviewChat component enabling AI-led conversational will narration via useConversation hook with SSE streaming, review system prompt instructing plain-language narration, and WillWizard wired to render ReviewChat on the review step with navigation back to any section.

## What Was Done

### Task 1: SectionReview, ReviewChat, review system prompt, WillWizard wiring

**SectionReview** (`SectionReview.tsx`):
- Props: `{ section: WillSection, onEdit: (section: WillSection) => void }`
- 7 section-specific renderers: PersonalReview, BeneficiariesReview, AssetsReview, GuardiansReview, ExecutorReview, BequestsReview, ResidueReview
- DRY `DataRow` helper component for table-style key/value display
- Human-readable labels for marital status and asset types
- Badge display for beneficiary share %, guardian primary/backup, asset types
- Empty sections show "Not yet completed" with Start button
- Populated sections show data + Edit button (`btn btn-outline btn-sm`)
- `useSectionHasData` hook checks store state per section
- DaisyUI card-border pattern for each section card

**ReviewChat** (`ReviewChat.tsx`):
- Reuses `useConversation` hook with `section='review'` (same SSE infrastructure from Plan 07)
- On mount: builds complete will summary from all Zustand store sections and sends as initial message
- AI responds by narrating the will in plain conversational language
- Initial system-triggered user message filtered from display (only AI narration + user follow-ups shown)
- "Looks Good -- Proceed" button appears after AI completes narration (placeholder for Phase 5 verification)
- "View Details" toggle shows collapsible SectionReview cards below the chat for quick reference
- Same chat layout as ChatSection: dvh viewport height, sticky input, DaisyUI chat bubbles
- `onNavigateToSection` callback routes user back to specific sections for edits
- Ref-guarded greeting to prevent duplicate initial messages on re-render

**Review system prompt** (`system.py`):
- Added 'review' entry to `SECTION_PROMPTS` dict
- Instructs AI to narrate will as a story ("You, [name], have decided that...")
- Uses phrases like "your estate goes to", "if [person] passes before you"
- Never use legal jargon, data tables, or bullet-point lists
- After narrating, asks if anything needs changing
- Guides user to appropriate section for changes (does NOT make changes itself)

**WillWizard** (`WillWizard.tsx`):
- Imported and wired ReviewChat component for review section
- Removed SectionPlaceholder (no more "coming soon" fallbacks)
- Review section gets same full-height chat card treatment as AI sections
- `ensureWillExists` triggered for review section (will draft required for API)
- `handleNavigateToSection` callback passed to ReviewChat for section navigation
- Renamed `isAISection` to `isChatSection` to include review in full-height layout

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SectionReview, ReviewChat, review system prompt | 6a183f3 | SectionReview.tsx, ReviewChat.tsx, WillWizard.tsx, system.py |

## Decisions Made

No new architectural decisions. Reused established patterns: useConversation SSE hook, DaisyUI card/chat patterns, Zustand store selectors.

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. TypeScript compiles: PASS (`npx tsc --noEmit` -- zero errors)
2. Build succeeds: PASS (`npm run build` -- no errors)
3. All will components exist: PASS (8 components in features/will/components/)
4. ReviewChat uses useConversation: PASS (4 matches)
5. Review system prompt: PASS ('review' key in SECTION_PROMPTS)
6. SectionReview has edit buttons: PASS (7 matches for onEdit/btn-outline)

## Next Phase Readiness

**Phase 3 Complete:**
- All 8 plans executed successfully
- Complete wizard flow: Personal form -> Marital form -> AI chat sections (6) -> AI Review
- Step indicator allows navigation between all 8 sections

**Ready for Phase 4 (Document Generation) and Phase 5 (Verification):**
- ReviewChat "Looks Good -- Proceed" button is a placeholder for Phase 5 verification flow
- All will data collected and reviewable via SectionReview cards
- Backend system prompts complete for all conversation sections including review

**No blockers.**

## Self-Check: PASSED
