# Phase 1: Foundation & Compliance - Research

**Researched:** 2026-02-05
**Domain:** POPIA compliance infrastructure, PostgreSQL schema design, UPL prevention for AI legal outputs
**Confidence:** HIGH (verified via official documentation, multiple authoritative sources)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

None explicitly locked - all Phase 1 decisions delegated to Claude's discretion.

### Claude's Discretion

User has delegated all Phase 1 decisions to Claude. This is appropriate because Phase 1 is infrastructure/compliance foundation with no user-facing features. Claude should apply best practices for:

**POPIA Consent Flow:**
- Blocking modal before any data collection (standard pattern)
- Clear, plain-language explanation of data handling
- Granular consent where legally required
- Easy consent withdrawal mechanism
- Audit trail for all consent events

**Clause Library Structure:**
- Hierarchical organization by will section (executors, beneficiaries, guardians, etc.)
- Version control for attorney-approved text
- Metadata for clause applicability (basic/trust/usufruct/joint)
- English only for MVP (Afrikaans can be Phase 10+)

**UPL Filter Behavior:**
- Silent replacement with approved clause text (no user confusion)
- Logging of all filter activations for compliance audit
- Hard block on freeform legal advice generation
- Graceful fallback to "consult an attorney" for edge cases

**Data Subject Rights:**
- Contact form approach (not full self-service for MVP)
- Clear Information Officer contact details
- Response time aligned with POPIA requirements (reasonable period)
- Audit logging of all data subject requests

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.

</user_constraints>

## Summary

Phase 1 establishes the foundational compliance infrastructure for WillCraft SA, covering POPIA data protection requirements, PostgreSQL database schema with audit logging, FastAPI backend structure with consent middleware, React consent flow UI, a versioned clause library system, and UPL (Unauthorized Practice of Law) filter architecture for AI outputs.

The research validates a standard modern Python/TypeScript stack: **FastAPI** with **SQLModel** for async PostgreSQL operations, **Alembic** for migrations, and **React** with consent modal patterns. For UPL prevention, the architecture should use a combination of rule-based guardrails and structured clause replacement rather than relying on AI self-moderation.

South African POPIA requirements (updated April 2025) mandate explicit, informed consent before processing personal information, with clear Information Officer contact details and accessible data subject rights processes. The blocking consent modal pattern aligns with both POPIA and GDPR best practices.

**Primary recommendation:** Build a layered compliance architecture where POPIA consent is a middleware gate, clause library is the single source of truth for all legal text, and UPL filtering happens at the API layer before any AI output reaches the user.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.115+ | Backend API framework | De facto standard for modern Python APIs; async-native, automatic OpenAPI docs |
| SQLModel | 0.0.22+ | ORM with Pydantic integration | Combines SQLAlchemy + Pydantic; native FastAPI compatibility |
| Alembic | 1.14+ | Database migrations | Industry standard for SQLAlchemy migrations; version-controlled schema |
| asyncpg | 0.30+ | Async PostgreSQL driver | Fastest async PostgreSQL driver for Python |
| PostgreSQL | 16+ | Primary database | JSONB support for flexible will data; robust audit capabilities |
| React | 19+ | Frontend framework | Project stack requirement; modern hooks for state management |
| Tailwind CSS | 4+ | Styling | Utility-first CSS; rapid UI development |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pydantic-settings | 2.7+ | Configuration management | Environment variable loading, validation |
| python-jose | 3.3+ | JWT handling | Token validation for Clerk middleware |
| httpx | 0.28+ | Async HTTP client | External API calls (Clerk JWKS, etc.) |
| NeMo Guardrails | 0.12+ | LLM output filtering | UPL filter implementation for AI outputs |
| react-cookie-consent | 9+ | Consent banner | POPIA consent modal component |
| @tanstack/react-query | 5+ | Data fetching | API state management in React |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SQLModel | SQLAlchemy 2.0 | SQLModel is simpler but less mature; SQLAlchemy has more features |
| asyncpg | psycopg3 | psycopg3 is more compatible with sync code; asyncpg is faster pure async |
| NeMo Guardrails | Custom regex rules | NeMo is heavier but more robust; custom rules need maintenance |
| Alembic | Manual migrations | Manual is error-prone at scale; Alembic enables team collaboration |

