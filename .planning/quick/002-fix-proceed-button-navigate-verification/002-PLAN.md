# Quick Task 002: Fix "Looks Good — Proceed" button navigation

## Problem
ReviewChat's "Looks Good — Proceed" button shows placeholder message "The verification phase will be available soon" instead of navigating to the verification step (which is already implemented in Phase 5).

## Task
1. Replace placeholder onClick handler with `onNavigateToSection('verification')` call

## Files
- `frontend/src/features/will/components/ReviewChat.tsx` — line ~250
