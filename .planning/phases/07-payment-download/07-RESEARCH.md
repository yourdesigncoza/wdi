# Phase 7: Payment & Download - Research

**Researched:** 2026-02-07
**Domain:** Payment gateway integration (PayFast), secure download tokens, transactional email
**Confidence:** MEDIUM-HIGH

## Summary

Phase 7 adds a PayFast payment gate between the existing Document Preview step and the final PDF download. The user flow is: Verification -> Document Preview (watermarked, free) -> Payment (PayFast redirect) -> Download (unwatermarked final PDF) + Email backup.

PayFast is South Africa's dominant payment gateway operating exclusively in ZAR. It uses a **form-POST redirect** model (not a client-side JS SDK): the backend generates a signed HTML form, the frontend submits it to PayFast, PayFast processes payment, then redirects the user back to a return URL. Independently, PayFast sends an **ITN (Instant Transaction Notification)** server-to-server POST to a webhook endpoint confirming payment status. The ITN is the authoritative source of truth for payment confirmation -- return URL redirects should NOT be trusted for unlocking downloads.

The existing codebase already has: `DocumentGenerationService.generate_final()` for unwatermarked PDFs, the `Will` model with status tracking, Clerk auth + POPIA consent middleware, Jinja2 templates, and an async session/service layer pattern. The main additions needed are: a Payment model, PayFast service (signature generation, ITN validation), a download token service (itsdangerous), an email service (fastapi-mail), and frontend payment/download pages.

**Primary recommendation:** Use PayFast's offsite redirect flow with server-side signature generation, ITN webhook for authoritative payment confirmation, itsdangerous URLSafeTimedSerializer for time-limited download tokens (24h), and fastapi-mail with Jinja2 templates for the backup email.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (no new backend framework) | -- | PayFast is REST/form-POST, no SDK needed | PayFast has no official Python SDK; integration is via HTTP form POST + webhook |
| itsdangerous | >=2.2 | Signed, time-limited download tokens | Pallets project (same team as Flask), battle-tested, already a transitive dependency of many Python packages |
| fastapi-mail | >=1.4 | Async email with Jinja2 templates | Purpose-built for FastAPI, supports BackgroundTasks, template rendering, SUPPRESS_SEND for testing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hashlib (stdlib) | -- | MD5 signature generation for PayFast | Always -- PayFast requires MD5 signatures |
| urllib.parse (stdlib) | -- | URL encoding for PayFast parameter strings | Always -- PayFast requires specific URL encoding (spaces as +) |
| ipaddress (stdlib) | -- | Validate ITN source IPs against PayFast ranges | Production security -- validate ITN comes from PayFast |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| itsdangerous | PyJWT (already in project) | JWT works but itsdangerous is purpose-built for URL-safe timed tokens; cleaner API for this use case. PyJWT is viable if avoiding new deps is priority |
| fastapi-mail | aiosmtplib (raw) | Lower-level; would need to hand-roll template rendering, connection management. fastapi-mail wraps this cleanly |
| fastapi-mail | SendGrid/Mailgun API | External service dependency; fastapi-mail works with any SMTP server including self-hosted |

**Installation:**
```bash
pip install itsdangerous fastapi-mail
```

## Architecture Patterns

### Recommended Project Structure (additions to existing)
```
backend/app/
├── models/
│   └── payment.py           # Payment model (new)
├── services/
│   ├── payfast_service.py    # PayFast signature gen, ITN validation (new)
│   ├── download_service.py   # Token generation + verification (new)
│   └── email_service.py      # Email sending with templates (new)
├── api/
│   ├── payment.py            # Payment initiation + ITN webhook (new)
│   └── download.py           # Secure download endpoint (new)
├── schemas/
│   └── payment.py            # Payment request/response schemas (new)
└── templates/
    └── email/
        └── download_ready.html  # Email template (new)

frontend/src/
├── features/will/components/
│   ├── PaymentPage.tsx       # Payment initiation UI (new)
│   └── DownloadPage.tsx      # Post-payment download UI (new)
└── services/
    └── api.ts                # Add payment + download API calls
```

