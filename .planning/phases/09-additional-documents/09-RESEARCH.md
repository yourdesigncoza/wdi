# Phase 9: Additional Documents - Research

**Researched:** 2026-02-08
**Domain:** Supplementary estate planning documents (living will, funeral wishes) for South Africa
**Confidence:** HIGH

## Summary

Phase 9 adds two supplementary documents to the WillCraft SA platform: a living will (advance healthcare directive) and a funeral wishes document. These are **separate documents from the main will** -- they are NOT additional sections within the existing will wizard. They require their own data models, questionnaire flows, clause templates, and PDF templates.

The existing codebase provides a strong, reusable foundation. The Phase 6 document generation pipeline (clause assembly, Jinja2 templates, WeasyPrint PDF) and the Phase 3 conversation system (per-section chat, SSE streaming, extraction) can both be reused with minimal adaptation. The key architectural decision is whether to use AI conversation or form-based questionnaires for data collection -- given the straightforward, structured nature of living will and funeral wishes data (mostly yes/no and multiple-choice), **form-based questionnaires are the better fit**, avoiding unnecessary AI cost and complexity.

**Primary recommendation:** Create a new `AdditionalDocument` model (not new columns on the Will model) with JSONB content, reuse the existing document generation pipeline with new templates, and use form-based questionnaires (not AI chat) for data collection.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WeasyPrint | existing | PDF generation from HTML | Already proven in Phase 6 pipeline |
| Jinja2 | existing | HTML template rendering | Already used for will templates |
| SQLModel + PostgreSQL | existing | Data persistence with JSONB | Same pattern as Will model |
| React Hook Form | existing | Form management | Already used in PersonalForm/MaritalForm |
| Zod | existing | Frontend schema validation | Already used for will schemas |
| DaisyUI v5 | existing | UI components | btn/card/form-control patterns established |
| Zustand + persist | existing | Frontend state management | Same pattern as useWillStore |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Alembic | existing | Database migrations | New AdditionalDocument table |
| FastAPI Depends | existing | Dependency injection | Service wiring for new endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Form-based questionnaire | AI conversation (ChatSection) | AI adds cost+complexity for mostly yes/no questions; forms are simpler and more deterministic |
| Separate AdditionalDocument model | JSONB columns on Will model | Separate model is cleaner -- these are distinct documents, not will sections |
| Shared base CSS template | Copy-paste CSS per template | Shared template avoids CSS duplication across 3 document types |

**Installation:** No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure (New Files Only)

```
backend/
  app/
    models/
      additional_document.py     # NEW: AdditionalDocument SQLModel
    schemas/
      additional_document.py     # NEW: Pydantic schemas for living will + funeral wishes
    api/
      additional_documents.py    # NEW: CRUD + PDF generation endpoints
    services/
      additional_document_service.py  # NEW: Document generation service
    templates/
      living_will/
        base.html                # NEW: Living will PDF template
        body.html                # NEW: Living will content sections
        signature_page.html      # NEW: Witness + signature section
      funeral_wishes/
        base.html                # NEW: Funeral wishes PDF template
        body.html                # NEW: Funeral wishes content sections
  alembic/versions/
    008_add_additional_documents.py  # NEW: Migration
  scripts/
    seed_clauses.py              # MODIFY: Add living will + funeral wishes clauses

frontend/
  src/
    features/
      additional-documents/
        components/
          AdditionalDocumentsDashboard.tsx  # NEW: Entry point showing available docs
          LivingWillForm.tsx               # NEW: Multi-step form questionnaire
          FuneralWishesForm.tsx             # NEW: Multi-step form questionnaire
          DocumentPreview.tsx               # NEW: Preview + download for additional docs
        store/
          useAdditionalDocStore.ts          # NEW: Zustand store for form state
        schemas/
          additionalDocSchemas.ts           # NEW: Zod validation schemas
        types/
          additionalDocument.ts             # NEW: TypeScript interfaces
    services/
      api.ts                     # MODIFY: Add additional document API methods
```

### Pattern 1: AdditionalDocument Model
**What:** A separate SQLModel table for additional documents (not JSONB columns on Will)
**When to use:** These are independent documents with their own lifecycle
**Why:** Living wills and funeral wishes are legally distinct from the last will and testament. They have different content structures, different formality requirements, and different PDF layouts. Mixing them into the Will model would violate single responsibility.

