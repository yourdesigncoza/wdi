"""Verification prompt builder and SA Wills Act rule definitions.

Defines verification rules organized by severity, attorney referral triggers,
and builds a complete system instruction for Gemini structured output
verification of SA will data.
"""

from __future__ import annotations

import json

# ── SA Wills Act Verification Rules ──────────────────────────────────
# Organized by severity. Each rule has a code, description, and check guidance.

VERIFICATION_RULES: dict[str, dict[str, str]] = {
    # ── Errors (block PDF generation) ────────────────────────────
    "error": {
        "MISSING_TESTATOR": (
            "Testator personal details incomplete. "
            "Full name, SA ID number (13 digits), and residential address are required."
        ),
        "INVALID_ID_NUMBER": (
            "SA ID number must be exactly 13 digits and pass the Luhn check algorithm. "
            "Verify the ID number is correctly entered."
        ),
        "TESTATOR_UNDER_16": (
            "Per the Wills Act s4, the testator must be 16 years or older to make a valid will. "
            "Check the date of birth derived from the ID number."
        ),
        "NO_BENEFICIARIES": (
            "The will must nominate at least one beneficiary to inherit from the estate."
        ),
        "NO_EXECUTOR": (
            "The will must nominate an executor to administer the estate after the testator's passing."
        ),
        "NO_RESIDUE_CLAUSE": (
            "The will must specify how the residue of the estate (everything not specifically bequeathed) "
            "should be distributed. Without this, intestate succession rules may apply to the remainder."
        ),
        "PERCENTAGES_EXCEED_100": (
            "The total percentage allocated to beneficiaries in any single distribution category "
            "exceeds 100%. Verify that share percentages are correct."
        ),
        "RESIDUE_PERCENTAGES_INVALID": (
            "The residue distribution percentages must sum to exactly 100%. "
            "Check that all residue beneficiary shares add up correctly."
        ),
        "MINOR_NO_PROVISION": (
            "A minor beneficiary (under 18) is inheriting without a testamentary trust provision "
            "or guardian nomination. In SA law, minors cannot inherit directly -- assets must be "
            "held in trust or paid into the Guardian's Fund."
        ),
    },
    # ── Warnings (need user acknowledgment) ──────────────────────
    "warning": {
        "NO_BACKUP_EXECUTOR": (
            "No alternate/backup executor has been nominated. If the primary executor is unable "
            "or unwilling to act, the Master of the High Court will appoint one."
        ),
        "NO_ALTERNATE_BENEFICIARY": (
            "No alternate beneficiary has been specified for one or more primary beneficiaries. "
            "If a beneficiary predeceases the testator, their share may fall into the residue "
            "or be distributed via intestate succession."
        ),
        "NO_GUARDIANS_WITH_MINORS": (
            "The testator has minor children but has not nominated guardians. "
            "Without a guardian nomination, the court will decide who cares for the children."
        ),
        "COMMUNITY_PROPERTY_HALF": (
            "The testator is married in community of property. Only the testator's half of the "
            "joint estate can be bequeathed. The other half belongs to the surviving spouse by law "
            "(Matrimonial Property Act)."
        ),
        "JOINT_WILL_IRREVOCABLE": (
            "A joint will becomes effectively irrevocable after the first spouse's death (s2B Wills Act). "
            "The surviving spouse cannot change the mutually agreed terms. Consider whether separate "
            "mirror wills may be more appropriate."
        ),
        "NO_SIMULTANEOUS_DEATH": (
            "No provision has been made for the simultaneous death of spouses. "
            "Without this clause, the order of death may affect how the estate is distributed."
        ),
        "BUSINESS_NO_BUY_SELL": (
            "Business assets are listed but there is no reference to a buy-sell agreement or "
            "succession plan. Business interests may require consent from remaining members/shareholders "
            "to transfer (Close Corporations Act s35)."
        ),
    },
    # ── Info (helpful tips, non-blocking) ────────────────────────
    "info": {
        "RECOMMEND_PROFESSIONAL_EXECUTOR": (
            "The estate appears large or complex. A professional executor (attorney, bank, or "
            "trust company) may be beneficial for efficient estate administration."
        ),
        "TRUST_VESTING_AGE": (
            "The trust vesting age determines when beneficiaries receive assets outright. "
            "Common choices are 18 (legal majority), 21, or 25. Consider the maturity level "
            "needed to manage the inheritance responsibly."
        ),
        "KEEP_WILL_UPDATED": (
            "Wills should be reviewed and updated after major life events such as marriage, "
            "divorce, birth of children, acquisition of significant assets, or death of a "
            "nominated beneficiary or executor."
        ),
    },
}