**Installation (Backend):**
```bash
pip install fastapi[standard] sqlmodel alembic asyncpg pydantic-settings python-jose httpx nemoguardrails
```

**Installation (Frontend):**
```bash
npm install react-cookie-consent @tanstack/react-query
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, lifespan events, CORS
│   ├── config.py               # Settings from environment
│   ├── database.py             # Engine, session factory
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── popia_consent.py    # Consent verification middleware
│   │   └── audit.py            # Request/response audit logging
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── consent.py          # POPIA consent endpoints
│   │   ├── privacy.py          # Privacy policy, data subject requests
│   │   └── health.py           # Health check endpoints
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── clause_library.py   # Clause retrieval and versioning
│   │   ├── upl_filter.py       # AI output filtering
│   │   └── audit_service.py    # Audit log operations
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User model (minimal for Phase 1)
│   │   ├── consent.py          # Consent record model
│   │   ├── clause.py           # Clause library model
│   │   └── audit.py            # Audit log model
│   │
│   └── schemas/
│       ├── __init__.py
│       ├── consent.py          # Consent Pydantic schemas
│       └── clause.py           # Clause schemas
│
├── alembic/
│   ├── versions/               # Migration files
│   └── env.py                  # Migration configuration
│
└── tests/
    └── ...

frontend/
├── src/
│   ├── components/
│   │   ├── consent/
│   │   │   ├── ConsentModal.tsx      # Blocking consent modal
│   │   │   ├── ConsentProvider.tsx   # Context for consent state
│   │   │   └── PrivacyPolicy.tsx     # Privacy policy display
│   │   └── common/
│   │       └── InfoOfficerContact.tsx
│   │
│   ├── hooks/
│   │   ├── useConsent.ts       # Consent state hook
│   │   └── useApi.ts           # API wrapper
│   │
│   ├── services/
│   │   └── api.ts              # API client
│   │
│   └── App.tsx                 # Root with ConsentProvider
```

### Pattern 1: POPIA Consent Middleware

**What:** Middleware that blocks API access until consent is recorded.

**When to use:** All endpoints that process personal information.

```python
# Source: FastAPI middleware pattern + POPIA requirements
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

class POPIAConsentMiddleware(BaseHTTPMiddleware):
    """
    Middleware that verifies POPIA consent before allowing
    access to endpoints that process personal information.
    """

    # Endpoints that don't require consent (public routes)
    EXEMPT_PATHS = {
        "/api/health",
        "/api/consent",  # The consent endpoint itself
        "/api/privacy-policy",
        "/api/info-officer",
        "/docs",
        "/openapi.json",
    }

    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ):
        # Skip exempt paths
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Check for consent token in cookie or header
        consent_token = request.cookies.get("popia_consent")

        if not consent_token:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "consent_required",
                    "message": "POPIA consent is required to continue",
                    "consent_url": "/api/consent"
                }
            )

        # Validate consent token (check against database)
        if not await self._validate_consent(consent_token):
            raise HTTPException(
                status_code=403,
                detail={"error": "consent_invalid"}
            )

        return await call_next(request)

    async def _validate_consent(self, token: str) -> bool:
        # Verify token against consent records
        # Implementation depends on token strategy
        ...
```

### Pattern 2: Versioned Clause Library

**What:** Database structure for attorney-approved legal clauses with version history.

**When to use:** All legal text generation.

