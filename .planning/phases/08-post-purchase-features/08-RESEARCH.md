# Phase 8: Post-Purchase Features - Research

**Researched:** 2026-02-07
**Domain:** Session persistence, auto-save, will versioning, resume flow, re-generation without payment
**Confidence:** HIGH

## Summary

Phase 8 builds upon the existing will creation and payment infrastructure to add four post-purchase capabilities: (1) auto-save at any point during will creation, (2) resume from where the user left off, (3) unlimited updates after initial purchase, and (4) PDF re-generation without additional payment.

The existing codebase already has significant infrastructure that Phase 8 can leverage. The backend stores all will data in JSONB columns on the `wills` table, conversation history is persisted per-section in the `conversations` table, and the Zustand store uses `persist` middleware to maintain state in localStorage. However, there is a critical **sync gap**: the current flow only syncs form-based sections (testator/marital) to the DB at will creation time and when entering review/verification. AI-section data is auto-extracted and saved to the DB after each AI response (via `stream_ai_response`), but the frontend Zustand store `sectionsComplete` and `currentSection` are **only in localStorage** -- they are never persisted to the backend. The `sections_complete` column exists on the Will model but the `markSectionComplete` backend API is never actually called by the WillWizard. This means resume-from-where-you-left-off requires fixing this sync gap.

The Will model already has `sections_complete` (JSONB dict), `status` (draft/review/verified/generated), and `paid_at` (timestamp). The Payment model tracks `status` (completed) and `download_token`. These provide the foundation for determining whether a will is "paid" and can be updated/re-generated without payment.

**Primary recommendation:** Fix the Zustand-to-DB sync gap for `sectionsComplete` and `currentSection`, add a will-list/dashboard endpoint and UI, implement a "load will" flow that hydrates Zustand from the DB, add a `version` counter to the Will model for tracking updates, and add a re-generate endpoint that bypasses payment gating for already-paid wills.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand persist | 5.x (existing) | Client-side state persistence in localStorage | Already in use; provides the offline/draft foundation |
| SQLModel/SQLAlchemy | existing | Will model with JSONB section columns | Already in use; JSONB enables per-section partial updates without migrations |
| Alembic | existing | DB schema migrations | Already in use; needed for new columns (version, current_section) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | existing | Route-based navigation for dashboard vs wizard | Already in use; add `/dashboard` route |
| @tanstack/react-query | existing | Server state management for will list | Already installed; ideal for dashboard data fetching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand persist for drafts | Server-only saves | Would require constant network; offline drafts are a feature |
| Polling for auto-save | Debounced writes on change | Polling is simpler but wasteful; debounce on state change is better for UX |
| Version integer column | Full will snapshots table | Snapshots provide full history but add storage complexity; version counter is sufficient for "has been updated" tracking |

**Installation:**
```bash
# No new dependencies -- all existing libraries cover the needs
```

## Architecture Patterns

### Recommended Project Structure (additions to existing)
```
backend/app/
├── api/
│   └── will.py              # Add: GET /api/wills (list), GET /api/wills/{id}/resume
├── models/
│   └── will.py              # Add: version (int), current_section (str)
├── services/
│   └── will_service.py      # Add: resume_will(), increment_version()
└── alembic/versions/
    └── 007_add_will_versioning.py  # version, current_section columns

frontend/src/
├── features/will/
│   ├── components/
│   │   ├── WillDashboard.tsx      # New: list user's wills, resume/create actions
│   │   └── WillWizard.tsx         # Modified: auto-save, load-from-DB, sync sectionsComplete
│   ├── hooks/
│   │   └── useAutoSave.ts         # New: debounced save hook
│   └── store/
│       └── useWillStore.ts        # Modified: add loadFromServer action
├── App.tsx                         # Modified: add /dashboard route
└── services/
    └── api.ts                      # Add: listWills, resumeWill, regeneratePdf
```

