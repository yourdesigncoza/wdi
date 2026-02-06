# Phase 4: Complex Estate Scenarios - Research

**Researched:** 2026-02-06
**Domain:** SA testamentary trusts, usufruct/fideicommissum, blended families, business assets, joint/mutual wills — extending existing JSONB-sectioned will + AI conversation architecture
**Confidence:** MEDIUM (domain law verified via official SA legal sources; architecture patterns HIGH from codebase analysis; clause text requires attorney approval)

## Summary

Phase 4 extends the basic will creation flow (Phase 3) to handle five complex estate scenarios common in South African estate planning: blended families with step-children, testamentary trusts for minor children, usufruct provisions for surviving spouses, business asset succession (CC member interests and company shares), and joint/mutual wills between spouses.

The standard approach is to treat each scenario as a **specialization layer** on top of the existing architecture rather than a rewrite. The Will model already supports `will_type` (currently "basic") and the Clause model already has `WillType` enum entries for "trust", "usufruct", and "joint". The conversation system already supports per-section AI conversations with section-specific system prompts. The work is primarily: (1) detect which complex scenarios apply via a routing/detection step, (2) add new JSONB section columns and schemas for trust/usufruct/business/joint data, (3) create new clause templates for each scenario, (4) extend system prompts with scenario-specific guidance, and (5) add frontend components for the new sections.

**Primary recommendation:** Implement a scenario detection layer early (plan 04-01) that sets `will_type` and enables conditional sections, then build each scenario as an additive feature on the existing section-based architecture. Do NOT restructure the wizard — add conditional sections that appear only when relevant.

## Standard Stack

### Core (No new libraries needed)

This phase uses the exact same stack as Phase 3. No new dependencies.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | existing | API endpoints for new sections | Already established |
| SQLModel + Alembic | existing | New JSONB columns via migration 004 | JSONB pattern already proven |
| OpenAI (gpt-4o-mini) | existing | Conversation for new sections | Same dual-temp pattern |
| Zustand + Immer | existing | Frontend state for new sections | Persist+Immer already established |
| Zod | existing | Validation for new section schemas | Already used for all sections |
| React Hook Form | existing | Forms for trust/usufruct/business config | Already used for personal/marital |
| DaisyUI v5 | existing | UI components for new sections | Already themed and configured |
| Jinja2 | existing | Clause template rendering | StrictUndefined already enforced |

### Supporting (no changes)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sse-starlette | existing | SSE streaming for new section conversations | Same dual-event pattern |
| pydantic-settings | existing | Config for any new env vars (none expected) | Same pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New JSONB columns per scenario | Single "complex_data" JSONB blob | Per-column is consistent with Phase 3 pattern and enables targeted queries |
| Separate will tables per type | Same Will model with conditional sections | Single model keeps relationships simple; JSONB columns are empty when unused |
| New database tables for trusts/usufruct | JSONB columns on existing Will model | JSONB is consistent with established pattern and avoids join complexity |

## Architecture Patterns

### Recommended Approach: Conditional Sections on Existing Model

```
backend/
├── app/
│   ├── models/
│   │   └── will.py               # Add new JSONB columns: trust_provisions, usufruct, business_assets, joint_will
│   ├── schemas/
│   │   └── will.py               # Add new Pydantic schemas: TrustSchema, UsufructSchema, BusinessAssetSchema, JointWillSchema
│   ├── prompts/
│   │   ├── system.py             # Add new SECTION_PROMPTS entries for trust, usufruct, business, joint
│   │   └── extraction.py         # Add new extraction models for trust/usufruct/business data
│   ├── services/
│   │   ├── will_service.py       # Extend VALID_SECTIONS set, add scenario detection logic
│   │   ├── scenario_detector.py  # NEW: Detect which complex scenarios apply based on will data
│   │   └── clause_library.py     # No changes needed (already supports WillType filtering)
│   ├── api/
│   │   └── will.py               # Extend _SECTION_SCHEMA_MAP with new sections
│   └── scripts/
│       └── seed_clauses.py       # Add trust, usufruct, business, joint clause templates
├── alembic/versions/
│   └── 004_add_complex_sections.py  # Migration adding new JSONB columns
│
frontend/src/
├── features/will/
│   ├── types/will.ts             # Add new interfaces: TrustProvisions, UsufructProvision, etc.
│   ├── store/useWillStore.ts     # Add new state slices and actions for each scenario
│   ├── schemas/willSchemas.ts    # Add Zod schemas for new section validation
│   ├── components/
│   │   ├── ScenarioDetector.tsx   # NEW: Detects and routes complex scenarios
│   │   ├── TrustSection.tsx       # NEW: Testamentary trust configuration
│   │   ├── UsufructSection.tsx    # NEW: Usufruct provision configuration
│   │   ├── BusinessAssetsSection.tsx  # NEW: Business asset questionnaire
│   │   ├── JointWillSetup.tsx     # NEW: Joint/mirror will configuration
│   │   └── WillWizard.tsx         # Extend to conditionally show complex sections
│   └── hooks/
│       └── useScenarioDetection.ts  # NEW: Hook for scenario detection logic
```