```python
# Source: Legal document versioning patterns
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional
from enum import Enum
import uuid

class ClauseCategory(str, Enum):
    REVOCATION = "revocation"
    EXECUTOR = "executor"
    BENEFICIARY = "beneficiary"
    GUARDIAN = "guardian"
    TRUST = "trust"
    USUFRUCT = "usufruct"
    RESIDUE = "residue"
    WITNESS = "witness"
    SIGNATURE = "signature"

class WillType(str, Enum):
    BASIC = "basic"
    TRUST = "trust"
    USUFRUCT = "usufruct"
    JOINT = "joint"

class Clause(SQLModel, table=True):
    """Attorney-approved clause template."""
    __tablename__ = "clauses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Identification
    code: str = Field(index=True, unique=True)  # e.g., "EXEC-01", "BENEF-02"
    name: str
    category: ClauseCategory

    # Version control
    version: int = Field(default=1)
    is_current: bool = Field(default=True, index=True)
    previous_version_id: Optional[uuid.UUID] = Field(default=None)

    # Content
    template_text: str  # Jinja2 template with {{ variables }}
    variables_schema: dict = Field(sa_column_kwargs={"type_": "JSONB"})

    # Applicability
    will_types: list[str] = Field(sa_column_kwargs={"type_": "JSONB"})
    is_required: bool = Field(default=False)
    display_order: int = Field(default=0)

    # Approval tracking
    approved_by: str  # Attorney name/ID
    approved_at: datetime
    approval_notes: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Pattern 3: Immutable Audit Log

**What:** Append-only audit trail for compliance and debugging.

**When to use:** All consent events, data subject requests, UPL filter activations.

```python
# Source: PostgreSQL audit log best practices
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
import uuid

class AuditLog(SQLModel, table=True):
    """
    Immutable audit log for compliance tracking.
    Table should have no UPDATE/DELETE permissions.
    """
    __tablename__ = "audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # Event identification
    event_type: str = Field(index=True)  # consent_granted, consent_withdrawn, etc.
    event_category: str = Field(index=True)  # popia, upl_filter, data_request

    # Actor
    user_id: Optional[uuid.UUID] = Field(default=None, index=True)
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Context
    resource_type: Optional[str] = None  # will_session, clause, etc.
    resource_id: Optional[uuid.UUID] = None

    # Payload (flexible JSONB for event-specific data)
    details: dict = Field(default_factory=dict, sa_column_kwargs={"type_": "JSONB"})

    # Timestamp (with timezone for legal compliance)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )

    class Config:
        # Prevent modification after creation
        orm_mode = True
```

**Database constraint for immutability:**
```sql
-- Apply via Alembic migration
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
GRANT INSERT, SELECT ON audit_logs TO app_user;
```

### Pattern 4: UPL Filter Service

**What:** Service layer that filters AI outputs to prevent unauthorized legal advice.

**When to use:** All AI-generated content before returning to user.

```python
# Source: LLM guardrails patterns + UPL requirements
from typing import Optional
from dataclasses import dataclass
from enum import Enum
import re

class FilterAction(str, Enum):
    ALLOW = "allow"
    REPLACE = "replace"  # Replace with approved clause
    BLOCK = "block"      # Block entirely with fallback message
    REFER = "refer"      # Suggest attorney consultation

@dataclass
class FilterResult:
    action: FilterAction
    original_text: str
    filtered_text: str
    clause_code: Optional[str] = None
    reason: Optional[str] = None