### Pattern 1: Bidirectional State Sync (Zustand <-> DB)
**What:** The current flow has a one-way gap: Zustand persists to localStorage but `sectionsComplete` and `currentSection` only live locally. The DB has `sections_complete` and needs `current_section`. Phase 8 must close this gap.
**When to use:** Every time a section is completed or the user navigates to a new section.

**Current state (the gap):**
- `WillWizard.handleNextSection()` calls `markSectionComplete(currentSection)` on the **Zustand store only**
- The backend `markSectionComplete` API endpoint exists but is **never called** by the frontend
- `currentSection` is only in Zustand localStorage -- not persisted to DB
- AI sections auto-extract data to DB via `stream_ai_response`, but form sections (personal/marital) only sync on will creation and review entry

**Fix:** After every Zustand `markSectionComplete`, also call `POST /api/wills/{id}/sections/{section}/complete`. After every `setCurrentSection`, call a new `PATCH /api/wills/{id}/current-section` endpoint. This ensures the DB always reflects the user's progress.

### Pattern 2: Will Hydration from DB (Resume Flow)
**What:** When a user returns and selects a will to resume, the frontend must load all will data from the DB into the Zustand store (reverse of the current flow).
**When to use:** Dashboard "Resume" action, or auto-detect on app load.

**Flow:**
1. User visits `/dashboard` or `/` (authenticated)
2. Frontend calls `GET /api/wills` to list user's wills
3. User clicks "Resume" on a draft will
4. Frontend calls `GET /api/wills/{id}` to get full will data
5. Zustand store is hydrated: `testator`, `marital`, `beneficiaries`, `assets`, etc. are loaded from the DB response
6. `currentSection` is set from the DB's `current_section` column
7. `sectionsComplete` is loaded from DB's `sections_complete`
8. User is navigated to `/will` with the wizard at the correct section

**Key concern:** The Zustand store uses camelCase (frontend convention) but the DB uses snake_case. A `snakeToCamel` mapper is needed during hydration (inverse of the existing `toSnakeCase` in WillWizard).

### Pattern 3: Debounced Auto-Save
**What:** Save will progress to the backend after a brief debounce period following any state change, without requiring the user to click "Save".
**When to use:** Form-based sections (personal, marital) where user is typing.

**Strategy:**
- AI sections already auto-save via the conversation service (`stream_ai_response` + auto-extraction)
- Form sections need a debounced save: after 2-3 seconds of inactivity, sync the current form data to the backend
- Section completion is saved immediately (no debounce) since it's a discrete event
- The `updated_at` timestamp on the Will model already tracks last modification

**Implementation approach:**
```typescript
// useAutoSave.ts - custom hook
function useAutoSave(willId: string | null, data: unknown, section: string, delay = 2000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!willId) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      await updateWillSection(willId, section, toSnakeCase(data))
    }, delay)
    return () => clearTimeout(timeoutRef.current)
  }, [willId, data, section, delay])
}
```

### Pattern 4: Post-Purchase Update Flow (No Re-Payment)
**What:** After a will is paid for (`paid_at` is set), the user can edit sections, re-verify, and re-generate the PDF without paying again.
**When to use:** Any time a user returns to update an already-purchased will.

**Flow:**
1. User opens a will where `paid_at` is not null
2. Will status is reset from "generated" back to "draft" (or a new "updating" status)
3. User edits sections as normal
4. Verification runs again (mandatory before re-generation)
5. PDF generation is allowed without payment gating
6. Will version is incremented
7. A new download token is generated (old one may have expired)

**Backend logic:**
- The current `initiate_payment` endpoint checks `will.status in {"generated", "verified"}`. For re-generation, we need a separate endpoint or a bypass: `POST /api/wills/{id}/regenerate` that checks `will.paid_at is not None` instead of payment status.
- The download endpoint already generates PDF on-the-fly from current will data, so re-generation with updated data is automatic.