```python
class DocumentType(str, Enum):
    LIVING_WILL = "living_will"
    FUNERAL_WISHES = "funeral_wishes"

class AdditionalDocument(SQLModel, table=True):
    __tablename__ = "additional_documents"

    id: uuid.UUID           # PK
    user_id: uuid.UUID      # FK to users
    will_id: uuid.UUID | None  # Optional FK to wills (associated will)
    document_type: DocumentType  # living_will | funeral_wishes
    status: str             # draft | completed | generated
    content: dict           # JSONB -- all document data
    created_at: datetime
    updated_at: datetime
```

### Pattern 2: Form-Based Questionnaire (Not AI Chat)
**What:** Multi-step React forms with React Hook Form + Zod validation
**When to use:** When the data to collect is structured, finite, and deterministic
**Why:** Living will and funeral wishes data is mostly yes/no choices and text fields -- there is no ambiguity requiring AI interpretation. Forms are faster, cheaper, deterministic, and avoid API costs. The existing PersonalForm/MaritalForm components prove this pattern already.

```tsx
// Multi-step form with sections
const [step, setStep] = useState(0)
const STEPS = ['personal', 'treatment', 'proxy', 'values']

// Each step is a sub-form rendered conditionally
{step === 0 && <PersonalDetailsStep />}
{step === 1 && <TreatmentPreferencesStep />}
{step === 2 && <HealthcareProxyStep />}
{step === 3 && <ValuesAndWishesStep />}
```

### Pattern 3: Reuse Document Generation Pipeline
**What:** Same clause assembly + Jinja2 + WeasyPrint pipeline from Phase 6
**When to use:** For all additional document PDF generation
**Why:** The pipeline is proven and handles all edge cases (watermarks, threading, error fallbacks). Only the templates and clause order differ.

```python
# New document service reuses the existing rendering approach
class AdditionalDocumentService:
    async def generate_pdf(self, doc: AdditionalDocument) -> bytes:
        # 1. Extract variables from doc.content JSONB
        # 2. Render Jinja2 template
        # 3. Generate PDF via WeasyPrint in thread pool
```

### Pattern 4: Navigation -- Separate Route, Not Wizard Step
**What:** Additional documents live at `/documents` route, not inside the will wizard
**When to use:** Always -- these are separate documents
**Why:** The will wizard (WillWizard.tsx) is already complex with dynamic sections, scenario detection, and step tracking. Adding more steps there would be unwieldy. A separate `/documents` route with its own dashboard is cleaner and allows future expansion (e.g., codicils, power of attorney).

### Anti-Patterns to Avoid
- **Adding sections to WillWizard:** These are NOT will sections. Do not add "living_will" or "funeral_wishes" to WILL_SECTIONS or the wizard flow.
- **Using AI chat for structured data:** The living will questionnaire is mostly checkboxes and text fields. AI conversation adds latency, cost, and non-determinism for no benefit.
- **Sharing a Zustand store with the will:** These documents have different data shapes. Use a separate store.
- **Storing data in Will model JSONB columns:** These are independent documents. Keep them in their own table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF library | WeasyPrint (existing) | Already integrated, proven, handles CSS paged media |
| Form state | Manual useState chains | React Hook Form + Zod (existing) | Validation, dirty tracking, error messages |
| Frontend state persistence | Custom localStorage | Zustand persist (existing) | Same pattern as will store, proven |
| Multi-step form navigation | Custom wizard framework | Simple step index + conditional rendering | PersonalSection already uses this pattern (subStep state) |
| CSS styling | Custom CSS | Reuse existing will template CSS | Same professional formatting requirement |

**Key insight:** This phase is primarily about content and templates, not new technical infrastructure. Every piece of technical infrastructure already exists from Phases 3-6.

## Common Pitfalls

### Pitfall 1: Over-Engineering the Questionnaire
**What goes wrong:** Building an AI conversation for data that is structured and finite
**Why it happens:** Pattern matching from will sections that need AI for nuanced extraction
**How to avoid:** Living will = checkboxes + text fields. Funeral wishes = dropdowns + text fields. Use forms.
**Warning signs:** Designing OpenAI prompts for "Do you want CPR? Yes/No" questions

