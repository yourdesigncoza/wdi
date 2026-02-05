# Domain Pitfalls: AI-Powered Will Generation (South Africa)

**Domain:** AI legal document generation (wills/estate planning)
**Jurisdiction:** South Africa
**Researched:** 2026-02-05
**Confidence:** HIGH (multiple authoritative sources, case law, regulatory guidance)

---

## Critical Pitfalls

Mistakes that cause regulatory action, lawsuits, invalid documents, or platform shutdown.

---

### Pitfall 1: Unauthorized Practice of Law (UPL) Violations

**What goes wrong:** Platform crosses the line from "document generation tool" into "legal advice provider." This triggers regulatory investigation, potential lawsuits from bar associations, and user lawsuits when advice proves wrong.

**Why it happens:**
- AI chatbots naturally drift toward giving personalized advice when users ask follow-up questions
- "Conversational" interfaces feel like consulting a lawyer
- Feature creep: adding "recommendations" or "suggestions" based on user input
- Developers don't understand where the legal line is drawn

**Consequences:**
- FTC enforcement action (see: DoNotPay paid $193,000 settlement in 2025)
- State bar complaints and injunctions
- Class action lawsuits from users
- Platform forced to shut down or drastically reduce features

**Warning signs:**
- AI says things like "You should..." or "I recommend..."
- Users treating platform outputs as final legal documents
- No attorney involved in any part of the process
- Marketing language implies attorney-level expertise

**Prevention:**
1. **Architectural constraint:** Every AI output passes through UPL filter before reaching user
2. **Language guardrails:** Hardcode prohibition of advice-giving language ("should," "recommend," "advise")
3. **Explicit framing:** Every interaction starts with "I help you fill out a template. This is not legal advice."
4. **Feature boundaries:** Never answer "what should I do?" questions - only "what information do you need?"
5. **Legal review:** Have a SA attorney review all prompts and outputs during development

**Phase to address:** Phase 1 (Foundation) - bake into architecture from day one