### Pattern 5: Will Versioning
**What:** Track how many times a will has been updated with a simple integer counter.
**When to use:** Every time a paid will is modified and re-generated.

**Implementation:**
- Add `version: int = 1` to the Will model (default 1 for new wills)
- Increment version when: (a) a paid will enters edit mode, and (b) a new PDF is generated after edits
- Version is informational -- displayed in the dashboard and in the PDF document reference
- No need for full snapshot history (would be over-engineering for the current requirements)

### Anti-Patterns to Avoid
- **Saving on every keystroke**: Use debounce (2-3s). Saving on every change creates excessive API calls and DB writes.
- **Trusting localStorage as source of truth for resume**: localStorage can be cleared by the user or browser. The DB must be the authoritative source for resume. localStorage is a performance optimization (avoids loading spinner on current session).
- **Resetting the entire will on edit**: When a user updates a paid will, preserve all existing data. Only the modified sections should change. The JSONB per-section model supports this well.
- **Creating a new will record for updates**: Updates should modify the existing will record, not create a new one. The version counter tracks the update count.
- **Generating new payment records for updates**: Post-purchase updates are free. The system must check `paid_at` before requiring payment.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Debounced auto-save | Custom timer management | Simple `useEffect` + `setTimeout` pattern (or `useDebouncedCallback` from `use-debounce`) | Timer cleanup is error-prone; standard debounce patterns handle unmounting and dependency changes |
| Will list/dashboard | Complex state management | `@tanstack/react-query` (already installed) | Handles caching, refetching, loading/error states for server data |
| Snake/camel case conversion | Manual field mapping | Systematic mapper functions | One place for the mapping logic, not scattered across components |
| Progress detection | Manual section-by-section checks | Use existing `sections_complete` JSONB + `current_section` | Already have the data structure; just need to sync it |

**Key insight:** The existing infrastructure covers 80% of Phase 8's needs. The main work is closing the sync gap between frontend state and backend state, and adding the dashboard/resume UI.

## Common Pitfalls

### Pitfall 1: Zustand localStorage Stale After DB Update
**What goes wrong:** User has an old will in localStorage from a previous session. On resume, Zustand hydrates from stale localStorage instead of fresh DB data.
**Why it happens:** Zustand `persist` middleware auto-loads from localStorage on mount, before any API call can fetch fresh data.
**How to avoid:**
- On resume, explicitly call the "load from server" action which overwrites the Zustand state
- When loading a specific will by ID, always fetch from DB and hydrate Zustand, not the other way around
- Consider clearing the Zustand persist storage key (`wdi-will-draft`) before hydrating from DB
**Warning signs:** User sees old data even after making changes on another device.

### Pitfall 2: Race Between Auto-Save and Section Navigation
**What goes wrong:** User clicks "Next Section" before the auto-save debounce fires, data is lost.
**Why it happens:** Debounced save has a 2-3 second delay; user may navigate faster.
**How to avoid:**
- On section navigation, flush any pending auto-save immediately (cancel debounce, trigger immediate save)
- The `handleNextSection` in WillWizard already calls `extractConversationData` and `markSectionComplete` -- add an immediate form-section sync before these
**Warning signs:** Data appears saved locally but is missing on resume from another session.

### Pitfall 3: Multiple Concurrent Auto-Saves Cause JSONB Conflicts
**What goes wrong:** Two auto-save requests overlap; the second overwrites the first with stale data.
**Why it happens:** Debounced saves are not serialized; network latency can cause overlap.
**How to avoid:**
- Use a single in-flight request tracker (abort previous if new one starts)
- Each auto-save only writes to its specific section column (not the entire will)
- The JSONB per-section model (D-0301-01) naturally prevents cross-section conflicts
**Warning signs:** Data reverts to old values intermittently.

