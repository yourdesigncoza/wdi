# Phase 5: AI Verification - Research

**Researched:** 2026-02-06
**Domain:** Dual-LLM verification, Google Gemini API, SA Wills Act compliance
**Confidence:** HIGH

## Summary

Phase 5 adds a verification layer where Google Gemini independently checks the will data collected by OpenAI's conversation flow. The `google-genai` Python SDK (v1.62.0) provides async support and Pydantic-based structured output, which maps directly to the project's existing pattern of Pydantic schemas + async FastAPI services. The verification runs once after all sections are complete, streams progress via SSE (reusing the existing dual-event pattern), and gates PDF generation.

The core technical challenge is designing a verification prompt that reliably detects completeness gaps, cross-section inconsistencies, and SA Wills Act violations across 13 JSONB section columns. The Gemini SDK's Pydantic `response_schema` support means the verification result schema can be enforced at the API level, eliminating JSON parsing failures.

**Primary recommendation:** Use `google-genai` SDK with Pydantic structured output, a single-call verification prompt (not multi-call per-section), SSE streaming for progress UX, and the existing service-layer DI pattern. Send JSONB data only (not conversation history) to Gemini to keep cost down and avoid token limit issues.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full validation: completeness + consistency + SA Wills Act rule checks
- Hybrid rule approach: Gemini evaluates all rules for now, architecture ready to add hardcoded deterministic checks later
- Verification runs once at the end (after all sections complete), not incrementally
- Live checklist progress during verification (checks appear as they complete)
- Results: top-level summary card (green/yellow/red) + expandable section-by-section breakdown
- Blocking gate: user CANNOT generate PDF until all errors resolved. Warnings can be acknowledged and bypassed
- Three severity levels: Error (blocks), Warning (needs acknowledgment), Info (helpful tips)
- Issues link back to relevant section -- user navigates back to fix via AI conversation
- Each issue includes plain-language explanation of WHY it's a problem
- If Gemini unavailable: fall back to OpenAI (base LLM) for verification instead
- Attorney referral triggers: conservative, non-blocking notification style, never a gate
- Triggers on complex scenarios (trusts, usufruct, business succession, international assets, disinheriting dependents) AND unusual patterns (very unequal distributions, leaving everything to non-family, no executor, extremely large estates)
- Generic recommendation language: "We recommend consulting a qualified attorney"
- Notification appears on verification results page AND as a note in the final PDF document

### Claude's Discretion
- Whether Gemini receives JSONB data only or JSONB + conversation history -- balance cost vs thoroughness
  - **Recommendation:** JSONB data only. Conversation history adds 10-50x tokens for marginal benefit. The extracted/structured data in JSONB columns is what matters for verification. Conversation history may contain user tangents, abandoned ideas, and AI pleasantries that would confuse verification. JSONB is the "source of truth" -- if extraction missed something, that's an extraction bug, not a verification concern.
- Re-verification approach (manual button vs auto)
  - **Recommendation:** Manual "Re-verify" button. Auto-verify on every section edit would be wasteful (Gemini API calls cost money). The user fixes issues, navigates back to verification page, and clicks "Re-verify". This keeps cost predictable and gives the user control.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `google-genai` | >=1.62.0 | Gemini API client | Official Google SDK, Pydantic structured output, async support via `client.aio` |
| `sse-starlette` | >=2.0.0 | SSE streaming | Already in project, reuse for verification progress events |
| `pydantic` | (via sqlmodel) | Verification result schema | Already in project, Gemini SDK accepts Pydantic models as `response_schema` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `httpx` | >=0.28.0 | Already in project | Gemini SDK uses httpx internally, no conflict |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `google-genai` (Gemini Developer API) | `google-cloud-aiplatform` (Vertex AI) | Vertex AI is enterprise-grade but requires GCP project setup, service accounts, IAM. Developer API just needs an API key -- much simpler for this project's scale |
| Single Gemini call | Per-section Gemini calls | Per-section would give finer progress granularity but 8-13 API calls vs 1. Cost and latency multiplication. Single call with structured output is sufficient |

**Installation:**
```bash
pip install google-genai>=1.62.0
```

Add to `backend/requirements.txt`.

## Architecture Patterns