### Pattern 1: PayFast Offsite Redirect Flow
**What:** Backend generates signed form data; frontend renders hidden form and auto-submits to PayFast; PayFast redirects back after payment.
**When to use:** Always for PayFast (their primary integration method).

The flow:
1. Frontend calls `POST /api/payment/initiate` with `will_id`
2. Backend creates Payment record (status=pending), generates PayFast form fields + signature
3. Frontend receives form fields, renders hidden `<form>` pointing to `https://sandbox.payfast.co.za/eng/process` (or `https://www.payfast.co.za/eng/process` in production)
4. Form auto-submits via JavaScript
5. User completes payment on PayFast's site
6. PayFast redirects user to `return_url` (success) or `cancel_url` (cancelled)
7. **Independently**, PayFast POSTs ITN to `notify_url` (backend webhook)
8. Backend webhook validates ITN, updates Payment status, generates download token, sends email

### Pattern 2: ITN Webhook Security Validation (4-step)
**What:** PayFast requires 4 security checks on every ITN callback.
**When to use:** Always -- mandatory for payment confirmation.

Steps (in order):
1. **Signature verification**: Reconstruct parameter string from POST data, generate MD5, compare to received `signature` field
2. **Source IP validation**: Verify request comes from PayFast IP ranges (197.97.145.144/28, 41.74.179.192/27)
3. **Amount validation**: Verify `amount_gross` matches the amount stored in the Payment record
4. **Server confirmation**: POST the received data back to `https://www.payfast.co.za/eng/query/validate` (or sandbox equivalent) and check for "VALID" response

### Pattern 3: Time-Limited Download Tokens
**What:** After payment confirmation, generate a signed token encoding will_id + payment_id + timestamp. Token is URL-safe and expires after 24 hours.
**When to use:** For all download links (immediate + email).

```python
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadData

DOWNLOAD_TOKEN_MAX_AGE = 86400  # 24 hours

def generate_download_token(will_id: str, payment_id: str, secret_key: str) -> str:
    s = URLSafeTimedSerializer(secret_key, salt="will-download")
    return s.dumps({"will_id": will_id, "payment_id": payment_id})

def verify_download_token(token: str, secret_key: str) -> dict | None:
    s = URLSafeTimedSerializer(secret_key, salt="will-download")
    try:
        return s.loads(token, max_age=DOWNLOAD_TOKEN_MAX_AGE)
    except (SignatureExpired, BadData):
        return None
```

### Pattern 4: Fire-and-Forget Email (existing pattern)
**What:** Send email via BackgroundTasks to avoid blocking the response.
**When to use:** Post-payment email with download link.

```python
from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

async def send_download_email(
    email: str, download_url: str, testator_name: str, fm: FastMail
):
    message = MessageSchema(
        subject="Your WillCraft SA Will Document is Ready",
        recipients=[email],
        template_body={
            "testator_name": testator_name,
            "download_url": download_url,
        },
        subtype=MessageType.html,
    )
    await fm.send_message(message, template_name="download_ready.html")
```

### Anti-Patterns to Avoid
- **Trusting return_url for payment confirmation**: PayFast redirects the user to return_url, but this is NOT authoritative. Users can navigate to the return URL manually. Only the ITN webhook confirms payment.
- **Storing PDF on disk**: Generate on-the-fly from the existing `DocumentGenerationService.generate_final()`. Avoids file management, disk space issues, and stale documents.
- **Generating download token before ITN confirmation**: The token must only be created after the ITN webhook confirms COMPLETE status.
- **Including passphrase in production signature when not configured**: PayFast sandbox uses passphrase; production may not. The signature logic must handle both cases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed time-limited URLs | Custom JWT or HMAC token scheme | itsdangerous URLSafeTimedSerializer | Handles URL-safe encoding, timestamp embedding, expiry verification, and proper cryptographic signing |
| Email with HTML templates | Raw aiosmtplib + manual Jinja2 | fastapi-mail with TEMPLATE_FOLDER | Handles connection pooling, TLS, template rendering, background sending, and test suppression |
| PayFast signature generation | -- | Must hand-roll (no Python SDK) | PayFast has no official Python SDK; but the algorithm is straightforward (MD5 of ordered URL-encoded params) |
| IP range validation | Manual string comparison | Python ipaddress stdlib | Handles CIDR notation, IPv4/IPv6, proper range checking |

