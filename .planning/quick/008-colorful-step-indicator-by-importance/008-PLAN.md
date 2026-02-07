---
phase: q-008
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/features/will/components/StepIndicator.tsx
autonomous: true
must_haves:
  truths:
    - "Incomplete critical steps (personal) show red (step-error)"
    - "Incomplete important steps (beneficiaries, assets, guardians) show warning (step-warning)"
    - "Incomplete standard steps (executor, bequests, residue, trust, usufruct, business, joint) show secondary (step-secondary)"
    - "Incomplete review/final steps (review, verification, document) show accent (step-accent)"
    - "All completed steps show a single done color (step-neutral) regardless of category"
    - "Current step remains visually distinct"
  artifacts:
    - path: "frontend/src/features/will/components/StepIndicator.tsx"
      provides: "Color-coded step indicator with importance categories"
      contains: "step-error"
---

<objective>
Add color-coded importance categories to the StepIndicator component. Each incomplete step gets a color based on its category (critical=red, important=warning, standard=secondary, review=accent). Completed steps all use a single `step-neutral` done color.

Purpose: Visual priority cues help users focus on the most important sections first.
Output: Updated StepIndicator.tsx with category-aware coloring.
</objective>

<execution_context>
@/home/laudes/.claude/get-shit-done/workflows/execute-plan.md
@/home/laudes/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/features/will/components/StepIndicator.tsx
@frontend/src/features/will/types/will.ts (WillSection type)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add importance category mapping and update getStepClass</name>
  <files>frontend/src/features/will/components/StepIndicator.tsx</files>
  <action>
Add a `SECTION_CATEGORY` record that maps each WillSection key to its DaisyUI step class:

Category mapping (use `Record<string, string>` keyed by WillSection values):
- Critical (red): `personal` -> `step-error`
- Important (warning): `beneficiaries`, `assets`, `guardians` -> `step-warning`
- Standard (secondary): `executor`, `bequests`, `residue`, `trust`, `usufruct`, `business`, `joint` -> `step-secondary`
- Review/Final (accent): `review`, `verification`, `document` -> `step-accent`

Note: `marital` is NOT a separate wizard step (it's part of `personal`), so do not include it.

Update `getStepClass()` logic to:
1. If `step.isComplete` -> return `'step step-neutral'` (single done color for all completed steps)
2. If `step.isCurrent` -> return `'step ' + SECTION_CATEGORY[step.key]` (category color, visually distinct because DaisyUI `step-*` on the current step will show the colored circle/icon while incomplete steps ahead are grey)
3. Default (incomplete, not current) -> return `'step ' + SECTION_CATEGORY[step.key]`

Wait -- both current and default return the category color. The current step is already visually distinct because the user is on it (it's the active step in the wizard). But to make it MORE distinct, add a fallback: if `step.isCurrent`, also keep the category color but the button already has `hover:underline` and is the active section. The DaisyUI steps component naturally shows the "line" between steps differently for completed vs incomplete, so the current step with its category color will stand out.

Actually, to keep current step extra distinct: for `isCurrent`, use `'step step-neutral'` as before so it contrasts with the category colors. This way:
- Completed = `step step-neutral` (done, muted)
- Current = `step step-neutral` (active, same base but user sees it as "where I am")
- Incomplete = category color (what's ahead, colored by importance)

Hmm, that makes completed and current look the same. Better approach:

- Completed = `step step-neutral` (grey/muted done color)
- Current = category color (shows importance of where you ARE)
- Incomplete ahead = no step-* class (default grey, unfilled)

Actually the user's requirement is clear: "Completed steps use single done color" and "Current step should still be visually distinct". The simplest and clearest approach:

- `step.isComplete` -> `'step step-neutral'`
- `step.isCurrent` -> `'step ' + SECTION_CATEGORY[step.key]` (category color highlights current)
- default (incomplete, not current) -> `'step'` (plain, no color -- unfilled)

This gives: done steps are neutral, current step pops with its category color, future steps are plain/empty. This is the cleanest interpretation.

FINAL implementation for `getStepClass`:
```
if (step.isComplete) return 'step step-neutral'
if (step.isCurrent) return 'step ' + SECTION_CATEGORY[step.key]
return 'step'
```

This matches the original structure (completed/current/default) but now current uses category color instead of `step-neutral`, and completed uses `step-neutral` instead of `step-primary`.

Add the `@source` inline directive comment at the top of the file for the DaisyUI step classes used:
`/* @source "../../../../../node_modules/daisyui"; */`
This ensures Tailwind CSS 4 scans DaisyUI for the step-error, step-warning, step-secondary, step-accent classes.
  </action>
  <verify>
    Run `cd /opt/lampp/htdocs/wdi/frontend && npx tsc --noEmit` to confirm no type errors.
    Run `cd /opt/lampp/htdocs/wdi/frontend && npm run build` to confirm build succeeds and DaisyUI classes are included.
    Visually inspect the output CSS (in the build) to confirm `step-error`, `step-warning`, `step-secondary`, `step-accent`, `step-neutral` classes are present.
  </verify>
  <done>
    StepIndicator shows category-colored current step, neutral completed steps, and plain incomplete steps. TypeScript compiles, build succeeds, all DaisyUI step classes are included in output.
  </done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes with no errors
- `npm run build` succeeds
- StepIndicator.tsx contains SECTION_CATEGORY mapping with all 14 section keys
- getStepClass returns step-neutral for complete, category color for current, plain for default
- No custom CSS added -- only DaisyUI classes used
</verification>

<success_criteria>
- Step indicator renders with color-coded current step based on importance category
- Completed steps uniformly show step-neutral (single done color)
- Current step shows its category color (error/warning/secondary/accent)
- Future incomplete steps show as plain/unfilled
- Build compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/008-colorful-step-indicator-by-importance/008-SUMMARY.md`
</output>
