# Map Legacy Form Fields to Phase 3 AI Conversation

**Area:** phase-3-conversation
**Priority:** high
**Created:** 2026-02-06

## Description

Map the legacy app's 10-section form fields and IF/While Not conditional branching logic into the Phase 3 AI conversation design. The legacy flow is the domain knowledge baseline for what a South African will must capture.

## Legacy Sections to Map

1. **Personal Details** — name, ID, contact, address
2. **Marital Status** — single/married ANC/COP/divorced/widower + spouse details if married
3. **Executors** — up to 3, own vs listed executor
4. **Dependants/Children** — repeatable (max 15), name/relationship/DOB
5. **Legacies** — specific bequests (person + asset), repeatable
6. **Pet Care** — legatee for pets, monetary benefit
7. **Estate Division** — 4 bequest scenarios incl. simultaneous death clause
8. **Trust for Minor Children** — trustees (min 3) + 14 power checkboxes + age cutoff
9. **Guardians** — for minor children, repeatable
10. **Special Requests** — cremation, living will, organ donation, custom requests

## Conditional Logic to Preserve

- Married? → spouse details
- Married outside SA? → country selector
- Own vs listed executor? → different fields
- Have pets? → pet legatee section
- Trust for minors? → trustees + powers section
- Cremation? → ashes instructions
- Living will? → next of kin + GP details
- Organ donation? → yes/no

## Action

Use this as a checklist when planning Phase 3 (Core Will Conversation) and Phase 4 (Complex Estate Scenarios) to ensure the AI conversational flow captures every data point the legacy form collected.