**Key insight:** PayFast integration is necessarily hand-rolled (no SDK), but download tokens and email should use established libraries to avoid subtle security bugs.

## Common Pitfalls

### Pitfall 1: PayFast Signature Mismatch
**What goes wrong:** Payment form submission fails with "signature mismatch" error on PayFast's side.
**Why it happens:** (a) Parameters not in correct order, (b) Empty values not filtered out, (c) Spaces encoded as %20 instead of +, (d) Passphrase handling differs between sandbox and production.
**How to avoid:**
- Define a strict field order constant matching PayFast's documentation
- Filter empty/null values before building the parameter string
- Use `urllib.parse.quote_plus()` for encoding (encodes spaces as +)
- Conditionally append passphrase based on environment
**Warning signs:** 100% payment failure rate in a specific environment (sandbox vs production).

### Pitfall 2: ITN Never Received
**What goes wrong:** Payment succeeds on PayFast but backend never gets confirmation.
**Why it happens:** (a) notify_url is not publicly accessible (localhost, firewall), (b) notify_url returns non-200 status, (c) PayFast IPs blocked by firewall/CDN.
**How to avoid:**
- For development: use ngrok or similar tunnel for the notify_url
- Ensure the ITN endpoint returns 200 OK immediately, then processes async
- Whitelist PayFast IP ranges: 197.97.145.144/28, 41.74.179.192/27
**Warning signs:** Payments appear in PayFast dashboard but Payment records stay "pending" in DB.

### Pitfall 3: Race Condition Between Return URL and ITN
**What goes wrong:** User arrives at return_url before ITN has been processed; frontend shows "payment pending" despite successful payment.
**Why it happens:** ITN is async; the redirect can arrive before the webhook.
**How to avoid:**
- Frontend return page should poll the backend for payment status (e.g., every 2-3 seconds for up to 30 seconds)
- Show a "Confirming payment..." spinner on the return page
- Eventually show the download link when status changes to "completed"
- If polling times out, show message: "Payment received, download link will be emailed"
**Warning signs:** Users complain they paid but can't download.

### Pitfall 4: Duplicate ITN Processing
**What goes wrong:** PayFast may retry ITN delivery; same payment gets processed twice.
**Why it happens:** PayFast retries if it doesn't receive a 200 OK quickly enough.
**How to avoid:**
- Make ITN handler idempotent: check if Payment.status is already "completed" before processing
- Use the `pf_payment_id` as a unique key
- Return 200 OK immediately, process in background
**Warning signs:** Duplicate download emails, double audit log entries.

### Pitfall 5: Download Token Expiry Too Short/Long
**What goes wrong:** User can't download because token expired, or token lives forever creating security risk.
**Why it happens:** Poor expiry configuration.
**How to avoid:** 24 hours is the sweet spot -- long enough for email delivery delays, short enough to prevent link sharing abuse.
**Warning signs:** Support requests about expired download links.