### Pitfall 2: Coupling Additional Documents to Will Lifecycle
**What goes wrong:** Requiring a will to exist before creating a living will; making additional documents go through will verification
**Why it happens:** Assuming these documents share the will's status machine (draft -> verified -> generated)
**How to avoid:** Additional documents have their own simple lifecycle: draft -> completed -> generated. They are optional companion documents.
**Warning signs:** Adding foreign key constraints that require will_id to be NOT NULL

### Pitfall 3: Duplicating CSS Across PDF Templates
**What goes wrong:** Copy-pasting the full CSS from will/base.html into each new template
**Why it happens:** Each PDF template is self-contained (WeasyPrint needs inline CSS)
**How to avoid:** Extract common CSS (page rules, typography, signature styles) into a shared Jinja2 include or macro. Document-specific styles stay in the document template.
**Warning signs:** Identical CSS blocks in 3+ template files

### Pitfall 4: Forgetting the Legal Context Differences
**What goes wrong:** Treating a living will like a testamentary will (requiring two witnesses, etc.)
**Why it happens:** Not understanding that living wills are not governed by the Wills Act 7 of 1953
**How to avoid:** Living wills in SA have NO statutory formality requirements (no specific witness rules). However, recommending 2 witnesses strengthens evidentiary value. The document template should recommend but not require witnesses. The funeral wishes document is NOT legally binding at all.
**Warning signs:** Template showing "Required by law" language for living will witnesses

### Pitfall 5: Not Linking Documents to Will Dashboard
**What goes wrong:** Users cannot find their additional documents after creation
**Why it happens:** Building the feature in isolation without dashboard integration
**How to avoid:** Add an "Additional Documents" section to WillDashboard or create a clear navigation path from the main dashboard
**Warning signs:** Users have to manually type a URL to access additional documents

## Code Examples

### AdditionalDocument Model
```python
# Source: Pattern from existing backend/app/models/will.py
class DocumentType(str, Enum):
    LIVING_WILL = "living_will"
    FUNERAL_WISHES = "funeral_wishes"

class AdditionalDocument(SQLModel, table=True):
    __tablename__ = "additional_documents"
    __table_args__ = (
        Index("ix_additional_documents_user_id", "user_id"),
    )

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True),
    )
    user_id: uuid.UUID = Field(
        sa_column=Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False),
    )
    will_id: uuid.UUID | None = Field(
        default=None,
        sa_column=Column(UUID(as_uuid=True), ForeignKey("wills.id", ondelete="SET NULL"), nullable=True),
    )
    document_type: str = Field(
        sa_column=Column(String(50), nullable=False),
    )
    status: str = Field(
        default="draft",
        sa_column=Column(String(50), nullable=False, server_default="draft"),
    )
    content: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=False, server_default="'{}'"),
    )
    created_at: datetime
    updated_at: datetime
```

### Living Will Content Schema (JSONB Shape)
```python
# Source: SA medical law research
class LivingWillContent(BaseModel):
    """Living will (advance healthcare directive) content."""

    # Personal details (may reference testator from linked will)
    full_name: str
    id_number: str  # SA ID
    date_of_birth: str
    address: str

    # Treatment preferences
    life_support: bool = False  # Accept/refuse
    artificial_ventilation: bool = False
    artificial_nutrition: bool = False  # Feeding tubes
    resuscitation_cpr: bool = False
    antibiotics_terminal: bool = False  # Antibiotics when terminal
    pain_management: bool = True  # Usually accepted

    # Trigger conditions
    terminal_illness: bool = True
    permanent_vegetative_state: bool = True
    permanent_unconsciousness: bool = True

    # Healthcare proxy
    proxy_name: str | None = None
    proxy_id_number: str | None = None
    proxy_phone: str | None = None
    proxy_relationship: str | None = None
    alternate_proxy_name: str | None = None

    # Values and wishes
    personal_values: str | None = None  # Free text for personal wishes
    religious_considerations: str | None = None
    organ_donation: bool | None = None
    organ_donation_details: str | None = None  # Specific organs or full body
```