# ── Attorney Referral Triggers ───────────────────────────────────────
# Conditions that trigger an attorney consultation recommendation.
# These are non-blocking -- the user can proceed, but we recommend
# professional advice for these scenarios.

ATTORNEY_REFERRAL_TRIGGERS: list[dict[str, str]] = [
    # Complex scenarios
    {
        "trigger": "testamentary_trust",
        "description": "Testamentary trust provisions detected",
        "detail": "Trust structures involve ongoing fiduciary duties and tax implications.",
    },
    {
        "trigger": "usufruct",
        "description": "Usufruct provisions detected",
        "detail": "Usufruct creates split ownership (use rights vs bare dominium) with legal obligations.",
    },
    {
        "trigger": "business_succession",
        "description": "Business assets require succession planning",
        "detail": "Business interests may need buy-sell agreements, valuation, and transfer procedures.",
    },
    {
        "trigger": "international_assets",
        "description": "International or cross-border assets mentioned",
        "detail": "International assets may involve foreign succession laws and tax treaties.",
    },
    {
        "trigger": "disinheriting_dependents",
        "description": "Potential disinheritance of dependents detected",
        "detail": "Dependents may have claims under the Maintenance of Surviving Spouses Act.",
    },
    # Unusual patterns
    {
        "trigger": "unequal_distribution",
        "description": "Very unequal distribution to a single non-family beneficiary",
        "detail": "Distributions exceeding 80% to a single non-family member may invite legal challenges.",
    },
    {
        "trigger": "no_family_beneficiaries",
        "description": "No family members among beneficiaries",
        "detail": "Leaving everything to non-family may be challenged by dependents or family members.",
    },
    {
        "trigger": "no_executor",
        "description": "No executor nominated despite will completion",
        "detail": "The Master will appoint an executor, which may not align with the testator's wishes.",
    },
    {
        "trigger": "large_complex_estate",
        "description": "Estate appears large or complex based on asset descriptions",
        "detail": "Large estates may have estate duty, CGT, and liquidity implications.",
    },
]


# ── Prompt Builder ───────────────────────────────────────────────────


def _format_rules_for_prompt() -> str:
    """Format all verification rules into a prompt-ready string."""
    sections: list[str] = []

    severity_labels = {
        "error": "ERRORS (must block will generation -- severity: error)",
        "warning": "WARNINGS (need user acknowledgment -- severity: warning)",
        "info": "INFO (helpful tips -- severity: info)",
    }

    for severity, label in severity_labels.items():
        rules = VERIFICATION_RULES[severity]
        lines = [f"### {label}"]
        for code, description in rules.items():
            lines.append(f"- **{code}**: {description}")
        sections.append("\n".join(lines))

    return "\n\n".join(sections)


def _format_referral_triggers_for_prompt() -> str:
    """Format attorney referral triggers into a prompt-ready string."""
    lines = ["### ATTORNEY REFERRAL TRIGGERS"]
    lines.append(
        "Flag (do NOT block) when any of these conditions are detected:"
    )
    for trigger in ATTORNEY_REFERRAL_TRIGGERS:
        lines.append(f"- **{trigger['trigger']}**: {trigger['description']} -- {trigger['detail']}")
    return "\n".join(lines)