### Recommended Project Structure
```
backend/app/
├── services/
│   ├── gemini_service.py          # Gemini API client (mirrors openai_service.py pattern)
│   └── verification_service.py    # Orchestrates verification flow + progress SSE
├── prompts/
│   └── verification.py            # Verification system prompt + SA Wills Act rules
├── schemas/
│   └── verification.py            # Pydantic models for verification results
├── api/
│   └── verification.py            # POST /api/wills/{will_id}/verify endpoint (SSE)
│                                  # GET  /api/wills/{will_id}/verification  (last result)
├── models/
│   └── verification.py            # VerificationResult DB model (persist results)

frontend/src/features/will/
├── components/
│   └── VerificationPage.tsx       # Full verification UI (checklist + results + actions)
├── hooks/
│   └── useVerification.ts         # SSE streaming hook for verification progress
├── types/
│   └── verification.ts            # TypeScript types for verification results
```

### Pattern 1: Gemini Service (mirrors OpenAI service)
**What:** Thin async wrapper around `google-genai` SDK
**When to use:** All Gemini API calls
**Example:**
```python
# Source: Context7 /googleapis/python-genai - verified pattern
from google import genai
from google.genai import types
from pydantic import BaseModel

class GeminiService:
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def verify_will(
        self,
        will_data: dict,
        system_prompt: str,
    ) -> VerificationResult:
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=self._format_will_for_verification(will_data),
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=VerificationResult,
                temperature=0.1,  # Low for deterministic verification
                max_output_tokens=4096,
            ),
        )
        return response.parsed
```

### Pattern 2: Verification Result Schema (Pydantic)
**What:** Structured output schema that Gemini must conform to
**When to use:** Defining what the verification produces
**Example:**
```python
from pydantic import BaseModel, Field
from enum import Enum

class IssueSeverity(str, Enum):
    ERROR = "error"      # Blocks PDF generation
    WARNING = "warning"  # Needs acknowledgment, can bypass
    INFO = "info"        # Helpful tips

class VerificationIssue(BaseModel):
    section: str = Field(description="Will section this issue relates to")
    severity: IssueSeverity
    code: str = Field(description="Machine-readable issue code, e.g. 'MISSING_EXECUTOR'")
    title: str = Field(description="Short human-readable issue title")
    explanation: str = Field(description="Plain-language explanation of WHY this is a problem")
    sa_law_reference: str | None = Field(
        default=None,
        description="SA law reference if applicable, e.g. 'SA Wills Act s2(1)(a)'"
    )

class SectionVerification(BaseModel):
    section: str
    status: str = Field(description="pass | warning | error")
    issues: list[VerificationIssue] = Field(default_factory=list)

class AttorneyReferral(BaseModel):
    recommended: bool
    reasons: list[str] = Field(default_factory=list)
    message: str = Field(default="We recommend consulting a qualified attorney")

class VerificationResult(BaseModel):
    overall_status: str = Field(description="green | yellow | red")
    sections: list[SectionVerification]
    attorney_referral: AttorneyReferral
    summary: str = Field(description="1-2 sentence plain-language summary")
```

### Pattern 3: SSE Progress Streaming
**What:** Reuse existing SSE pattern for live verification checklist
**When to use:** Verification endpoint that streams progress
**Example:**
```python
# Backend: Verification endpoint with SSE progress
async def verify_will_sse(will_id, session):
    # Phase 1: Pre-flight checks (deterministic)
    yield {"event": "check", "data": json.dumps({
        "name": "Loading will data",
        "status": "complete"
    })}

    # Phase 2: Gemini verification (single API call)
    yield {"event": "check", "data": json.dumps({
        "name": "Running AI verification",
        "status": "in_progress"
    })}
    result = await gemini_service.verify_will(will_data, prompt)
    yield {"event": "check", "data": json.dumps({
        "name": "Running AI verification",
        "status": "complete"
    })}

    # Phase 3: Emit per-section results
    for section in result.sections:
        yield {"event": "section_result", "data": json.dumps({
            "section": section.section,
            "status": section.status,
            "issue_count": len(section.issues),
        })}

    # Phase 4: Final result
    yield {"event": "done", "data": json.dumps(result.model_dump())}
```

