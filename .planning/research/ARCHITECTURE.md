# Architecture Patterns: WillCraft SA

**Domain:** AI-powered legal document generation (online wills)
**Researched:** 2026-02-05
**Overall Confidence:** HIGH (verified via Context7, official documentation, multiple sources)

---

## Executive Summary

WillCraft SA requires a **multi-tier architecture** with clear separation between:
1. Conversational UI layer (React)
2. API Gateway/Backend (FastAPI)
3. AI Orchestration layer (OpenAI + Gemini dual-model)
4. Document Generation engine
5. Data persistence layer (PostgreSQL)

The architecture follows modern patterns for AI-powered legal document systems: conversational data collection, multi-model verification for legal accuracy, and secure PDF generation with audit trails.

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    React + Tailwind Frontend                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ Clerk Auth   │  │ Conversation │  │ Document Preview         │   │    │
│  │  │ Components   │  │ UI (Wizard)  │  │ & Download               │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS/JWT
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    FastAPI Backend                                   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ Auth         │  │ Session      │  │ Payment                   │   │    │
│  │  │ Middleware   │  │ Management   │  │ Integration               │   │    │
│  │  │ (Clerk JWT)  │  │ API          │  │ (PayFast)                 │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │    │
│  │  │ Will Data    │  │ Conversation │  │ Document                  │   │    │
│  │  │ API          │  │ API          │  │ Generation API            │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐
│   AI ORCHESTRATION   │ │  DOCUMENT GEN    │ │     DATA LAYER               │
│  ┌────────────────┐  │ │  ┌────────────┐  │ │  ┌────────────────────────┐  │
│  │ OpenAI         │  │ │  │ Template   │  │ │  │ PostgreSQL             │  │
│  │ (Conversation) │  │ │  │ Engine     │  │ │  │ ┌────────────────────┐ │  │
│  └────────────────┘  │ │  └────────────┘  │ │  │ │ Users              │ │  │
│  ┌────────────────┐  │ │  ┌────────────┐  │ │  │ │ Will Sessions      │ │  │
│  │ Gemini         │  │ │  │ PDF        │  │ │  │ │ Will Data (JSON)   │ │  │
│  │ (Verification) │  │ │  │ Generator  │  │ │  │ │ Generated PDFs     │ │  │
│  └────────────────┘  │ │  │ (WeasyPrint│  │ │  │ │ Audit Logs         │ │  │
│  ┌────────────────┐  │ │  │ /ReportLab)│  │ │  │ │ Payments           │ │  │
│  │ Estate Logic   │  │ │  └────────────┘  │ │  │ └────────────────────┘ │  │
│  │ Validator      │  │ │                  │ │  └────────────────────────┘  │
│  └────────────────┘  │ │                  │ │                              │
└──────────────────────┘ └──────────────────┘ └──────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Build Phase |
|-----------|---------------|-------------------|-------------|
| **Clerk Auth UI** | User authentication, session management | Clerk API, Backend Auth Middleware | Phase 1 |
| **Conversation UI** | Multi-step wizard, chat interface, input validation | Backend Conversation API | Phase 2 |
| **Document Preview** | PDF preview, download, print | Document Generation API | Phase 4 |
| **Auth Middleware** | JWT validation, user context injection | Clerk JWKS, all API routes | Phase 1 |
| **Session Management** | Will session state, progress tracking | PostgreSQL, Conversation API | Phase 2 |
| **Will Data API** | CRUD for will data, versioning | PostgreSQL, AI Orchestration | Phase 2 |
| **Conversation API** | Chat endpoints, AI routing | OpenAI, Estate Logic Validator | Phase 2 |
| **Payment Integration** | Payment flow, webhooks | PayFast API, PostgreSQL | Phase 5 |
| **OpenAI Service** | Conversational AI, data extraction | OpenAI API | Phase 2 |
| **Gemini Service** | Legal verification, consistency checks | Gemini API | Phase 3 |
| **Estate Logic Validator** | Business rules for SA law (trusts, usufruct, etc.) | Will Data, AI Services | Phase 3 |
| **Template Engine** | Will document templates, variable substitution | Will Data, PDF Generator | Phase 4 |
| **PDF Generator** | Legally-formatted PDF output | Template Engine, File Storage | Phase 4 |
| **PostgreSQL** | Persistent storage, audit logs | All backend services | Phase 1 |

