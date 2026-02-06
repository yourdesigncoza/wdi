# Phase 3: Core Will Conversation - Research

**Researched:** 2026-02-06
**Domain:** AI-guided will creation with hybrid form+conversation interface, OpenAI integration, SSE streaming, will data modeling
**Confidence:** HIGH (verified via Context7, official docs, codebase analysis)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Conversation flow (hybrid approach):**
- Progressive hybrid: structured form fields first for testator essentials, then AI conversation kicks in once minimum data is captured
- The handoff point from form to AI is at Claude's discretion based on what works best technically
- User can navigate sections in flexible order -- not locked into a sequence
- Step indicator always visible showing progress (e.g., Personal > Beneficiaries > Assets > Guardians > Executor > Review)

**AI personality & smart prompting:**
- Friendly, approachable tone -- not legalese, not overly formal
- Smart prompting: AI proactively nudges for legally important items (executor, guardians for minors) but stays quiet on optional ones (specific bequests)
- Plain-language explanations of legal terms when contextually relevant
- Tone handling for sensitive topics at Claude's discretion

**Data entry & editing:**
- Each section (beneficiaries, assets, guardians, executor) has a dedicated review/edit page accessible from the step indicator or menu
- How the AI captures structured data during conversation (extraction vs mini-forms) at Claude's discretion
- Confirmation patterns (always vs batch) at Claude's discretion

**Progress & completion:**
- Visible step indicator throughout the process
- Flexible section order -- user can jump to any section
- AI-led review at completion: AI walks through a conversational summary of the entire will, asks if anything needs changing
- Plain-language will preview before proceeding to verification -- readable summary of what the will actually says, not legal jargon

**Mobile:**
- Mobile-first design -- many SA users access via phone, chat and forms must work great on small screens

### Claude's Discretion

- Form-to-AI handoff point (after which fields the AI takes over)
- Initial form field selection (SA will essentials vs minimal start)
- Data capture pattern during conversation (natural language extraction vs inline mini-forms)
- Confirmation frequency (per-item vs batch)
- Tone calibration for sensitive topics (death, minor children, family conflict)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 3 is the core of WillCraft SA: an AI-guided hybrid interface where users first fill structured forms for testator essentials (name, ID, marital status), then transition into a conversational AI flow for beneficiaries, assets, guardians, executor nomination, and estate distribution. The conversation uses OpenAI (gpt-4o-mini for cost efficiency) with SSE streaming for real-time responses, while the UPL filter (already built in Phase 1) gates all AI output.

The research validates this architecture: **OpenAI Python SDK v2.x** with async streaming via `sse-starlette` on the backend, **Zustand** for client-side will data state management (with `persist` middleware for crash recovery), **React Hook Form + Zod** for structured form sections, and **DaisyUI chat/steps components** for the UI. Will data is stored as JSONB in PostgreSQL, linked to the authenticated user, with conversation history persisted for context continuity.

The critical architectural insight is the **dual-mode data capture pattern**: structured forms extract data via standard form submission, while the AI conversation extracts structured data using OpenAI's Structured Outputs (Pydantic models on the backend) to parse natural language into will data fields. Both paths write to the same Zustand store and database model, ensuring consistency.

**Primary recommendation:** Build a section-based will data model with JSONB flexibility, use OpenAI function calling / Structured Outputs to extract will data from conversation, stream responses via SSE, and use DaisyUI chat bubbles + steps for the mobile-first UI. The form-to-AI handoff should occur after Personal Details (name, ID, DOB, address, marital status) since these are rigid, structured fields that benefit from form validation rather than conversation extraction.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai (Python SDK) | >=1.60.0 | OpenAI API client for conversation | Official SDK with async streaming, Structured Outputs, function calling |
| sse-starlette | >=2.0.0 | SSE streaming from FastAPI | De facto standard for Server-Sent Events in Starlette/FastAPI |
| zustand | >=5.0.0 | Client-side will data state | Minimal, performant React state with persist middleware for crash recovery |
| react-hook-form | >=7.54.0 | Structured form sections | Performant forms with minimal re-renders, Zod resolver support |
| zod | >=3.24.0 | Form + API schema validation | TypeScript-first schema validation, shared types with React Hook Form |
| @hookform/resolvers | >=3.9.0 | Zod integration for react-hook-form | Bridges Zod schemas to React Hook Form validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| immer | >=10.0.0 | Immutable state updates in Zustand | Simplify nested will data updates (beneficiaries[], assets[]) |
| eventsource-parser | >=3.0.0 | Parse SSE stream on frontend | Handle OpenAI-style SSE events from FastAPI backend |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | React Context + useReducer | Context causes unnecessary re-renders with complex nested state; Zustand is more performant |
| OpenAI gpt-4o-mini | OpenAI gpt-4o | gpt-4o is smarter but 10x more expensive ($2.50/M input vs $0.15/M); gpt-4o-mini sufficient for guided conversation |
| sse-starlette | FastAPI StreamingResponse | StreamingResponse works but sse-starlette handles SSE protocol properly (event types, retry, disconnect detection) |
| Zustand persist | localStorage directly | Zustand persist handles serialization, hydration, versioning automatically |