### Pattern 4: Fallback to OpenAI
**What:** If Gemini is unavailable, use the existing OpenAI service
**When to use:** Gemini API errors, timeouts, rate limits
**Example:**
```python
async def verify_with_fallback(will_data, prompt):
    try:
        return await gemini_service.verify_will(will_data, prompt)
    except Exception as exc:
        logger.warning("Gemini unavailable (%s), falling back to OpenAI", exc)
        # OpenAI also supports structured output via .parse()
        return await openai_fallback_verify(will_data, prompt)
```

### Pattern 5: Will Status Transition
**What:** Update will.status from "draft"/"review" to "verified" after passing
**When to use:** After verification completes with no errors
**Note:** `WillService.update_will_status()` already exists and supports "draft | review | verified | generated" transitions.

### Anti-Patterns to Avoid
- **Per-section Gemini calls:** Do NOT call Gemini 8-13 times (once per section). Cross-section consistency checks (e.g., beneficiary percentages totaling 100%) require seeing all data at once. Use one call with all data.
- **Streaming Gemini response as progress:** Do NOT stream Gemini's text generation as a "progress indicator." The live checklist is simulated progress based on known verification steps. Gemini returns a single structured JSON response.
- **Caching conversation history for Gemini:** Do NOT send conversation history to Gemini. It adds massive token cost for minimal verification benefit. The JSONB data IS the extracted truth.
- **Blocking verification on startup:** Do NOT auto-verify when user navigates to verification page. Wait for explicit user action (click "Verify My Will").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gemini API client | Raw HTTP calls to Gemini REST API | `google-genai` SDK | Auth, retries, streaming, structured output all handled |
| JSON schema enforcement | Manual JSON parsing + validation | Pydantic `response_schema` in Gemini config | SDK guarantees schema-valid JSON, returns `.parsed` Pydantic object |
| SSE event formatting | Manual `data:` and `event:` string building | `sse-starlette` EventSourceResponse | Already in project, handles SSE spec correctly |
| SA Wills Act rules engine | Custom rule classes per SA law section | Gemini prompt with rules embedded | User decision: "Gemini evaluates all rules for now, architecture ready for hardcoded later" |

**Key insight:** The `google-genai` SDK's Pydantic integration means the verification result is guaranteed to be schema-valid. No manual JSON parsing, no try/catch for malformed responses. The `.parsed` property returns a ready-to-use Pydantic object.

## Common Pitfalls

### Pitfall 1: Gemini Structured Output Schema Limitations
**What goes wrong:** Gemini's structured output has different constraints than OpenAI's. Some Pydantic features (e.g., `Union` types, deeply nested generics) may not translate cleanly to Gemini's JSON schema format.
**Why it happens:** Gemini uses a different JSON schema dialect internally.
**How to avoid:** Keep the `VerificationResult` schema flat-ish. Use `str` enums instead of complex union types. Test the schema against the Gemini API early. Use `Optional` fields cautiously -- prefer `str | None` with `default=None`.
**Warning signs:** `400 Bad Request` errors mentioning schema validation from Gemini API.

### Pitfall 2: Gemini API Key vs OpenAI API Key Configuration
**What goes wrong:** Mixing up API key configuration, or forgetting to add GEMINI_API_KEY to `.env`.
**Why it happens:** Project already has OPENAI_API_KEY in settings. Easy to forget the new key.
**How to avoid:** Add `GEMINI_API_KEY` and `GEMINI_MODEL` to `Settings` class in `config.py` following the exact same pattern as `OPENAI_API_KEY` and `OPENAI_MODEL`.
**Warning signs:** Empty string API key causing cryptic auth errors.

### Pitfall 3: SSE Connection Timeout During Verification
**What goes wrong:** Gemini API call takes 5-15 seconds. Browser may timeout the SSE connection if no data flows.
**Why it happens:** Some proxies/browsers close idle SSE connections after a few seconds.
**How to avoid:** Send keepalive/progress events while waiting for Gemini. The "simulated checklist" pattern naturally solves this -- send a "Loading will data: complete" event, then "Running AI verification: in_progress" event, THEN call Gemini, THEN send remaining events.
**Warning signs:** Frontend sees connection close before results arrive.

