# Feature Landscape: Online Will-Generation Platform (South Africa)

**Domain:** AI-powered online will-generation platform
**Market:** South Africa
**Researched:** 2026-02-05
**Confidence:** MEDIUM (based on competitor analysis and regulatory research)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Basic will creation** | Core product purpose | Medium | None | Questionnaire-based, covers spouse, children, assets, debts |
| **PDF generation** | SA Wills Act requires physical signing | Low | Will creation | Printable, professional formatting |
| **Witness signing instructions** | SA law requires wet-ink + 2 witnesses | Low | PDF generation | Clear, step-by-step guide included in download |
| **Beneficiary designation** | Fundamental will purpose | Low | Will creation | Named individuals or charities |
| **Asset inventory** | Users need to list what they're bequeathing | Medium | None | Property, vehicles, bank accounts, investments |
| **Guardian nomination** | Expected for users with minor children | Low | Will creation | Primary + backup guardian options |
| **Executor nomination** | Required for estate administration | Low | Will creation | Can be individual or professional service |
| **Unlimited updates** | Life changes; will must evolve | Low | Account system | LegalWills.co.za offers this as standard |
| **Mobile responsive** | 60%+ SA users access via mobile | Low | Frontend | Not just responsive - usable on small screens |
| **Secure data storage** | POPIA compliance mandatory | Medium | Infrastructure | Encryption at rest, access controls |
| **Account system** | Users expect to return and update | Low | Database | Registration before/after will creation |
| **Basic validation** | Prevent obvious errors (blank fields, invalid dates) | Low | Will creation | Client-side + server-side validation |

### Legal Compliance Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **POPIA compliance** | Legal requirement, ZAR 10M penalty | Medium | Privacy policy, consent, data handling |
| **Wills Act compliance** | Document must be legally valid | Low | Signing instructions, witness requirements |
| **Information Officer** | POPIA requirement | Low | Designated person, published contact |
| **Data subject rights** | POPIA requirement | Medium | Access, correction, deletion requests |

---

## Differentiators

Features that set WillCraft SA apart. Not expected, but create competitive advantage.

### High-Value Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Conversational AI guide** | Reduces intimidation; explains as it goes | High | LLM integration | Natural language vs rigid questionnaire; handles "I don't know" gracefully |
| **Complex scenario handling** | Addresses gaps competitors miss | High | AI + legal logic | Blended families, multiple marriages, business assets, usufruct rights |
| **Testamentary trust creation** | Protect minor children's inheritance | High | Legal templates | Auto-generates trust provisions within will |
| **Usufruct provisions** | Common SA need (spouse keeps home, children inherit) | Medium | Legal templates | Proper legal language for Deeds Office registration |
| **Business asset guidance** | CC member interests, company shares, succession | High | AI + legal logic | Alerts to shareholder agreement needs |
| **Real-time explanations** | AI explains each concept in plain language | Medium | LLM integration | "What is an executor?" answered contextually |
| **Progress saving + resume** | Complex wills take multiple sessions | Low | Account system | Auto-save every answer |
| **Document preview** | See will before payment | Medium | PDF generation | Builds confidence before commitment |

### Medium-Value Differentiators

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Living will (advance directive)** | Health care decisions if incapacitated | Medium | Separate template | LegalWills offers at R499 extra |
| **Funeral wishes document** | Reduces family stress | Low | Separate template | Non-binding but helpful |
| **Digital asset inventory** | Modern need: passwords, accounts, crypto | Low | Vault feature | MyLifeLocker equivalent |
| **Keyholder mechanism** | Designated people unlock info on death | Medium | Account system | LegalWills' Keyholder feature |
| **Estate cost calculator** | DigiWill offers this; shows value of planning | Low | Calculator widget | Administration costs, executor fees |
| **Spouse joint will option** | Common request; married couples | Medium | Will creation | Shared or mutual wills |
| **Alternate beneficiaries** | "If X predeceases me, then Y" | Low | Will creation | Handles cascading inheritance |

