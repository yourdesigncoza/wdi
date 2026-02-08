# Quick Task 009: Fix 2-Column Layout for Toggle Sections

## Task
Fix the toggle/checkbox layout in LivingWillForm's TreatmentStep to use a proper 2-column grid instead of stacking inline.

## Problem
The "When should this directive apply?" and "Treatment Decisions" sections use `space-y-2` which on wider screens causes toggles to flow horizontally in an unreadable way.

## Solution
Wrap toggle labels in `grid grid-cols-1 md:grid-cols-2 gap-2` for both sections:
1. Trigger conditions (3 toggles) → 2-column grid
2. Treatment decisions (6 toggles) → 2-column grid

## Files
- `frontend/src/features/additional-documents/components/LivingWillForm.tsx` (TreatmentStep)

## Tasks
- [ ] Task 1: Replace `space-y-2` with `grid grid-cols-1 md:grid-cols-2 gap-2` for both toggle sections in TreatmentStep