### Pattern 1: Scenario Detection and Flow Routing

**What:** A detection layer that analyzes existing will data (testator, marital, beneficiaries, assets) to determine which complex scenarios are relevant, then activates additional wizard sections.

**When to use:** After the user completes basic sections (personal, marital, beneficiaries, assets) — before proceeding to executor/bequests/residue.

**How it works:**
- Marital status = married + has children from prior relationship = blended family scenario
- Has minor children (any scenario) = offer testamentary trust
- Has property + married = offer usufruct
- Has business assets (CC member interest, company shares) = business asset scenario
- Will type = "joint" (selected explicitly by married users) = joint will workflow

**Implementation approach:**
```python
# backend: app/services/scenario_detector.py
class ScenarioDetector:
    """Analyzes will data and returns applicable complex scenarios."""

    def detect(self, will_data: dict) -> list[str]:
        scenarios = []
        marital = will_data.get("marital", {})
        beneficiaries = will_data.get("beneficiaries", [])
        assets = will_data.get("assets", [])

        # Blended family: married + children from prior relationships
        is_married = marital.get("status", "").startswith("married")
        has_step_children = any(
            b.get("relationship") in ("step_child", "step_son", "step_daughter")
            for b in beneficiaries
        )
        if is_married and has_step_children:
            scenarios.append("blended_family")

        # Testamentary trust: has minor beneficiaries
        has_minors = any(
            b.get("is_minor", False) for b in beneficiaries
        )
        if has_minors:
            scenarios.append("testamentary_trust")

        # Usufruct: has property + married/has dependents
        has_property = any(
            a.get("asset_type") == "property" for a in assets
        )
        if has_property and is_married:
            scenarios.append("usufruct")

        # Business assets: has CC or company shares
        has_business = any(
            a.get("asset_type") == "business" for a in assets
        )
        if has_business:
            scenarios.append("business_assets")

        return scenarios
```

**Frontend routing:**
```typescript
// The WillWizard conditionally renders sections based on detected scenarios
const COMPLEX_SECTIONS: Record<string, WillSection> = {
  testamentary_trust: 'trust',
  usufruct: 'usufruct',
  business_assets: 'business',
}
```

### Pattern 2: Conditional JSONB Sections (Additive, Not Destructive)

**What:** Add new JSONB columns to the Will model for complex scenario data. These columns default to empty objects/arrays and are only populated when the relevant scenario is active.

**Why:** Consistent with the Phase 3 JSONB-per-section pattern. No impact on basic wills — columns simply remain empty.

**Migration approach:**
```python
# alembic/versions/004_add_complex_sections.py
def upgrade():
    # Testamentary trust provisions
    op.add_column("wills", sa.Column(
        "trust_provisions", postgresql.JSONB,
        nullable=False, server_default="{}"
    ))
    # Usufruct provisions
    op.add_column("wills", sa.Column(
        "usufruct", postgresql.JSONB,
        nullable=False, server_default="{}"
    ))
    # Business asset details
    op.add_column("wills", sa.Column(
        "business_assets", postgresql.JSONB,
        nullable=False, server_default="[]"
    ))
    # Joint will configuration
    op.add_column("wills", sa.Column(
        "joint_will", postgresql.JSONB,
        nullable=False, server_default="{}"
    ))
    # Update sections_complete default to include new sections
```

### Pattern 3: Extended System Prompts for Complex Scenarios

**What:** New entries in SECTION_PROMPTS for each complex section, providing domain-specific guidance to the AI.

**Why:** The AI needs specialized knowledge about SA testamentary trusts, usufruct, business succession, and joint wills. The prompts must include UPL boundaries specific to each domain.

**Example for testamentary trust:**
```python
SECTION_PROMPTS["trust"] = (
    "You are helping the user set up testamentary trust provisions to protect "
    "minor children's inheritance. In South Africa, children under 18 cannot "
    "inherit directly — assets must be held in trust. "
    "Ask about: which children are minors, what age they should inherit outright "
    "(commonly 18 or 25), who should be the trustee(s), whether income should "
    "be available for education and maintenance before the vesting age. "
    "IMPORTANT: Do not advise on specific trust structures or tax implications — "
    "recommend an attorney for complex trust arrangements. "
    "Focus on collecting the information needed for a standard testamentary trust."
)
```