class UPLFilterService:
    """
    Filters AI outputs to prevent unauthorized practice of law.
    Uses rule-based detection + clause library replacement.
    """

    # Patterns that indicate legal advice (not just information)
    ADVICE_PATTERNS = [
        r"you should\s+(?:definitely\s+)?(?:include|add|create|make)",
        r"I (?:recommend|advise|suggest)\s+(?:that\s+)?you",
        r"the best (?:way|approach|option)\s+(?:is|would be)",
        r"you (?:must|need to|have to)\s+(?:do|include|specify)",
        r"legally,?\s+you\s+(?:should|must|need)",
    ]

    # Patterns for complex scenarios requiring attorney
    ATTORNEY_REQUIRED = [
        r"tax\s+(?:implications|consequences|planning)",
        r"estate\s+duty",
        r"business\s+(?:succession|valuation)",
        r"offshore\s+(?:assets|trust)",
        r"disputed\s+(?:estate|inheritance|will)",
    ]

    FALLBACK_MESSAGE = (
        "For this specific situation, we recommend consulting with "
        "a qualified attorney who can provide personalized legal advice."
    )

    def __init__(self, clause_service):
        self.clause_service = clause_service
        self.advice_regex = [re.compile(p, re.IGNORECASE) for p in self.ADVICE_PATTERNS]
        self.attorney_regex = [re.compile(p, re.IGNORECASE) for p in self.ATTORNEY_REQUIRED]

    async def filter_output(
        self,
        text: str,
        context: dict
    ) -> FilterResult:
        """
        Filter AI output for UPL compliance.

        Args:
            text: Raw AI output
            context: Will context (type, section being discussed, etc.)

        Returns:
            FilterResult with action taken and filtered text
        """
        # Check for attorney-required patterns first
        for pattern in self.attorney_regex:
            if pattern.search(text):
                return FilterResult(
                    action=FilterAction.REFER,
                    original_text=text,
                    filtered_text=self.FALLBACK_MESSAGE,
                    reason=f"Matched attorney-required pattern"
                )

        # Check for advice-giving patterns
        for pattern in self.advice_regex:
            if pattern.search(text):
                # Try to find appropriate clause replacement
                clause = await self._find_replacement_clause(context)
                if clause:
                    return FilterResult(
                        action=FilterAction.REPLACE,
                        original_text=text,
                        filtered_text=clause.template_text,
                        clause_code=clause.code,
                        reason="Replaced advice with approved clause"
                    )
                else:
                    return FilterResult(
                        action=FilterAction.BLOCK,
                        original_text=text,
                        filtered_text=self.FALLBACK_MESSAGE,
                        reason="No suitable clause found"
                    )

        return FilterResult(
            action=FilterAction.ALLOW,
            original_text=text,
            filtered_text=text
        )

    async def _find_replacement_clause(self, context: dict):
        """Find appropriate clause based on context."""
        category = context.get("category")
        will_type = context.get("will_type", "basic")

        if category:
            return await self.clause_service.get_current_clause(
                category=category,
                will_type=will_type
            )
        return None
```

### Anti-Patterns to Avoid

- **Storing consent in cookies only:** Always persist consent to database with audit trail; cookies can be cleared/manipulated.

- **Using AI to detect UPL:** AI models are not reliable for legal compliance decisions; use rule-based guardrails with clause library as source of truth.

- **Mutable audit logs:** Never allow UPDATE/DELETE on audit tables; use PostgreSQL permissions to enforce append-only.

- **Inline clause text:** Never hardcode legal text in code; always reference clause library for maintainability and attorney approval workflow.

- **Processing before consent:** Never collect or process personal information before POPIA consent is recorded; middleware must gate all PII endpoints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cookie consent UI | Custom modal with localStorage | react-cookie-consent | Handles edge cases, accessibility, GDPR patterns |
| JWT validation | Manual token parsing | python-jose + JWKS | Security-critical; libraries handle attacks |
| Database migrations | Raw SQL files | Alembic | Version control, rollback, team collaboration |
| LLM output filtering | Simple regex list | NeMo Guardrails | More robust, extensible, battle-tested |
| Audit log queries | Custom SQL | PostgreSQL JSONB operators | Built-in indexing, query optimization |
| Environment config | os.environ directly | pydantic-settings | Validation, type safety, defaults |

**Key insight:** Phase 1 is foundational infrastructure. Using battle-tested libraries reduces risk and allows focus on business logic. Hand-rolling security and compliance components is high-risk.

## Common Pitfalls

### Pitfall 1: Consent Token Tampering

**What goes wrong:** User modifies consent cookie/token to bypass validation.

**Why it happens:** Client-side only consent storage; no server verification.

**How to avoid:**
- Store consent record in database with user identifier
- Sign consent token with server secret
- Verify token against database on each request

**Warning signs:** Consent count doesn't match expected user count; consent without corresponding database record.

### Pitfall 2: Clause Version Confusion

**What goes wrong:** Old clause versions used after attorney approves updates.

**Why it happens:** Caching stale clauses; not checking `is_current` flag.

**How to avoid:**
- Always query with `is_current=True` filter
- Use database triggers to set `is_current=False` on old versions
- Clear clause cache on version update

**Warning signs:** Generated documents have outdated text; attorney reports seeing old clauses.

### Pitfall 3: Audit Log Performance Degradation

**What goes wrong:** Audit queries slow down as table grows to millions of rows.

**Why it happens:** Missing indexes; querying without date bounds.

**How to avoid:**
- Partition audit_logs by month (PostgreSQL range partitioning)
- Index on `(event_type, created_at)` and `(user_id, created_at)`
- Always include date range in queries

**Warning signs:** Audit queries taking >1s; database CPU spikes during reporting.

### Pitfall 4: UPL Filter False Negatives

**What goes wrong:** Legal advice slips through filter undetected.

**Why it happens:** Regex patterns don't cover all advice-giving language.

**How to avoid:**
- Log all filter passes for manual review
- Regularly update patterns based on review findings
- Default to BLOCK for ambiguous cases
- Use clause library as primary output source, not AI

**Warning signs:** Users report receiving specific legal recommendations; audit log shows many ALLOW results.

### Pitfall 5: POPIA Consent Scope Creep

**What goes wrong:** Collecting data beyond what user consented to.

**Why it happens:** Consent form too broad; new features add data collection without consent update.

**How to avoid:**
- Specific, granular consent per data type
- Consent versioning with re-consent required for scope changes
- Map each data field to consent category

**Warning signs:** Privacy audit finds undisclosed data collection; user complaints about unexpected data use.

## Code Examples

### Database Session Dependency (FastAPI + SQLModel)

```python
# Source: FastAPI/SQLModel documentation patterns
from typing import AsyncGenerator
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from app.config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides async database session.
    Handles commit on success, rollback on exception.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### Consent Recording Endpoint

