# Quick Task 010: Summary

## Root Cause
Global react-query `staleTime: 5 * 60 * 1000` (5 min) cached the `['additional-documents']` list response. When the user completed a form (PATCH with `status: 'completed'`), the DB updated correctly, but when navigating back to the dashboard within 5 minutes, react-query served stale data showing "Draft".

## Fix
Added `queryClient.invalidateQueries({ queryKey: ['additional-documents'] })` in `DocumentEditPage.handleComplete()` (App.tsx) so the dashboard refetches fresh data with the updated status when the user returns.

## Files Changed
- `frontend/src/App.tsx` — Added `useQueryClient` import and cache invalidation in `handleComplete`