### Pattern 4: Joint Will as Separate Will Type (Not a Section)

**What:** Joint wills fundamentally change the will structure — two testators sharing one document. This should modify the `will_type` to "joint" and add a co-testator pattern rather than being just another section.

**Why:** A joint will is not simply an add-on section. It requires: (1) second testator details, (2) massing provisions, (3) mutual bequest clauses, (4) irrevocability terms. The Will model already has a `will_type` field that can be set to "joint".

**Key decision point:** Joint wills require collecting a second testator's full details (name, ID, address). This can reuse the TestatorSchema but needs a "co-testator" field on the will.

### Anti-Patterns to Avoid

- **Rewriting the wizard:** Do NOT restructure WillWizard for complex scenarios. Add conditional sections that appear/disappear based on detected scenarios. The existing step indicator already supports dynamic sections.
- **Separate will models per type:** Do NOT create separate database tables for trust wills vs usufruct wills. Use the same Will model with optional JSONB columns.
- **AI-generated clause text:** Do NOT let the AI generate legal text for trusts/usufruct/business. These MUST come from the clause library. The AI collects information; clauses render the legal text.
- **Overcomplicating detection:** Scenario detection should be deterministic (based on data), not AI-powered. Simple conditional logic based on marital status, beneficiary types, and asset types.
- **Making scenarios mandatory:** All complex scenarios are OPTIONAL. The user should be offered them, not forced through them. A basic will remains valid without trusts/usufruct/business provisions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trust clause text | Custom AI-generated trust clauses | Clause library templates (TRUST-01, TRUST-02, etc.) | Must be attorney-approved per UPL requirements |
| Usufruct clause text | Custom AI-generated usufruct text | Clause library templates (USUF-01, USUF-02, etc.) | Complex legal instrument requiring precise language |
| Business succession clauses | AI-generated business clauses | Clause library templates (BUS-01, BUS-02, etc.) | CC Act s35 and Companies Act requirements |
| Joint will mutual bequest | AI-generated mutual bequest text | Clause library templates (JOINT-01, etc.) | Irrevocability and massing have precise legal meaning |
| SA minor inheritance rules | Custom age-checking logic | Well-known rule: under 18 cannot inherit directly, Guardian's Fund or trust required | Established SA law, don't reinterpret |
| Scenario detection | LLM-based scenario analysis | Deterministic rules on structured data | Faster, cheaper, more predictable than AI-based detection |

**Key insight:** The clause library and UPL filter are the critical constraint. Phase 4 adds NEW clause templates (requiring attorney approval) and extends system prompts, but the architecture pattern is identical to Phase 3. The complexity is in the domain knowledge (SA estate law), not the code architecture.

## Common Pitfalls

### Pitfall 1: Missing Attorney Approval for Complex Clauses

**What goes wrong:** Trust, usufruct, and business succession clauses are implemented with placeholder text that is legally incorrect or incomplete.
**Why it happens:** Developers write clause text based on web research rather than attorney review.
**How to avoid:** Use `approved_by: "PLACEHOLDER - Pending Attorney Review"` for all new clauses. Add prominent warnings in the UI when using placeholder clauses. Block production deployment until attorney approval is obtained.
**Warning signs:** Clause text that includes specific legal obligations, tax implications, or procedural requirements that weren't reviewed by an SA attorney.

### Pitfall 2: Testamentary Trust Complexity Explosion

**What goes wrong:** Trying to handle all possible trust variations (discretionary trusts, vesting trusts, special trusts, etc.) in one implementation.
**Why it happens:** South African trust law is extensive. There are many trust types with different implications.
**How to avoid:** Limit scope to the STANDARD testamentary trust for minor children: assets held in trust until vesting age (18-25), with income available for maintenance and education. Refer complex trust needs to an attorney.
**Warning signs:** Schema includes fields for discretionary distribution powers, special trusts for disabled persons, or investment mandates.

### Pitfall 3: Usufruct vs Fideicommissum Confusion

**What goes wrong:** Mixing up usufruct (right to USE property) and fideicommissum (conditional OWNERSHIP transfer). The two are legally distinct.
**Why it happens:** Both involve "person A gets benefit, then person B gets the asset." But the legal mechanism and implications differ substantially.
**How to avoid:** Implement ONLY usufruct (not fideicommissum) as it is simpler and more commonly understood. The usufructuary does NOT own the property; they have a right to use and enjoy it. The bare dominium holder (typically children) is the actual owner from the start. Clearly distinguish this in system prompts.
**Warning signs:** System prompt or clause text uses "ownership" when describing the usufructuary's position.

### Pitfall 4: CC Member Interest Consent Requirement