**Installation (Backend):**
```bash
pip install openai sse-starlette
```

**Installation (Frontend):**
```bash
npm install zustand immer react-hook-form @hookform/resolvers zod
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── conversation.py    # SSE streaming conversation endpoints
│   │   └── will.py            # Will CRUD endpoints (save/load/update sections)
│   ├── services/
│   │   ├── openai_service.py  # OpenAI client, system prompts, streaming
│   │   ├── conversation_service.py  # Conversation state, message history, section tracking
│   │   └── will_service.py    # Will data persistence, section validation
│   ├── models/
│   │   ├── will.py            # Will SQLModel (JSONB sections)
│   │   └── conversation.py    # Conversation history model
│   ├── schemas/
│   │   ├── will.py            # Will section Pydantic schemas (testator, beneficiary, etc.)
│   │   └── conversation.py    # Message schemas, SSE event schemas
│   └── prompts/
│       ├── system.py          # System prompt templates per section
│       └── extraction.py      # Structured Output schemas for data extraction
│
frontend/
├── src/
│   ├── features/
│   │   └── will/
│   │       ├── store/
│   │       │   └── useWillStore.ts     # Zustand store for will data + persist
│   │       ├── components/
│   │       │   ├── WillWizard.tsx       # Main wizard container with steps
│   │       │   ├── StepIndicator.tsx    # DaisyUI steps navigation
│   │       │   ├── PersonalForm.tsx     # Structured form (testator details)
│   │       │   ├── MaritalForm.tsx      # Marital status + spouse details
│   │       │   ├── ChatSection.tsx      # AI conversation interface
│   │       │   ├── ChatMessage.tsx      # DaisyUI chat bubble wrapper
│   │       │   ├── SectionReview.tsx    # Section-specific review/edit page
│   │       │   └── WillPreview.tsx      # Plain-language will summary
│   │       ├── hooks/
│   │       │   ├── useConversation.ts   # SSE streaming hook
│   │       │   └── useWillProgress.ts   # Section completion tracking
│   │       ├── schemas/
│   │       │   └── willSchemas.ts       # Zod schemas for form validation
│   │       └── types/
│   │           └── will.ts              # TypeScript types for will data
│   └── services/
│       └── api.ts                       # Extended with conversation + will endpoints
```

### Pattern 1: SSE Streaming Conversation Endpoint

**What:** FastAPI endpoint that streams AI responses via Server-Sent Events, with UPL filtering on each chunk.

**When to use:** All AI conversation interactions.

```python
# Source: sse-starlette docs + OpenAI Python SDK streaming
from fastapi import APIRouter, Depends, Request
from sse_starlette.sse import EventSourceResponse
from openai import AsyncOpenAI
import json

from app.services.openai_service import OpenAIService
from app.services.upl_filter import UPLFilterService

router = APIRouter(tags=["conversation"])

@router.post("/api/conversation/stream")
async def stream_conversation(
    request: Request,
    body: ConversationRequest,
    openai_service: OpenAIService = Depends(get_openai_service),
    upl_filter: UPLFilterService = Depends(get_upl_filter),
):
    async def event_generator():
        full_response = ""
        async for chunk in openai_service.stream_response(
            messages=body.messages,
            section=body.current_section,
            will_context=body.will_context,
        ):
            full_response += chunk
            yield {"event": "delta", "data": json.dumps({"content": chunk})}

        # UPL filter on complete response
        filter_result = await upl_filter.filter_output(
            text=full_response,
            context={"category": body.current_section, "will_type": "basic"},
        )

        if filter_result.action != FilterAction.ALLOW:
            yield {
                "event": "filtered",
                "data": json.dumps({
                    "action": filter_result.action.value,
                    "content": filter_result.filtered_text,
                }),
            }

        yield {"event": "done", "data": json.dumps({"complete": True})}

    return EventSourceResponse(event_generator())
```

### Pattern 2: Will Data Model with JSONB Sections

**What:** Single will record with JSONB columns for each section, enabling flexible schema evolution without migrations.

**When to use:** All will data storage.