### Lower-Priority Differentiators (Post-MVP)

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Attorney review add-on** | Professional validation for complex cases | Low (integration) | Partner network | LegalWills charges R999 for this |
| **Secure document vault** | Store related documents | Medium | Storage infrastructure | Insurance policies, property deeds |
| **Messages to beneficiaries** | Emotional value - letters to loved ones | Low | Account system | Released upon death notification |
| **Will validity checker** | AI reviews for common errors | Medium | LLM + rules engine | Post-creation quality check |
| **Multi-currency assets** | Expat South Africans, foreign property | Medium | Asset module | Cross-border estate considerations |

---

## Anti-Features

Features to deliberately NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Digital/electronic signatures** | SA Wills Act requires wet-ink signatures; digital invalid | Clear instructions for physical signing with witnesses |
| **Auto-filing with Master's Office** | Estate reporting requires physical documents; premature automation | Provide guidance, not automation |
| **"Free" will with forced executor** | Banks do this; feels deceptive; locks users in | Transparent pricing; users choose their own executor |
| **Overly complex onboarding** | Users abandon; 4-5 questions max before showing value | Progressive disclosure; start simple, add complexity when needed |
| **Legal advice claims** | Platform cannot provide legal advice; liability risk | "Guidance and document preparation" - clear disclaimers |
| **Real-time chat support (human)** | Expensive; 24/7 expectation; AI can handle most queries | AI-first support; email for complex issues |
| **Notarization services** | SA wills don't require notarization | Don't add unnecessary steps that confuse users |
| **Automated beneficiary notifications** | Privacy concerns; premature disclosure | Leave notification to executor/user discretion |
| **Social login only** | Email verification needed for legal documents | Email-based accounts with optional social linking |
| **Annual subscription model** | Feels exploitative for a one-time document | One-time fee + optional update periods (LegalWills model) |
| **Tax advice engine** | Requires professional qualification; liability | "Consult a tax advisor" disclaimers; general information only |
| **Blockchain will storage** | Gimmick; no legal standing; complicates execution | Standard encrypted cloud storage with redundancy |

---

## Feature Dependencies

```
Registration/Account System
    |
    +-- Will Creation Module
    |       |
    |       +-- Beneficiary Module
    |       +-- Asset Inventory Module
    |       +-- Guardian Nomination Module
    |       +-- Executor Nomination Module
    |       +-- [Advanced] Testamentary Trust Module
    |       +-- [Advanced] Usufruct Module
    |       +-- [Advanced] Business Assets Module
    |
    +-- PDF Generation Engine
    |       |
    |       +-- Document Preview
    |       +-- Signing Instructions
    |
    +-- Payment Gateway
    |       |
    |       +-- PDF Download (gated)
    |
    +-- AI Conversation Engine
            |
            +-- Context-aware explanations
            +-- Complex scenario handling
            +-- Error detection/validation
```

### Dependency Notes

1. **Will Creation Module must be built before advanced modules** - Testamentary trusts, usufruct, and business assets extend the core will structure
2. **PDF Generation critical path** - Users need to see and sign physical document; no value without this
3. **Payment gateway before download** - Revenue model depends on this gate
4. **AI can be layered progressively** - Start with scripted questionnaire, enhance with AI later

---

## MVP Recommendation

For MVP, prioritize:

### Must Have (Week 1-4)
1. **Basic will creation** - Questionnaire covering standard scenarios
2. **PDF generation with signing instructions** - Legally compliant output
3. **Registration + payment gate** - Revenue model
4. **POPIA compliance** - Legal requirement

### Should Have (Week 5-8)
5. **Guardian nomination** - High user expectation
6. **Unlimited updates** - Competitive necessity (LegalWills offers this)
7. **Mobile responsive** - SA market reality
8. **Progress saving** - Complex wills need multiple sessions

### Differentiator (Week 9-12)
9. **Conversational AI guide** - Key differentiator; makes complex accessible
10. **Real-time explanations** - Reduces abandonment