**What goes wrong:** Will provision bequeathing CC member interest to an heir, without noting that remaining members must consent per Close Corporations Act s35.
**Why it happens:** Developers treat CC interests like any other asset without understanding the statutory consent requirement.
**How to avoid:** The business asset section MUST warn the user that CC member interest transfer requires consent of remaining members. The AI should proactively ask about Association Agreements and buy-sell agreements. If the heir doesn't get consent, the interest must be sold.
**Warning signs:** CC member interest is treated identically to company shares without the consent caveat.

### Pitfall 5: Joint Will Irrevocability Trap

**What goes wrong:** Implementing joint wills without prominently warning users about irrevocability after the first testator's death.
**Why it happens:** Joint wills seem simpler than separate wills, so users choose them without understanding the binding nature.
**How to avoid:** The AI must explain that once one spouse dies and the survivor accepts benefits, the surviving spouse is typically bound by the entire joint will and cannot change it. The system should recommend separate (mirror) wills as the default, with joint wills as an explicit opt-in for users who understand the implications.
**Warning signs:** Joint will workflow doesn't include a prominent warning about irrevocability.

### Pitfall 6: Over-Scoping Step-Children Handling

**What goes wrong:** Building complex blended family logic (adoption status tracking, half-sibling vs step-sibling distinction, maintenance obligations) when a simpler approach suffices.
**Why it happens:** Blended family law is complex with many edge cases.
**How to avoid:** The core need is: user can specify step-children as beneficiaries with explicit share allocation. The AI should proactively ask about children from prior relationships when marital history indicates previous marriage. Refer complex custody/maintenance situations to an attorney.
**Warning signs:** Schema includes fields for adoption date, custody arrangement details, or maintenance order references.

## Code Examples

### Example 1: New JSONB Section Schemas (Backend)

```python
# app/schemas/will.py additions

class TrustProvisionSchema(BaseModel):
    """Testamentary trust provisions for minor beneficiaries."""
    trust_name: str = Field(description="Name of the trust, e.g., 'Smith Family Trust'")
    minor_beneficiaries: list[str] = Field(
        description="Names of minor children who benefit from the trust"
    )
    vesting_age: int = Field(
        default=18, ge=18, le=25,
        description="Age at which beneficiaries inherit outright"
    )
    trustees: list[dict] = Field(
        default_factory=list,
        description="List of trustees [{name, id_number, relationship}]"
    )
    income_for_maintenance: bool = Field(
        default=True,
        description="Whether trust income can be used for maintenance and education"
    )
    capital_for_education: bool = Field(
        default=True,
        description="Whether trust capital can be used for education"
    )


class UsufructSchema(BaseModel):
    """Usufruct provision — right to use property without ownership."""
    property_description: str = Field(description="Description of property subject to usufruct")
    usufructuary_name: str = Field(description="Person who gets right to use (typically spouse)")
    usufructuary_id_number: Optional[str] = None
    bare_dominium_holders: list[dict] = Field(
        default_factory=list,
        description="Owners of bare dominium [{name, id_number, share_percent}]"
    )
    duration: str = Field(
        default="lifetime",
        description="Duration: 'lifetime' or specific period"
    )


class BusinessAssetSchema(BaseModel):
    """Business asset for will — CC member interest or company shares."""
    business_name: str
    business_type: str = Field(description="cc_member_interest | company_shares | partnership")
    registration_number: Optional[str] = None
    percentage_held: Optional[float] = Field(default=None, ge=0, le=100)
    heir_name: Optional[str] = None
    heir_relationship: Optional[str] = None
    has_buy_sell_agreement: bool = False
    has_association_agreement: bool = False
    notes: Optional[str] = None


class JointWillSchema(BaseModel):
    """Joint will configuration between spouses."""
    co_testator_first_name: str
    co_testator_last_name: str
    co_testator_id_number: str = Field(pattern=r"^\d{13}$")
    will_structure: str = Field(
        default="mutual",
        description="'mutual' (benefit each other) or 'mirror' (identical but separate)"
    )
    massing: bool = Field(
        default=False,
        description="Whether estates are combined into a single mass"
    )
    irrevocability_acknowledged: bool = Field(
        default=False,
        description="User confirmed understanding that joint will may be irrevocable after first death"
    )
```

### Example 2: Frontend Type Definitions