---

## Data Flow

### 1. Authentication Flow

```
User → Clerk UI → Clerk API → JWT Token
                              ↓
Backend ← Clerk JWKS validation ← Request with JWT
                              ↓
           User context injected into request
```

**Implementation:** Use `fastapi-clerk-middleware` or custom dependency that validates Clerk JWTs against the JWKS endpoint.

### 2. Conversational Data Collection Flow

```
User Input → React UI (wizard step)
                ↓
    POST /api/conversation/message
                ↓
    FastAPI validates session, extracts context
                ↓
    OpenAI API (conversation model)
    - System prompt: SA will requirements
    - User context: current will state
    - User message: latest input
                ↓
    AI Response parsed for:
    - Next question
    - Extracted data points
    - Validation errors
                ↓
    Will session updated in PostgreSQL
                ↓
    Response → React UI → Next wizard step
```

**Key Pattern:** State machine for conversation flow. Each step has:
- Required data points to collect
- Validation rules
- Skip conditions (e.g., skip "spouse" section if unmarried)

### 3. Multi-Model Verification Flow

```
User completes data collection
                ↓
    POST /api/will/verify
                ↓
    Backend assembles complete will data
                ↓
    ┌──────────────────────────────────┐
    │     PARALLEL VERIFICATION        │
    │  ┌────────────┐ ┌────────────┐  │
    │  │ Gemini     │ │ Estate     │  │
    │  │ Legal      │ │ Logic      │  │
    │  │ Review     │ │ Validator  │  │
    │  └────────────┘ └────────────┘  │
    └──────────────────────────────────┘
                ↓
    Results aggregated:
    - Legal compliance issues
    - Logical inconsistencies
    - Missing required clauses
                ↓
    If issues found → Return to conversation
    If verified → Ready for generation
```

**Rationale:** Using Gemini for verification (separate from OpenAI conversation) provides:
1. Independent verification (different model = different perspective)
2. Cost optimization (Gemini may be cheaper for batch review)
3. Redundancy (not dependent on single AI provider)

### 4. Document Generation Flow

```
Verified will data
        ↓
    Template Engine
    - Select template based on will type
    - Apply South African legal formatting
    - Insert variable data
        ↓
    HTML/Markdown intermediate format
        ↓
    WeasyPrint/ReportLab PDF conversion
        ↓
    PDF stored in database (BYTEA) or file storage
        ↓
    Audit log created
        ↓
    Download link generated with time-limited token
```

### 5. Payment Flow (PayFast Integration)

```
User ready to download → Clicks "Complete Will"
        ↓
    Backend creates payment intent
        ↓
    Redirect to PayFast hosted payment page
        ↓
    PayFast processes payment
        ↓
    Webhook: POST /api/payments/webhook
        ↓
    Verify signature, update payment status
        ↓
    Unlock will download
        ↓
    Redirect user to download page
```

**Important:** PayFast uses redirect flow (not embedded). Plan UI accordingly.

---

## Component Deep Dives

### Frontend State Management

**Recommendation:** `useReducer` + Context API

```typescript
// WillContext.tsx
interface WillState {
  currentStep: number;
  willData: WillData;
  conversationHistory: Message[];
  validationErrors: ValidationError[];
  status: 'draft' | 'verified' | 'paid' | 'generated';
}

type WillAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'UPDATE_DATA'; field: string; value: any }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_ERRORS'; errors: ValidationError[] }
  | { type: 'SET_STATUS'; status: WillState['status'] };

// Provider wraps entire app, exposes useWill() and useWillDispatch()
```

**Why not Zustand/Redux?**
- Wizard state is localized (not global app state)
- useReducer handles complex state transitions well
- Context avoids prop drilling without external deps
- Simpler mental model for form wizards

### Backend Structure (FastAPI)