### Pitfall 4: Paid Will Edit Breaks Download Token
**What goes wrong:** User edits a paid will; the existing download token still generates the OLD PDF (if cached) or the token expires before re-generation.
**Why it happens:** Download tokens encode `will_id` + `payment_id` and are time-limited (24h).
**How to avoid:**
- Re-generation creates a new download token (new `payment_id` is NOT needed; reuse the original completed payment)
- The download endpoint already generates PDF on-the-fly from current will data, so it naturally serves updated content
- Option: extend token expiry or generate a new token on re-generation
**Warning signs:** Downloaded PDF shows old data despite recent edits.

### Pitfall 5: Status Flow Confusion for Paid Will Updates
**What goes wrong:** A paid will has status "generated" and `paid_at` set. User edits it. What status should it be?
**Why it happens:** Current status flow is linear: `draft -> review -> verified -> generated`. There's no "updating" concept.
**How to avoid:**
- When a paid will enters edit mode, reset status to "draft" but keep `paid_at` intact
- The payment gate checks `paid_at` not `status` for re-generation eligibility
- Add a clear distinction: `status` tracks the editing workflow; `paid_at` tracks the payment lifecycle
- Never clear `paid_at` on edit -- once paid, always paid
**Warning signs:** User gets "payment required" error when trying to re-generate an already-paid will.

### Pitfall 6: Creating Duplicate Wills on Re-Visit
**What goes wrong:** User returns to `/will` and the `ensureWillExists` logic creates a new will instead of loading the existing one.
**Why it happens:** `ensureWillExists` in WillWizard only checks if `willId` is in Zustand. If localStorage was cleared but the user has a will in the DB, a duplicate is created.
**How to avoid:**
- Before creating a new will, check the backend: `GET /api/wills` to see if the user has any existing draft wills
- If an existing draft exists, offer to resume it (dashboard) rather than silently creating a new one
- The dashboard becomes the entry point, not direct navigation to `/will`
**Warning signs:** User has multiple draft wills in the DB, most empty.

## Code Examples

### Backend: Resume Will Endpoint
```python
@router.get("/api/wills/{will_id}/resume")
async def resume_will(
    will_id: uuid.UUID,
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Return full will data for frontend hydration on resume."""
    user_id = _extract_user_id(request)
    will = await service.get_will(will_id, user_id)

    # Include conversation sections that have history
    # (so frontend knows which sections to show as "started")
    return WillResumeResponse(
        **will.model_dump(),
        has_conversation={section: True for section in _get_active_conversation_sections(will_id)},
    )
```

### Backend: Save Current Section
```python
@router.patch("/api/wills/{will_id}/current-section")
async def update_current_section(
    will_id: uuid.UUID,
    body: CurrentSectionUpdate,  # {"current_section": "beneficiaries"}
    request: Request,
    service: WillService = Depends(get_will_service),
):
    """Persist the user's current wizard position for resume."""
    user_id = _extract_user_id(request)
    return await service.update_current_section(will_id, user_id, body.current_section)
```

### Backend: Re-Generate for Paid Will
```python
@router.post("/api/wills/{will_id}/regenerate")
async def regenerate_will(
    will_id: uuid.UUID,
    request: Request,
    will_service: WillService = Depends(get_will_service),
    doc_service: DocumentGenerationService = Depends(get_document_service),
    session: AsyncSession = Depends(get_session),
):
    """Re-generate PDF for an already-paid will without new payment.

    Checks paid_at is set, generates new download token, increments version.
    """
    user_id = _extract_user_id(request)
    will = await will_service.get_will(will_id, user_id)

    if will.paid_at is None:
        raise HTTPException(status_code=402, detail="Payment required")

    if will.status != "verified":
        raise HTTPException(status_code=400, detail="Will must be re-verified before regeneration")

    # Increment version
    will.version = (will.version or 1) + 1
    will.status = "generated"

    # Find the original completed payment for this will
    stmt = select(Payment).where(
        Payment.will_id == will_id,
        Payment.status == "completed",
    ).order_by(Payment.created_at.desc())
    result = await session.exec(stmt)
    payment = result.first()

    if payment is None:
        raise HTTPException(status_code=400, detail="No completed payment found")

    # Generate new download token
    new_token = generate_download_token(str(will_id), str(payment.id))
    payment.download_token = new_token

    session.add(will)
    session.add(payment)
    await session.flush()

    return {"download_token": new_token, "version": will.version}
```