def build_verification_prompt(will_data: dict) -> str:
    """Build a complete system instruction for Gemini will verification.

    Parameters
    ----------
    will_data:
        The full will JSONB data as a dict. Keys correspond to will section
        columns: testator, marital, beneficiaries, assets, guardians, executor,
        bequests, residue, trust_provisions, usufruct, business_assets,
        joint_will, scenarios.

    Returns
    -------
    Complete system instruction string for Gemini, including all verification
    rules, the will data to analyze, and structured output instructions.
    """
    rules_text = _format_rules_for_prompt()
    referral_text = _format_referral_triggers_for_prompt()
    will_json = json.dumps(will_data, indent=2, default=str)

    return f"""You are a South African will data verification system.

Your task is to verify the provided will data for COMPLETENESS, CONSISTENCY, and COMPLIANCE with South African law. You check whether all required data has been collected and is internally consistent.

IMPORTANT: You are NOT providing legal advice. You are verifying data completeness and consistency. You identify issues for the user to address. Use neutral, factual language. When recommending professional help, say: "We recommend consulting a qualified attorney."

## VERIFICATION SCOPE

You must check three categories:

1. **COMPLETENESS** -- Are all required sections and fields filled in?
   - testator: firstName, lastName, idNumber (13 digits), dateOfBirth, address, province required
   - beneficiaries: at least 1 beneficiary with fullName and relationship
   - executor: name is required
   - residue: at least 1 residue beneficiary with distribution specified
   - guardians: required if any beneficiary is marked as a minor
   - assets: recommended but not strictly required

2. **CONSISTENCY** -- Does the data across sections make sense together?
   - Beneficiary share percentages in any category should not exceed 100%
   - Residue distribution percentages should sum to exactly 100%
   - If married in community of property, only half the joint estate is disposable
   - Minor beneficiaries should have corresponding trust provisions or guardian nominations
   - Business assets should be consistent with assets listed as type "business"
   - Joint will co-testator details should match spouse from marital section
   - Simultaneous death clause should be present if both spouses are testators

3. **SA WILLS ACT COMPLIANCE** -- Does the data comply with SA law requirements?
   - Testator must be 16+ years old (Wills Act s4)
   - SA ID number must be 13 digits (validate format)
   - Joint will irrevocability warning (s2B Wills Act)
   - Community of property constraints (Matrimonial Property Act)

## VERIFICATION RULES

{rules_text}

## ATTORNEY REFERRAL EVALUATION

{referral_text}

Set `attorney_referral.recommended` to true if ANY trigger condition is detected.
Include all matching trigger descriptions in the `reasons` list.

## SECTION NAMES

Use these exact section identifiers in your results:
testator, marital, beneficiaries, assets, guardians, executor, bequests, residue, trust, usufruct, business, joint

Only include sections in your results that are relevant to the will data provided.
At minimum, always evaluate: testator, beneficiaries, executor, residue.

## OUTPUT INSTRUCTIONS

Return a structured JSON result with:
- `overall_status`: "pass" if no issues, "warning" if worst issue is warning/info, "error" if any error exists
- `sections`: list of per-section results, each with section name, status, and list of issues
- `attorney_referral`: whether attorney consultation is recommended and why
- `summary`: one paragraph summarizing the verification findings in plain, friendly language

For each issue, provide:
- `code`: the exact rule code from the rules above (e.g. "MISSING_TESTATOR")
- `severity`: "error", "warning", or "info"
- `section`: which section the issue relates to
- `title`: a short, clear title (e.g. "Testator Details Incomplete")
- `explanation`: a plain-language explanation of why this matters
- `suggestion`: what the user should do to fix it

## WILL DATA TO VERIFY

```json
{will_json}
```

Analyze the above will data against all rules and return your structured verification result."""