```typescript
// features/will/types/will.ts additions

export interface TrustProvisions {
  trustName: string
  minorBeneficiaries: string[]
  vestingAge: number
  trustees: { name: string; idNumber?: string; relationship: string }[]
  incomeForMaintenance: boolean
  capitalForEducation: boolean
}

export interface UsufructProvision {
  propertyDescription: string
  usufructuaryName: string
  usufructuaryIdNumber?: string
  bareDominiumHolders: { name: string; idNumber?: string; sharePercent: number }[]
  duration: 'lifetime' | string
}

export interface BusinessAsset {
  id: string
  businessName: string
  businessType: 'cc_member_interest' | 'company_shares' | 'partnership'
  registrationNumber?: string
  percentageHeld?: number
  heirName?: string
  heirRelationship?: string
  hasBuySellAgreement: boolean
  hasAssociationAgreement: boolean
  notes?: string
}

export interface JointWillConfig {
  coTestatorFirstName: string
  coTestatorLastName: string
  coTestatorIdNumber: string
  willStructure: 'mutual' | 'mirror'
  massing: boolean
  irrevocabilityAcknowledged: boolean
}
```

### Example 3: Scenario-Specific System Prompts

```python
# app/prompts/system.py additions

SECTION_PROMPTS["trust"] = (
    "You are helping the user set up a testamentary trust to protect the "
    "inheritance of minor children. In South Africa, children under 18 cannot "
    "inherit directly — their inheritance must be held in trust or paid to the "
    "Guardian's Fund. "
    "Ask about: (1) Which children are minors? (2) At what age should they "
    "receive their inheritance outright — commonly 18, 21, or 25? (3) Who "
    "should be the trustee(s) — the person(s) who manage the trust? "
    "(4) Should trust income be available for the children's maintenance "
    "and education before they reach the vesting age? "
    "IMPORTANT: Do NOT advise on specific trust structures, tax implications, "
    "or estate duty planning. For complex trust arrangements, refer to an attorney."
)

SECTION_PROMPTS["usufruct"] = (
    "You are helping the user set up a usufruct provision. A usufruct gives "
    "someone (usually the surviving spouse) the right to USE and ENJOY a "
    "property for their lifetime, while actual ownership (bare dominium) "
    "passes to other beneficiaries (usually children). "
    "Ask about: (1) Which property is subject to the usufruct? (2) Who gets "
    "the right to use the property? (3) Who gets ownership? (4) Should it "
    "last for the usufructuary's lifetime or a specific period? "
    "IMPORTANT: The usufructuary does NOT own the property — they have a right "
    "to use it. They must maintain it and cannot sell it. Be clear about this "
    "distinction. Do NOT confuse this with a fideicommissum."
)

SECTION_PROMPTS["business"] = (
    "You are helping the user include business assets in their will. "
    "In South Africa, business interests require special attention: "
    "CC member interests need consent from remaining members under s35 of "
    "the Close Corporations Act. Company shares transfer differently to CC interests. "
    "Ask about: (1) Business name and type (CC, Pty Ltd, partnership). "
    "(2) What percentage/interest the user holds. (3) Who should inherit "
    "the business interest. (4) Is there a buy-sell agreement in place? "
    "(5) Is there an Association Agreement (for CCs)? "
    "IMPORTANT: Do NOT advise on business valuation, buy-sell agreement terms, "
    "or tax implications. These require professional advice."
)

SECTION_PROMPTS["joint"] = (
    "You are helping the user set up a joint or mutual will with their spouse. "
    "IMPORTANT: Joint wills become effectively IRREVOCABLE after the first "
    "testator dies. The surviving spouse who accepts benefits is typically "
    "bound by all terms and cannot change the will — even if circumstances "
    "change dramatically. Make sure the user understands this. "
    "Ask about: (1) Spouse details (if not already collected in marital section). "
    "(2) Whether they want a mutual will (benefit each other) or mirror will "
    "(identical but technically separate). (3) Whether they want massing of "
    "estates (combining assets into one pool). (4) Confirm they understand "
    "the irrevocability implications. "
    "NOTE: Many estate planners recommend separate mirror wills instead of "
    "joint wills for greater flexibility. Mention this option."
)
```

### Example 4: Clause Library Seeds for Complex Scenarios