```python
# Source: Existing codebase patterns (SQLModel + JSONB)
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlmodel import Field, SQLModel


class Will(SQLModel, table=True):
    """User's will document with section-based JSONB storage."""

    __tablename__ = "wills"
    __table_args__ = (
        Index("ix_wills_user_id", "user_id"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("users.id"),
            nullable=False,
        ),
    )

    # Will metadata
    will_type: str = Field(default="basic", max_length=50)
    status: str = Field(default="draft", max_length=50)  # draft, review, verified, generated

    # Section data (JSONB for flexibility)
    testator: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'"))
    marital: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'"))
    beneficiaries: list = Field(default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="'[]'"))
    assets: list = Field(default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="'[]'"))
    guardians: list = Field(default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="'[]'"))
    executor: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'"))
    bequests: list = Field(default_factory=list, sa_column=Column(JSONB, nullable=False, server_default="'[]'"))
    residue: dict = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False, server_default="'{}'"))

    # Section completion tracking
    sections_complete: dict = Field(
        default_factory=lambda: {
            "personal": False,
            "beneficiaries": False,
            "assets": False,
            "guardians": False,
            "executor": False,
            "bequests": False,
            "residue": False,
        },
        sa_column=Column(JSONB, nullable=False),
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default="now()"),
    )
```

### Pattern 3: Zustand Will Store with Persist

**What:** Client-side will data store with localStorage persistence for crash recovery and section-based updates.

**When to use:** All frontend will data management.

```typescript
// Source: Zustand docs (Context7), immer middleware
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface Testator {
  firstName: string
  lastName: string
  idNumber: string
  dateOfBirth: string
  address: string
  city: string
  province: string
  postalCode: string
  phone: string
  email: string
}

export interface Beneficiary {
  id: string
  fullName: string
  relationship: string
  idNumber?: string
  sharePercent?: number
  alternateBeneficiary?: string
  isCharity: boolean
}

export interface WillState {
  willId: string | null
  testator: Partial<Testator>
  marital: Record<string, unknown>
  beneficiaries: Beneficiary[]
  assets: Record<string, unknown>[]
  guardians: Record<string, unknown>[]
  executor: Record<string, unknown>
  bequests: Record<string, unknown>[]
  residue: Record<string, unknown>
  sectionsComplete: Record<string, boolean>
  currentSection: string
}

export interface WillActions {
  setWillId: (id: string) => void
  updateTestator: (data: Partial<Testator>) => void
  addBeneficiary: (beneficiary: Beneficiary) => void
  removeBeneficiary: (id: string) => void
  updateSection: (section: string, data: unknown) => void
  markSectionComplete: (section: string) => void
  setCurrentSection: (section: string) => void
  resetWill: () => void
}

const initialState: WillState = {
  willId: null,
  testator: {},
  marital: {},
  beneficiaries: [],
  assets: [],
  guardians: [],
  executor: {},
  bequests: [],
  residue: {},
  sectionsComplete: {
    personal: false,
    beneficiaries: false,
    assets: false,
    guardians: false,
    executor: false,
    bequests: false,
    residue: false,
  },
  currentSection: 'personal',
}

export const useWillStore = create<WillState & WillActions>()(
  persist(
    immer((set) => ({
      ...initialState,

      setWillId: (id) => set((state) => { state.willId = id }),

      updateTestator: (data) =>
        set((state) => {
          Object.assign(state.testator, data)
        }),

      addBeneficiary: (beneficiary) =>
        set((state) => {
          state.beneficiaries.push(beneficiary)
        }),

      removeBeneficiary: (id) =>
        set((state) => {
          state.beneficiaries = state.beneficiaries.filter((b) => b.id !== id)
        }),

      updateSection: (section, data) =>
        set((state) => {
          ;(state as any)[section] = data
        }),

      markSectionComplete: (section) =>
        set((state) => {
          state.sectionsComplete[section] = true
        }),

      setCurrentSection: (section) =>
        set((state) => {
          state.currentSection = section
        }),

      resetWill: () => set(initialState),
    })),
    { name: 'wdi-will-draft' },
  ),
)
```

### Pattern 4: OpenAI Structured Output for Data Extraction

**What:** Use OpenAI function calling with Pydantic models to extract structured will data from natural language conversation.

**When to use:** After each AI conversation turn, to extract any will data mentioned by the user.

```python
# Source: OpenAI Python SDK Context7 - Structured Outputs
from pydantic import BaseModel, Field
from typing import Optional
from openai import AsyncOpenAI

class ExtractedBeneficiary(BaseModel):
    """Beneficiary data extracted from conversation."""
    full_name: str = Field(description="Full name of the beneficiary")
    relationship: str = Field(description="Relationship to testator (spouse, child, sibling, friend, charity, etc.)")
    id_number: Optional[str] = Field(default=None, description="SA ID number if mentioned")
    share_percent: Optional[float] = Field(default=None, description="Percentage share if specified")
    is_charity: bool = Field(default=False, description="Whether this is a charity/organization")

class ExtractedWillData(BaseModel):
    """Structured data extracted from a conversation turn."""
    beneficiaries: list[ExtractedBeneficiary] = Field(default_factory=list)
    assets_mentioned: list[str] = Field(default_factory=list)
    guardian_name: Optional[str] = None
    executor_name: Optional[str] = None
    specific_bequests: list[dict] = Field(default_factory=list)
    needs_clarification: list[str] = Field(default_factory=list, description="Items that need follow-up questions")

async def extract_will_data(
    client: AsyncOpenAI,
    conversation_history: list[dict],
    latest_user_message: str,
) -> ExtractedWillData:
    """Extract structured will data from the latest conversation turn."""
    completion = await client.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract any will-related data from the user's message. "
                    "Only extract data that was explicitly stated. "
                    "If something is unclear, add it to needs_clarification."
                ),
            },
            {"role": "user", "content": latest_user_message},
        ],
        response_format=ExtractedWillData,
    )
    return completion.choices[0].message.parsed
```

