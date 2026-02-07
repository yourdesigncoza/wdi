---
phase: quick
plan: 006
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/app/prompts/verification.py
autonomous: true

must_haves:
  truths:
    - "Gemini verification no longer rejects valid SA ID numbers due to Luhn check failures"
    - "SA ID format validation still enforced: 13 digits, valid YYMMDD date, valid citizenship digit"
  artifacts:
    - path: "backend/app/prompts/verification.py"
      provides: "Updated INVALID_ID_NUMBER rule without Luhn requirement"
      contains: "INVALID_ID_NUMBER"
  key_links:
    - from: "backend/app/prompts/verification.py"
      to: "Gemini AI verification"
      via: "build_verification_prompt"
      pattern: "INVALID_ID_NUMBER"
---

<objective>
Fix SA ID number verification by removing the Luhn check algorithm requirement from the AI verification prompt.

Purpose: LLMs cannot reliably perform arithmetic operations like Luhn checksums. Gemini rejects valid SA ID numbers because it miscalculates the checksum. The ID format checks (13 digits, valid date, valid citizenship digit) are sufficient for AI-level validation. If deterministic Luhn validation is needed later, it belongs in Python code, not an AI prompt.

Output: Updated verification prompt that validates SA ID format without requiring Luhn computation.
</objective>

<execution_context>
@/home/laudes/.claude/get-shit-done/workflows/execute-plan.md
@/home/laudes/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@backend/app/prompts/verification.py
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove Luhn check from INVALID_ID_NUMBER rule and verification scope</name>
  <files>backend/app/prompts/verification.py</files>
  <action>
    In `VERIFICATION_RULES["error"]["INVALID_ID_NUMBER"]` (line 22-25), replace the current text:

    FROM:
    "SA ID number must be exactly 13 digits and pass the Luhn check algorithm. "
    "Verify the ID number is correctly entered."

    TO:
    "SA ID number must be exactly 13 digits with valid format: "
    "digits 1-6 must form a valid date (YYMMDD), digit 11 must be 0 (SA citizen) "
    "or 1 (permanent resident). Check that the ID number matches this format."

    Also in `build_verification_prompt` verification scope section (line 249), the text already says
    "SA ID number must be 13 digits (validate format)" which is correct -- no change needed there.

    Do NOT add any deterministic Luhn validation in Python in this task. That is a separate concern for a future task if needed.
  </action>
  <verify>
    1. `grep -n "Luhn" backend/app/prompts/verification.py` returns NO matches
    2. `grep -n "INVALID_ID_NUMBER" backend/app/prompts/verification.py` returns the updated rule text
    3. `grep -n "YYMMDD" backend/app/prompts/verification.py` returns the new format description
    4. `python -c "import backend.app.prompts.verification as v; print(v.VERIFICATION_RULES['error']['INVALID_ID_NUMBER'])"` prints the new rule text without Luhn mention
  </verify>
  <done>
    INVALID_ID_NUMBER rule text describes format-only validation (13 digits, valid YYMMDD date, valid citizenship digit). No mention of Luhn check algorithm anywhere in verification.py. The prompt still catches genuinely malformed ID numbers but no longer asks the AI to perform arithmetic it cannot reliably do.
  </done>
</task>

</tasks>

<verification>
- No occurrence of "Luhn" in backend/app/prompts/verification.py
- INVALID_ID_NUMBER rule still exists and checks 13-digit format, YYMMDD date portion, citizenship digit
- build_verification_prompt() still generates a valid prompt string without errors
- Backend server starts without import errors
</verification>

<success_criteria>
The verification prompt no longer asks Gemini to compute Luhn checksums on SA ID numbers. Valid SA IDs that pass format checks will no longer be incorrectly rejected by AI arithmetic errors.
</success_criteria>

<output>
After completion, create `.planning/quick/006-fix-sa-id-luhn-verification/006-SUMMARY.md`
</output>
