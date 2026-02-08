# WillCraft SA

AI-powered will generation platform for South Africa. Any South African can create a legally compliant will through an intelligent, guided conversation — no legal knowledge required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, DaisyUI v5 |
| Backend | FastAPI, Python 3.13+, SQLModel, async/await |
| Database | PostgreSQL + asyncpg, Alembic migrations |
| Auth | Clerk (RS256 JWKS) |
| AI | OpenAI GPT-4o-mini (conversation), Google Gemini 2.5 Flash (verification) |
| PDF | WeasyPrint + Jinja2 templates |
| Payment | PayFast (ZAR) |
| State | Zustand (persist + immer) |
| Forms | React Hook Form + Zod validation |

## Features

- **Multi-step Will Wizard** — 10-step guided process: Personal, Beneficiaries, Assets, Guardians, Executor, Bequests, Residue, Review, Verification, Document
- **AI Conversation** — Per-section chat with OpenAI, streaming via SSE, 20-message rolling window
- **Complex Estate Scenarios** — Testamentary trusts, usufruct, business assets, joint wills (auto-detected)
- **Legal Verification** — Gemini-powered compliance check against SA Wills Act (9 error rules, 7 warnings, 9 attorney referral triggers)
- **UPL Filter** — 7 advice patterns + 10 attorney-required patterns prevent unlawful practice
- **POPIA Compliance** — Consent management with JWT httpOnly cookies, data access requests, audit logging
- **PDF Generation** — WeasyPrint with CSS paged media, token-based download
- **Payment Integration** — PayFast with ITN webhook signature validation
- **Additional Documents** — Living will and funeral wishes forms
- **Dark/Light Themes** — Nord (light) + Business (dark) via DaisyUI
- **Responsive Navbar** — Shared layout with mobile hamburger menu

## Project Structure

```
wdi/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Navbar, Layout, ThemeToggle
│   │   │   ├── consent/         # ConsentProvider, ConsentModal
│   │   │   └── common/          # PrivacyPolicy, InfoOfficerContact
│   │   ├── features/
│   │   │   ├── will/            # Will wizard, chat, review, payment
│   │   │   │   ├── components/  # WillWizard, ChatSection, SectionReview...
│   │   │   │   ├── store/       # useWillStore (Zustand)
│   │   │   │   ├── hooks/       # useConversation, useVerification
│   │   │   │   ├── schemas/     # Zod validation schemas
│   │   │   │   └── types/       # TypeScript interfaces
│   │   │   └── additional-documents/
│   │   │       ├── components/  # LivingWillForm, FuneralWishesForm
│   │   │       └── store/       # useAdditionalDocStore
│   │   ├── contexts/            # AuthApiContext
│   │   ├── hooks/               # useConsent
│   │   ├── services/            # API client
│   │   └── App.tsx              # Routing + auth gating
│   └── package.json
├── backend/                     # FastAPI server
│   ├── app/
│   │   ├── api/                 # Route handlers (12 modules)
│   │   ├── services/            # Business logic (16 services)
│   │   ├── models/              # SQLModel DB models (8 models)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── middleware/          # Auth, POPIA consent, audit
│   │   ├── prompts/             # OpenAI system + extraction prompts
│   │   ├── templates/           # Jinja2 HTML templates for PDF
│   │   ├── config.py            # Settings from .env
│   │   └── main.py              # FastAPI app entry point
│   ├── alembic/versions/        # 8 migration files
│   ├── scripts/                 # seed_clauses.py
│   ├── tests/                   # pytest test files
│   └── requirements.txt
└── .planning/                   # GSD workflow state
```

## Getting Started

### Prerequisites

