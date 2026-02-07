---
phase: 07-payment-download
plan: 01
subsystem: payment-data-layer
tags: [payment, model, migration, config, payfast, schemas]
dependency_graph:
  requires: [05-01, 06-01]
  provides: [payment-model, payment-schemas, payfast-config, email-config, download-token-config]
  affects: [07-02, 07-03, 07-04]
tech_stack:
  added: [itsdangerous, fastapi-mail]
  patterns: [SQLModel-JSONB-audit, Pydantic-schemas, Alembic-hand-written]
key_files:
  created:
    - backend/app/models/payment.py
    - backend/alembic/versions/006_add_payment_table.py
    - backend/app/schemas/payment.py
  modified:
    - backend/app/models/will.py
    - backend/app/models/__init__.py
    - backend/app/config.py
    - backend/requirements.txt
key_decisions: []
metrics:
  duration: "1m 59s"
  completed: "2026-02-07T18:57:35Z"
---

# Phase 7 Plan 1: Payment Model and Config Summary

Payment SQLModel with UUID PK, PayFast ITN fields, download token tracking, and SMTP email config for post-payment delivery.

## What Was Done

### Task 1: Payment model, Will model update, and config settings (3b7a8bc)

- Created `Payment` SQLModel with 14 columns: UUID PK, will/user FKs, merchant/PayFast payment IDs, amount, status lifecycle, JSONB ITN audit data, download token, email tracking, timestamps
- Indexes: `ix_payments_will_id` (lookup) and `ix_payments_m_payment_id` (unique constraint)
- Added `paid_at` datetime column to Will model for download gating
- Registered Payment in models `__init__.py` for Alembic discovery
- Config additions: PayFast sandbox credentials (merchant ID, key, passphrase), URLs (return, cancel, notify), will pricing (R199.00), download token settings (24h TTL), full SMTP email config with MAIL_SUPPRESS_SEND=True for dev
- Added `itsdangerous>=2.2.0` and `fastapi-mail>=1.4.0` to requirements.txt

### Task 2: Alembic migration 006 and Pydantic schemas (a810348)

- Migration 006: creates `payments` table with all columns, indexes, and FKs; adds `paid_at` to `wills`
- Down_revision correctly chains from `005_verification`
- Migration tested successfully: `alembic upgrade head` ran without errors
- Payment schemas: `PaymentInitiateRequest` (will_id), `PaymentInitiateResponse` (payment_id, m_payment_id, payfast_url, form_data), `PaymentStatusResponse` (payment_id, status, download_token), `PaymentCancelResponse` (message)

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `from app.models.payment import Payment` | PASSED |
| `Payment.__tablename__ == "payments"` | PASSED |
| `from app.schemas.payment import PaymentInitiateResponse` | PASSED |
| Migration 006 down_revision = "005_verification" | PASSED |
| Config has PAYFAST_MERCHANT_ID | PASSED |
| Config has WILL_PRICE | PASSED |
| Config has DOWNLOAD_TOKEN_MAX_AGE | PASSED |
| Config has MAIL_SERVER | PASSED |
| requirements.txt has itsdangerous | PASSED |
| requirements.txt has fastapi-mail | PASSED |
| `alembic upgrade head` runs cleanly | PASSED |

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 3b7a8bc | feat(07-01): add Payment model, config settings, and Will paid_at column |
| 2 | a810348 | feat(07-01): add migration 006 and payment Pydantic schemas |

## Self-Check: PASSED

All 3 created files exist. Both commit hashes verified in git log.
