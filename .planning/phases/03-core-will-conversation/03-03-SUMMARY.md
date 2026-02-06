---
phase: "03"
plan: "03"
subsystem: "frontend-will-data"
tags: ["zustand", "immer", "zod", "react-hook-form", "typescript", "will-state", "form-validation"]

dependency_graph:
  requires: ["02.1-01"]  # DaisyUI + frontend scaffold
  provides: ["will-types", "will-store", "will-schemas", "will-progress-hook"]
  affects: ["03-04", "03-05", "03-06", "03-07", "03-08"]

tech_stack:
  added: ["zustand@5.0.11", "immer@11.1.3", "react-hook-form@7.71.1", "@hookform/resolvers@5.2.2", "zod@4.3.6"]
  patterns: ["Zustand persist+immer middleware", "Zod v4 superRefine for conditional validation", "SA-specific regex validation"]

key_files:
  created:
    - "frontend/src/features/will/types/will.ts"
    - "frontend/src/features/will/store/useWillStore.ts"
    - "frontend/src/features/will/schemas/willSchemas.ts"
    - "frontend/src/features/will/hooks/useWillProgress.ts"
  modified:
    - "frontend/package.json"

decisions:
  - id: "D-0303-01"
    decision: "Zod v4 over v3 -- installed latest (v4.3.6) which uses same API surface but with native ESM"
    rationale: "npm default resolution; hookform/resolvers supports ^3.25 || ^4.0; no API breaking changes for our patterns"

metrics:
  duration: "3m 30s"
  completed: "2026-02-06"
---

# Phase 3 Plan 3: Frontend Foundation Summary

Zustand store with persist+immer middleware persisting to localStorage 'wdi-will-draft', TypeScript interfaces for all 8 will sections, Zod v4 schemas with SA-specific validation (13-digit ID, 4-digit postal code, conditional spouse fields), and useWillProgress hook tracking section completion with canReview gate.

## What Was Done

### Task 1: Install frontend dependencies
Installed 5 npm packages into frontend:
- **zustand** v5.0.11 -- state management with persist middleware for localStorage crash recovery
- **immer** v11.1.3 -- immutable nested updates for beneficiaries[], assets[], etc.
- **react-hook-form** v7.71.1 -- performant form handling for testator/marital sections
- **@hookform/resolvers** v5.2.2 -- bridges Zod schemas to React Hook Form
- **zod** v4.3.6 -- schema validation for forms and API

### Task 2: Create will types, store, schemas, and progress hook

**Types** (`types/will.ts`):
- Const-object enums: MaritalStatus (6 values), Province (9 SA provinces), AssetType (7 categories)
- Interfaces: Testator, MaritalInfo, Beneficiary, Asset, Guardian, ExecutorInfo, Bequest, ResidueBeneficiary, ResidueInfo
- Section tracking: WILL_SECTIONS tuple (8 sections), WillSection type, SectionsComplete record
- Store contract: WillState (data) + WillActions (17 mutation methods)

**Store** (`store/useWillStore.ts`):
- `create<WillState & WillActions>()(persist(immer(...), { name: 'wdi-will-draft' }))`
- All actions use immer's `set()` for safe nested mutations
- Array operations: push (add), filter (remove), findIndex+assign (update)
- resetWill replaces entire state with initialState

**Schemas** (`schemas/willSchemas.ts`):
- testatorSchema: 10 fields, SA ID 13-digit regex, 4-digit postal code, province enum, optional email
- maritalSchema: superRefine for conditional spouse fields (required when married_*)
- beneficiarySchema, assetSchema, guardianSchema, executorSchema, bequestSchema, residueSchema
- All schemas export inferred types: `type XxxFormData = z.infer<typeof xxxSchema>`

**Progress Hook** (`hooks/useWillProgress.ts`):
- Derives from useWillStore via selective subscriptions (sectionsComplete, currentSection)
- Returns: sections[] (8 entries with key/label/isComplete/isCurrent), completedCount, totalSections (7), isAllComplete, canReview
- canReview requires: personal + beneficiaries + executor + residue all complete
- Memoized with useMemo for performance

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install frontend dependencies | 2e9d4f0 | frontend/package.json |
| 2 | Create will data foundation | 933d113 | types/will.ts, store/useWillStore.ts, schemas/willSchemas.ts, hooks/useWillProgress.ts |

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0303-01 | Zod v4 (4.3.6) over v3 | npm resolved to v4 which is latest; @hookform/resolvers supports zod ^3.25 or ^4.0; same API surface for z.object/z.string/z.enum/z.infer/superRefine |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `npm ls` confirms all 5 packages installed
2. `npx tsc --noEmit` passes with zero errors
3. Store key `wdi-will-draft` present in useWillStore.ts
4. SA ID regex `^\d{13}$` present in willSchemas.ts
5. Postal code regex `^\d{4}$` present in willSchemas.ts
6. Conditional spouse validation via superRefine confirmed

## Next Phase Readiness

**Ready for Plans 03-04 through 03-08:**
- Types are exported and importable by PersonalForm, MaritalForm, ChatSection, WillWizard components
- Store actions cover all CRUD operations needed by conversation and form sections
- Schemas ready for React Hook Form integration via `zodResolver(testatorSchema)`
- Progress hook ready for StepIndicator component

**No blockers.** All dependencies resolved, types compile clean.

## Self-Check: PASSED
