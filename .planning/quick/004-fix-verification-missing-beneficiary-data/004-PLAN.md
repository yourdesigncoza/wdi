---
phase: quick-004
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/app/services/conversation_service.py
  - backend/app/api/conversation.py
  - frontend/src/features/will/components/WillWizard.tsx
  - frontend/src/services/api.ts
autonomous: true
must_haves:
  truths:
    - "Beneficiary data from AI conversation is persisted to the will's beneficiaries JSONB column"
    - "All AI-driven section data (assets, guardians, executor, bequests, residue) is also persisted"
    - "Verification service reads non-empty beneficiaries from the will and does not report NO_BENEFICIARIES"
  artifacts:
    - path: "backend/app/services/conversation_service.py"
      provides: "Auto-extraction and save-to-will after each AI response"
    - path: "frontend/src/features/will/components/WillWizard.tsx"
      provides: "Trigger extraction+save when user leaves an AI chat section"
  key_links:
    - from: "conversation_service.py stream_ai_response"
      to: "will JSONB columns"
      via: "extract_and_save_to_will after each assistant response"
      pattern: "extract_data_from_conversation.*update_section|setattr.*will"
---

<objective>
Fix the broken data pipeline where AI-extracted will data (beneficiaries, assets, etc.) never gets persisted to the will's JSONB section columns, causing verification to always report "No Beneficiaries Nominated."

**Root cause:** The conversation service extracts structured data via OpenAI but only returns it -- it never writes to the will's JSONB columns. The frontend never calls the extraction endpoint either. So the will's `beneficiaries`, `assets`, `guardians`, `executor`, `bequests`, and `residue` columns remain as empty defaults `{}` / `[]` despite the AI conversation containing all the data.

**Fix strategy:** After each AI response completes (after UPL filtering), automatically extract structured data and persist it to the will's JSONB section columns. This is the most reliable approach -- data is continuously extracted and saved as the conversation progresses, so by the time the user reaches verification, the will columns are populated.

Purpose: Without this fix, verification will always fail for AI-driven sections because the will data is trapped in conversation history and never reaches the JSONB columns that verification reads.
Output: Working data pipeline from AI conversation -> extraction -> will JSONB columns.
</objective>

<execution_context>
@/home/laudes/.claude/get-shit-done/workflows/execute-plan.md
@/home/laudes/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@backend/app/services/conversation_service.py
@backend/app/services/verification_service.py
@backend/app/services/will_service.py
@backend/app/prompts/extraction.py
@backend/app/api/conversation.py
@frontend/src/features/will/components/WillWizard.tsx
@frontend/src/services/api.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Auto-extract and persist AI data to will JSONB after each response</name>
  <files>
    backend/app/services/conversation_service.py
  </files>
  <action>
Add auto-extraction and persistence to `stream_ai_response` in ConversationService.

1. Add WillService import and inject session dependency (ConversationService already has `self._session`).

2. After the assistant message is persisted (after `await self.add_message(conversation, "assistant", final_text)` on line ~199), add extraction+save logic:

```python
# Auto-extract structured data and persist to will JSONB
try:
    extracted = await self.extract_data_from_conversation(will_id, section)
    if extracted is not None:
        await self._save_extracted_to_will(will_id, section, extracted)
except Exception as exc:
    logger.warning("Auto-extraction failed for will %s section %s: %s", will_id, section, exc)
```

3. Add a new private method `_save_extracted_to_will` that maps extracted data to will JSONB columns:

```python
async def _save_extracted_to_will(
    self,
    will_id: uuid.UUID,
    section: str,
    extracted: ExtractedWillData,
) -> None:
    """Persist extracted conversation data to the will's JSONB section columns.

    Maps the flat ExtractedWillData fields to the correct will section column
    based on the current conversation section. Only updates if extracted data
    is non-empty to avoid overwriting existing data with blanks.
    """
    from app.models.will import Will

    stmt = select(Will).where(Will.id == will_id)
    result = await self._session.exec(stmt)
    will = result.first()
    if will is None:
        return

    changed = False

    # Map section -> extraction field -> will column
    # Each section extracts data relevant to that section
    if section == "beneficiaries" and extracted.beneficiaries:
        will.beneficiaries = [b.model_dump() for b in extracted.beneficiaries]
        changed = True
    elif section == "assets" and extracted.assets:
        will.assets = [a.model_dump() for a in extracted.assets]
        changed = True
    elif section == "guardians" and extracted.guardians:
        will.guardians = [g.model_dump() for g in extracted.guardians]
        changed = True
    elif section == "executor" and extracted.executor:
        will.executor = extracted.executor.model_dump()
        changed = True
    elif section == "bequests" and extracted.bequests:
        will.bequests = extracted.bequests
        changed = True
    elif section == "residue":
        # Residue doesn't have a dedicated extraction field yet,
        # but beneficiaries mentioned in residue context may appear in beneficiaries
        pass
    elif section == "trust" and extracted.trust:
        will.trust_provisions = extracted.trust.model_dump()
        changed = True
    elif section == "usufruct" and extracted.usufruct_data:
        will.usufruct = extracted.usufruct_data.model_dump()
        changed = True
    elif section == "business" and extracted.business_data:
        will.business_assets = [b.model_dump() for b in extracted.business_data]
        changed = True

    if changed:
        from datetime import datetime, timezone
        will.updated_at = datetime.now(timezone.utc)
        self._session.add(will)
        await self._session.flush()
        logger.info("Saved extracted %s data to will %s", section, will_id)
```