```python
# scripts/seed_clauses.py additions

COMPLEX_CLAUSES = [
    {
        "code": "TRUST-01",
        "name": "Testamentary Trust for Minor Children",
        "category": ClauseCategory.TRUST,
        "template_text": (
            "I direct that any inheritance due to my minor children, namely "
            "{{ children_names }}, shall be held in a testamentary trust to be "
            "known as the {{ trust_name }}. The trust shall be administered by "
            "{{ trustee_names }} as Trustee(s). The trust assets shall vest in "
            "each beneficiary upon attaining the age of {{ vesting_age }} years. "
            "Until vesting, the Trustee(s) shall have the power to apply trust "
            "income and, if necessary, capital for the maintenance, education, "
            "and general welfare of the beneficiaries."
        ),
        "variables_schema": {
            "children_names": {"type": "string", "required": True},
            "trust_name": {"type": "string", "required": True},
            "trustee_names": {"type": "string", "required": True},
            "vesting_age": {"type": "integer", "required": True},
        },
        "will_types": [WillType.TRUST.value, WillType.BASIC.value],
        "is_required": False,
        "display_order": 55,
    },
    {
        "code": "USUF-01",
        "name": "Usufruct over Immovable Property",
        "category": ClauseCategory.USUFRUCT,
        "template_text": (
            "I bequeath to {{ usufructuary_name }}, Identity Number "
            "{{ usufructuary_id_number }}, a usufruct over the immovable "
            "property described as {{ property_description }}, for the "
            "duration of {{ usufructuary_name }}'s lifetime. The bare dominium "
            "of the said property shall vest in {{ bare_dominium_holders }}. "
            "The usufructuary shall be entitled to the use and enjoyment of "
            "the property and shall be responsible for the maintenance thereof "
            "and the payment of all rates and taxes."
        ),
        "variables_schema": {
            "usufructuary_name": {"type": "string", "required": True},
            "usufructuary_id_number": {"type": "string", "required": True},
            "property_description": {"type": "string", "required": True},
            "bare_dominium_holders": {"type": "string", "required": True},
        },
        "will_types": [WillType.USUFRUCT.value, WillType.BASIC.value],
        "is_required": False,
        "display_order": 57,
    },
    {
        "code": "BUS-01",
        "name": "Bequest of Close Corporation Member Interest",
        "category": ClauseCategory.BENEFICIARY,
        "template_text": (
            "I bequeath my member's interest of {{ percentage_held }}% in "
            "{{ business_name }}, registration number {{ registration_number }}, "
            "to {{ heir_name }}. This bequest is subject to the consent of the "
            "remaining members of the close corporation in terms of Section 35 "
            "of the Close Corporations Act 69 of 1984. Should such consent not "
            "be obtained, I direct my Executor to dispose of my member's interest "
            "in such manner as may be required by law."
        ),
        "variables_schema": {
            "percentage_held": {"type": "string", "required": True},
            "business_name": {"type": "string", "required": True},
            "registration_number": {"type": "string", "required": True},
            "heir_name": {"type": "string", "required": True},
        },
        "will_types": _ALL_TYPES,
        "is_required": False,
        "display_order": 35,
    },
    {
        "code": "JOINT-01",
        "name": "Joint Will Mutual Bequest",
        "category": ClauseCategory.BENEFICIARY,
        "template_text": (
            "We, {{ testator_1_name }}, Identity Number {{ testator_1_id }}, "
            "and {{ testator_2_name }}, Identity Number {{ testator_2_id }}, "
            "being husband and wife, do hereby jointly declare this to be our "
            "joint last will and testament. Upon the death of the first-dying, "
            "the survivor shall inherit the entire estate of the first-dying. "
            "Upon the death of the survivor, the combined estate shall be "
            "distributed as set out in this will."
        ),
        "variables_schema": {
            "testator_1_name": {"type": "string", "required": True},
            "testator_1_id": {"type": "string", "required": True},
            "testator_2_name": {"type": "string", "required": True},
            "testator_2_id": {"type": "string", "required": True},
        },
        "will_types": [WillType.JOINT.value],
        "is_required": True,
        "display_order": 15,
    },
]
```

### Example 5: Extraction Schema Extensions

