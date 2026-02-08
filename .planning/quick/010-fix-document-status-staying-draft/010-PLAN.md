# Quick Task 010: Fix Document Status Staying Draft

## Problem
After completing a funeral wishes (or living will) form, the dashboard still shows "Draft" because react-query's global `staleTime: 5 * 60 * 1000` caches the old response and doesn't refetch on navigation back.

## Root Cause
`DocumentEditPage.handleComplete()` navigates to preview without invalidating the `['additional-documents']` query cache. When the user later returns to the dashboard, react-query serves the stale "draft" data.

## Fix
In `DocumentEditPage` (App.tsx), add `useQueryClient()` and call `queryClient.invalidateQueries({ queryKey: ['additional-documents'] })` inside `handleComplete()` before navigating.

## Files
- `frontend/src/App.tsx` — `DocumentEditPage` component

## Tasks
- [ ] Task 1: Add query cache invalidation in handleComplete