### Pitfall 6: SMTP Configuration Missing in Dev
**What goes wrong:** Email sending fails silently or crashes in development.
**Why it happens:** No SMTP server configured locally.
**How to avoid:**
- Use `SUPPRESS_SEND = True` in development config
- Use a tool like Mailpit for local email testing
- Make email sending fire-and-forget (don't fail the payment flow if email fails)
**Warning signs:** Payment succeeds but no email received.

## Code Examples

### PayFast Signature Generation (Python)
```python
import hashlib
import urllib.parse

# PayFast requires this exact field order for checkout signatures
PAYFAST_FIELD_ORDER = [
    "merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url",
    "name_first", "name_last", "email_address", "cell_number",
    "m_payment_id", "amount", "item_name", "item_description",
    "custom_str1", "custom_str2", "custom_str3", "custom_str4", "custom_str5",
    "custom_int1", "custom_int2", "custom_int3", "custom_int4", "custom_int5",
    "email_confirmation", "confirmation_address",
    "payment_method",
]

def generate_payfast_signature(data: dict, passphrase: str | None = None) -> str:
    """Generate MD5 signature for PayFast form submission.

    Args:
        data: Payment form fields (without 'signature' key).
        passphrase: PayFast passphrase (required for sandbox, optional for production).

    Returns:
        MD5 hex digest string.
    """
    # Build ordered parameter string, filtering empty values
    pairs = []
    for key in PAYFAST_FIELD_ORDER:
        value = data.get(key)
        if value is not None and str(value).strip():
            encoded_value = urllib.parse.quote_plus(str(value).strip())
            pairs.append(f"{key}={encoded_value}")

    # Append passphrase if provided
    if passphrase:
        pairs.append(f"passphrase={urllib.parse.quote_plus(passphrase.strip())}")

    param_string = "&".join(pairs)
    return hashlib.md5(param_string.encode()).hexdigest()
```

### PayFast ITN Signature Validation
```python
def validate_itn_signature(post_data: dict, passphrase: str | None = None) -> bool:
    """Validate ITN callback signature from PayFast.

    The ITN signature is generated from the POST data (excluding 'signature'),
    in the order received.
    """
    received_signature = post_data.get("signature", "")

    # Build parameter string from all fields except signature
    pairs = []
    for key, value in post_data.items():
        if key == "signature":
            continue
        if value is not None and str(value).strip():
            encoded_value = urllib.parse.quote_plus(str(value).strip())
            pairs.append(f"{key}={encoded_value}")

    if passphrase:
        pairs.append(f"passphrase={urllib.parse.quote_plus(passphrase.strip())}")

    param_string = "&".join(pairs)
    expected_signature = hashlib.md5(param_string.encode()).hexdigest()

    # Timing-safe comparison
    return hmac.compare_digest(expected_signature, received_signature)
```

### ITN Source IP Validation
```python
import ipaddress

PAYFAST_IP_RANGES = [
    ipaddress.ip_network("197.97.145.144/28"),
    ipaddress.ip_network("41.74.179.192/27"),
]

def is_valid_payfast_ip(ip_str: str) -> bool:
    """Check if IP address belongs to known PayFast ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in PAYFAST_IP_RANGES)
    except ValueError:
        return False
```

### Payment Model (SQLModel)
```python
class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    will_id: uuid.UUID = Field(foreign_key="wills.id", nullable=False)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)

    # PayFast references
    m_payment_id: str  # Our merchant payment ID (e.g., "PAY-{uuid}")
    pf_payment_id: str | None = None  # PayFast's payment ID (from ITN)

    # Amount
    amount: str  # Decimal string "XXX.XX" (ZAR, 2 decimal places)

    # Status: pending -> completed | cancelled | failed
    status: str = "pending"

    # ITN data (store full POST for audit)
    itn_data: dict | None = None  # JSONB

    # Download token (generated after payment confirmed)
    download_token: str | None = None

    # Email tracking
    email_sent: bool = False
    email_sent_at: datetime | None = None

    # Timestamps
    created_at: datetime
    updated_at: datetime
```

### Frontend: PayFast Form Auto-Submit
```tsx
function PayFastRedirect({ formData, payFastUrl }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    // Auto-submit the form to PayFast
    formRef.current?.submit()
  }, [])

  return (
    <form ref={formRef} method="POST" action={payFastUrl}>
      {Object.entries(formData).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </form>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PayFast onsite modal (JS SDK) | PayFast offsite redirect (form POST) | Onsite still available but redirect is simpler and more reliable | Redirect avoids CSP issues, JS loading failures, and iframe security concerns |
| Store PDFs on disk | Generate on-the-fly with WeasyPrint | Already in codebase (Phase 6) | No file storage management needed; always generates from latest will data |
| Email verification via DB tokens | Signed tokens (itsdangerous) | Established pattern | No DB table for tokens; stateless verification |

**Deprecated/outdated:**
- PayFast's older `validate` endpoint at `/eng/query/validate` may have been updated; verify current URL during sandbox testing

## Data Model Considerations

### New DB Objects Needed
1. **Payment table**: Tracks payment lifecycle (pending -> completed/cancelled/failed)
2. **Will model updates**: Add `payment_id` or `paid_at` column to gate downloads; update `VALID_STATUSES` to include "paid"

### Will Status Flow Update
Current: `draft -> review -> verified -> generated`
New: `draft -> review -> verified -> generated -> paid`

The `generated` status already exists but currently only means "preview generated." We need either:
- (A) Add a `paid` status after `generated`, or
- (B) Keep `generated` and add `paid_at` timestamp + `payment_id` FK on Will

Option (B) is cleaner: it avoids changing the existing status flow and uses a separate Payment table as the authoritative record.

### Migration Plan
- Alembic migration 006: Create `payments` table
- Add `paid_at` (nullable DateTime) to `wills` table (optional convenience column)

## PayFast Integration Details

### URLs
| Environment | Form Submit URL | Validate URL |
|-------------|-----------------|--------------|
| Sandbox | `https://sandbox.payfast.co.za/eng/process` | `https://sandbox.payfast.co.za/eng/query/validate` |
| Production | `https://www.payfast.co.za/eng/process` | `https://www.payfast.co.za/eng/query/validate` |

### Sandbox Test Credentials (PUBLIC -- from PayFast docs)
| Field | Value |
|-------|-------|
| Merchant ID | 10000100 |
| Merchant Key | 46f0cd694581a |
| Passphrase | jt7NOE43FZPn |

### ITN Callback Fields (POST data from PayFast)
| Field | Description |
|-------|-------------|
| m_payment_id | Merchant's payment reference |
| pf_payment_id | PayFast payment ID |
| payment_status | COMPLETE, FAILED, PENDING |
| item_name | Item description |
| amount_gross | Total charged (ZAR) |
| amount_fee | PayFast fee |
| amount_net | Net after fees |
| name_first, name_last | Customer name |
| email_address | Customer email |
| merchant_id | Merchant ID (must match yours) |
| signature | MD5 signature for validation |
| custom_str1-5, custom_int1-5 | Custom data fields |

### PayFast IP Ranges for Whitelisting
- `197.97.145.144/28` (197.97.145.144 - 197.97.145.159)
- `41.74.179.192/27` (41.74.179.192 - 41.74.179.223)

## Config Settings to Add

```python
# PayFast
PAYFAST_MERCHANT_ID: str = ""
PAYFAST_MERCHANT_KEY: str = ""
PAYFAST_PASSPHRASE: str = ""
PAYFAST_SANDBOX: bool = True  # True for sandbox, False for production
PAYFAST_RETURN_URL: str = "http://localhost:5173/payment/return"
PAYFAST_CANCEL_URL: str = "http://localhost:5173/payment/cancel"
PAYFAST_NOTIFY_URL: str = "http://localhost:8000/api/payment/notify"

# Will pricing
WILL_PRICE: str = "199.00"  # ZAR, 2 decimal places

# Download tokens
DOWNLOAD_TOKEN_MAX_AGE: int = 86400  # 24 hours

# Email (SMTP)
MAIL_USERNAME: str = ""
MAIL_PASSWORD: str = ""
MAIL_FROM: str = "noreply@willcraft.co.za"
MAIL_FROM_NAME: str = "WillCraft SA"
MAIL_PORT: int = 587
MAIL_SERVER: str = ""
MAIL_STARTTLS: bool = True
MAIL_SSL_TLS: bool = False
```

## Frontend Route Changes

Current routes: `/, /will, /privacy-policy, /info-officer`

New routes needed:
- `/payment/return` -- PayFast success redirect landing page
- `/payment/cancel` -- PayFast cancellation redirect
- `/download/:token` -- Token-based download page

The WillWizard step flow needs a new `payment` section between `document` and a new `download` step, or the `document` step is replaced/extended to include payment.

### Recommended WillSection Update
Add to `WILL_SECTIONS`: `'payment'` after `'document'`
- `document` step: Preview (existing) + "Proceed to Payment" button
- `payment` step: Shows payment summary, initiates PayFast redirect
- Return URL page: Polls for confirmation, shows download link

## Open Questions

1. **Will pricing model**
   - What we know: Phase description says "PayFast payment" -- implies single payment
   - What's unclear: Fixed price or variable? Per-will or subscription?
   - Recommendation: Default to fixed price (e.g., R199.00) -- simplest to implement. Add `WILL_PRICE` config setting.

2. **ITN notify_url in development**
   - What we know: PayFast ITN requires a publicly accessible URL
   - What's unclear: Does the dev team have ngrok or similar set up?
   - Recommendation: Make notify_url configurable. For dev, use ngrok tunnel. Document the setup in plan.

3. **Email SMTP provider**
   - What we know: fastapi-mail needs SMTP credentials
   - What's unclear: Which SMTP provider will be used (Gmail, SendGrid, self-hosted)?
   - Recommendation: Make all SMTP settings configurable via .env. Use SUPPRESS_SEND=True in dev. The email plan should be provider-agnostic.

4. **Multiple downloads or single download?**
   - What we know: Requirements say "download link" (singular)
   - What's unclear: Can user download multiple times within 24h? Or single-use token?
   - Recommendation: Allow multiple downloads within the 24h token window. Single-use adds complexity without clear benefit.

5. **Existing DocumentPreviewPage integration**
   - What we know: DocumentPreviewPage currently has "Generate Preview" + "Back to Verification"
   - What's unclear: Should payment be triggered from DocumentPreviewPage or a new step?
   - Recommendation: Add "Proceed to Payment" button on DocumentPreviewPage (after preview is generated). This avoids adding another wizard step and keeps the flow natural: Preview -> satisfied? -> Pay.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/opt/lampp/htdocs/wdi/backend/app/` -- full model, service, API review
- itsdangerous official docs (Context7 /pallets/itsdangerous) -- URLSafeTimedSerializer API, version 2.2.x
- fastapi-mail official docs (https://sabuhish.github.io/fastapi-mail/example/) -- Configuration, templates, background tasks

### Secondary (MEDIUM confidence)
- PayFast developer portal (https://developers.payfast.co.za/) -- JS-rendered, partial extraction
- PayFast PHP SDK (https://github.com/Payfast/payfast-php-sdk) -- sandbox credentials: 10000100 / 46f0cd694581a / jt7NOE43FZPn
- PayFast integration skill (https://claude-plugins.dev/skills/@mkelam/PDFLab/payfast-integration.SKILL.md) -- ITN flow, signature details, IP ranges
- Dean Malan's PayFast Python signature guide (https://www.deanmalan.co.za/2023/2023-02-08-calculate-payfast-signature.html) -- field ordering, URL encoding, MD5
- dev.to PayFast Node.js article (https://dev.to/greggcbs/payfast-api-nodejs-signature-and-headers-function-1m92) -- signature algorithm, header requirements
- django-payfast (https://github.com/PiDelport/django-payfast) -- ITN validation checks pattern
- PayFast support (https://support.payfast.help/) -- IP whitelisting, ITN security checks

### Tertiary (LOW confidence)
- PayFast IP ranges may have been updated recently -- verify against PayFast support docs during sandbox testing
- PayFast validate endpoint URL needs sandbox testing confirmation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - itsdangerous and fastapi-mail are well-documented, established libraries; PayFast form POST pattern is well-understood
- Architecture: HIGH - Follows existing codebase patterns (service layer, DI, async sessions, fire-and-forget background tasks)
- PayFast integration: MEDIUM - No official Python SDK; signature algorithm verified from multiple sources but needs sandbox testing
- Pitfalls: HIGH - Well-documented from community experience and PayFast support articles

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days -- PayFast API is stable; IP ranges may update)