```python
# app/prompts/extraction.py additions

class ExtractedTrustData(BaseModel):
    """Trust-related data extracted from conversation."""
    trust_name: Optional[str] = None
    minor_beneficiaries: list[str] = Field(default_factory=list)
    vesting_age: Optional[int] = None
    trustees: list[dict] = Field(default_factory=list)
    income_for_maintenance: Optional[bool] = None
    capital_for_education: Optional[bool] = None

class ExtractedUsufructData(BaseModel):
    """Usufruct-related data extracted from conversation."""
    property_description: Optional[str] = None
    usufructuary_name: Optional[str] = None
    bare_dominium_holders: list[dict] = Field(default_factory=list)
    duration: Optional[str] = None

class ExtractedBusinessData(BaseModel):
    """Business asset data extracted from conversation."""
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    registration_number: Optional[str] = None
    percentage_held: Optional[float] = None
    heir_name: Optional[str] = None
    has_buy_sell_agreement: Optional[bool] = None
    has_association_agreement: Optional[bool] = None
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic will model | JSONB section columns per scenario | Phase 3 (established) | Each scenario adds columns, not tables |
| Hardcoded will sections | Dynamic sections based on scenario detection | Phase 4 (this phase) | Wizard adapts to user's situation |
| Joint wills as standard recommendation | Mirror wills preferred; joint wills with warnings | Modern SA estate practice | Joint will irrevocability is widely discouraged |
| CC member interests treated like shares | Distinct handling with s35 consent caveat | CC Act requirements | Must warn about member consent requirement |
| Trust as separate legal document | Testamentary trust embedded in will | Standard SA practice | Single document, trust activates on death |

**Key SA legal context:**
- Testamentary trusts: Governed by Trust Property Control Act 57 of 1988, registered with Master of High Court after death. The will IS the trust document.
- Usufruct: Roman-Dutch law concept. Usufructuary has right to use and enjoy, NOT own. Must maintain property and pay rates/taxes.
- Fideicommissum: Different from usufruct — conditional ownership. OUT OF SCOPE for this phase (too complex, recommend attorney).
- CC member interests: Close Corporations Act 69 of 1984, s35 requires remaining member consent for transfer to heir.
- Joint wills: Comply with Wills Act 7 of 1953. Binding after first death; surviving spouse bound by doctrine of election.

## SA Legal Domain Knowledge

### Testamentary Trust Essentials (Confidence: MEDIUM)

1. **Minor children cannot inherit directly** in SA law — inheritance must be held in trust or paid to Guardian's Fund
2. Trust comes into existence on testator's death when estate is wound up
3. Trustee must obtain written authorisation from Master of High Court before acting
4. No fees for testamentary trust registration — the will serves as the trust document
5. Standard vesting ages: 18 (legal majority), 21, or 25 (common for significant estates)
6. Trust Property Control Act 57 of 1988 governs administration
7. Income trust vs capital trust distinction matters for tax — but tax advice is OUT OF SCOPE (attorney required)

### Usufruct Essentials (Confidence: MEDIUM)

1. Usufructuary has right to USE and ENJOY, not own
2. Bare dominium (actual ownership) passes to children/remainder beneficiaries immediately
3. Usufructuary must maintain property and pay rates/taxes
4. Usufructuary CANNOT sell or mortgage independently
5. If usufructuary makes improvements, no compensation for them
6. Terminates on usufructuary's death (or specified event)
7. Distinct from fideicommissum where the fiduciary IS the conditional owner

### Business Asset Essentials (Confidence: MEDIUM)

1. CC member interest: s35 Close Corporations Act requires remaining member consent for transfer
2. Consent must be given within 28 days
3. If consent refused, executor must sell the interest
4. Association Agreement can pre-authorise succession — ask about this
5. Buy-sell agreements (funded by life insurance) are common but separate from the will
6. Company shares (Pty Ltd): transfer governed by company MOI and Shareholders Agreement
7. Partnership interest: governed by partnership agreement terms

### Joint/Mutual Will Essentials (Confidence: MEDIUM)

1. Joint will = single document, two testators (usually spouses)
2. Mutual will = testators benefit each other (subset of joint)
3. Mirror will = two SEPARATE but identical wills (NOT a joint will)
4. After first death, surviving spouse who accepts benefits is bound (doctrine of election)
5. Surviving spouse typically CANNOT change terms after accepting benefits
6. Estate planners increasingly recommend mirror wills over joint wills
7. Massing of estates = combining assets into single pool — complex implications
8. Both testators must sign; two witnesses required (same as all SA wills)

### Blended Family Essentials (Confidence: MEDIUM)

1. Step-children have NO automatic inheritance rights under intestate succession
2. Must be explicitly named as beneficiaries in the will
3. Testamentary trust is often recommended to protect both biological and step-children
4. Usufruct can protect surviving spouse while preserving biological children's inheritance
5. Prenuptial/postnuptial agreements interact with will provisions — but are OUT OF SCOPE
6. "Adiation" (acceptance/rejection of inheritance) applies to all beneficiaries

## UPL Filter Considerations

The existing UPL filter patterns need extension for Phase 4:

1. **Trust tax advice** triggers REFER: patterns like "estate duty on trust", "trust tax implications", "section 7C"
2. **Business valuation** triggers REFER: "business valuation", "fair market value of member interest"
3. **Fideicommissum advice** triggers REFER: complex instrument requiring attorney
4. **Joint will legal opinion** triggers REFER: "should you choose joint or separate", "which type of will is better"

New attorney-required patterns to add:
```python
_ATTORNEY_REQUIRED_PATTERNS.extend([
    ("trust_tax", re.compile(r"trust\s+(?:tax|duty|estate\s+duty)", re.IGNORECASE)),
    ("fideicommissum", re.compile(r"fideicommiss", re.IGNORECASE)),
    ("business_valuation", re.compile(r"business\s+(?:valuation|fair\s+market\s+value)", re.IGNORECASE)),
    ("complex_trust", re.compile(r"(?:special|discretionary|inter\s+vivos)\s+trust", re.IGNORECASE)),
])
```

## Open Questions

Things that couldn't be fully resolved:

1. **Attorney-approved clause text**
   - What we know: All existing clauses are placeholders. Phase 4 adds 4+ more placeholder clauses.
   - What's unclear: When will attorney review happen? This blocks production use.
   - Recommendation: Continue with placeholder clauses, prominently mark them, and ensure the architecture supports easy clause updates via the versioning system already in place.

2. **Joint will vs mirror will UX flow**
   - What we know: Joint will = 1 document, 2 testators. Mirror will = 2 separate documents.
   - What's unclear: Should mirror wills generate TWO separate will records (one per spouse), or one will record with a "mirror" flag? Mirror wills are technically separate legal documents.
   - Recommendation: For v1, implement joint will (single document) and mirror will as two separate will records with linked IDs. Add a `linked_will_id` field for mirror will pairing.

3. **Scope of "blended family" detection**
   - What we know: Step-children need explicit will provisions.
   - What's unclear: How deeply should the system probe for blended family complexity (prior marriages, children from different relationships, adopted step-children)?
   - Recommendation: Keep detection simple — if user indicates children from prior relationships, activate blended family guidance. Do NOT track adoption status or custody arrangements.

4. **Will type transitions**
   - What we know: Will starts as "basic" and may become "trust", "usufruct", or "joint" based on detected scenarios.
   - What's unclear: What happens when a will has BOTH trust AND usufruct provisions? Multiple types?
   - Recommendation: Use a `scenarios: list[str]` field rather than changing `will_type`. A will can have multiple active scenarios (e.g., ["testamentary_trust", "usufruct"]). Keep `will_type` for the primary classification but add a separate scenarios tracker.

5. **Co-testator authentication for joint wills**
   - What we know: Joint wills involve two testators.
   - What's unclear: Does the co-testator need their own account? Can one spouse fill in both sides?
   - Recommendation: For v1, allow one authenticated user to input both testators' details. The co-testator does not need a separate account. The platform collects information; the physical signing still requires both parties present with witnesses.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: Will model, Conversation model, Clause model, system prompts, extraction schemas, WillWizard, useWillStore, API endpoints — all files read directly
- Existing WillType enum already includes: BASIC, TRUST, USUFRUCT, JOINT
- Existing ClauseCategory enum already includes: TRUST, USUFRUCT
- Phase 3 architecture patterns verified from implemented code

### Secondary (MEDIUM confidence)
- [Burger Huyser Attorneys - Testamentary Trust Requirements](https://www.burgerhuyserattorneys.co.za/what-are-the-requirements-to-set-up-a-testamentary-trust-in-south-africa/) - Trust Property Control Act, Master registration, trustee requirements
- [SA Shares - Testamentary Trust Guide](https://sashares.co.za/testamentary-trust/) - Trust basics, minor inheritance rules
- [Eversheds Sutherland - Limited Rights to Property](https://www.eversheds-sutherland.com/en/south-africa/insights/limited-rights-to-property-in-will) - Usufruct vs fideicommissum distinction
- [Strachan Crouse - Usufructus and Fideicommissum](https://strachancrouse.co.za/news/what-does-usufructus-and-fideicommissum-mean-in-a-will) - Legal definitions
- [VDM Law - Joint Wills](https://www.vdm.law/legal-services/deceased-estates-trusts-and-wills/wills/joint-wills) - Joint will irrevocability, massing
- [HM Attorneys - Joint Wills](https://www.hmattorneys.co.za/what-is-a-joint-will-and-do-you-need-to-be-married-to-enter-into-one/) - Joint vs mutual distinction
- [Benaters Attorneys - CC Member Death](https://www.benaters.com/news-and-insights/2021/5/13/death-of-a-close-corporation-member-or-shareholder-of-a-private-company-pty-ltd-now-what) - CC Act s35, consent requirements
- [Engelsman Magabane - Blended Families](https://engelsman.co.za/blended-families-new-considerations-for-estate-planning-in-south-africa/) - Step-children inheritance, trust provisions
- [Mashitisho Attorneys - Estate Planning Blended Families](https://mashitishoattorneys.co.za/2023/06/07/blended-families-and-estate-planning/) - Blended family scenarios

### Tertiary (LOW confidence)
- None. All findings verified with at least one legal source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, extends proven Phase 3 patterns
- Architecture: HIGH - additive pattern on existing JSONB section model, verified from codebase
- SA legal domain: MEDIUM - verified via multiple SA legal sources, but clause text requires attorney approval
- Pitfalls: MEDIUM - based on domain research and legal source analysis

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, legal requirements don't change frequently)
