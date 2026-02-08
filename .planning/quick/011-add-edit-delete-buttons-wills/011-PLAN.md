# Quick Task 011: Add Edit & Delete Buttons to Your Wills Section

## Problem
Will cards on dashboard only have "Resume Draft" button. Need Edit & Delete like additional documents have.

## Tasks
- [ ] Task 1: Add `delete_will` method to WillService + DELETE endpoint to will API
- [ ] Task 2: Add `deleteWill` to frontend API client
- [ ] Task 3: Add Edit & Delete buttons to WillCard with confirm dialog (match AdditionalDocuments pattern)

## Files
- `backend/app/services/will_service.py` — add delete_will method
- `backend/app/api/will.py` — add DELETE endpoint
- `frontend/src/services/api.ts` — add deleteWill
- `frontend/src/features/will/components/WillDashboard.tsx` — add buttons + useMutation