### Funeral Wishes Content Schema (JSONB Shape)
```python
# Source: LegalWills.co.za MyFuneral structure
class FuneralWishesContent(BaseModel):
    """Funeral wishes document content."""

    # Personal details
    full_name: str
    id_number: str

    # Body disposition
    disposition: str  # "burial" | "cremation"
    embalming: bool | None = None

    # Burial specifics (if burial)
    cemetery_name: str | None = None
    burial_location_details: str | None = None
    casket_preference: str | None = None

    # Cremation specifics (if cremation)
    ashes_instruction: str | None = None  # "scatter" | "urn" | "other"
    ashes_details: str | None = None

    # Ceremony preferences
    ceremony_type: str | None = None  # "religious" | "secular" | "celebration_of_life" | "none"
    ceremony_location: str | None = None
    religious_denomination: str | None = None
    officiant_preference: str | None = None

    # Music and readings
    music_preferences: str | None = None
    readings_or_poems: str | None = None

    # Attendees and notifications
    specific_attendees: str | None = None  # People who must be notified

    # Budget
    budget_preference: str | None = None  # "economical" | "moderate" | "elaborate"

    # Additional wishes
    additional_wishes: str | None = None
    messages_to_family: str | None = None
```

### PDF Template Reuse Pattern
```html
{# Shared base structure -- living_will/base.html #}
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Advance Healthcare Directive -- {{ full_name }}</title>
  <style>
    {# Reuse page rules, typography, signature styles from will template #}
    @page { size: A4; margin: 25mm 25mm 30mm 25mm; }
    body { font-family: "Liberation Serif", serif; font-size: 12pt; line-height: 1.5; }
    {# ... same professional formatting ... #}
  </style>
</head>
<body>
  {% if is_preview %}
  <div class="watermark-overlay">PREVIEW -- NOT VALID</div>
  {% endif %}
  {% include "living_will/cover_page.html" %}
  {% include "living_will/body.html" %}
  {% include "living_will/signature_page.html" %}
</body>
</html>
```

### Frontend Form Pattern (Reuse from PersonalForm)
```tsx
// Source: Existing pattern in frontend/src/features/will/components/PersonalForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { livingWillSchema, type LivingWillData } from '../schemas/additionalDocSchemas'

function TreatmentPreferencesStep({ onNext, onBack }: StepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<LivingWillData>({
    resolver: zodResolver(livingWillSchema),
  })

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Treatment Preferences</legend>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Accept life support / artificial ventilation</span>
            <input type="checkbox" className="toggle" {...register('lifeSupport')} />
          </label>
        </div>
        {/* ... more preference toggles ... */}
      </fieldset>

      <div className="flex justify-between mt-6">
        <button type="button" className="btn btn-soft" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-neutral">Next</button>
      </div>
    </form>
  )
}
```

## South African Legal Context

### Living Will (Advance Healthcare Directive)

**Legal status:** NOT governed by any South African statute. No law formally validates living wills. However:
- HPCSA guidelines state patients have a right to refuse treatment
- Section 7 of the National Health Act recognizes written medical consent
- Constitutional right to dignity (s10) and bodily integrity (s12) underpin enforceability
- The End of Life Decisions Act (1999 draft) was never passed
- A National Health Amendment Bill (2018) was formulated but never tabled

**Formality requirements:** NONE statutory. However, to strengthen evidentiary value:
- Recommend 2 competent witnesses (same pattern as testamentary will, though not legally required)
- Creator must be 18+ and of sound mind
- Creator must be fully informed about their health condition
- Document should be signed and dated

**Content should include:**
1. Personal identification (name, ID number)
2. Declaration of mental capacity and informed consent
3. Trigger conditions (terminal illness, permanent vegetative state, permanent unconsciousness)
4. Specific treatment refusals (life support, ventilation, feeding tubes, CPR, antibiotics)
5. Treatment acceptances (pain management, palliative care)
6. Healthcare proxy appointment (optional but recommended)
7. Personal values and religious considerations
8. Organ donation wishes
9. Revocation clause
10. Date, signature, and witness signatures

**UPL considerations:** The platform must NOT advise on medical treatment decisions. It collects the user's pre-existing preferences. Recommend consulting a medical professional for informed decision-making.

### Funeral Wishes Document

**Legal status:** NOT legally binding in South Africa. The executor of the estate has final authority over funeral arrangements. However, the document:
- Serves as a record of the deceased's wishes
- Relieves family of difficult decisions during grief
- Can be referenced by the executor
- Has no formality requirements whatsoever

