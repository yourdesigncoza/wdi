# Technology Stack

**Project:** WillCraft SA - AI-Powered Will Generation Platform
**Researched:** 2026-02-05
**Overall Confidence:** HIGH

---

## Executive Summary

This stack recommendation is optimized for an AI-powered legal document generation platform with conversational UI. The architecture separates concerns cleanly: React + Vite for the interactive frontend, FastAPI for the AI orchestration backend, PostgreSQL for reliable data persistence, and a dual-LLM strategy (OpenAI primary, Gemini verification) for legal accuracy.

**Key architectural decisions:**
- Direct OpenAI SDK over LangChain (simpler, faster for single-purpose document generation)
- WeasyPrint + Jinja2 for PDF generation (HTML/CSS templates = maintainable legal document formatting)
- Zustand over Redux (minimal boilerplate for conversational state)
- React Hook Form + Zod for multi-step form validation (type-safe, performant)

---

## Recommended Stack

### Frontend Core

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **React** | 19.x | UI framework | Production-ready since Dec 2024. New hooks (useActionState, useOptimistic) perfect for conversational forms. React Compiler eliminates manual memoization. Server Components available but not needed for SPA. | HIGH |
| **Vite** | 6.x | Build tool | Industry standard replacing CRA. Near-instant HMR, native ESM in dev, Rollup-based production builds. Lightning fast iteration. | HIGH |
| **TypeScript** | 5.7+ | Type safety | Non-negotiable for legal document logic. Catches schema mismatches at compile time. | HIGH |
| **Tailwind CSS** | 4.x | Styling | v4 released with CSS-first config, smaller builds. Utility-first = rapid UI development. Note: Requires Safari 16.4+, Chrome 111+, Firefox 128+. | HIGH |

### Frontend Libraries

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| **Zustand** | 5.x | State management | Minimal boilerplate, TypeScript-first. Perfect for conversational flow state (current step, answers, validation). No Redux ceremony. | HIGH |
| **TanStack Query** | 5.x | Server state | Handles API calls, caching, optimistic updates. Separates server state from UI state cleanly. | HIGH |
| **React Hook Form** | 7.x | Form handling | Best-in-class performance (uncontrolled inputs). Native validation, minimal re-renders. Essential for multi-step forms. | HIGH |
| **Zod** | 4.x | Schema validation | v4 has 2KB core, 10x faster than v3. TypeScript inference for form→API contract. Shared schemas possible with Python via JSON Schema. | HIGH |
| **@clerk/clerk-react** | 5.x | Authentication | Pre-built auth UI components. Handles OAuth, MFA, session management. React SDK mature and well-documented. | HIGH |
| **Motion** | 11.x | Animations | Formerly Framer Motion. Physics-based animations for smooth conversational UI transitions. Hardware-accelerated. | HIGH |

### Backend Core

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Python** | 3.12+ | Runtime | Required for FastAPI async features. Type hints for Pydantic integration. Latest performance improvements. | HIGH |
| **FastAPI** | 0.115+ | API framework | Async-native, automatic OpenAPI docs, Pydantic integration. StreamingResponse for LLM output. Production-proven at scale. | HIGH |
| **Pydantic** | 2.x | Data validation | Rust-powered validation (pydantic-core). Type hints = schema definitions. Seamless FastAPI integration. | HIGH |
| **Uvicorn** | 0.30+ | ASGI server | Production-grade async server. Use with --workers for multi-process in production. | HIGH |

### Backend Libraries

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| **openai** | 1.x | OpenAI SDK | Direct SDK faster than LangChain for single-purpose apps. Streaming support, async client, structured outputs. | HIGH |
| **google-generativeai** | 0.8+ | Gemini SDK | Secondary LLM for verification. Gemini 2.0 Flash for cost-effective validation checks. | HIGH |
| **SQLAlchemy** | 2.x | ORM | Async support (asyncpg driver). Type-safe queries. Mature ecosystem. | HIGH |
| **Alembic** | 1.13+ | Migrations | Database migrations. Integrates with async SQLAlchemy 2.0. Auto-generates from model changes. | HIGH |
| **asyncpg** | 0.29+ | PostgreSQL driver | Fastest async PostgreSQL driver for Python. Required for SQLAlchemy async. | HIGH |
| **WeasyPrint** | 62+ | PDF generation | HTML/CSS to PDF. Maintains legal document formatting via templates. Better than ReportLab for styled documents. | HIGH |
| **Jinja2** | 3.1+ | Templating | Template engine for PDF generation. Conditional clauses for legal variations. | HIGH |
| **fastapi-clerk-auth** | 0.4+ | Auth middleware | Validates Clerk JWT tokens. Lightweight, purpose-built for Clerk+FastAPI. | MEDIUM |
| **httpx** | 0.27+ | HTTP client | Async HTTP for external API calls. Required for Clerk backend validation. | HIGH |
| **python-dotenv** | 1.0+ | Config | Environment variable management. Standard practice. | HIGH |
| **pydantic-settings** | 2.x | Config | Type-safe settings from env vars. Validates config at startup. | HIGH |

