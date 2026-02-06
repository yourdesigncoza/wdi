---
phase: "03"
plan: "06"
subsystem: "frontend-will-wizard"
tags: ["react-hook-form", "zod", "daisyui", "wizard", "step-indicator", "forms", "zustand"]

dependency_graph:
  requires: ["03-03"]
  provides: ["will-wizard-shell", "step-indicator", "personal-form", "marital-form", "will-route"]
  affects: ["03-07", "03-08"]

tech_stack:
  added: []
  patterns: ["DaisyUI steps-horizontal navigation", "React Hook Form zodResolver integration", "Conditional form fields via watch()", "Multi-step wizard with Zustand section tracking"]

key_files:
  created:
    - "frontend/src/features/will/components/WillWizard.tsx"
    - "frontend/src/features/will/components/StepIndicator.tsx"
    - "frontend/src/features/will/components/PersonalForm.tsx"
    - "frontend/src/features/will/components/MaritalForm.tsx"
  modified:
    - "frontend/src/App.tsx"

decisions: []

metrics:
  duration: "3m 10s"
  completed: "2026-02-06"
---

# Phase 3 Plan 6: Wizard Shell and Forms Summary

DaisyUI steps-horizontal wizard with clickable section navigation, PersonalForm validating SA ID (13 digits) and postal code (4 digits) via Zod zodResolver, MaritalForm conditionally rendering spouse fields for married statuses, both saving to Zustand store with auto-advance flow, and /will route with auth+consent gating.

## What Was Done

### Task 1: WillWizard container and StepIndicator

**StepIndicator** (`StepIndicator.tsx`):
- DaisyUI `steps steps-horizontal` component with `overflow-x-auto` for mobile scrolling
- Receives sections array with `isComplete`/`isCurrent` state from useWillProgress hook
- Completed sections get `step-primary` class, current gets `step-neutral`
- Each step has a clickable button triggering `onNavigate(key)` for section switching
- Mobile-first text sizing: `text-xs sm:text-sm`

**WillWizard** (`WillWizard.tsx`):
- Main container reading `currentSection` from useWillStore and `sections` from useWillProgress
- StepIndicator always visible at top
- Section rendering via switch: `personal` renders PersonalSection (PersonalForm then MaritalForm), other sections render placeholders for later plans (07/08)
- PersonalSection orchestrates: shows PersonalForm until testator data saved, then shows MaritalForm
- DaisyUI card+card-body container, max-w-3xl centered, full-width on mobile

### Task 2: PersonalForm, MaritalForm, and /will route

**PersonalForm** (`PersonalForm.tsx`):
- `useForm<TestatorFormData>({ resolver: zodResolver(testatorSchema) })`
- Pre-populates from `useWillStore().testator` for edit revisits
- 10 fields: firstName, lastName, idNumber (maxLength 13), dateOfBirth (date input), address, city, province (select with 9 SA provinces), postalCode (maxLength 4), phone, email (optional)
- DaisyUI fieldset/fieldset-legend pattern for all field groups
- Error display with `text-error` class under each field
- Responsive grid: single column mobile, 2-column md+ (3-column for city/province/postal)
- On submit: `updateTestator(data)` saves to Zustand (triggers PersonalSection re-render showing MaritalForm)

**MaritalForm** (`MaritalForm.tsx`):
- `useForm<MaritalFormData>({ resolver: zodResolver(maritalSchema) })`
- Pre-populates from `useWillStore().marital`
- Marital status select with 6 options (single, 3 married types, divorced, widowed)
- Conditional spouse fields: when status is `married_*`, shows spouseFirstName, spouseLastName, spouseIdNumber
- Conditional marriageCountry: when `marriedOutsideSa` checkbox checked
- Uses `watch('status')` and `watch('marriedOutsideSa')` for conditional rendering
- On submit: `updateMarital(data)`, `markSectionComplete('personal')`, `setCurrentSection('beneficiaries')`
- Back button returns to personal section

**App.tsx updates:**
- Added `/will` route rendering `WillWizard` wrapped in `AuthGatedContent` (auth + consent gating)
- Refactored `AuthGatedContent` to accept `children` prop for reuse across routes
- Added `WillPage` component with consent loading/check before rendering WillWizard
- Dashboard now has "Create Your Will" CTA button linking to `/will`

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | WillWizard container and StepIndicator | 8d2d2e6 | WillWizard.tsx, StepIndicator.tsx |
| 2 | PersonalForm, MaritalForm, /will route | 7c1e3c0 | PersonalForm.tsx, MaritalForm.tsx, App.tsx |

## Decisions Made

No new architectural decisions. Used established patterns from 03-03 (Zod schemas, Zustand store).

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` passes with zero errors
2. `/will` route present in App.tsx
3. `zodResolver` used in PersonalForm.tsx and MaritalForm.tsx
4. DaisyUI `steps steps-horizontal` in StepIndicator.tsx
5. `useWillStore` integrated in PersonalForm.tsx, MaritalForm.tsx, WillWizard.tsx

## Next Phase Readiness

**Ready for Plan 03-07 (Chat Section):**
- WillWizard placeholders for beneficiaries/assets/guardians/executor/bequests/residue ready to be replaced with ChatSection component
- Store actions for all CRUD operations already available

**Ready for Plan 03-08 (Will Preview):**
- Review section placeholder in WillWizard ready for WillPreview component
- useWillProgress.canReview gate available for review section access control

**No blockers.**

## Self-Check: PASSED