Note: The datetime import at module level already exists (line 13). Move the `from datetime import datetime, timezone` to the module-level imports instead of inline. Similarly, `Will` import and `select` import should be at module level (select is already imported on line 19, Will on line 25).

IMPORTANT: Do NOT touch or restructure the existing `stream_ai_response` flow. Only append the extraction call after the assistant message is saved, before the `done` event yield. This ensures extraction happens transparently without affecting the streaming UX.
  </action>
  <verify>
    - `python -c "from app.services.conversation_service import ConversationService"` succeeds (no import errors)
    - Grep for `_save_extracted_to_will` confirms the method exists
    - Grep for `extract_data_from_conversation` in `stream_ai_response` confirms the call is wired
  </verify>
  <done>
    After each AI response in stream_ai_response, the service automatically extracts structured data and writes it to the will's JSONB section column. Extraction failures are logged but do not break the conversation flow.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add fallback extraction trigger when user leaves AI section</name>
  <files>
    frontend/src/features/will/components/WillWizard.tsx
    frontend/src/services/api.ts
  </files>
  <action>
Add a belt-and-suspenders fallback: when the user clicks "Next Section" from an AI chat section, trigger a backend extraction+save call. This covers cases where auto-extraction in Task 1 might have missed data (e.g., if extraction failed on a particular message, or the user sent multiple messages building up context that only makes sense together).

1. In `frontend/src/services/api.ts`, add an `extractAndSave` function:

```typescript
/** Trigger AI extraction for a conversation section and save to will JSONB */
export function extractConversationData(
  willId: string,
  section: string,
): Promise<{ extracted: Record<string, unknown>; has_data: boolean }> {
  return request(`/conversation/${willId}/${section}/extract`, {
    method: 'POST',
  })
}
```

2. In `backend/app/api/conversation.py`, update the `extract_will_data` endpoint to also SAVE extracted data to the will's JSONB column (not just return it). After calling `service.extract_data_from_conversation(will_id, section)`, also call the save method:

```python
extracted = await service.extract_data_from_conversation(will_id, section)

if extracted is None:
    return ExtractionResponse(extracted={}, has_data=False)

# Persist extracted data to will JSONB columns
await service.save_extracted_to_will(will_id, section, extracted)

return ExtractionResponse(
    extracted=extracted.model_dump(),
    has_data=True,
)
```

This requires making `_save_extracted_to_will` public (rename to `save_extracted_to_will`) in ConversationService.

3. In `frontend/src/features/will/components/WillWizard.tsx`, update `handleNextSection` to trigger extraction before advancing:

```typescript
import { createWill, updateWillSection, extractConversationData } from '../../../services/api.ts'
```

Update `handleNextSection`:
```typescript
const handleNextSection = useCallback(async () => {
  // Trigger extraction for AI sections before advancing
  if (willId && AI_SECTIONS.has(currentSection)) {
    try {
      await extractConversationData(willId, currentSection)
    } catch (err) {
      console.error('Extraction failed, continuing anyway:', err)
    }
  }
  markSectionComplete(currentSection)
  const currentIndex = sections.findIndex((s) => s.key === currentSection)
  const nextIndex = currentIndex + 1
  if (nextIndex < sections.length) {
    setCurrentSection(sections[nextIndex].key)
  }
}, [currentSection, sections, markSectionComplete, setCurrentSection, willId])
```

This ensures that even if per-message auto-extraction missed something, the full conversation is re-extracted when the user explicitly moves to the next section.
  </action>
  <verify>
    - `cd /opt/lampp/htdocs/wdi/frontend && npx tsc --noEmit` passes (TypeScript compiles)
    - Grep for `extractConversationData` in WillWizard.tsx confirms the import and usage
    - Grep for `save_extracted_to_will` in conversation.py API confirms the save call
  </verify>
  <done>
    When user clicks "Next Section" from any AI chat section, extraction is triggered as a fallback. The extract endpoint now also persists data to the will JSONB column, not just returns it. Both auto-extraction (per message) and manual extraction (on section change) ensure data reaches the will columns before verification.
  </done>
</task>

</tasks>

<verification>
1. Start backend: `cd /opt/lampp/htdocs/wdi/backend && source venv/bin/activate && uvicorn app.main:app --reload`
2. Start frontend: `cd /opt/lampp/htdocs/wdi/frontend && npm run dev`
3. Navigate through will wizard to beneficiaries section
4. Chat with AI about a beneficiary (e.g., "I want to leave 80% to Sannie vd. Walt, my friend")
5. Click "Next Section" to advance
6. Navigate to verification and run verification
7. Verify that "No Beneficiaries Nominated" error no longer appears
8. Check backend logs for "Saved extracted beneficiaries data to will" log line
</verification>

<success_criteria>
- AI conversation data for beneficiaries (and all other AI sections) is persisted to the will's JSONB columns
- Verification reads populated beneficiaries data and does not report NO_BENEFICIARIES error
- Extraction failures are logged but do not break conversation flow or section navigation
- Both auto-extraction (per message) and on-advance extraction ensure data integrity
</success_criteria>

<output>
After completion, create `.planning/quick/004-fix-verification-missing-beneficiary-data/004-SUMMARY.md`
</output>
