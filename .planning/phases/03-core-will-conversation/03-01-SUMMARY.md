---
phase: "03"
plan: "01"
subsystem: "data-model"
tags: ["sqlmodel", "jsonb", "pydantic", "alembic", "will-data", "conversation"]

dependency_graph:
  requires: ["01-01", "02-02"]  # Initial schema + user table
  provides: ["will-model", "conversation-model", "will-schemas", "conversation-schemas", "migration-003"]
  affects: ["03-02", "03-03", "03-04", "03-05", "03-06", "03-07", "03-08"]

tech_stack:
  added: []
  patterns: ["JSONB section columns", "per-section conversation history", "SA-specific enums"]

key_files:
  created:
    - "backend/app/models/will.py"
    - "backend/app/models/conversation.py"
    - "backend/app/schemas/will.py"
    - "backend/app/schemas/conversation.py"
    - "backend/alembic/versions/003_add_will_and_conversation_tables.py"
  modified:
    - "backend/app/models/__init__.py"
    - "backend/app/schemas/__init__.py"

decisions:
  - id: "D-0301-01"
    description: "JSONB section columns (not single blob) for per-section queries and partial updates"
  - id: "D-0301-02"
    description: "Unique composite index on (will_id, section) enforcing one conversation per will+section"
  - id: "D-0301-03"
    description: "CASCADE delete on conversation FK -- deleting a will removes all its conversation history"

metrics:
  duration: "2m 28s"
  completed: "2026-02-06"
---

# Phase 3 Plan 01: Will Data Model Summary

**JSONB section-based Will model with 8 data columns, Conversation history per section, full Pydantic validation schemas for SA will fields, and Alembic migration 003.**

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create Will and Conversation SQLModels | b6cc677 | models/will.py, models/conversation.py, models/__init__.py |
| 2 | Create Pydantic schemas for will sections and conversation | 657d7c3 | schemas/will.py, schemas/conversation.py, schemas/__init__.py |
| 3 | Create Alembic migration 003 | 843bbe3 | alembic/versions/003_add_will_and_conversation_tables.py |

## What Was Built

### Will Model (`backend/app/models/will.py`)
- UUID primary key, `user_id` FK to `users.id`
- `will_type` (default "basic"), `status` (default "draft" -- draft/review/verified/generated)
- 8 JSONB section columns: `testator`, `marital`, `beneficiaries`, `assets`, `guardians`, `executor`, `bequests`, `residue`
- `sections_complete` JSONB dict tracking per-section completion (personal, beneficiaries, assets, guardians, executor, bequests, residue)
- `created_at`, `updated_at` timestamps with timezone
- Index on `user_id` for fast user-will lookups

### Conversation Model (`backend/app/models/conversation.py`)
- UUID primary key, `will_id` FK to `wills.id` with CASCADE delete
- `section` string identifying which will section (beneficiaries, assets, etc.)
- `messages` JSONB array of `{role, content, timestamp}` dicts
- Unique composite index on `(will_id, section)` enforcing one conversation per section
- `created_at`, `updated_at` timestamps

### Pydantic Schemas (`backend/app/schemas/will.py`, `conversation.py`)
- SA-specific enums: `MaritalStatus` (6 values), `Province` (9 SA provinces), `AssetType` (7 categories)
- Section schemas: `TestatorSchema`, `MaritalSchema`, `BeneficiarySchema`, `AssetSchema`, `GuardianSchema`, `ExecutorSchema`, `BequestSchema`, `ResidueSchema`
- API payloads: `WillCreateRequest`, `WillSectionUpdate`, `WillResponse`
- Conversation: `MessageSchema`, `ConversationRequest`, `ConversationResponse`, `SSEEvent`
- Validation: SA ID 13-digit regex, postal code 4-digit regex, share_percent 0-100 range

### Migration 003 (`backend/alembic/versions/003_add_will_and_conversation_tables.py`)
- Revision chain: `002_add_user` -> `003_will_conversation`
- Creates `wills` table with all columns, indexes, and JSONB server defaults
- Creates `conversations` table with CASCADE FK and unique composite index
- Clean `downgrade()` drops both tables

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| D-0301-01 | Separate JSONB columns per section | Enables per-section queries, validation, and partial updates without full-document locking |
| D-0301-02 | Unique (will_id, section) index | One conversation per section per will -- prevents duplicate histories |
| D-0301-03 | CASCADE delete conversations with will | Orphan conversations serve no purpose; clean deletion |

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. All models import from `app.models`: PASS
2. All schemas import from `app.schemas.will` and `app.schemas.conversation`: PASS
3. `TestatorSchema` validation with SA data (ID, province, postal code): PASS
4. Migration 003 revision chain (`002_add_user` -> `003_will_conversation`): PASS

## Next Phase Readiness

All downstream plans (03-02 through 03-08) can now build on:
- Will model for CRUD operations (03-02: will service)
- Conversation model for message persistence (03-03: conversation service)
- Pydantic schemas for API validation (03-04: API endpoints)
- Migration must be applied (`alembic upgrade head`) before runtime use

## Self-Check: PASSED
