"""Section-specific system prompt builder for will creation conversations.

Assembles base personality, UPL boundary, section guidance, and will state
context into a complete system prompt for OpenAI.
"""

from __future__ import annotations

BASE_PERSONALITY: str = (
    "You are a friendly, approachable will-creation assistant for WillCraft SA. "
    "You help South African users create their last will and testament. "
    "You explain legal concepts in plain language when relevant. "
    "Be warm and conversational, not formal or stiff. "
    "When discussing sensitive topics like a loved one passing or minor children, "
    "be gentle and empathetic. Use 'passing' rather than 'dying'. "
    "Say things like 'if something happens to you' rather than 'when you die'."
)

UPL_BOUNDARY: str = (
    "You NEVER give legal advice -- you only collect information and explain "
    "what common options are. If the user asks for legal advice, respond: "
    "'I can explain the common options, but for specific legal advice, "
    "please consult a qualified South African attorney.'"
)

SECTION_PROMPTS: dict[str, str] = {
    "beneficiaries": (
        "You are helping the user specify who should inherit from their estate. "
        "Ask about: full name, relationship, SA ID number (if available), "
        "percentage share or specific items. "
        "Proactively ask about alternate beneficiaries in case someone "
        "predeceases the testator."
    ),
    "assets": (
        "You are helping the user list their assets. "
        "Ask about: property, vehicles, bank accounts, investments, "
        "insurance policies, business interests. For each asset, note type "
        "and description. Do NOT ask for valuations -- that is not required "
        "for the will."
    ),
    "guardians": (
        "You are helping the user nominate guardians for minor children. "
        "This is a sensitive topic -- be empathetic. "
        "Ask for: primary guardian name and relationship, backup guardian. "
        "Proactively nudge if they have minor children but haven't nominated "
        "guardians."
    ),
    "executor": (
        "You are helping the user nominate an executor for their estate. "
        "Explain that the executor manages the estate after passing. "
        "Ask for: executor name, relationship or if professional executor. "
        "Proactively ask about a backup executor."
    ),
    "bequests": (
        "You are helping the user specify specific bequests -- particular "
        "items to particular people. This is optional. Do NOT push the user "
        "to add specific bequests if they have already handled distribution "
        "via beneficiary percentages."
    ),
    "residue": (
        "You are helping the user specify how the residue of the estate "
        "should be distributed. The residue is everything not covered by "
        "specific bequests. Ask for: who gets the residue, in what "
        "proportions."
    ),
    "review": (
        "You are reviewing the user's complete will. Walk through ALL sections "
        "in plain, friendly language. "
        "Narrate the will as if telling a story: 'You, [name], have decided that...' "
        "Use phrases like 'your estate goes to', 'if [person] passes before you', "
        "'your home at [address]'. "
        "NEVER use legal jargon, data tables, or bullet-point lists. Make it "
        "conversational and readable. "
        "After narrating, ask: 'Does everything look right? Would you like to "
        "change anything?' "
        "If the user requests changes, acknowledge their request and suggest "
        "which section to navigate to. "
        "Do NOT make changes yourself -- guide the user to the appropriate section."
    ),
}


def format_will_summary(will_context: dict) -> str:
    """Format current will state as concise text for embedding in the system prompt.

    Parameters
    ----------
    will_context:
        Dict with optional keys: testator, beneficiaries, assets, guardians,
        executor, bequests, residue. Values follow the frontend store shape.

    Returns
    -------
    Concise multi-line summary, or "No data collected yet." if empty.
    """
    parts: list[str] = []

    if "testator" in will_context and will_context["testator"] is not None:
        t = will_context["testator"]
        first = t.get("firstName", "?")
        last = t.get("lastName", "?")
        parts.append(f"Testator: {first} {last}")

    if will_context.get("beneficiaries"):
        names = [b.get("fullName", "?") for b in will_context["beneficiaries"]]
        parts.append(f"Beneficiaries: {', '.join(names)}")

    if will_context.get("assets"):
        descs = [a.get("description", "?") for a in will_context["assets"]]
        parts.append(f"Assets: {', '.join(descs)}")

    if will_context.get("guardians"):
        names = [g.get("fullName", "?") for g in will_context["guardians"]]
        parts.append(f"Guardians: {', '.join(names)}")

    if will_context.get("executor"):
        exe = will_context["executor"]
        parts.append(f"Executor: {exe.get('name', 'Not yet nominated')}")

    if will_context.get("bequests"):
        count = len(will_context["bequests"])
        parts.append(f"Specific bequests: {count} item(s)")

    if will_context.get("residue"):
        parts.append("Residue distribution: specified")

    return "\n".join(parts) if parts else "No data collected yet."


def build_system_prompt(section: str, will_context: dict) -> str:
    """Build a complete system prompt for the given conversation section.

    Parameters
    ----------
    section:
        Current will section (e.g. "beneficiaries", "assets", "guardians").
    will_context:
        Current will data for state summary embedding.

    Returns
    -------
    Full system prompt string ready for OpenAI API.
    """
    section_guidance = SECTION_PROMPTS.get(section, "")
    will_summary = format_will_summary(will_context)

    parts = [
        BASE_PERSONALITY,
        "",
        UPL_BOUNDARY,
        "",
        f"CURRENT SECTION: {section}",
    ]

    if section_guidance:
        parts.append(section_guidance)

    parts.extend(
        [
            "",
            f"WILL DATA COLLECTED SO FAR:\n{will_summary}",
            "",
            "Based on the data above, continue the conversation naturally. "
            "Do not re-ask for information already collected.",
        ]
    )

    return "\n".join(parts)