```python
# Source: POPIA requirements + FastAPI patterns
from fastapi import APIRouter, Depends, Response, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime, timedelta
import uuid
import jwt

from app.database import get_session
from app.models.consent import ConsentRecord
from app.models.audit import AuditLog
from app.config import settings
from app.schemas.consent import ConsentRequest, ConsentResponse

router = APIRouter(prefix="/api/consent", tags=["consent"])

@router.post("/", response_model=ConsentResponse)
async def record_consent(
    request: Request,
    consent: ConsentRequest,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    """
    Record POPIA consent and set consent cookie.
    """
    # Generate consent ID
    consent_id = uuid.uuid4()

    # Create consent record
    consent_record = ConsentRecord(
        id=consent_id,
        consent_version=settings.CONSENT_VERSION,
        privacy_policy_version=settings.PRIVACY_POLICY_VERSION,
        accepted_at=datetime.utcnow(),
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        consent_categories=consent.categories,  # List of consented categories
    )
    session.add(consent_record)

    # Audit log
    audit = AuditLog(
        event_type="consent_granted",
        event_category="popia",
        resource_type="consent",
        resource_id=consent_id,
        ip_address=request.client.host,
        details={
            "consent_version": settings.CONSENT_VERSION,
            "categories": consent.categories,
        }
    )
    session.add(audit)

    # Generate signed consent token
    token = jwt.encode(
        {
            "consent_id": str(consent_id),
            "version": settings.CONSENT_VERSION,
            "exp": datetime.utcnow() + timedelta(days=365)
        },
        settings.SECRET_KEY,
        algorithm="HS256"
    )

    # Set secure cookie
    response.set_cookie(
        key="popia_consent",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=365 * 24 * 60 * 60  # 1 year
    )

    return ConsentResponse(
        consent_id=consent_id,
        accepted_at=consent_record.accepted_at,
        consent_version=settings.CONSENT_VERSION
    )
```

### React Blocking Consent Modal