### Frontend: Load Will Into Zustand Store
```typescript
// In useWillStore.ts - add loadFromServer action
loadFromServer: (will: WillResponse) =>
  set((state) => {
    state.willId = will.id
    state.testator = snakeToCamel(will.testator) as Partial<Testator>
    state.marital = snakeToCamel(will.marital) as Partial<MaritalInfo>
    state.beneficiaries = will.beneficiaries.map(b => snakeToCamel(b)) as Beneficiary[]
    state.assets = will.assets.map(a => snakeToCamel(a)) as Asset[]
    state.guardians = will.guardians.map(g => snakeToCamel(g)) as Guardian[]
    state.executor = snakeToCamel(will.executor) as Partial<ExecutorInfo>
    state.bequests = will.bequests.map(b => snakeToCamel(b)) as Bequest[]
    state.residue = snakeToCamel(will.residue) as Partial<ResidueInfo>
    state.trustProvisions = snakeToCamel(will.trust_provisions) as Partial<TrustProvisions>
    state.usufruct = snakeToCamel(will.usufruct) as Partial<UsufructProvision>
    state.businessAssets = will.business_assets.map(b => snakeToCamel(b)) as BusinessAssetDetail[]
    state.jointWill = snakeToCamel(will.joint_will) as Partial<JointWillConfig>
    state.scenarios = will.scenarios as ComplexScenario[]
    state.sectionsComplete = will.sections_complete
    // current_section loaded from DB
    state.currentSection = (will.current_section || 'personal') as WillSection
  }),
```

### Frontend: Debounced Auto-Save Hook
```typescript
// hooks/useAutoSave.ts
import { useEffect, useRef } from 'react'
import { updateWillSection } from '../../../services/api'

export function useAutoSave(
  willId: string | null,
  section: string,
  data: Record<string, unknown>,
  delay = 2000,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!willId) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        await updateWillSection(willId, section, dataRef.current)
      } catch (err) {
        console.error(`Auto-save failed for ${section}:`, err)
      }
    }, delay)

    return () => clearTimeout(timeoutRef.current)
  }, [willId, section, JSON.stringify(data), delay])

  // Flush function for immediate save (e.g., before navigation)
  const flush = async () => {
    clearTimeout(timeoutRef.current)
    if (willId) {
      await updateWillSection(willId, section, dataRef.current)
    }
  }

  return { flush }
}
```