### Pitfall 4: Token Limit Exceeded for Large Wills
**What goes wrong:** A will with many beneficiaries, assets, trusts, and business entities could produce a very large JSONB payload that exceeds Gemini's input token limit.
**Why it happens:** Complex estates with 10+ beneficiaries, 20+ assets, multiple trusts.
**How to avoid:** Estimate token count before sending. The JSONB data for even complex wills should be well under 10K tokens (Gemini-2.5-flash supports 1M context). This is unlikely to be a real problem but worth monitoring.
**Warning signs:** 413 or token limit error responses from Gemini.

### Pitfall 5: Inconsistent Section Naming Between Frontend and Backend
**What goes wrong:** Frontend uses camelCase section names (`trustProvisions`), backend uses snake_case (`trust_provisions`), and the verification result needs to reference sections that the frontend can navigate to.
**Why it happens:** Existing convention split between JS and Python naming.
**How to avoid:** Define a canonical section identifier map. The `VerificationIssue.section` field should use the frontend's `WillSection` type values: `personal`, `beneficiaries`, `assets`, `guardians`, `executor`, `bequests`, `residue`, `trust`, `usufruct`, `business`, `joint`. These already exist in `types/will.ts` as `WILL_SECTIONS`.
**Warning signs:** "Navigate to section" links not working because section IDs don't match.

### Pitfall 6: Verification Result Not Persisted
**What goes wrong:** User runs verification, navigates away, comes back -- results are gone.
**Why it happens:** If results are only in frontend state and not persisted to DB.
**How to avoid:** Create a `verification_results` JSONB column on the `Will` model (or a separate `VerificationResult` table). Persist the full result after each verification run. Add `verified_at` timestamp. Frontend loads cached results on page visit.
**Warning signs:** User has to re-verify every time they visit the verification page.

### Pitfall 7: Race Condition on Will Status Update
**What goes wrong:** User edits a section while verification is running. Verification passes based on stale data.
**Why it happens:** No lock or version check between "read will data" and "write verified status."
**How to avoid:** Compare will's `updated_at` timestamp before and after Gemini call. If will was modified during verification, discard results and prompt re-verification. Alternatively, set will status to "verifying" during the process.
**Warning signs:** Will shows "verified" but data has changed since verification.

## Code Examples

### Gemini Client Initialization (Async)
```python
# Source: Context7 /googleapis/python-genai - verified
from google import genai
from google.genai import types

client = genai.Client(api_key="GEMINI_API_KEY")

# Async call with Pydantic structured output
response = await client.aio.models.generate_content(
    model="gemini-2.5-flash",
    contents="Verify this will data: ...",
    config=types.GenerateContentConfig(
        system_instruction="You are a SA will verification assistant...",
        response_mime_type="application/json",
        response_schema=VerificationResult,
        temperature=0.1,
    ),
)
# response.parsed is a VerificationResult Pydantic object
result = response.parsed
```

### Verification Prompt Structure
```python
VERIFICATION_SYSTEM_PROMPT = """You are a South African will verification assistant.
You verify will data for completeness, consistency, and compliance with SA law.
You do NOT give legal advice. You identify issues for the user to address.

## SA WILLS ACT 7 OF 1953 - Key Rules
1. Testator must be 16+ years old
2. Will must be in writing
3. Testator must sign each page in presence of 2+ witnesses (14+ years old)
4. Witnesses must sign in presence of testator and each other
5. A beneficiary should NOT be a witness (disqualification)
6. If testator cannot sign, mark/thumbprint with Commissioner of Oaths certification

## COMPLETENESS CHECKS
For each section, verify required fields are present and non-empty.
- testator: firstName, lastName, idNumber (13 digits), dateOfBirth, address, province
- beneficiaries: at least 1 beneficiary with fullName and relationship
- executor: name is required, backup recommended
- residue: at least 1 residue beneficiary
- guardians: required if any beneficiary is a minor
- assets: recommended but not strictly required

## CONSISTENCY CHECKS
- Beneficiary percentages should total 100% (if percentage-based distribution)
- Residue beneficiary percentages should total 100%
- If married in community of property, only half the estate can be bequeathed
- Minor beneficiaries should have trust provisions or guardian nomination
- Business assets should match assets listed as type "business"
- Executor and witnesses must not be beneficiaries (SA law disqualification)
- Joint will co-testator should match spouse from marital section

## ATTORNEY REFERRAL TRIGGERS
Flag (but do not block) when:
- Trust provisions present (testamentary trust complexity)
- Usufruct provisions present
- Business succession involved
- International assets mentioned
- Disinheriting dependents
- Very unequal distributions (>80% to single non-family beneficiary)
- No executor nominated
- Extremely large estates (if indicated by asset descriptions)

## SEVERITY RULES
- ERROR: Missing required fields, legal compliance violations, invalid data
- WARNING: Missing recommended fields, potential consistency issues, complex scenarios
- INFO: Best practices, helpful suggestions, general tips
"""
```

