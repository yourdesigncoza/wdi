---
phase: 07-payment-download
verified: 2026-02-07T19:30:01Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 7: Payment & Download Verification Report

**Phase Goal:** Users can pay and download their completed will document
**Verified:** 2026-02-07T19:30:01Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User must complete PayFast payment before downloading PDF | ✓ VERIFIED | Payment model tracks lifecycle, download endpoint validates token + payment status = "completed", paid_at gate on Will model |
| 2 | User receives download link immediately after successful payment | ✓ VERIFIED | PaymentReturnPage polls every 3s, ITN handler generates token on COMPLETE status. **Infrastructure note:** ITN webhook requires public URL; localhost polling times out in dev but code is correct |
| 3 | User receives email with download link as backup | ✓ VERIFIED | ITN handler fires asyncio.create_task(send_download_email(...)) on payment completion. **Infrastructure note:** MAIL_SUPPRESS_SEND=True in dev prevents actual sending; email service code is wired correctly |
| 4 | Download links are secure and time-limited | ✓ VERIFIED | itsdangerous URLSafeTimedSerializer with 24h expiry, token verified before PDF generation, download endpoint validates token matches payment record |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/models/payment.py` | Payment SQLModel with lifecycle fields | ✓ VERIFIED | 99 lines, all required fields (id, will_id, user_id, m_payment_id, pf_payment_id, amount, status, itn_data, download_token, email_sent, email_sent_at, timestamps), ForeignKey to wills.id, indexes on will_id and m_payment_id (unique) |
| `backend/alembic/versions/006_add_payment_table.py` | Migration creates payments table + paid_at on wills | ✓ VERIFIED | 102 lines, creates payments table with all columns, indexes, adds paid_at to wills, proper upgrade/downgrade |
| `backend/app/schemas/payment.py` | Pydantic request/response schemas | ✓ VERIFIED | 44 lines, PaymentInitiateRequest, PaymentInitiateResponse, PaymentStatusResponse, PaymentCancelResponse |
| `backend/app/config.py` | PayFast, email, download token settings | ✓ VERIFIED | All settings present: PAYFAST_* (7 settings), WILL_PRICE, DOWNLOAD_TOKEN_* (2 settings), MAIL_* (9 settings) |
| `backend/app/services/payfast_service.py` | PayFast signature generation + ITN validation | ✓ VERIFIED | 209 lines, generate_signature with MD5, build_payment_form_data, validate_itn_signature with hmac.compare_digest (timing-safe), is_valid_payfast_ip, async validate_itn_server_confirmation |
| `backend/app/services/download_service.py` | Time-limited download token management | ✓ VERIFIED | 53 lines, generate_download_token with URLSafeTimedSerializer, verify_download_token with max_age check |
| `backend/app/services/email_service.py` | Async email sending with fastapi-mail | ✓ VERIFIED | 67 lines, send_download_email with Jinja2 template, SUPPRESS_SEND support |
| `backend/app/templates/email/download_ready.html` | HTML email template | ✓ VERIFIED | 77 lines, testator_name and download_url variables, professional inline-CSS design, 24h expiry notice, witness signing reminder |
| `backend/app/api/payment.py` | Payment initiation, ITN webhook, status endpoints | ✓ VERIFIED | 276 lines, 3 endpoints: POST /initiate (creates payment + returns form data), POST /notify (ITN with 4-step validation + idempotent processing), GET /{id}/status (polling) |
| `backend/app/api/download.py` | Secure download endpoint with token verification | ✓ VERIFIED | 71 lines, GET /{token} validates token, checks payment status, generates final PDF, returns as attachment |
| `backend/app/main.py` | Router registration for payment and download | ✓ VERIFIED | Lines 83-84: app.include_router(payment.router) and app.include_router(download.router) |
| `backend/app/middleware/popia_consent.py` | ITN webhook + download in skip list | ✓ VERIFIED | Lines 27, 37: /api/payment/notify and /api/download/ in unprotected paths |
| `backend/app/middleware/clerk_auth.py` | ITN webhook + download in skip list | ✓ VERIFIED | Lines 30, 40: /api/payment/notify and /api/download/ in unprotected paths |
| `frontend/src/services/api.ts` | Payment API functions | ✓ VERIFIED | Lines 288, 295, 300: initiatePayment, getPaymentStatus, downloadWill (returns blob) |
| `frontend/src/features/will/types/will.ts` | Payment section in WILL_SECTIONS | ✓ VERIFIED | Line 190: 'payment' in WILL_SECTIONS array |
| `frontend/src/features/will/components/PaymentPage.tsx` | PayFast hidden form auto-submit | ✓ VERIFIED | 154 lines, initiatePayment call, formRef for hidden form, Pay Now button triggers submit, stores payment_id in localStorage |
| `frontend/src/features/will/components/PaymentReturnPage.tsx` | Post-payment polling and download link | ✓ VERIFIED | 247 lines, polls getPaymentStatus every 3s (max 10 attempts), 4 states (polling, completed, timeout, error), Link to /download/{token} |
| `frontend/src/features/will/components/PaymentCancelPage.tsx` | Payment cancellation with retry option | ✓ VERIFIED | 52 lines, cancel message, Link to /will for retry |
| `frontend/src/features/will/components/DownloadPage.tsx` | Token-based PDF download | ✓ VERIFIED | 183 lines, downloadWill API call, blob download via temp <a> element, 4 states (ready, downloading, success, error), expired token handling |
| `frontend/src/features/will/components/DocumentPreviewPage.tsx` | Proceed to Payment button | ✓ VERIFIED | Lines 7, 10, 186-191: onProceedToPayment prop, button appears after hasGenerated |
| `frontend/src/features/will/components/WillWizard.tsx` | Payment section integration | ✓ VERIFIED | Line 16: import PaymentPage, line 304: onProceedToPayment callback, line 318: payment section rendering |
| `frontend/src/App.tsx` | Routes for return/cancel/download | ✓ VERIFIED | Lines 160-162: /payment/return, /payment/cancel, /download/:token routes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Payment model | Will model | ForeignKey wills.id | ✓ WIRED | Line 31-32 in payment.py: ForeignKey("wills.id", nullable=False) |
| PayFast service | Config | settings.PAYFAST_MERCHANT_ID | ✓ WIRED | Lines 119-123 in payfast_service.py: reads PAYFAST_* settings |
| Download service | Config | URLSafeTimedSerializer secret | ✓ WIRED | Lines 21-22 in download_service.py: settings.DOWNLOAD_TOKEN_SECRET or settings.SECRET_KEY |
| Payment API | PayFast service | build_payment_form_data, validate_itn_signature | ✓ WIRED | Lines 29-35 in payment.py: imports + lines 115-122, 156 call functions |
| Payment API | Download service | generate_download_token | ✓ WIRED | Line 27 import, line 205 call in ITN handler |
| Payment API | Email service | send_download_email | ✓ WIRED | Line 28 import, line 229 asyncio.create_task call |
| Download API | Download service | verify_download_token | ✓ WIRED | Line 20 import, line 39 call |
| Download API | Document service | generate_final | ✓ WIRED | Lines 16-19 import, line 59 call |
| PaymentPage | API client | initiatePayment | ✓ WIRED | Line 2 import, line 24 call, formRef submit on line 40 |
| PaymentReturnPage | API client | getPaymentStatus polling | ✓ WIRED | Line 3 import, line 37 call, setInterval on lines 66-68 |
| DownloadPage | API client | downloadWill | ✓ WIRED | Line 3 import, line 23 call, blob download lines 24-32 |
| DocumentPreviewPage | PaymentPage | onProceedToPayment callback | ✓ WIRED | WillWizard line 304: onProceedToPayment={() => setCurrentSection('payment')} |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| DOC-04: Payment gate before download | ✓ SATISFIED | Download endpoint validates payment.status == "completed" (line 54 download.py) |
| DOC-05: Secure download links | ✓ SATISFIED | itsdangerous URLSafeTimedSerializer with 24h expiry, token verification before PDF generation |
| DOC-06: Email download link | ✓ SATISFIED | ITN handler sends email via asyncio.create_task (line 228-230 payment.py), SUPPRESS_SEND=True prevents actual sending in dev |

### Anti-Patterns Found

**None found.** All files are substantive implementations with no TODO/FIXME/placeholder markers.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | - | - | - |

### Human Verification Required

#### 1. PayFast Sandbox Payment Flow (End-to-End)

**Test:** Complete a full payment cycle in PayFast sandbox
1. Navigate to a verified will in the wizard
2. Generate document preview
3. Click "Proceed to Payment"
4. Verify payment summary shows R199.00
5. Click "Pay Now" — verify redirect to PayFast sandbox (https://sandbox.payfast.co.za/eng/process)
6. Complete payment using sandbox test credentials
7. Verify return to PaymentReturnPage
8. Verify download token appears (may timeout in localhost — see note below)
9. Click download link
10. Verify final PDF downloads without watermark

**Expected:** Smooth redirect flow, sandbox payment completion, return page polling shows download link

**Why human:** PayFast sandbox requires real browser interaction and payment form submission. ITN webhook validation cannot be fully tested on localhost without ngrok/public URL.

**Infrastructure note:** The ITN webhook cannot reach localhost:8000 in development. For full e2e testing:
- Option 1: Use ngrok to expose localhost:8000, update PAYFAST_NOTIFY_URL to ngrok URL
- Option 2: Accept that polling times out in dev, verify email would be sent (check SUPPRESS_SEND logs)
- Option 3: Deploy to staging with public URL

#### 2. Email Delivery (When SUPPRESS_SEND=False)

**Test:** Verify email is sent after payment completion (requires SMTP config + SUPPRESS_SEND=False)
1. Configure SMTP credentials in backend/.env (MAIL_SERVER, MAIL_USERNAME, MAIL_PASSWORD)
2. Set MAIL_SUPPRESS_SEND=False
3. Complete payment flow (requires public URL for ITN)
4. Check recipient inbox for "Your WillCraft SA Will Document is Ready" email
5. Verify email contains download link
6. Click link in email — verify it navigates to DownloadPage

**Expected:** Email received within seconds of payment completion, download link works

**Why human:** Requires real SMTP server + email inbox verification + public URL for ITN webhook

#### 3. Download Token Expiry

**Test:** Verify time-limited token security
1. Complete payment and get download link
2. Download the PDF successfully (token is fresh)
3. Wait 24+ hours (or manually set DOWNLOAD_TOKEN_MAX_AGE=60 in config for faster testing)
4. Try to use the same download link again
5. Verify error message: "Invalid or expired download link"

**Expected:** Token expires after DOWNLOAD_TOKEN_MAX_AGE seconds, download fails with clear error

**Why human:** Time-based behavior difficult to verify programmatically without manual clock manipulation

#### 4. Payment Cancellation Flow

**Test:** Verify cancel page and retry flow
1. Navigate to payment page
2. Click "Pay Now" to redirect to PayFast
3. Click "Cancel" button on PayFast page (before completing payment)
4. Verify redirect to /payment/cancel
5. Verify message: "Payment Cancelled — Your payment was not completed. No charges have been made."
6. Click "Return to Will"
7. Verify wizard state restored, can navigate back to payment

**Expected:** Cancel page displays, no payment record created or status stays "pending", user can retry

**Why human:** Requires PayFast UI interaction and flow navigation

#### 5. Payment Idempotency (ITN Duplicate Processing)

**Test:** Verify ITN handler is idempotent (duplicate ITN notifications are safe)
1. Complete a payment successfully (generates download token, sends email)
2. Manually trigger the ITN webhook again with the same m_payment_id and COMPLETE status (use curl/Postman)
3. Verify logs show "ITN duplicate for already-completed payment"
4. Verify no duplicate email is sent
5. Verify download token remains unchanged

**Expected:** Second ITN is a no-op, no side effects, logs confirm idempotent handling

**Why human:** Requires manual webhook replay via HTTP client

---

## Summary

**All 4 phase success criteria VERIFIED.**

Phase 7 successfully implements a complete payment and download flow:

1. **Payment gate:** Users cannot download the final PDF without completing PayFast payment
2. **Immediate download link:** After successful payment, the ITN handler generates a download token and the return page polls for it (3s intervals, 10 attempts max)
3. **Email backup:** ITN handler fires asyncio.create_task to send download email with link
4. **Secure, time-limited downloads:** itsdangerous URLSafeTimedSerializer with 24h expiry, token validation before PDF generation

**Infrastructure constraints (NOT code gaps):**
- **ITN webhook in localhost:** PayFast servers cannot reach localhost:8000 to send ITN callbacks. This means the return page polling will timeout in local dev. The code is correct — it requires a public URL (ngrok or deployed environment) to receive ITN callbacks.
- **Email delivery in dev:** MAIL_SUPPRESS_SEND=True prevents actual email sending to avoid SMTP config requirements in dev. The email service is wired correctly and will send emails when SUPPRESS_SEND=False + SMTP is configured.

**All artifacts are substantive implementations:**
- Backend: 5 services (PayFast, download, email) + 2 API routers (payment, download) + migration + models + schemas
- Frontend: 4 components (PaymentPage, PaymentReturnPage, PaymentCancelPage, DownloadPage) + API client functions + wizard integration
- No TODO/FIXME/placeholder markers found
- All services have proper error handling, logging, and follow established patterns

**Security highlights:**
- PayFast ITN 4-step validation: signature (timing-safe), IP ranges, amount matching, server confirmation
- Idempotent ITN processing (duplicate callbacks are safe)
- Time-limited download tokens (24h default)
- Token verification before PDF generation
- Payment status gating (must be "completed")

**Phase goal achieved.** Ready to proceed to Phase 8.

---

_Verified: 2026-02-07T19:30:01Z_
_Verifier: Claude (gsd-verifier)_