```tsx
// Source: react-cookie-consent patterns + POPIA requirements
import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConsentContextType {
  hasConsent: boolean;
  isLoading: boolean;
  grantConsent: (categories: string[]) => Promise<void>;
  withdrawConsent: () => Promise<void>;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing consent cookie
    const checkConsent = async () => {
      try {
        const response = await fetch('/api/consent/status', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setHasConsent(data.has_valid_consent);
        }
      } catch (error) {
        console.error('Consent check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkConsent();
  }, []);

  const grantConsent = async (categories: string[]) => {
    const response = await fetch('/api/consent', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories })
    });

    if (response.ok) {
      setHasConsent(true);
    } else {
      throw new Error('Failed to record consent');
    }
  };

  const withdrawConsent = async () => {
    await fetch('/api/consent/withdraw', {
      method: 'POST',
      credentials: 'include'
    });
    setHasConsent(false);
  };

  return (
    <ConsentContext.Provider value={{ hasConsent, isLoading, grantConsent, withdrawConsent }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used within ConsentProvider');
  return context;
}

// Blocking modal component
export function ConsentModal() {
  const { hasConsent, isLoading, grantConsent } = useConsent();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading || hasConsent) return null;

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await grantConsent(['essential', 'functional']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg mx-4">
        <h2 className="text-xl font-bold mb-4">Privacy Consent Required</h2>

        <p className="mb-4">
          Before you continue, we need your consent to process your personal
          information in accordance with the Protection of Personal Information
          Act (POPIA).
        </p>

        <div className="mb-4 p-4 bg-gray-50 rounded text-sm">
          <p className="font-semibold mb-2">We will use your information to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create and store your will document</li>
            <li>Send you important updates about your will</li>
            <li>Process your payment securely</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href="/privacy-policy"
            target="_blank"
            className="text-blue-600 underline text-sm"
          >
            Read our full Privacy Policy
          </a>

          <a
            href="/info-officer"
            className="text-blue-600 underline text-sm"
          >
            Contact our Information Officer
          </a>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'I Accept'}
          </button>

          <button
            onClick={() => window.location.href = 'https://google.com'}
            className="flex-1 border border-gray-300 py-2 px-4 rounded hover:bg-gray-50"
          >
            Leave Site
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Alembic Migration Example

```python
# alembic/versions/001_initial_schema.py
"""Initial schema with POPIA compliance tables

Revision ID: 001
Revises:
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Consent records
    op.create_table(
        'consent_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('consent_version', sa.String(50), nullable=False),
        sa.Column('privacy_policy_version', sa.String(50), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('withdrawn_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('consent_categories', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_consent_records_accepted_at', 'consent_records', ['accepted_at'])

    # Clause library
    op.create_table(
        'clauses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('version', sa.Integer, default=1, nullable=False),
        sa.Column('is_current', sa.Boolean, default=True, nullable=False),
        sa.Column('previous_version_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('template_text', sa.Text, nullable=False),
        sa.Column('variables_schema', postgresql.JSONB, nullable=False),
        sa.Column('will_types', postgresql.JSONB, nullable=False),
        sa.Column('is_required', sa.Boolean, default=False),
        sa.Column('display_order', sa.Integer, default=0),
        sa.Column('approved_by', sa.String(200), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('approval_notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_clauses_code', 'clauses', ['code'])
    op.create_index('ix_clauses_category_current', 'clauses', ['category', 'is_current'])

    # Audit logs (partitioned by month)
    op.execute("""
        CREATE TABLE audit_logs (
            id UUID PRIMARY KEY,
            event_type VARCHAR(100) NOT NULL,
            event_category VARCHAR(50) NOT NULL,
            user_id UUID,
            session_id VARCHAR(200),
            ip_address VARCHAR(45),
            user_agent TEXT,
            resource_type VARCHAR(100),
            resource_id UUID,
            details JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        ) PARTITION BY RANGE (created_at);
    """)

    # Create initial partition
    op.execute("""
        CREATE TABLE audit_logs_2026_02
        PARTITION OF audit_logs
        FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
    """)

    op.create_index('ix_audit_logs_event_type', 'audit_logs', ['event_type', 'created_at'])
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id', 'created_at'])

def downgrade():
    op.drop_table('audit_logs_2026_02')
    op.drop_table('audit_logs')
    op.drop_table('clauses')
    op.drop_table('consent_records')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sync SQLAlchemy | Async SQLModel + asyncpg | 2024 | Better concurrency, native FastAPI integration |
| Single audit table | Partitioned audit logs | 2024 | Scales to millions of records without degradation |
| GDPR-only patterns | POPIA-specific (SA) | 2025 | Explicit consent, Information Officer requirements |
| AI self-moderation | Rule-based guardrails | 2025 | More reliable UPL compliance |
| Manual migrations | Alembic autogenerate | Standard | Consistent schema changes across team |

**Deprecated/outdated:**
- **psycopg2 for async:** Use asyncpg instead for true async PostgreSQL
- **Storing PII in JWTs:** Security risk; store in database, reference by ID
- **Single monolithic consent:** POPIA requires granular, specific consent per purpose

## Open Questions

1. **Attorney Approval Workflow**
   - What we know: Clauses need attorney approval before use
   - What's unclear: Process for submitting, reviewing, and publishing clauses
   - Recommendation: For Phase 1, pre-seed database with initial clauses; build approval UI in later phase

2. **Consent Re-versioning**
   - What we know: When consent form changes, users must re-consent
   - What's unclear: How to handle in-progress will sessions when consent version updates
   - Recommendation: Block API access until re-consent; allow resume after

3. **UPL Filter Tuning**
   - What we know: Initial regex patterns need refinement based on real AI outputs
   - What's unclear: How aggressive to filter without degrading user experience
   - Recommendation: Start with strict filtering (more false positives); log all and tune iteratively

4. **Audit Log Retention**
   - What we know: POPIA requires reasonable retention periods
   - What's unclear: Specific retention period for will-related audit data
   - Recommendation: Default to 7 years (typical legal document retention); implement partition cleanup job

## Sources

### Primary (HIGH confidence)
- [FastAPI Documentation](https://fastapi.tiangolo.com/tutorial/sql-databases/) - Database patterns, middleware, dependencies
- [POPIA Official Site](https://popia.co.za/) - Consent requirements, data subject rights, Information Officer duties
- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/datatype-json.html) - JSONB storage patterns

### Secondary (MEDIUM confidence)
- [Alembic + FastAPI Guide](https://medium.com/@rajeshpachaikani/using-alembic-with-fastapi-and-postgresql-no-bullshit-guide-b564ae89f4be) - Migration best practices
- [PostgreSQL Audit Logging](https://oneuptime.com/blog/post/2026-01-21-postgresql-audit-logging/view) - Immutable audit patterns
- [NeMo Guardrails Documentation](https://docs.nvidia.com/nemo/guardrails/latest/index.html) - LLM output filtering
- [React Cookie Consent](https://www.npmjs.com/package/react-cookie-consent) - Consent modal patterns
- [GDPR Consent Requirements 2025](https://secureprivacy.ai/blog/gdpr-cookie-consent-requirements-2025) - Button parity, dark pattern restrictions
- [SA Data Protection Laws 2025](https://www.oaklaw.co.za/how-south-african-data-protection-laws-impact-your-business-operations-in-2025/) - POPIA April 2025 amendments
- [SQLModel Async FastAPI](https://daniel.feldroy.com/posts/til-2025-08-using-sqlmodel-asynchronously-with-fastapi-and-air-with-postgresql) - Async patterns

### Tertiary (LOW confidence - needs validation)
- UPL-specific guardrail patterns (limited published examples for SA context)
- Clause library versioning for legal documents (general patterns, not SA-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official documentation and multiple recent sources
- Architecture patterns: HIGH - Based on official FastAPI/SQLModel docs and established patterns
- POPIA requirements: HIGH - Verified via official POPIA site and legal resources
- UPL filter implementation: MEDIUM - Based on guardrails best practices, limited SA-specific guidance
- Audit log patterns: HIGH - Verified via PostgreSQL documentation and multiple production guides

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable infrastructure patterns)