### Defer to Post-MVP
- Testamentary trust creation (complex legal templates needed)
- Usufruct provisions (requires Deeds Office coordination research)
- Business asset handling (need legal review)
- Living will / advance directive (separate document type)
- Document vault (infrastructure complexity)
- Attorney review integration (partner network needed)
- Estate cost calculator (nice-to-have)

---

## Competitor Feature Matrix

| Feature | LegalWills.co.za | DigiWill.co.za | Bank Services | WillCraft SA (Planned) |
|---------|------------------|----------------|---------------|------------------------|
| Basic will | Yes (R499-1,299) | Yes (Free) | Yes (Free*) | Yes |
| Living will | Yes (extra) | No | Some | Post-MVP |
| Testamentary trust | Limited | No | Yes (complex) | Yes (AI-assisted) |
| Usufruct provisions | Manual | No | Yes | Yes (AI-assisted) |
| Business assets | Limited | No | Yes | Yes (AI-assisted) |
| AI guidance | No | No | No | **Yes (Differentiator)** |
| Unlimited updates | Yes | Yes | Varies | Yes |
| Document vault | Yes | No | Some | Post-MVP |
| Estate calculator | No | Yes | No | Post-MVP |
| Executor services | Partner referral | Yes | Yes (tied) | Partner referral |
| Mobile optimized | Yes | Yes | Varies | Yes |

*Bank "free" wills typically require nominating bank as executor

---

## Pricing Context

| Competitor | Pricing Model | Notes |
|------------|---------------|-------|
| LegalWills.co.za | R499 basic, R1,299 premium | Plus annual renewal for updates |
| DigiWill.co.za | Free | Revenue from executor/insurance services |
| Capital Legacy | Free | Revenue from Legacy Protection Plan |
| Banks (Absa, FNB, Nedbank) | Free | Lock-in: must use bank as executor |
| Traditional attorneys | R1,500-5,000+ | Complex wills significantly more |

**Recommended positioning:** R499-999 range, one-time payment with optional update periods. Premium tier for complex scenarios (trusts, business assets, blended families).

---

## Sources

### South African Legal Requirements
- [Wills Act Formalities - SchoemanLaw](https://schoemanlaw.co.za/the-wills-act-formalities/)
- [Requirements for Valid Will - LexisNexis SA](https://www.lexisnexis.co.za/blogs-data/categories/rule-of-law/requirements-for-a-valid-will)
- [POPIA Compliance Guide](https://popia.co.za/)

### Competitor Analysis
- [LegalWills.co.za Features](https://www.legalwills.co.za/features)
- [DigiWill.co.za](https://www.digiwill.co.za/)
- [Capital Legacy](https://www.capitallegacy.co.za/)

### Domain-Specific Features
- [Testamentary Trusts - LegalWise](https://www.legalwise.co.za/help-yourself/legal-articles/testamentary-trusts-created-your-will)
- [Usufruct in SA Property Law - Barter McKellar](https://www.bartermckellar.law/property-law-explained/demystifying-usufruct-in-south-african-property-law-a-comprehensive-guide)
- [Guardian Nomination - LegalWills Blog](https://www.legalwills.co.za/blog/2016/09/21/guardian-children/)
- [Business Assets in Deceased Estates - Benaters](https://www.benaters.com/news-and-insights/2021/5/13/death-of-a-close-corporation-member-or-shareholder-of-a-private-company-pty-ltd-now-what)

### Industry Best Practices
- [Best Online Will Makers 2026 - NCOA](https://www.ncoa.org/product-resources/estate-planning/best-online-will-makers/)
- [Trust & Will Features](https://trustandwill.com/)
- [AI in Estate Planning Challenges - EncorEstate Study](https://www.citybiz.co/article/747000/encorestate-study-are-ai-chatbots-reliable-for-estate-planning)

### Pitfalls & Problems
- [Why Not to Trust Online Will Makers - Ridley Law](https://ridleylawoffices.com/three-reasons-not-do-your-will-and-trust-online-2/)
- [Potential Pitfalls of Online Wills - Timoney Knox](https://www.timoneyknox.com/should-you-prepare-your-own-will-online/)
