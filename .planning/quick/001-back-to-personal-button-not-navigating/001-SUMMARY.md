# Quick Task 001 — Summary

## Task
Fix "Back to Personal" button not navigating back from MaritalForm to PersonalForm.

## Root Cause
`PersonalSection` in `WillWizard.tsx` used store-derived `hasTestator` boolean to decide which form to render. Once testator data was saved, there was no path back to `PersonalForm` — the condition always resolved to `MaritalForm`.

## Solution
Replaced store-derived rendering logic with local `subStep` state in `PersonalSection`:
- Default sub-step: `'personal'` (always starts showing PersonalForm)
- `PersonalForm` calls `onSaved` prop on submit → advances to `'marital'`
- `MaritalForm` calls `onBackToPersonal` prop on back button → resets to `'personal'`

## Files Changed
| File | Change |
|------|--------|
| `WillWizard.tsx` | Added `subStep` state to `PersonalSection`, prop-driven navigation |
| `PersonalForm.tsx` | Added `onSaved` callback prop, called after `updateTestator` |
| `MaritalForm.tsx` | Added `onBackToPersonal` prop, replaced `setCurrentSection('personal')` |

## Commit
`3d7d0ce` — fix: Back to Personal button now navigates to PersonalForm