### SSE Verification Endpoint
```python
@router.post("/api/wills/{will_id}/verify")
async def verify_will(
    will_id: uuid.UUID,
    request: Request,
    service: VerificationService = Depends(get_verification_service),
):
    user_id = _extract_user_id(request)

    async def event_generator():
        async for event in service.run_verification(will_id, user_id):
            if await request.is_disconnected():
                break
            yield event

    return EventSourceResponse(event_generator())
```

### Frontend Verification Hook (mirrors useConversation.ts pattern)
```typescript
interface VerificationCheck {
  name: string
  status: 'pending' | 'in_progress' | 'complete' | 'error'
}

interface VerificationResult {
  overall_status: 'green' | 'yellow' | 'red'
  sections: SectionVerification[]
  attorney_referral: AttorneyReferral
  summary: string
}

function useVerification(willId: string) {
  const [checks, setChecks] = useState<VerificationCheck[]>([])
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const startVerification = useCallback(async () => {
    setIsRunning(true)
    // SSE connection to POST /api/wills/{willId}/verify
    // Parse events: check (progress), section_result, done, error
    // Same SSE parsing pattern as useConversation.ts
  }, [willId])

  return { checks, result, isRunning, startVerification }
}
```

### Warning Acknowledgment Pattern
```python
# DB: Store acknowledged warning codes per will
# Will model addition:
acknowledged_warnings: list = Field(
    default_factory=list,
    sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
)

# API: POST /api/wills/{will_id}/acknowledge-warning
# Body: { "warning_codes": ["NO_BACKUP_EXECUTOR", "UNEQUAL_DISTRIBUTION"] }
```

## SA Wills Act Verification Rules

These rules form the basis of the verification prompt. Sourced from the SA Wills Act 7 of 1953 and common SA estate practice.

### Errors (Must Block)
| Code | Rule | SA Law Reference |
|------|------|-----------------|
| `MISSING_TESTATOR` | Testator details incomplete | General requirement |
| `INVALID_ID_NUMBER` | SA ID number not 13 digits | SA ID system |
| `TESTATOR_UNDER_16` | Testator must be 16+ to make a will | Wills Act s4 |
| `NO_BENEFICIARIES` | At least one beneficiary required | General requirement |
| `NO_EXECUTOR` | Executor nomination required | Administration of Estates Act |
| `NO_RESIDUE_CLAUSE` | Residue distribution must be specified | General requirement |
| `PERCENTAGES_EXCEED_100` | Beneficiary percentages exceed 100% | Mathematical consistency |
| `RESIDUE_PERCENTAGES_INVALID` | Residue percentages don't total 100% | Mathematical consistency |
| `MINOR_NO_PROVISION` | Minor beneficiary without trust or Guardian's Fund | Children's Act / best practice |

### Warnings (Need Acknowledgment)
| Code | Rule | SA Law Reference |
|------|------|-----------------|
| `NO_BACKUP_EXECUTOR` | No backup executor nominated | Best practice |
| `NO_ALTERNATE_BENEFICIARY` | No alternate beneficiary for predeceasing | Best practice |
| `NO_GUARDIANS_WITH_MINORS` | Has minor children but no guardian nominated | Best practice |
| `COMMUNITY_PROPERTY_HALF` | Married in community -- only 50% of joint estate is disposable | Matrimonial Property Act |
| `JOINT_WILL_IRREVOCABLE` | Joint will becomes irrevocable after first death | SA common law |
| `NO_SIMULTANEOUS_DEATH` | No simultaneous death clause specified | Best practice |
| `BUSINESS_NO_BUY_SELL` | Business interest without buy-sell agreement mention | Best practice |