**Sources:**
- [FTC DoNotPay Order (Feb 2025)](https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires)
- [ABA: Re-Regulating UPL in the Age of AI](https://www.americanbar.org/groups/law_practice/resources/law-practice-magazine/2025/march-april-2025/re-regulating-upl-in-the-age-of-ai/)
- [Florida Bar v. TIKD Services LLC case](https://journals.library.columbia.edu/index.php/stlr/article/view/13336)

---

### Pitfall 2: AI Hallucinations in Legal Content

**What goes wrong:** AI generates incorrect legal clauses, wrong terminology, fabricated requirements, or misapplied legal concepts. User relies on these, document is invalid or creates unintended legal effects.

**Why it happens:**
- LLMs "confidently wrong" - present fabrications with same confidence as facts
- SA-specific law not well-represented in training data
- Model fills gaps with plausible-sounding but incorrect content
- No verification layer catches errors before output

**Consequences:**
- Invalid wills that fail probate
- Unintended beneficiaries or exclusions
- Estate disputes and litigation
- User financial losses
- Liability for platform (depending on disclaimer strength)

**Warning signs:**
- AI references "Section X" of acts without verification
- Generated clauses that don't match established templates
- Inconsistent terminology between outputs
- AI "explains" legal concepts in ways that sound reasonable but are wrong

**Prevention:**
1. **RAG architecture mandatory:** Never generate legal clauses freeform - always retrieve from verified clause library
2. **Dual-LLM verification:** Use second model specifically to verify first model's output against source clauses
3. **Human-approved clause library:** All legal text pre-approved by SA attorney, stored in database
4. **Constrained generation:** AI selects from options, never generates novel legal language
5. **Hallucination detection:** Flag any output containing unrecognized clause text for human review

**Phase to address:** Phase 1 (Foundation) - architecture must prevent freeform generation

**Sources:**
- [Stanford HAI: Legal AI Hallucination Rates (1 in 6 or more)](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries)
- [MyPillow case - $6,000 sanctions for AI-hallucinated citations](https://www.npr.org/2025/07/10/nx-s1-5463512/ai-courts-lawyers-mypillow-fines)
- [AI Hallucination Cases Database](https://www.damiencharlotin.com/hallucinations/)

---

### Pitfall 3: Electronic Signature / Wet-Ink Confusion

**What goes wrong:** Users believe their online-completed will is legally valid. They don't execute proper wet-ink signatures with witnesses. Will fails at probate.

**Why it happens:**
- Digital-native users assume e-signatures work for everything
- Platform doesn't adequately communicate execution requirements
- Completion flow feels "done" after online submission
- Users don't understand difference between "template complete" and "legally valid will"

**Consequences:**
- Wills rejected at probate (intestate succession applies)
- User's wishes not honored
- Family disputes
- Platform reputation destroyed
- Potential liability claims

**Warning signs:**
- User abandonment after PDF download (never returns)
- Support questions like "Is my will now legal?"
- No follow-up engagement for execution guidance
- Users sharing "completed" wills without proper signatures

**Prevention:**
1. **Execution flow mandatory:** Don't call it "complete" until user confirms physical execution
2. **Post-download engagement:** Email sequence guiding through printing, signing, witnessing
3. **Execution checklist:** Interactive checklist within platform tracking execution steps
4. **Clear status labels:** "Draft generated" vs "Awaiting execution" vs "Executed (self-reported)"
5. **Witness finder feature:** Help users locate witnesses (notaries, commissioners of oaths)
6. **Education content:** Prominent explainer on SA Wills Act requirements

**Phase to address:** Phase 2 (Core Product) - execution guidance is core feature, not afterthought

**Sources:**
- [Benaters: Signing a Will by Electronic Signature in SA](https://benaters.com/news-and-insights/can-a-will-be-signed-by-electronic-signature-in-south-africa)
- [SchoemanLaw: Wills Act Formalities Pitfalls](https://schoemanlaw.co.za/the-wills-act-formalities/)
- [Cliffe Dekker Hofmeyr: Invalid Electronic Wills](https://www.cliffedekkerhofmeyr.com/en/news/publications/2025/Practice/Trusts-Estates-Law/trusts-and-estates-law-alert-20-March-valid-or-not-valid-unsigned-electronic-wills-in-south-africa)

---

### Pitfall 4: POPIA Non-Compliance

**What goes wrong:** Platform collects sensitive personal data (family details, asset information, health status, relationships) without proper POPIA compliance. Information Regulator investigates, fines issued, possible criminal liability.

**Why it happens:**
- Will data is inherently sensitive (special personal information under POPIA)
- Developers focus on features, not compliance
- Third-party integrations (LLM APIs) create data transfer issues
- No Information Officer appointed
- No proper consent mechanisms

**Consequences:**
- Fines up to R10 million (~$550,000 USD)
- Criminal prosecution possible (POPIA includes imprisonment provisions)
- Mandatory breach notifications
- Reputation destruction
- Platform shutdown by regulator

**Warning signs:**
- No privacy policy or outdated one
- User data sent to offshore APIs without disclosure
- No data retention policy
- No breach response plan
- Users can't access/delete their data

**Prevention:**
1. **POPIA audit before launch:** Hire compliance specialist to review data flows
2. **Data minimization:** Only collect what's necessary, delete draft data promptly
3. **Consent architecture:** Granular, informed consent at each data collection point
4. **LLM data handling:** Ensure LLM providers don't train on user data, document data processing agreements
5. **Information Officer:** Appoint and register with Information Regulator
6. **Breach response plan:** Document procedures before you need them
7. **Data residency:** Prefer SA-based storage, document any cross-border transfers

**Phase to address:** Phase 1 (Foundation) - compliance architecture from start

**Sources:**
- [POPIA Official Site](https://popia.co.za/)
- [Information Regulator: Mandatory e-Portal Breach Reporting (April 2025)](https://www.insideprivacy.com/data-security/data-breaches/south-africa-introduces-mandatory-e-portal-reporting-for-data-breaches/)
- [Captain Compliance: POPIA Comprehensive Guide](https://captaincompliance.com/education/the-protection-of-personal-information-act-popia-a-comprehensive-guide-to-south-africas-data-privacy-regulation/)

---

## Moderate Pitfalls

Mistakes that cause technical debt, user churn, or significant rework.

---

### Pitfall 5: Complex Estate Oversimplification

**What goes wrong:** Platform attempts to handle complex estates (usufructs, trusts, multiple marriages, cross-border assets) with same simple flow as basic wills. Outputs are legally incorrect or dangerously incomplete.

**Why it happens:**
- Pressure to handle "edge cases" without building proper complexity
- Developers underestimate legal nuance
- AI appears to handle complexity (but generates plausible nonsense)
- No clear boundaries on what platform can/cannot handle

**Consequences:**
- Users with complex estates get invalid documents
- Usufruct clauses that create family disputes
- Trust provisions that conflict with Trust Property Control Act
- Estate duty implications users don't understand

**Warning signs:**
- Same question flow for R50K estate and R50M estate
- No triggers for "consult attorney" recommendations
- AI handling trust creation provisions
- Blended family scenarios treated like first marriage

**Prevention:**
1. **Complexity scoring:** Rate estate complexity early in questionnaire
2. **Hard boundaries:** Define what platform CANNOT handle (trusts, cross-border, business succession)
3. **Attorney handoff:** Build referral network for complex cases, earn referral fees
4. **Progressive disclosure:** Complex options only appear when user indicates need
5. **Prominent warnings:** Clear messaging when user's situation exceeds platform capability

**Phase to address:** Phase 2 (Core Product) - complexity boundaries define MVP scope

**Sources:**
- [STBB: Your Will and Usufructs](https://stbb.co.za/blog-your-will-and-usufructs/)
- [Dorcey Law: AI DIY Estate Planning Risks](https://www.dorceylaw.com/blog/2025/february/why-ai-driven-diy-estate-planning-can-put-your-l/)
- [Guideway Legal: AI Estate Planning Risks](https://guidewaylegal.com/ai-assisted-estate-planning-opportunities-and-risks-for-california-residents/)

---

### Pitfall 6: Multi-LLM Coordination Failures

**What goes wrong:** Using OpenAI for conversation and Gemini for verification creates coordination problems - inconsistent outputs, verification failures not properly handled, state synchronization issues.

**Why it happens:**
- Multi-agent architectures are inherently complex
- No standardized message protocols between models
- Verification model can't properly evaluate conversation model's reasoning
- Different models have different knowledge and biases
- Rate limiting and API failures create cascade effects

**Consequences:**
- Verification passes invalid content (false negatives)
- Verification rejects valid content (false positives, user frustration)
- Inconsistent user experience
- Hard-to-debug production issues
- Cost overruns from redundant API calls

**Warning signs:**
- Verification model frequently disagrees with conversation model
- Same inputs produce different outputs on retry
- High API costs relative to user volume
- Debugging requires examining multiple model logs

**Prevention:**
1. **Architectural constraints over model prompts:** Enforce correctness via code, not prompt engineering
2. **Single source of truth:** Verified clause library is authoritative, models just navigate it
3. **Deterministic verification:** Use rules-based checks where possible, LLM verification as supplement
4. **Graceful degradation:** If verification service fails, present draft with clear "unverified" warning
5. **Cost monitoring:** Set budget caps, alert on unusual API consumption
6. **Comprehensive logging:** Every inter-model exchange logged for debugging

**Phase to address:** Phase 1 (Foundation) - architecture decision, hard to change later

**Sources:**
- [Anthropic: How We Built Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Why Multi-Agent LLM Systems Fail (arXiv)](https://arxiv.org/html/2503.13657v1)
- [Augment Code: Multi-Agent Failure Modes](https://www.augmentcode.com/guides/why-multi-agent-llm-systems-fail-and-how-to-fix-them)

---

### Pitfall 7: Inadequate Disclaimers and Liability Exposure

**What goes wrong:** Disclaimers are generic copy-paste from other SaaS products, don't properly address legal document generation context. When something goes wrong, disclaimers don't provide expected protection.

**Why it happens:**
- Using template Terms of Service without legal review
- Not understanding SA consumer protection law
- Disclaimers hidden in footer, not presented at key moments
- No professional liability insurance

**Consequences:**
- Successful user lawsuits
- Consumer protection complaints
- Disclaimers voided by court as unconscionable
- Personal liability for founders

**Warning signs:**
- Terms of Service copied from generic template
- No SA attorney reviewed Terms
- Disclaimers only appear once at signup
- No professional indemnity insurance

**Prevention:**
1. **SA-specific Terms:** Have SA attorney draft Terms addressing legal document generation
2. **Contextual disclaimers:** Repeat key disclaimers at critical moments (before generation, before download)
3. **Consumer Protection Act compliance:** Ensure Terms aren't one-sided or unconscionable
4. **Professional indemnity insurance:** Explore coverage for tech-enabled legal services
5. **Limitation architecture:** Technical limits that prevent high-stakes use (estate value caps)

**Phase to address:** Phase 1 (Foundation) - legal structure before launch

**Sources:**
- [Clio: Legal Disclaimer Templates Guide](https://www.clio.com/resources/legal-document-templates/legal-disclaimer-template/)
- [TermsFeed: SaaS Limitation of Liability](https://www.termsfeed.com/blog/saas-limitation-liability/)
- [Galkin Law: Negotiating SaaS Liability Clauses](https://galkinlaw.com/limitation-of-liability-for-saas/)

---

### Pitfall 8: Questionnaire Drop-Off and Incomplete Wills

**What goes wrong:** Users start will generation but abandon mid-process. They have incomplete drafts they may incorrectly treat as complete, or platform loses users at high rate.

**Why it happens:**
- Questionnaire too long or complex
- Users hit questions they can't answer immediately
- No save/resume functionality
- Questions feel invasive without context
- No progress indication

**Consequences:**
- Poor conversion rates (high CAC, low LTV)
- Users with partial drafts in dangerous state
- Negative reviews about lengthy process
- Business model unviable

**Warning signs:**
- Completion rate below 50%
- High drop-off at specific questions
- Support requests asking how to finish
- Users starting multiple incomplete wills

**Prevention:**
1. **Progressive commitment:** Start with easy questions, build investment before complex ones
2. **Save everywhere:** Auto-save every answer, resume exactly where left off
3. **Time estimates:** Show "5 minutes remaining" type indicators
4. **Question context:** Explain why each question matters
5. **Skip and return:** Allow users to skip questions they need to research
6. **Minimal viable will first:** Complete simple will quickly, then offer enhancement

**Phase to address:** Phase 2 (Core Product) - UX is core product quality

**Sources:**
- [Specific App: AI Conversational Surveys](https://www.specific.app/blog/ai-survey-how-conversational-surveys-boost-engagement-and-deliver-better-insights)
- [InMoment: Conversational Surveys](https://inmoment.com/blog/conversational-surveys/)
- [Involve.me: AI Survey Tools](https://www.involve.me/blog/best-ai-survey-tools)

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework.

---

### Pitfall 9: Over-Engineering the AI Conversation

**What goes wrong:** Building sophisticated "natural conversation" when users actually want efficient data collection. AI tries to be too human, users get frustrated with small talk.

**Why it happens:**
- Demos of conversational AI are impressive
- Developers assume users want "chat" experience
- Not testing with real users who want to finish quickly

**Prevention:**
1. User research before building conversation flow
2. Offer "quick mode" for experienced users
3. Let users skip pleasantries
4. Measure time-to-completion, not conversation length

**Phase to address:** Phase 2 (Core Product)

---

### Pitfall 10: Ignoring Mobile Experience

**What goes wrong:** Complex estate questionnaire is desktop-focused. Mobile users (significant portion of SA market) have poor experience.

**Why it happens:**
- Developers use desktop for development
- Complex forms hard to design for mobile
- Testing on mobile is afterthought

**Prevention:**
1. Mobile-first design from start
2. Test on low-end Android devices (SA market reality)
3. Offline capability for unstable connections
4. SMS/WhatsApp integration for execution reminders

**Phase to address:** Phase 2 (Core Product) - affects design decisions

---

### Pitfall 11: Template Versioning Nightmares

**What goes wrong:** Legal templates need updates (law changes, errors found). No system for versioning. Users with old versions get confused.

**Why it happens:**
- Templates treated as static assets
- No version control for legal content
- No migration strategy for users with drafts

**Prevention:**
1. Version all legal templates from day one
2. Document which version each user draft uses
3. Build update notification system
4. Create migration paths for template updates

**Phase to address:** Phase 1 (Foundation) - infrastructure decision

---

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation Priority |
|-------|---------------|---------------------|
| Phase 1: Foundation | UPL architecture, POPIA compliance, Multi-LLM coordination | CRITICAL - foundational decisions |
| Phase 2: Core Product | Wet-ink confusion, Complex estate boundaries, Questionnaire drop-off | HIGH - core product quality |
| Phase 3: Enhancement | Template versioning, Over-engineering AI | MEDIUM - optimization |
| Phase 4: Scale | Liability exposure, Mobile experience | MEDIUM - growth preparation |

---

## Domain-Specific Checklist

Before each phase completion, verify:

- [ ] No feature crosses UPL line
- [ ] All AI outputs verified against clause library (not freeform)
- [ ] Execution guidance prominent and tracked
- [ ] POPIA consent captured for all data collection
- [ ] Complex estate triggers work correctly
- [ ] Disclaimers appear at appropriate moments
- [ ] Drop-off rates within acceptable range
- [ ] Multi-LLM coordination tested under failure conditions

---

## Sources Summary

### Regulatory/Legal (HIGH confidence)
- FTC DoNotPay enforcement action
- SA Wills Act formalities documentation
- POPIA official guidance
- Information Regulator breach reporting requirements

### Industry Analysis (MEDIUM confidence)
- Stanford HAI hallucination research
- Anthropic multi-agent architecture documentation
- ABA unauthorized practice of law guidance

### Community/Market (LOW-MEDIUM confidence)
- LegalZoom/Rocket Lawyer user reviews and criticisms
- Estate planning attorney commentary
- Legal tech failure post-mortems