**Recommended project layout:**

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, middleware, routes
│   ├── config.py               # Settings, env vars
│   ├── dependencies.py         # Shared dependencies (DB, auth)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py             # Auth routes (if needed beyond Clerk)
│   │   ├── conversation.py     # Conversation endpoints
│   │   ├── will.py             # Will CRUD endpoints
│   │   ├── payment.py          # Payment endpoints, webhooks
│   │   └── document.py         # PDF generation, download
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── openai_service.py   # OpenAI API wrapper
│   │   ├── gemini_service.py   # Gemini API wrapper
│   │   ├── estate_logic.py     # SA law business rules
│   │   ├── pdf_generator.py    # PDF generation logic
│   │   └── payfast_service.py  # PayFast integration
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # SQLModel user
│   │   ├── will_session.py     # SQLModel will session
│   │   ├── payment.py          # SQLModel payment
│   │   └── audit.py            # SQLModel audit log
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── will.py             # Pydantic will schemas
│   │   ├── conversation.py     # Pydantic conversation schemas
│   │   └── payment.py          # Pydantic payment schemas
│   │
│   └── templates/
│       └── will/               # Will document templates
│           ├── basic_will.html
│           ├── trust_will.html
│           └── usufruct_will.html
│
├── tests/
├── alembic/                    # Database migrations
└── requirements.txt
```

**Key Pattern:** Dependency Injection for services

```python
# dependencies.py
from fastapi import Depends
from functools import lru_cache

@lru_cache
def get_openai_service():
    return OpenAIService(api_key=settings.OPENAI_API_KEY)

@lru_cache
def get_gemini_service():
    return GeminiService(api_key=settings.GEMINI_API_KEY)

