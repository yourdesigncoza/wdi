# Key Facts & Configuration

## Environment Variables (backend/.env)

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL async connection string | Yes |
| `SECRET_KEY` | JWT signing key | Yes |
| `OPENAI_API_KEY` | OpenAI API for conversation + extraction | Yes |
| `GEMINI_API_KEY` | Gemini API for verification | Yes |

## AI Models

| Service | Model | Temperature | Purpose |
|---------|-------|-------------|---------|
| Conversation | gpt-4o-mini | 0.7 | Natural language will chat |
| Extraction | gpt-4o-mini | 0.2 | Structured data extraction from conversation |
| Verification (primary) | gemini-2.5-flash | 0.1 | SA Wills Act compliance checking |
| Verification (fallback) | gpt-4o-mini | 0.1 | Fallback if Gemini unavailable |

## Extraction Pipeline

1. **Auto-extraction (per message):** After each AI response in `stream_ai_response`, extract structured data and persist to will JSONB column
2. **Fallback extraction (on advance):** When user clicks "Next Section", triggers POST to extract endpoint which also persists
3. **Pre-verification extraction:** `_extract_missing_sections` runs before verification for any AI sections with empty JSONB columns

## Extraction Schema Models

All types in `ExtractedWillData` must be explicit Pydantic BaseModel classes (no bare `dict`):
- `ExtractedBeneficiary`, `ExtractedAsset`, `ExtractedGuardian`, `ExtractedExecutor`
- `ExtractedBequest`, `ExtractedResidueData`, `ExtractedResidueBeneficiary`
- `ExtractedTrustData`, `ExtractedTrustee`, `ExtractedUsufructData`, `ExtractedBareDominiumHolder`
- `ExtractedBusinessData`

## Will Section -> JSONB Column Mapping

| Section | Will Column | Type | Extraction Field |
|---------|------------|------|------------------|
| beneficiaries | `beneficiaries` | `list` | `extracted.beneficiaries` |
| assets | `assets` | `list` | `extracted.assets` |
| guardians | `guardians` | `list` | `extracted.guardians` |
| executor | `executor` | `dict` | `extracted.executor` |
| bequests | `bequests` | `list` | `extracted.bequests` |
| residue | `residue` | `dict` | `extracted.residue` |
| trust | `trust_provisions` | `dict` | `extracted.trust` |
| usufruct | `usufruct` | `dict` | `extracted.usufruct_data` |
| business | `business_assets` | `list` | `extracted.business_data` |