### Pattern 5: DaisyUI Chat + Steps UI (Mobile-First)

**What:** Mobile-first chat interface with DaisyUI chat bubbles and steps navigation.

**When to use:** The main conversation view.

```tsx
// Source: DaisyUI v5 docs (chat, steps components)

// StepIndicator.tsx
function StepIndicator({ currentSection, sectionsComplete, onNavigate }) {
  const sections = [
    { key: 'personal', label: 'Personal' },
    { key: 'beneficiaries', label: 'Beneficiaries' },
    { key: 'assets', label: 'Assets' },
    { key: 'guardians', label: 'Guardians' },
    { key: 'executor', label: 'Executor' },
    { key: 'review', label: 'Review' },
  ]

  return (
    <div className="overflow-x-auto py-2">
      <ul className="steps steps-horizontal text-xs sm:text-sm">
        {sections.map(({ key, label }) => (
          <li
            key={key}
            className={`step cursor-pointer ${
              sectionsComplete[key] ? 'step-primary' :
              currentSection === key ? 'step-neutral' : ''
            }`}
            onClick={() => onNavigate(key)}
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ChatMessage.tsx
function ChatMessage({ message, isAI }) {
  return (
    <div className={`chat ${isAI ? 'chat-start' : 'chat-end'}`}>
      {isAI && (
        <div className="chat-image avatar placeholder">
          <div className="bg-primary text-primary-content w-8 rounded-full">
            <span className="text-xs">WC</span>
          </div>
        </div>
      )}
      <div className={`chat-bubble ${
        isAI ? 'chat-bubble-neutral' : 'chat-bubble-primary'
      }`}>
        {message.content}
      </div>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Storing full conversation in frontend state only:** Always persist conversation history to the backend. LocalStorage is for crash recovery only; the server is the source of truth.

- **Streaming unfiltered AI output directly to user:** All AI output must pass through the UPL filter before reaching the user. For streaming, accumulate the full response, filter, then retroactively correct if needed. Or batch-stream (send full sentences after filtering).

- **Forcing linear section order:** The user decision explicitly allows flexible navigation. The step indicator must support jumping to any section, even incomplete ones.

- **Using gpt-4o for all conversation turns:** gpt-4o-mini is sufficient for guided will conversation at 1/10th the cost. Reserve gpt-4o for complex extraction or Phase 5 verification only.

- **Building custom form state management:** React Hook Form + Zod handles forms; Zustand handles cross-section state. Do not build custom form state handlers.

- **Monolithic will data column:** Use separate JSONB columns per section (testator, beneficiaries, assets, etc.) rather than one giant JSON blob. This enables per-section queries, validation, and partial updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming | Custom chunked HTTP | sse-starlette EventSourceResponse | Handles SSE protocol, disconnect detection, retry headers |
| Form validation | Manual if/else checks | React Hook Form + Zod | Type-safe schemas, dynamic arrays, error messages |
| Will data state | React Context for complex state | Zustand + immer + persist | No re-render cascading, localStorage persistence, nested updates |
| Data extraction from chat | Regex parsing of AI responses | OpenAI Structured Outputs | Reliable JSON extraction with schema enforcement |
| Chat UI components | Custom chat bubbles | DaisyUI chat component | Themed, accessible, responsive out of the box |
| Step navigation | Custom stepper | DaisyUI steps component | Consistent with theme, responsive, semantic HTML |
| SA ID validation | Custom regex | Luhn algorithm for SA IDs | Standard 13-digit ID with check digit (well-documented algorithm) |

**Key insight:** The AI conversation is the hard part. Everything around it (forms, state, UI) should use proven libraries so development time focuses on the conversation quality, system prompts, and data extraction accuracy.

## Common Pitfalls

### Pitfall 1: UPL Filter vs Streaming Conflict

**What goes wrong:** Streaming AI text character-by-character makes UPL filtering impossible because the filter needs complete sentences/paragraphs to detect advice patterns.

**Why it happens:** UPL regex patterns match multi-word phrases like "you should definitely include" which arrive across multiple SSE chunks.

**How to avoid:**
- Accumulate the full AI response server-side before yielding final content
- Use a dual-event pattern: stream `delta` events for typing indicator UX, then send a `complete` event with the filtered full response
- Alternatively, buffer by sentence (split on period/newline) and filter each sentence before yielding

**Warning signs:** Users see legal advice flash briefly then disappear; UPL audit log shows no BLOCK/REFER events during conversations.

### Pitfall 2: Lost Conversation Context on Section Switch

**What goes wrong:** User switches from "Beneficiaries" to "Assets" section and back, losing the conversation history for beneficiaries.

**Why it happens:** Conversation history stored per-section but not persisted; or all sections share one conversation thread that gets confused.

**How to avoid:**
- Maintain separate conversation histories per section in the database
- When switching sections, load that section's history
- Include a concise will-state summary in the system prompt for each section so the AI knows what has been collected already

**Warning signs:** AI asks for information already provided; conversation "forgets" earlier answers after section switches.

### Pitfall 3: SA ID Number Validation Edge Cases

**What goes wrong:** Users enter invalid SA ID numbers that pass basic length checks but fail the Luhn check digit or encode impossible dates.

**Why it happens:** SA ID format is 13 digits: YYMMDD-SSSS-C-A-Z where each part has specific constraints. Simple regex misses date validation and check digit.

**How to avoid:**
- Validate: 13 digits, valid date from first 6 digits, valid check digit (Luhn mod 10)
- Handle 2000+ dates (YY < 26 could be 2000s or 1900s)
- Allow passport numbers as alternative for non-SA citizens

**Warning signs:** Database contains impossible DOBs; users stuck on ID field with valid-looking numbers.

### Pitfall 4: Massive Conversation History Blowing Token Limits

**What goes wrong:** After many back-and-forth exchanges, the conversation history exceeds gpt-4o-mini's context window (128K tokens) or becomes very expensive.

**Why it happens:** Naively appending all messages to history without pruning.

**How to avoid:**
- Keep a rolling window of last N messages (e.g., 20) plus the system prompt
- Include a structured "will state summary" in the system prompt that captures all collected data compactly
- This summary replaces the need for the AI to "remember" -- it reads current state from the prompt

**Warning signs:** API errors with "context_length_exceeded"; increasing response latency; unexpectedly high OpenAI costs.

### Pitfall 5: Race Condition Between Form Save and AI Extract

**What goes wrong:** User submits a form (e.g., personal details) and simultaneously the AI extracts conflicting data from a conversation turn, overwriting form data.

**Why it happens:** Both the form submission and AI extraction update the same will record without coordination.

**How to avoid:**
- Form submissions are authoritative for their section -- they overwrite
- AI extraction only writes to sections currently in "conversation mode"
- Use section-level locking: when a section is in form mode, AI extraction skips it
- Always merge AI extractions (additive) rather than replacing

**Warning signs:** Form-submitted data disappears after AI conversation; beneficiary list has duplicates.

### Pitfall 6: Mobile Keyboard Pushes Chat Off Screen

**What goes wrong:** On mobile devices, the virtual keyboard pushes the chat messages and input field off the visible area.

**Why it happens:** CSS layout doesn't account for dynamic viewport height changes when keyboard appears.

**How to avoid:**
- Use `dvh` (dynamic viewport height) CSS units or `window.visualViewport` API
- Pin the input field to the bottom with `position: sticky` or `fixed`
- Auto-scroll to latest message when keyboard appears
- Test on actual mobile devices, not just Chrome DevTools

**Warning signs:** Users on mobile report inability to see messages while typing; input field hidden behind keyboard.

## Code Examples

### OpenAI Service with System Prompts

```python
# Source: OpenAI Python SDK Context7 + codebase patterns
from openai import AsyncOpenAI
from typing import AsyncGenerator