### Database & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **PostgreSQL** | 16+ | Primary database | ACID compliance critical for legal documents. JSONB for flexible will data structures. Proven reliability. | HIGH |
| **Redis** | 7.x | Caching | LLM response caching, session storage, rate limiting. Reduces API costs significantly. | MEDIUM |

---

## LLM Strategy

### Primary: OpenAI

| Model | Use Case | Why |
|-------|----------|-----|
| **GPT-4o** | Will generation, complex estate logic | Best reasoning for legal language, trust structures, usufruct handling |
| **GPT-4o-mini** | Simple questions, validation | Cost-effective for straightforward Q&A |

**Integration pattern:** Direct SDK with streaming. No LangChain - adds complexity without benefit for document generation.

### Secondary: Gemini (Verification)

| Model | Use Case | Why |
|-------|----------|-----|
| **Gemini 2.0 Flash** | Document verification, consistency checks | Fast, cheap second opinion. Different training = catches different errors. |

**Verification workflow:**
1. OpenAI generates will content
2. Gemini validates: legal terminology, internal consistency, completeness
3. Flag discrepancies for human review

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| **Create React App** | Deprecated. Vite is the standard now. |
| **Redux / Redux Toolkit** | Overkill for this app. Zustand does conversational state with 1/10th the code. |
| **LangChain** | Adds abstraction layer without benefit. Direct SDK is faster, simpler for single-LLM-provider apps. Only use if you need multi-provider orchestration or complex chains. |
| **Next.js** | SSR/SSG not needed for authenticated SPA. Adds deployment complexity. React + Vite + SPA is sufficient. |
| **MongoDB** | Legal documents need ACID transactions. PostgreSQL's JSONB gives flexibility without sacrificing reliability. |
| **ReportLab** | Programmatic PDF generation is harder to maintain than HTML/CSS templates. WeasyPrint + Jinja2 is more maintainable for legal documents. |
| **Tailwind CSS v3** | v4 is stable and significantly improved. Don't start new projects on v3. |
| **Flask** | Sync-first. FastAPI's async is essential for LLM streaming and concurrent requests. |
| **Celery** | Overkill for this scale. FastAPI BackgroundTasks sufficient. Consider if processing >1000 wills/day. |

---

## Installation Commands

### Frontend

```bash
# Create project
npm create vite@latest willcraft-frontend -- --template react-ts
cd willcraft-frontend

# Core dependencies
npm install react@19 react-dom@19
npm install @clerk/clerk-react
npm install zustand @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install motion
npm install axios

# Dev dependencies
npm install -D tailwindcss @tailwindcss/postcss postcss
npm install -D @types/node
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D eslint @eslint/js typescript-eslint
npm install -D prettier eslint-config-prettier
```

### Backend

```bash
# Create project
mkdir willcraft-backend && cd willcraft-backend
python -m venv .venv
source .venv/bin/activate  # Linux/Mac

# requirements.txt
cat > requirements.txt << 'EOF'
# Core
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0

# Database
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0

# Authentication
fastapi-clerk-auth>=0.4.0
httpx>=0.27.0

# LLM
openai>=1.50.0
google-generativeai>=0.8.0

# PDF Generation
weasyprint>=62.0
jinja2>=3.1.0

# Utilities
python-dotenv>=1.0.0
EOF

pip install -r requirements.txt
```

---

## Project Structure

### Frontend

```
willcraft-frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── forms/           # Form step components
│   │   └── layout/          # Layout components
│   ├── features/
│   │   ├── auth/            # Clerk integration
│   │   ├── questionnaire/   # Conversational flow
│   │   ├── will-preview/    # Document preview
│   │   └── dashboard/       # User dashboard
│   ├── hooks/               # Custom hooks
│   ├── stores/              # Zustand stores
│   ├── lib/                 # Utilities, API client
│   ├── types/               # TypeScript types
│   └── App.tsx
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Backend

```
willcraft-backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── questionnaire.py
│   │   │   ├── will.py
│   │   │   └── user.py
│   │   └── deps.py          # Dependencies (auth, db)
│   ├── core/
│   │   ├── config.py        # Settings
│   │   ├── security.py      # Clerk validation
│   │   └── database.py      # SQLAlchemy setup
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── services/
│   │   ├── llm/             # OpenAI/Gemini services
│   │   ├── pdf/             # WeasyPrint generation
│   │   └── will/            # Will logic
│   └── main.py
├── alembic/
├── templates/               # Jinja2 PDF templates
├── tests/
├── alembic.ini
└── requirements.txt
```

---

## Environment Variables

### Frontend (.env)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_URL=http://localhost:8000
```