### Frontend: Will Dashboard Component (Sketch)
```tsx
function WillDashboard() {
  const { data: wills, isLoading } = useQuery({
    queryKey: ['wills'],
    queryFn: () => listWills(),
  })
  const navigate = useNavigate()
  const loadFromServer = useWillStore(s => s.loadFromServer)
  const resetWill = useWillStore(s => s.resetWill)

  const handleResume = async (willId: string) => {
    const will = await getWill(willId)
    loadFromServer(will)
    navigate('/will')
  }

  const handleCreateNew = () => {
    resetWill()
    navigate('/will')
  }

  return (
    <div>
      <h2>Your Wills</h2>
      {wills?.map(will => (
        <div key={will.id} className="card">
          <p>Status: {will.status} {will.paid_at ? '(Paid)' : '(Draft)'}</p>
          <p>Last updated: {will.updated_at}</p>
          <p>Version: {will.version || 1}</p>
          <button onClick={() => handleResume(will.id)}>
            {will.paid_at ? 'Update Will' : 'Resume Draft'}
          </button>
          {will.paid_at && <button>Download Latest</button>}
        </div>
      ))}
      <button onClick={handleCreateNew}>Create New Will</button>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual "Save" buttons | Debounced auto-save + auto-extraction | Standard for modern SPA forms | Users never lose work; reduces friction |
| Full document snapshots for versioning | Version counter + on-the-fly regeneration | Common in SaaS document tools | Simpler storage; PDF always reflects latest data |
| Separate "update" purchase | Unlimited updates included in initial price | SaaS best practice for document services | Better user trust; simpler payment model |
| Browser-only state | Server-authoritative with local cache | Standard for multi-device SPA apps | Resume works across devices; data survives browser resets |

**Deprecated/outdated:**
- Relying solely on localStorage for persistence is inadequate for a paid product. Users expect data to survive across devices and browser clears.

## Existing Infrastructure Audit

### What Already Works for Phase 8
| Component | Current State | Phase 8 Use |
|-----------|---------------|-------------|
| `Will.sections_complete` (JSONB) | Exists in DB, never written to by frontend | Resume: load section progress from DB |
| `Will.paid_at` (DateTime) | Set on ITN completion | Gate: free re-generation check |
| `Will.status` (String) | draft/review/verified/generated | Track editing workflow |
| `Will.updated_at` (DateTime) | Auto-updated on every change | Dashboard: show "last edited" |
| `GET /api/wills` endpoint | Exists, lists user's wills | Dashboard: show all wills |
| `GET /api/wills/{id}` endpoint | Returns full will data | Resume: hydrate Zustand from DB |
| `PATCH /api/wills/{id}/sections/{section}` | Updates any section | Auto-save: write section data |
| `POST /api/wills/{id}/sections/{section}/complete` | Marks section done in DB | Sync: mirror Zustand markSectionComplete |
| Zustand persist middleware | Saves to localStorage as `wdi-will-draft` | Offline draft cache |
| `DocumentGenerationService.generate_final()` | Generates PDF on-the-fly from will data | Re-generation: always uses latest data |
| Conversation per-section history | Persisted in conversations table | Resume: chat history restored automatically |
| `useConversation` hook | Loads history on mount via `getConversationHistory` | Resume: already works for AI sections |

### What Needs to Be Added
| Component | What's Missing | Plan |
|-----------|---------------|------|
| `Will.version` (int) | Does not exist | Migration 007: add column, default 1 |
| `Will.current_section` (str) | Does not exist | Migration 007: add column, default 'personal' |
| `PATCH /api/wills/{id}/current-section` | No endpoint | New endpoint in will.py |
| `POST /api/wills/{id}/regenerate` | No endpoint | New endpoint: bypasses payment for paid wills |
| `loadFromServer` Zustand action | No way to hydrate from API | New store action: overwrites local state |
| `snakeToCamel` utility | Only `toSnakeCase` exists | New utility function (inverse of existing) |
| `useAutoSave` hook | No auto-save for form sections | New hook: debounced PATCH to backend |
| `WillDashboard` component | No dashboard/will-list UI | New page: list wills, resume, create |
| `/dashboard` route | No route | Add to App.tsx |
| Frontend `markSectionComplete` DB sync | Zustand-only today | Call backend API on completion |
| Frontend `setCurrentSection` DB sync | Zustand-only today | Call backend API on section change |

### What Needs to Be Modified
| Component | Current Behavior | Needed Change |
|-----------|-----------------|---------------|
| `WillWizard.handleNextSection` | Only marks section in Zustand | Also call backend `markSectionComplete` |
| `WillWizard.setCurrentSection` | Only updates Zustand | Also call backend `updateCurrentSection` |
| `WillWizard.ensureWillExists` | Creates new will if no willId | Check backend for existing drafts first |
| `MainContent` (App.tsx) | Shows "Create Your Will" link | Show dashboard with existing wills |
| `PaymentPage` / payment API | Requires payment for every generation | Check `paid_at` to allow free re-generation |
| `WillResponse` schema | Missing version, current_section | Add new fields to response |
| `DocumentPreviewPage` | "Proceed to Payment" always | Conditional: "Proceed to Payment" vs "Re-generate" based on `paid_at` |
| Download endpoint | Token has 24h expiry | For re-generation, create new token |

## Data Model Changes

### New Columns (Migration 007)
```python
# Will model additions
version: int = Field(
    default=1,
    sa_column=Column(Integer, nullable=False, server_default="1"),
)
current_section: str = Field(
    default="personal",
    sa_column=Column(String(50), nullable=False, server_default="personal"),
)
```

### Will Status Flow (Updated)
```
New will:     draft -> review -> verified -> generated -> [payment] -> paid (paid_at set)
Post-purchase: draft -> review -> verified -> generated (paid_at stays set, version incremented)
```

The `status` field tracks editing workflow. The `paid_at` field is the authoritative payment indicator and is never cleared once set.

## Open Questions

1. **Multiple wills per user**
   - What we know: The `list_user_wills` endpoint already supports multiple wills per user. The frontend currently only works with one will at a time.
   - What's unclear: Should users be allowed to create multiple wills, or should the system enforce one active will per user?
   - Recommendation: Allow multiple wills (the DB already supports it). The dashboard shows all wills. A user might want to replace their will entirely by creating a new one after paying for the first. The "unlimited updates" requirement (AUTH-06) applies per-will.

2. **Dashboard as new home vs. existing landing**
   - What we know: Currently, authenticated users see "Create Your Will" button on `/`.
   - What's unclear: Should the dashboard replace the landing page for authenticated users, or be a separate route?
   - Recommendation: Replace the `MainContent` component with a `WillDashboard` for authenticated users. If no wills exist, show the "Create Your Will" CTA. If wills exist, show the list with resume/create options.

3. **Auto-save indicator in UI**
   - What we know: Users expect feedback that their work is being saved.
   - What's unclear: Should there be a visible "Saving..." / "Saved" indicator?
   - Recommendation: Add a subtle status indicator (e.g., in the navbar or near the step indicator) showing "Saving..." during auto-save and "All changes saved" after. This is important for user trust.

4. **Cross-device resume**
   - What we know: DB-backed state enables cross-device resume. Zustand localStorage is device-specific.
   - What's unclear: How to handle conflicts when localStorage has different data than the DB.
   - Recommendation: On resume, DB data always wins. Clear localStorage will state and hydrate from DB. This avoids merge conflicts.

5. **Will update notification to user**
   - What we know: After re-generation, a new download token is created.
   - What's unclear: Should an email be sent with the new download link on re-generation?
   - Recommendation: Yes, reuse the existing email service to send a "Your updated will is ready" email with the new download link.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Full review of all models, services, APIs, frontend components, and store
- Zustand persist middleware: Already in use, behavior verified from `useWillStore.ts`
- Existing `Will` model: `sections_complete`, `paid_at`, `status` columns verified
- Existing API endpoints: `GET /api/wills`, `PATCH /api/wills/{id}/sections/{section}`, `POST /api/wills/{id}/sections/{section}/complete` all exist and work

### Secondary (MEDIUM confidence)
- Debounced auto-save pattern: Standard React pattern, well-documented in React docs and community
- Version counter pattern: Common SaaS pattern for document versioning without full snapshots

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all existing tools cover requirements
- Architecture: HIGH - Direct codebase analysis; clear understanding of gaps and fixes needed
- Pitfalls: HIGH - Based on actual codebase state (Zustand-DB sync gap, localStorage staleness, status flow)
- Resume flow: HIGH - Existing endpoints provide the data; only hydration logic is new
- Re-generation flow: MEDIUM - Requires careful handling of payment gating and token lifecycle

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days -- all based on stable existing architecture)