class OpenAIService:
    """Manages OpenAI conversation for will creation."""

    def __init__(self, api_key: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)

    async def stream_response(
        self,
        messages: list[dict],
        section: str,
        will_context: dict,
    ) -> AsyncGenerator[str, None]:
        """Stream an AI response for the given conversation section."""
        system_prompt = self._build_system_prompt(section, will_context)

        stream = await self._client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )

        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _build_system_prompt(self, section: str, will_context: dict) -> str:
        """Build section-specific system prompt with current will state."""
        base = (
            "You are a friendly, approachable will-creation assistant for WillCraft SA. "
            "You help South African users create their last will and testament. "
            "You explain legal concepts in plain language when relevant. "
            "You NEVER give legal advice -- you only collect information and explain what common options are. "
            "If the user asks for legal advice, respond: 'I can explain the common options, "
            "but for specific legal advice, please consult a qualified South African attorney.' "
            "Be warm and conversational, not formal or stiff. "
            "When discussing sensitive topics (death, minor children), be gentle and empathetic. "
        )

        section_prompts = {
            "beneficiaries": (
                "You are helping the user specify who should inherit from their estate. "
                "Ask about: full name, relationship, SA ID number (if available), "
                "percentage share or specific items. "
                "Proactively ask about alternate beneficiaries in case someone predeceases the testator. "
            ),
            "assets": (
                "You are helping the user list their assets. "
                "Ask about: property, vehicles, bank accounts, investments, insurance policies, "
                "business interests. For each asset, note type and description. "
                "Do NOT ask for valuations -- that is not required for the will. "
            ),
            "guardians": (
                "You are helping the user nominate guardians for minor children. "
                "This is a sensitive topic -- be empathetic. "
                "Ask for: primary guardian name and relationship, backup guardian. "
                "Proactively nudge if they have minor children but haven't nominated guardians. "
            ),
            "executor": (
                "You are helping the user nominate an executor for their estate. "
                "Explain that the executor manages the estate after death. "
                "Ask for: executor name, relationship or if professional executor. "
                "Proactively ask about a backup executor. "
            ),
            "bequests": (
                "You are helping the user specify specific bequests -- particular items to particular people. "
                "This is optional. Do NOT push the user to add specific bequests if they have already "
                "handled distribution via beneficiary percentages. "
            ),
            "residue": (
                "You are helping the user specify how the residue of the estate should be distributed. "
                "The residue is everything not covered by specific bequests. "
                "Ask for: who gets the residue, in what proportions. "
            ),
        }

        will_state_summary = self._format_will_summary(will_context)

        return (
            f"{base}\n\n"
            f"CURRENT SECTION: {section}\n"
            f"{section_prompts.get(section, '')}\n\n"
            f"WILL DATA COLLECTED SO FAR:\n{will_state_summary}\n\n"
            f"Based on the data above, continue the conversation naturally. "
            f"Do not re-ask for information already collected."
        )

    def _format_will_summary(self, will_context: dict) -> str:
        """Format current will state as concise text for the system prompt."""
        parts = []
        if will_context.get("testator"):
            t = will_context["testator"]
            name = f"{t.get('firstName', '?')} {t.get('lastName', '?')}"
            parts.append(f"Testator: {name}")
        if will_context.get("beneficiaries"):
            names = [b.get("fullName", "?") for b in will_context["beneficiaries"]]
            parts.append(f"Beneficiaries: {', '.join(names)}")
        if will_context.get("executor"):
            parts.append(f"Executor: {will_context['executor'].get('name', 'Not yet nominated')}")
        return "\n".join(parts) if parts else "No data collected yet."
