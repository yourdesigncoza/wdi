# Quick Task 001: Back to Personal button not navigating

## Problem
"Back to Personal" button in MaritalForm calls `setCurrentSection('personal')`, but `PersonalSection` checks `hasTestator` from store — since testator data already exists, it immediately renders MaritalForm again.

## Fix
1. Add local `subStep` state to `PersonalSection` (`'personal' | 'marital'`)
2. `PersonalForm` receives `onSaved` prop — advances sub-step to marital on submit
3. `MaritalForm` receives `onBackToPersonal` prop — resets sub-step to personal
4. Remove direct `setCurrentSection('personal')` from MaritalForm button

## Files
- `WillWizard.tsx` — PersonalSection sub-step state
- `PersonalForm.tsx` — onSaved callback prop
- `MaritalForm.tsx` — onBackToPersonal callback prop