- Node.js 18+ with npm
- Python 3.13+ with venv
- PostgreSQL
- [Clerk](https://clerk.com) account (authentication)
- [OpenAI](https://platform.openai.com) API key
- [Google AI](https://ai.google.dev) API key (Gemini)

### 1. Clone and Setup Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Create `backend/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/willcraft

# Security
SECRET_KEY=change-me-in-production

# Auth (Clerk)
CLERK_JWKS_URL=https://your-instance.clerk.accounts.com/.well-known/jwks.json

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash

# POPIA
CONSENT_VERSION=1.0
PRIVACY_POLICY_VERSION=1.0

# PayFast (sandbox defaults)
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=jt7NOE43FZPn
PAYFAST_SANDBOX=true
PAYFAST_RETURN_URL=http://localhost:5173/payment/return
PAYFAST_CANCEL_URL=http://localhost:5173/payment/cancel
PAYFAST_NOTIFY_URL=http://localhost:8000/api/payment/notify
WILL_PRICE=199.00

# Email (optional for dev)
MAIL_SUPPRESS_SEND=true
```

Create `frontend/.env.local`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

### 3. Setup Database

```bash
createdb willcraft
cd backend
alembic upgrade head
```

### 4. Seed Clause Library

```bash
cd backend
python scripts/seed_clauses.py
```

### 5. Run Development Servers

**Backend** (port 8000):
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend** (port 5173):
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8000`.

## API Endpoints

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness probe |

### Consent (POPIA)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/consent` | Accept consent |
| GET | `/api/consent/status` | Check consent status |
| POST | `/api/consent/withdraw` | Withdraw consent |

### Will CRUD
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wills` | Create new will draft |
| GET | `/api/wills` | List user's wills |
| GET | `/api/wills/{id}` | Get specific will |
| DELETE | `/api/wills/{id}` | Delete will |
| PATCH | `/api/wills/{id}/current-section` | Update wizard position |
| GET | `/api/wills/{id}/scenarios` | Detect complex estate scenarios |

### AI Conversation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/conversation/stream` | SSE streaming AI response |
| GET | `/api/conversation/{will_id}/{section}` | Get conversation history |
| POST | `/api/conversation/{will_id}/{section}/extract` | Extract structured data |

### Verification
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wills/{id}/verify` | SSE streaming Gemini verification |
| GET | `/api/wills/{id}/verification` | Get verification result |
| POST | `/api/wills/{id}/acknowledge-warnings` | Acknowledge warnings |

### Payment (PayFast)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment/initiate` | Create payment |
| POST | `/api/payment/notify` | ITN webhook callback |
| GET | `/api/payment/{id}/status` | Poll payment status |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wills/{id}/preview` | Generate preview PDF |
| GET | `/api/download/{token}` | Download paid will PDF |
| POST | `/api/wills/{id}/regenerate` | Regenerate paid will |

### Additional Documents
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/additional-documents/` | Create living will or funeral wishes |
| GET | `/api/additional-documents/` | List user's additional documents |
| GET | `/api/additional-documents/{id}` | Get specific document |
| PATCH | `/api/additional-documents/{id}` | Update document |
| DELETE | `/api/additional-documents/{id}` | Delete document |

## Database Schema

8 Alembic migrations managing these models:

| Model | Key Fields |
|-------|-----------|
| **User** | clerk_user_id, email |
| **Will** | user_id, status, 12 JSONB section columns (testator, marital, beneficiaries, assets, guardians, executor, bequests, residue, trust_provisions, usufruct, business_assets, joint_will), verification_result |
| **Conversation** | will_id, section, messages (JSONB), unique(will_id, section) |
| **Payment** | will_id, amount, status, payfast_response, download_token |
| **AdditionalDocument** | will_id, document_type, content (JSONB) |
| **ConsentRecord** | consent_version, accepted_at, consent_categories (JSONB) |
| **Clause** | code, template_text (Jinja2), variables_schema, version, is_current |
| **AuditLog** | user_id, action, resource_type, changes (JSONB), partitioned by created_at |

## Architecture

### Middleware Stack (outermost to innermost)

1. **CORS** — configured origins
2. **Audit Logging** — fire-and-forget via `asyncio.create_task`
3. **POPIA Consent Gate** — JWT httpOnly cookie verification
4. **Clerk Auth** — RS256 JWKS token validation

### AI Pipeline

```
User Message → OpenAI (GPT-4o-mini, temp 0.7)
                 ↓
            UPL Filter (7 advice + 10 attorney-required patterns)
                 ↓ ALLOW / REPLACE / BLOCK / REFER
            SSE Stream → Frontend (delta events during, filtered/done after)
                 ↓
            Auto-Extract → JSONB section columns
```

### Verification Pipeline

```
Will Data → Gemini (2.5 Flash, temp 0.1)
               ↓ (fallback: OpenAI)
          SA Wills Act Rules (9 error, 7 warning, 3 info)
               ↓
          Attorney Referral Check (9 triggers)
               ↓
          SSE Stream → Frontend → Status Gating
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Will data storage | JSONB per-section columns | Flexible schema evolution, per-section queries |
| SSE pattern | Dual-event (delta + filtered/done) | UPL filter can modify response after stream |
| Consent tracking | JWT httpOnly cookie (365d) | Stateless, no session management needed |
| Clause rendering | Jinja2 StrictUndefined | Missing variables raise errors, not blank text |
| Verification | Gemini-first + OpenAI fallback | Gemini cheaper, OpenAI as reliability backup |
| UPL order | Attorney-required before advice | Strictest patterns checked first |

## Testing

```bash
# Backend tests
cd backend && source venv/bin/activate
pytest tests/ -v

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint

# Production build
cd frontend && npm run build
```

## Production Notes

Before deploying to production:

- [ ] Replace all 12 PLACEHOLDER clause texts with attorney-approved content
- [ ] Update privacy policy and info officer contact details
- [ ] Set `PAYFAST_SANDBOX=false` and configure production PayFast credentials
- [ ] Ensure `PAYFAST_NOTIFY_URL` points to a publicly accessible URL
- [ ] Apply audit log immutability: `REVOKE UPDATE, DELETE ON audit_logs FROM app_user`
- [ ] Set up automated monthly `audit_logs` partition creation
- [ ] Configure production `SECRET_KEY` and `DOWNLOAD_TOKEN_SECRET`
- [ ] Set `MAIL_SUPPRESS_SEND=false` and configure SMTP credentials
- [ ] Set `DEBUG=false`

## License

Proprietary. All rights reserved.