### Info (Helpful Tips)
| Code | Rule |
|------|------|
| `RECOMMEND_PROFESSIONAL_EXECUTOR` | Large or complex estate may benefit from professional executor |
| `TRUST_VESTING_AGE` | Consider vesting age implications |
| `KEEP_WILL_UPDATED` | Recommend reviewing will after major life events |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `google-generativeai` package | `google-genai` package | 2025 | New unified SDK, `google-generativeai` is legacy. Use `google-genai` |
| Manual JSON parsing from LLM | Pydantic `response_schema` | 2025 | Gemini guarantees schema-valid JSON, `.parsed` returns Pydantic object |
| Gemini Pro for all tasks | Gemini 2.5 Flash for cost-effective tasks | 2025 | Flash is cheaper, faster, and sufficient for structured verification |

**Deprecated/outdated:**
- `google-generativeai` (old package): Replaced by `google-genai`. Do NOT use the old package.
- `genai.configure(api_key=...)` (old init pattern): New SDK uses `genai.Client(api_key=...)` constructor.

## Database Schema Additions

### Option A: JSONB column on Will model (recommended for simplicity)
```python
# Add to Will model:
verification_result: dict = Field(
    default_factory=dict,
    sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
)
verified_at: datetime | None = Field(
    default=None,
    sa_column=Column(DateTime(timezone=True), nullable=True),
)
acknowledged_warnings: list = Field(
    default_factory=list,
    sa_column=Column(JSONB, nullable=False, server_default="'[]'"),
)
```

### Migration: 005_add_verification_columns.py
Adds three columns to `wills` table: `verification_result`, `verified_at`, `acknowledged_warnings`.

## Configuration Additions

```python
# Add to Settings class in config.py:
GEMINI_API_KEY: str = ""
GEMINI_MODEL: str = "gemini-2.5-flash"
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/wills/{will_id}/verify` | Run verification (SSE streaming) |
| GET | `/api/wills/{will_id}/verification` | Get last verification result |
| POST | `/api/wills/{will_id}/acknowledge-warnings` | Acknowledge warning codes |

## Open Questions

1. **Gemini model selection: Flash vs Pro**
   - What we know: Gemini 2.5 Flash is cheaper and faster. Pro is more capable.
   - What's unclear: Whether Flash is accurate enough for legal verification.
   - Recommendation: Start with Flash (cost-effective). The structured output constraint means the format is guaranteed -- only the quality of the content matters. If accuracy is insufficient, upgrade to Pro. Model is configurable via `GEMINI_MODEL` setting.

2. **Verification result caching duration**
   - What we know: Results should persist in DB.
   - What's unclear: How long a cached result should be considered "fresh."
   - Recommendation: Results are valid until `will.updated_at` changes. If will data has been modified since `verified_at`, the cached result is stale and re-verification is needed. Frontend shows "outdated" badge when stale.

3. **Exact Gemini token cost per verification**
   - What we know: JSONB data for a complex will is approximately 2-5K tokens input, structured output ~1-2K tokens output.
   - What's unclear: Exact pricing and whether Flash is sufficient.
   - Recommendation: Log token usage in audit trail for cost monitoring. Flash pricing is significantly cheaper than Pro.

## Sources

### Primary (HIGH confidence)
- Context7 `/googleapis/python-genai` v1.33.0 docs - SDK API, structured output, async patterns
- PyPI `google-genai` v1.62.0 (released 2026-02-04) - Latest version, Python >=3.10
- Existing codebase analysis: all backend services, models, schemas, API routes, frontend store/hooks

### Secondary (MEDIUM confidence)
- LegalWise SA: "Requirements of a Valid Will" - SA Wills Act 7 of 1953 rules
- SA Government: Wills Act 7 of 1953 official text
- LLM cross-validation research papers (2025-2026) - Dual-LLM verification patterns

### Tertiary (LOW confidence)
- Community patterns for SSE progress UI in React (various blog posts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `google-genai` SDK verified via Context7, PyPI version confirmed
- Architecture: HIGH - Mirrors existing project patterns (service layer, DI, SSE, Pydantic schemas)
- SA Wills Act rules: MEDIUM - Rules sourced from SA legal information sites, not from attorney review
- Pitfalls: HIGH - Based on analysis of existing codebase patterns and known API constraints

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days -- stable domain, SDK may have minor updates)