**Content should include:**
1. Personal identification
2. Body disposition preference (burial vs cremation)
3. Ceremony preferences (religious, secular, celebration of life)
4. Specific wishes (music, readings, attendees)
5. Budget guidance
6. Personal messages to family
7. Date and signature (no witnesses needed, but good practice)

**UPL considerations:** None -- this is purely a personal preference document with no legal implications.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Combined will + living will | Separate documents | Current best practice | Cleaner data model, independent lifecycles |
| AI chat for all data | Form-based for structured data | Project pattern since Phase 3 | PersonalForm/MaritalForm already use forms for structured data |

**Deprecated/outdated:**
- None -- this is new territory for the project

## Open Questions

1. **Navigation access point**
   - What we know: Users need to access additional documents from somewhere
   - What's unclear: Should it be a tab on WillDashboard, a separate route, or accessible from the will wizard's post-payment flow?
   - Recommendation: Add an "Additional Documents" section to WillDashboard + a separate `/documents` route. Users see it after will creation but can access it independently.

2. **Pre-population from will data**
   - What we know: If a user has a will, their personal details (name, ID, address) are already collected
   - What's unclear: How aggressively to pre-fill from the linked will
   - Recommendation: Pre-fill personal details from linked will if one exists, but allow override. Optional will_id FK on AdditionalDocument.

3. **Clause library vs. direct templates**
   - What we know: The will uses a clause library with DB-stored templates and variable substitution
   - What's unclear: Whether additional documents need the same clause versioning infrastructure
   - Recommendation: Use direct Jinja2 templates (no clause library) for Phase 9. These documents are simpler and don't need clause-level versioning. Clause library could be added later if attorney review requires version tracking.

4. **Payment gating**
   - What we know: The main will requires payment before final download
   - What's unclear: Whether additional documents are free, bundled with will payment, or separately priced
   - Recommendation: For MVP, make them free (included with platform). Payment gating can be added later. Generate PDFs directly without payment gate.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/opt/lampp/htdocs/wdi/backend/app/services/document_service.py` -- existing PDF generation pipeline
- Codebase analysis: `/opt/lampp/htdocs/wdi/backend/app/models/will.py` -- JSONB model pattern
- Codebase analysis: `/opt/lampp/htdocs/wdi/frontend/src/features/will/components/PersonalForm.tsx` -- form pattern
- Codebase analysis: `/opt/lampp/htdocs/wdi/backend/app/templates/will/base.html` -- PDF template structure
- Codebase analysis: `/opt/lampp/htdocs/wdi/backend/scripts/seed_clauses.py` -- clause seeding pattern

### Secondary (MEDIUM confidence)
- [Medical Protection Society SA - Living Wills/Advance Directives](https://www.medicalprotection.org/southafrica/casebook-and-resources/factsheets/factsheets/sa-living-wills-advance-directives) -- factsheet on SA living will requirements and legal status
- [De Rebus - Enforceability of Living Wills in SA](https://www.derebus.org.za/enforceability-of-living-wills-in-south-africa/) -- legal analysis and formality recommendations
- [VDM Attorneys - Living Wills](https://www.vdm.law/legal-services/deceased-estates-trusts-and-wills/wills/living-wills) -- content sections and witness recommendations
- [Barter McKellar - Medical Proxy vs Living Will](https://www.bartermckellar.law/family-law-explained/understanding-medical-proxy-vs-living-will-in-south-africa-navigating-legal-waters) -- distinction between living will and medical proxy
- [LegalWills.co.za - MyFuneral Sample](https://www.legalwills.co.za/myfuneral_sample) -- funeral wishes document structure and sections

### Tertiary (LOW confidence)
- [DignitySA](https://www.dignitysouthafrica.org/legalisation-of-living-wills) -- advocacy for living will legislation (pending)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- patterns directly follow existing codebase conventions (JSONB model, form-based collection, Jinja2+WeasyPrint pipeline)
- Pitfalls: HIGH -- well-understood from Phase 6 experience and SA legal research
- SA legal context: MEDIUM -- living will legal status is well-documented but no statutory framework exists; funeral wishes have no legal standing

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable domain, no fast-moving dependencies)