```

### SSE Streaming Hook (Frontend)

```typescript
// Source: eventsource-parser patterns + React hooks
import { useState, useCallback, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseConversationOptions {
  section: string
  willContext: Record<string, unknown>
  tokenGetter: () => Promise<string | null>
}

export function useConversation({ section, willContext, tokenGetter }: UseConversationOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    // Add placeholder for assistant response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const token = await tokenGetter()
    abortRef.current = new AbortController()

    try {
      const response = await fetch('/api/conversation/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          current_section: section,
          will_context: willContext,
        }),
        signal: abortRef.current.signal,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        // Parse SSE events
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  last.content += data.content
                }
                return updated
              })
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Conversation error:', err)
      }
    } finally {
      setIsStreaming(false)
    }
  }, [messages, section, willContext, tokenGetter])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, isStreaming, sendMessage, stopStreaming }
}
```

### Will Data Section Schemas (Shared Backend/Frontend)

```python
# Backend: Pydantic schemas for will sections
# Source: SA Wills Act requirements + legacy form mapping

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class MaritalStatus(str, Enum):
    SINGLE = "single"
    MARRIED_IN_COMMUNITY = "married_in_community"
    MARRIED_ANC = "married_anc"  # ante-nuptial contract
    MARRIED_COP = "married_cop"  # community of property
    DIVORCED = "divorced"
    WIDOWED = "widowed"

class Province(str, Enum):
    EASTERN_CAPE = "EC"
    FREE_STATE = "FS"
    GAUTENG = "GP"
    KWAZULU_NATAL = "KZN"
    LIMPOPO = "LP"
    MPUMALANGA = "MP"
    NORTHERN_CAPE = "NC"
    NORTH_WEST = "NW"
    WESTERN_CAPE = "WC"