### Backend (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/willcraft

# Clerk
CLERK_SECRET_KEY=sk_test_xxx
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json

# OpenAI
OPENAI_API_KEY=sk-xxx

# Gemini
GEMINI_API_KEY=xxx

# App
ENVIRONMENT=development
DEBUG=true
```

---

## Version Verification Sources

| Technology | Source | Verification Date |
|------------|--------|-------------------|
| React 19 | [react.dev/blog](https://react.dev/blog/2024/12/05/react-19) | 2026-02-05 |
| Vite | [vite.dev](https://vite.dev/guide/) | 2026-02-05 |
| Tailwind CSS v4 | [tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide) | 2026-02-05 |
| FastAPI | Context7 /websites/fastapi_tiangolo | 2026-02-05 |
| Zustand v5 | Context7 /websites/zustand_pmnd_rs | 2026-02-05 |
| TanStack Query v5 | Context7 /tanstack/query | 2026-02-05 |
| Zod v4 | Context7 /colinhacks/zod | 2026-02-05 |
| OpenAI SDK | Context7 /openai/openai-python | 2026-02-05 |
| Gemini SDK | Context7 /websites/ai_google_dev_api | 2026-02-05 |
| WeasyPrint | Context7 /websites/doc_courtbouillon_weasyprint_stable | 2026-02-05 |
| Clerk | Context7 /clerk/clerk-docs | 2026-02-05 |
| Pydantic v2 | Context7 /pydantic/pydantic | 2026-02-05 |

---

## Confidence Assessment Summary

| Category | Confidence | Notes |
|----------|------------|-------|
| Frontend Core (React, Vite, TS, Tailwind) | HIGH | All verified via Context7/official docs. Production-ready. |
| Frontend Libraries (Zustand, TanStack, RHF, Zod) | HIGH | Well-documented, widely adopted, verified versions. |
| Backend Core (FastAPI, Pydantic, SQLAlchemy) | HIGH | Industry standard stack. Extensive documentation. |
| LLM Integration (OpenAI, Gemini) | HIGH | Official SDKs, verified streaming patterns. |
| PDF Generation (WeasyPrint, Jinja2) | HIGH | Mature, maintained libraries. Legal document use cases documented. |
| Auth (Clerk) | HIGH (frontend) / MEDIUM (backend) | Frontend SDK mature. Backend middleware newer but functional. |

---

## South Africa-Specific Considerations

| Concern | Recommendation |
|---------|----------------|
| **Data Residency** | PostgreSQL can be self-hosted or use AWS Cape Town region. Clerk stores auth data globally but sensitive will data stays in your DB. |
| **Legal Compliance** | PDF templates must include SA-specific witness requirements, executor appointment language. Consult legal counsel for template validation. |
| **Payment Integration** | Consider PayFast (SA-native) or Stripe (supports ZAR). Not included in base stack - add when monetization needed. |

---

## Scaling Considerations

| User Count | Infrastructure Changes |
|------------|------------------------|
| < 1,000 | Single server, in-memory caching, basic PostgreSQL |
| 1,000 - 10,000 | Add Redis, PostgreSQL read replicas, consider connection pooling |
| 10,000+ | Horizontal scaling, dedicated LLM response caching, consider Celery for async PDF generation |

---

## References

### Official Documentation
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [Vite Getting Started](https://vite.dev/guide/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)

### Architecture Guides
- [FastAPI + OpenAI Streaming Best Practices](https://blog.gopenai.com/how-to-stream-llm-responses-in-real-time-using-fastapi-and-sse-d2a5a30f2928)
- [Building LLM apps with FastAPI](https://agentsarcade.com/blog/building-llm-apps-with-fastapi-best-practices)
- [Vite + React 2025 Guide](https://codeparrot.ai/blogs/advanced-guide-to-using-vite-with-react-in-2025)

### Integration Resources
- [Clerk + FastAPI Integration](https://blog.lamona.tech/how-to-authenticate-api-requests-with-clerk-and-fastapi-6ac5196cace7)
- [WeasyPrint + Jinja2 PDF Generation](https://medium.com/@engineering_holistic_ai/using-weasyprint-and-jinja2-to-create-pdfs-from-html-and-css-267127454dbd)
- [FastAPI + SQLAlchemy Async](https://testdriven.io/blog/fastapi-sqlmodel/)