# In routes:
@router.post("/conversation/message")
async def send_message(
    request: MessageRequest,
    openai: OpenAIService = Depends(get_openai_service),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ...
```

### AI Orchestration Architecture

**Dual-Model Strategy:**

| Model | Role | Use Case | Cost Profile |
|-------|------|----------|--------------|
| OpenAI (GPT-4+) | Conversation | Real-time chat, data extraction | Higher per-token, faster |
| Gemini | Verification | Batch legal review, consistency | Lower cost, longer context |

**Prompt Engineering Structure:**

```
System Prompt (OpenAI Conversation):
├── Role: South African will drafting assistant
├── Constraints: SA Wills Act requirements
├── Output format: JSON with extracted fields
└── Conversation style: Professional, empathetic

System Prompt (Gemini Verification):
├── Role: Legal document reviewer
├── Input: Complete will data as JSON
├── Tasks:
│   ├── Check legal compliance (SA Wills Act)
│   ├── Verify logical consistency
│   ├── Flag missing required elements
│   └── Assess estate division fairness
└── Output: Structured verification report
```

### Estate Logic Validator (SA-Specific)

**Business rules to encode:**

```python
class EstateLogicValidator:
    """
    Validates will data against South African legal requirements
    and common estate planning rules.
    """

    def validate(self, will_data: WillData) -> ValidationResult:
        errors = []
        warnings = []

        # Required elements per SA Wills Act
        errors += self._check_testator_requirements(will_data)
        errors += self._check_witness_requirements(will_data)
        errors += self._check_executor_requirements(will_data)

        # Estate-specific validations
        if will_data.has_trust:
            errors += self._validate_trust_structure(will_data.trust)

        if will_data.has_usufruct:
            errors += self._validate_usufruct(will_data.usufruct)

        if will_data.multiple_marriages:
            warnings += self._check_prior_marriage_obligations(will_data)

        # Asset distribution validation
        errors += self._validate_estate_distribution(will_data)

        return ValidationResult(errors=errors, warnings=warnings)

    def _check_testator_requirements(self, will_data):
        """Testator must be 16+, mentally competent"""
        ...

    def _validate_usufruct(self, usufruct_data):
        """
        Usufruct-specific rules:
        - Must specify property clearly
        - Must identify usufructuary and remainder beneficiary
        - Duration must be specified (life or fixed term)
        """
        ...
```

### PDF Generation Strategy

**Recommendation:** HTML-to-PDF via WeasyPrint

**Rationale:**
1. Legal documents need precise formatting
2. HTML/CSS gives full control over layout
3. WeasyPrint produces high-quality, print-ready PDFs
4. Templates are maintainable (HTML vs. programmatic drawing)

**Template Structure:**

```html
<!-- templates/will/basic_will.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        @page {
            size: A4;
            margin: 2.5cm;
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
            }
        }
        body {
            font-family: "Times New Roman", serif;
            font-size: 12pt;
            line-height: 1.5;
        }
        .clause {
            margin-bottom: 1em;
            text-align: justify;
        }
        .signature-block {
            margin-top: 3cm;
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <h1>LAST WILL AND TESTAMENT</h1>
    <p class="clause">
        I, <strong>{{ testator.full_name }}</strong>,
        Identity Number {{ testator.id_number }},
        of {{ testator.address }},
        being of sound mind...
    </p>
    <!-- More clauses -->
</body>
</html>
```

---

## Patterns to Follow

### Pattern 1: Repository Pattern for Data Access

**What:** Separate database operations from business logic via repository classes.

**When:** All database interactions.

```python
class WillRepository:
    def __init__(self, db: Session):
        self.db = db

    async def get_by_id(self, will_id: UUID) -> WillSession | None:
        return await self.db.get(WillSession, will_id)

    async def create(self, user_id: UUID, initial_data: dict) -> WillSession:
        will = WillSession(user_id=user_id, data=initial_data)
        self.db.add(will)
        await self.db.commit()
        return will

    async def update_data(self, will_id: UUID, data: dict) -> WillSession:
        will = await self.get_by_id(will_id)
        will.data = {**will.data, **data}  # Merge
        will.updated_at = datetime.utcnow()
        await self.db.commit()
        return will
```

### Pattern 2: Service Layer for Business Logic

**What:** Encapsulate business logic in service classes, inject dependencies.

**When:** Any complex operation spanning multiple concerns.

```python
class WillService:
    def __init__(
        self,
        repository: WillRepository,
        openai: OpenAIService,
        gemini: GeminiService,
        validator: EstateLogicValidator
    ):
        self.repository = repository
        self.openai = openai
        self.gemini = gemini
        self.validator = validator

    async def process_message(
        self,
        will_id: UUID,
        message: str
    ) -> ConversationResponse:
        will = await self.repository.get_by_id(will_id)

        # Get AI response
        ai_response = await self.openai.converse(
            context=will.data,
            history=will.conversation_history,
            message=message
        )

        # Extract and validate data
        extracted = ai_response.extracted_data
        if extracted:
            validation = self.validator.validate_partial(extracted)
            if validation.errors:
                return ConversationResponse(
                    message="I noticed some issues...",
                    errors=validation.errors
                )

            await self.repository.update_data(will_id, extracted)

        return ConversationResponse(
            message=ai_response.message,
            next_step=ai_response.suggested_step
        )
```

### Pattern 3: Event-Driven Audit Logging

**What:** Log all significant actions for compliance and debugging.

**When:** Any state change, payment event, document generation.

```python
class AuditService:
    async def log(
        self,
        event_type: str,
        user_id: UUID,
        will_id: UUID | None,
        details: dict
    ):
        audit = AuditLog(
            event_type=event_type,
            user_id=user_id,
            will_id=will_id,
            details=details,
            ip_address=get_client_ip(),
            timestamp=datetime.utcnow()
        )
        await self.repository.create(audit)

# Usage:
await audit.log("will_verified", user.id, will.id, {"verification_score": 0.95})
await audit.log("payment_completed", user.id, will.id, {"amount": 299, "method": "payfast"})
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic AI Prompts

**What:** Single massive prompt trying to do everything (conversation + validation + formatting).

**Why Bad:**
- Hard to debug when issues arise
- Expensive (more tokens = more cost)
- Unreliable (complex prompts have more failure modes)

**Instead:**
- Separate prompts for separate tasks
- Use structured output (JSON) for data extraction
- Keep conversation prompts focused on dialogue

### Anti-Pattern 2: Storing Sensitive Data in JWT

**What:** Putting will data or PII in JWT tokens.

**Why Bad:**
- JWTs are visible client-side
- Increases token size
- Can't revoke data once issued

**Instead:**
- JWT contains only user ID and session info
- All sensitive data lives in PostgreSQL
- Backend fetches data using ID from JWT

### Anti-Pattern 3: Synchronous PDF Generation

**What:** Generating PDF in the request/response cycle.

**Why Bad:**
- PDF generation can be slow (2-5+ seconds)
- Blocks the request
- Poor user experience

**Instead:**
- Return immediately with "generating" status
- Generate PDF in background task (Celery/ARQ)
- Notify frontend via polling or webhook when ready

### Anti-Pattern 4: Direct AI API Calls from Frontend

**What:** Calling OpenAI/Gemini directly from React.

**Why Bad:**
- Exposes API keys
- No rate limiting control
- Can't inject user context securely
- No audit trail

**Instead:**
- All AI calls go through FastAPI backend
- Backend injects context, manages keys
- Rate limiting at API layer
- Full audit logging

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 100K Users |
|---------|--------------|--------------|---------------|
| **Database** | Single PostgreSQL | Read replicas, connection pooling | Sharding or managed service (Supabase) |
| **AI Costs** | Pay-per-use fine | May need to cache common responses | Consider fine-tuned models |
| **PDF Generation** | Sync acceptable | Background workers (3-5) | Dedicated PDF service, queue |
| **Sessions** | In-memory cache | Redis for session state | Redis cluster |
| **File Storage** | PostgreSQL BYTEA | S3/Cloudflare R2 | CDN for downloads |

---

## Build Order (Dependencies)

Based on component dependencies, recommended build order:

```
Phase 1: Foundation
├── PostgreSQL schema + migrations
├── FastAPI project structure
├── Clerk authentication integration
├── Basic React app with Clerk
└── Dependency: None (greenfield)

Phase 2: Core Conversation
├── OpenAI service integration
├── Conversation API endpoints
├── React conversation/wizard UI
├── Will data model and storage
└── Dependency: Phase 1 (auth, db)

Phase 3: Verification & Estate Logic
├── Gemini service integration
├── Estate Logic Validator (SA rules)
├── Verification endpoints
├── React verification UI
└── Dependency: Phase 2 (conversation data)

Phase 4: Document Generation
├── Will templates (HTML)
├── PDF generation service
├── Download endpoints
├── React preview/download UI
└── Dependency: Phase 3 (verified data)

Phase 5: Payments
├── PayFast integration
├── Payment flow UI
├── Webhook handlers
├── License unlocking logic
└── Dependency: Phase 4 (document to sell)

Phase 6: Polish & Production
├── Error handling & monitoring
├── Performance optimization
├── Security hardening
├── Production deployment
└── Dependency: Phases 1-5 complete
```

**Critical Path:** Phases 1-4 must be sequential. Phase 5 can start in parallel with Phase 4 polish.

---

## South Africa Legal Constraints

### Electronic Signatures and Wills

**CRITICAL:** Under the Electronic Communications and Transactions Act (ECTA), wills **cannot** be executed using electronic signatures in South Africa. The platform generates the will document, but the testator must:

1. Print the will
2. Sign with wet ink
3. Have two witnesses sign (both present simultaneously)

**Architectural Implication:**
- Platform is a drafting tool, not an execution platform
- UI must clearly instruct users on proper execution
- Consider partnership with commissioner of oaths service

### Payment Gateway

**Stripe is not available in South Africa.** Use PayFast (or alternatives like Peach Payments, DPO PayGate).

PayFast uses redirect-based payment flow:
- User redirected to PayFast hosted page
- After payment, redirected back with status
- Webhook confirms payment (don't trust redirect alone)

---

## Sources

### HIGH Confidence (Context7, Official Docs)
- FastAPI documentation: https://fastapi.tiangolo.com/
- React documentation: https://react.dev/learn/scaling-up-with-reducer-and-context
- Clerk FastAPI integration: https://github.com/OSSMafia/fastapi-clerk-middleware

### MEDIUM Confidence (Multiple sources agree)
- AI legal document architecture patterns: https://juro.com/learn/ai-legal-documents
- Multi-model AI strategies 2025: https://atoms.dev/blog/2025-llm-review-gpt-5-2-gemini-3-pro-claude-4-5
- PayFast integration: https://payfast.io/

### Domain-Specific (Legal)
- ECTA electronic signatures: https://helpx.adobe.com/legal/esignatures/regulations/south-africa.html
- SA electronic signature law: https://legalese.co.za/what-are-the-requirements-for-electronic-signatures-in-south-africa/

---

## Open Questions for Phase-Specific Research

1. **Witness Guidance:** How to guide users through proper will execution post-generation?
2. **Template Variants:** How many template variants needed for trust/usufruct/multiple marriage scenarios?
3. **Version Management:** How to handle will updates over time (new versions vs. amendments)?
4. **Offline Access:** Should users be able to download editable versions?