class TestatorSchema(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    id_number: str = Field(pattern=r"^\d{13}$")  # SA ID: 13 digits
    date_of_birth: str  # ISO format YYYY-MM-DD
    address: str
    city: str
    province: Province
    postal_code: str = Field(pattern=r"^\d{4}$")
    phone: Optional[str] = None
    email: Optional[str] = None

class MaritalSchema(BaseModel):
    status: MaritalStatus
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_id_number: Optional[str] = None
    married_outside_sa: bool = False
    marriage_country: Optional[str] = None

class BeneficiarySchema(BaseModel):
    full_name: str
    relationship: str
    id_number: Optional[str] = None
    share_percent: Optional[float] = Field(default=None, ge=0, le=100)
    alternate_beneficiary: Optional[str] = None
    is_charity: bool = False

class AssetSchema(BaseModel):
    asset_type: str  # property, vehicle, bank_account, investment, insurance, business, other
    description: str
    details: Optional[dict] = None  # Flexible for type-specific details

class GuardianSchema(BaseModel):
    full_name: str
    relationship: str
    id_number: Optional[str] = None
    is_primary: bool = True  # vs backup

class ExecutorSchema(BaseModel):
    name: str
    relationship: Optional[str] = None
    is_professional: bool = False  # Professional executor (e.g., attorney/bank)
    backup_name: Optional[str] = None
    backup_relationship: Optional[str] = None
```

## Will Data Fields (SA Requirements)

Based on the legacy system mapping and SA Wills Act requirements:

### Phase 3 Data Fields (Basic Will)

**Testator Essentials (Form Section):**
- First name, Last name, SA ID number (13 digit), Date of birth
- Physical address, City, Province, Postal code
- Phone, Email
- Marital status (single / married in community / married ANC / married COP / divorced / widowed)
- If married: spouse details (name, ID number)
- If married outside SA: country

**Beneficiaries (AI Conversation):**
- Full name, Relationship to testator, SA ID (optional)
- Share percentage or specific items
- Alternate beneficiary (if primary predeceases)
- Support for charity beneficiaries (organization name)
- Up to 15 beneficiaries (legacy system limit, apply as soft cap)

**Assets (AI Conversation):**
- Property (address, description)
- Vehicles (make, model, registration)
- Bank accounts (bank name, account type)
- Investments (type, institution)
- Insurance policies (provider, policy number)
- Business interests (company name, type)
- Other assets (description)

**Guardians (AI Conversation -- only if minor children):**
- Primary guardian: full name, relationship
- Backup guardian: full name, relationship
- AI should proactively ask if testator has children under 18

**Executor (AI Conversation):**
- Executor name, relationship
- Professional vs personal executor
- Backup executor name
- Legacy system allowed up to 3 executors

**Specific Bequests (AI Conversation -- optional):**
- Item/asset description
- Recipient name
- This is optional; AI should not push users to add bequests

**Residual Estate (AI Conversation):**
- How remainder of estate is divided
- Beneficiary names and shares
- Simultaneous death clause (what happens if both spouses die)

### Phase 4 Fields (Deferred -- NOT in scope)
- Testamentary trust details (trustees, powers, age cutoff)
- Usufruct provisions
- Business succession planning
- Joint/mirror will structure

## Claude's Discretion Recommendations

### Form-to-AI Handoff Point

**Recommendation:** After Personal Details + Marital Status forms.

**Rationale:**
- Personal Details (name, ID, DOB, address) are rigid structured data -- forms are faster and less error-prone than conversation extraction
- Marital Status has conditional logic (married -> spouse details, outside SA -> country) that maps cleanly to conditional form fields
- After these two sections, the remaining sections (beneficiaries, assets, guardians, executor, bequests, residue) are more conversational in nature -- users describe their wishes in natural language
- This aligns with the user's stated preference: "fixed form fields and as the user progresses past minimum data required (name, surname, etc.) we can start prompting the user"

### Data Capture Pattern

**Recommendation:** Inline mini-forms for high-stakes data, natural language extraction for everything else.

**Rationale:**
- For beneficiaries and assets, the AI conversation should extract data using Structured Outputs, then present a confirmation card (DaisyUI card component) showing extracted data with an "Edit" option
- For names and ID numbers where precision matters, use inline mini-forms within the chat: AI says "Let me capture your beneficiary's details" and renders a small form inline
- This hybrid approach avoids the frustration of the AI misinterpreting names while keeping the conversation flowing
- Batch confirmation per entity (not per field): after extracting a beneficiary, show the full entity for confirmation before moving to the next

### Confirmation Frequency

**Recommendation:** Confirm per entity, not per field.

**Rationale:**
- Confirming every field breaks conversation flow
- Confirming per entity (one beneficiary, one asset) keeps things moving
- At section end, show a summary card of all entities in that section
- At will completion, AI-led review walks through entire will

### Tone Calibration

**Recommendation:**
- Death/dying: Use "passing" or "if something happens to you" instead of "when you die"
- Minor children: "Let's make sure your children are looked after" -- empathetic framing
- Family conflict: Neutral language, never assume relationships are positive -- "Is there anyone you specifically want to mention or exclude?"
- Financial details: Reassuring -- "We don't need exact amounts, just the types of assets"

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static multi-step form wizard | AI-guided hybrid (form + conversation) | 2024-2025 | More natural data collection, better completion rates |
| JSON mode for extraction | OpenAI Structured Outputs | Aug 2024 | Guaranteed schema-valid JSON, no post-processing |
| WebSocket for chat | SSE (Server-Sent Events) | 2024-2025 | Simpler, HTTP-native, sufficient for unidirectional streaming |
| Redux for form state | Zustand + persist | 2024 | Less boilerplate, built-in persistence, better DX |
| Custom validation | Zod + React Hook Form | 2024 | Type-safe schemas shared between frontend validation and API |

**Deprecated/outdated:**
- **OpenAI JSON Mode:** Replaced by Structured Outputs (more reliable, schema-enforced)
- **WebSockets for LLM chat:** SSE is simpler and sufficient for server-to-client streaming (chat uses POST for user messages + SSE for AI responses)
- **react-cookie-consent for POPIA:** Already replaced by custom ConsentModal in Phase 1

## Open Questions

1. **OpenAI API Key Management**
   - What we know: Need OPENAI_API_KEY in backend environment
   - What's unclear: Whether to use organization-level key or project-level key; rate limit tier
   - Recommendation: Add OPENAI_API_KEY and OPENAI_MODEL to Settings; default model to gpt-4o-mini; handle rate limit errors gracefully with retry

2. **Conversation History Storage Limits**
   - What we know: Each conversation section accumulates messages; gpt-4o-mini has 128K context
   - What's unclear: Practical limit before cost becomes prohibitive
   - Recommendation: Keep rolling window of 20 messages per section plus will-state summary in system prompt; archive older messages to database but don't send to API

3. **Offline/Disconnection Handling**
   - What we know: Zustand persist saves to localStorage; SSE disconnects on network loss
   - What's unclear: How to handle partial AI response on disconnect
   - Recommendation: Zustand persist covers form data; for SSE, detect disconnect and offer "retry" button; partial AI response is discarded (not saved as complete message)

4. **SA ID Validation Depth**
   - What we know: 13-digit format with date encoding and Luhn check
   - What's unclear: Whether to validate citizenship digit, gender digit, or just format + check digit
   - Recommendation: Validate format (13 digits) + date validity (first 6 digits) + Luhn check digit. Don't validate citizenship/gender sections as they may cause friction for edge cases.

## Sources

### Primary (HIGH confidence)
- `/openai/openai-python` (Context7) - Async streaming, Structured Outputs, function calling patterns
- `/react-hook-form/react-hook-form` (Context7) - useFieldArray, Zod resolver, multi-step forms
- `/websites/zustand_pmnd_rs` (Context7) - Persist middleware, immer, TypeScript patterns
- DaisyUI v5 docs (WebFetch) - Chat bubble and Steps component classes and structure
- SA Wills Act 7 of 1953 requirements (WebSearch, multiple legal sources)

### Secondary (MEDIUM confidence)
- [FastAPI SSE streaming patterns](https://medium.com/@shudongai/building-a-real-time-streaming-api-with-fastapi-and-openai-a-comprehensive-guide-cb65b3e686a5) - sse-starlette + OpenAI streaming
- [sse-starlette GitHub](https://github.com/sysid/sse-starlette) - EventSourceResponse API
- [OpenAI GPT-4o-mini pricing](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/) - $0.15/M input, $0.60/M output
- [React SSE streaming patterns](https://oneuptime.com/blog/post/2026-01-15-server-sent-events-sse-react/view) - EventSource in React
- [SA Wills Act requirements](https://www.bartermckellar.law/family-law-explained/understanding-the-requirements-for-a-valid-will-in-south-africa) - Formal requirements for valid SA wills
- [Wills Act formalities](https://schoemanlaw.co.za/the-wills-act-formalities/) - Common pitfalls under Section 2(1)(a)

### Tertiary (LOW confidence -- needs validation)
- Optimal conversation token window size (20 messages recommendation is heuristic, not measured)
- SA ID validation edge cases for non-citizen residents
- Mobile keyboard viewport handling specifics (dvh support varies by browser)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7 with current versions and API patterns
- Architecture patterns: HIGH - Based on verified OpenAI SDK, FastAPI, Zustand docs and existing codebase patterns
- Will data model: HIGH - Mapped from legacy system + SA Wills Act requirements
- UPL filter integration: HIGH - Extends existing Phase 1 infrastructure (already built and tested)
- Mobile chat UX: MEDIUM - DaisyUI components verified, but mobile keyboard handling needs real-device testing
- Pitfalls: HIGH - Drawn from documented issues with SSE streaming, token limits, and form/AI race conditions

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - OpenAI API is fast-moving but core patterns are stable)
