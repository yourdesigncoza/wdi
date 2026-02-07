import { useCallback, useEffect, useRef, useState } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import { useWillProgress } from '../hooks/useWillProgress.ts'
import { StepIndicator } from './StepIndicator.tsx'
import { PersonalForm } from './PersonalForm.tsx'
import { MaritalForm } from './MaritalForm.tsx'
import { ChatSection } from './ChatSection.tsx'
import { ReviewChat } from './ReviewChat.tsx'
import { ScenarioDetector } from './ScenarioDetector.tsx'
import { TrustSection } from './TrustSection.tsx'
import { UsufructSection } from './UsufructSection.tsx'
import { BusinessAssetsSection } from './BusinessAssetsSection.tsx'
import { JointWillSetup } from './JointWillSetup.tsx'
import { VerificationPage } from './VerificationPage.tsx'
import { DocumentPreviewPage } from './DocumentPreviewPage.tsx'
import { PaymentPage } from './PaymentPage.tsx'
import {
  createWill,
  getWill,
  updateWillSection,
  extractConversationData,
  markSectionComplete as markSectionCompleteApi,
  updateCurrentSection,
} from '../../../services/api.ts'
import type { WillSection } from '../types/will.ts'

/** Convert camelCase keys to snake_case for backend Pydantic schemas */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

/** Sections driven by the AI conversation (as opposed to form-based) */
const AI_SECTIONS: ReadonlySet<WillSection> = new Set([
  'beneficiaries',
  'assets',
  'guardians',
  'executor',
  'bequests',
  'residue',
  'trust',
  'usufruct',
  'business',
])

/** Complex sections that have dedicated wrapper components */
const COMPLEX_SECTION_KEYS: ReadonlySet<WillSection> = new Set([
  'trust',
  'usufruct',
  'business',
  'joint',
])

/**
 * Personal section renders PersonalForm first.
 * Once testator data is saved, it shows MaritalForm.
 * After marital is saved, the section advances to beneficiaries.
 *
 * Uses a local sub-step so "Back to Personal" from MaritalForm
 * always shows PersonalForm (even when testator data already exists).
 */
function PersonalSection() {
  const [subStep, setSubStep] = useState<'personal' | 'marital'>('personal')

  const advanceToMarital = useCallback(() => {
    setSubStep('marital')
  }, [])

  if (subStep === 'personal') {
    return <PersonalForm onSaved={advanceToMarital} />
  }

  return <MaritalForm onBackToPersonal={() => setSubStep('personal')} />
}


export function WillWizard() {
  const currentSection = useWillStore((s) => s.currentSection)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)
  const willId = useWillStore((s) => s.willId)
  const setWillId = useWillStore((s) => s.setWillId)
  const scenarios = useWillStore((s) => s.scenarios)
  const { sections } = useWillProgress()

  // Track whether the current will has already been paid for
  const [isPaidWill, setIsPaidWill] = useState(false)

  // Track whether scenario detection interstitial has been shown
  const [scenariosDetected, setScenariosDetected] = useState(false)

  // Detect whether the current will has been paid for
  useEffect(() => {
    if (!willId) {
      setIsPaidWill(false)
      return
    }
    getWill(willId)
      .then((will) => {
        if (will.paid_at) {
          setIsPaidWill(true)
        }
      })
      .catch(() => {})
  }, [willId])

  // Track whether will creation is in-flight to prevent duplicate calls
  const creatingRef = useRef(false)

  // Track whether form sections have been synced to prevent duplicate calls
  const syncedRef = useRef(false)

  /**
   * Sync form-based section data (testator, marital) from Zustand to the backend.
   * These sections are filled via forms (not AI), so their data lives only in
   * localStorage until explicitly synced to the DB's JSONB columns.
   */
  const syncFormSections = useCallback(
    async (targetWillId: string) => {
      if (syncedRef.current) return
      const state = useWillStore.getState()
      const { testator, marital } = state
      // Only sync if testator has meaningful data
      if (!testator.firstName) return
      syncedRef.current = true
      try {
        const syncs: Promise<unknown>[] = [
          updateWillSection(targetWillId, 'testator', toSnakeCase(testator)),
        ]
        // Only sync marital if user completed the form (status is required)
        if (marital.status) {
          syncs.push(updateWillSection(targetWillId, 'marital', toSnakeCase(marital)))
        }
        await Promise.all(syncs)
      } catch (err) {
        console.error('Failed to sync form sections:', err)
        syncedRef.current = false
      }
    },
    [],
  )

  // Auto-create a will when user navigates to an AI section without one
  const ensureWillExists = useCallback(async () => {
    if (willId || creatingRef.current) return
    creatingRef.current = true
    try {
      const will = await createWill()
      setWillId(will.id)
      // Sync form data that was collected before will creation
      await syncFormSections(will.id)
    } catch (err) {
      console.error('Failed to create will:', err)
    } finally {
      creatingRef.current = false
    }
  }, [willId, setWillId, syncFormSections])

  // When switching to an AI, complex, review, or verification section, ensure a will exists
  useEffect(() => {
    if (
      AI_SECTIONS.has(currentSection) ||
      COMPLEX_SECTION_KEYS.has(currentSection) ||
      currentSection === 'review' ||
      currentSection === 'verification' ||
      currentSection === 'document' ||
      currentSection === 'payment'
    ) {
      void ensureWillExists()
    }
  }, [currentSection, ensureWillExists])

  // Re-sync form sections to backend when entering verification or review
  // Ensures any edits to personal/marital since initial sync are captured
  useEffect(() => {
    if ((currentSection === 'verification' || currentSection === 'review') && willId) {
      syncedRef.current = false
      void syncFormSections(willId)
    }
  }, [currentSection, willId, syncFormSections])

  // If scenarios were previously detected (store has scenarios), skip the interstitial
  useEffect(() => {
    if (scenarios.length > 0) {
      setScenariosDetected(true)
    }
  }, [scenarios.length])

  /** Navigate from review back to a specific section for editing */
  const handleNavigateToSection = useCallback(
    (section: WillSection) => {
      setCurrentSection(section)
      if (willId) {
        updateCurrentSection(willId, section).catch((err) =>
          console.error('Failed to sync current section:', err)
        )
      }
    },
    [setCurrentSection, willId],
  )

  /** Handle ScenarioDetector completion */
  const handleScenarioContinue = useCallback(
    (nextSection: WillSection) => {
      setScenariosDetected(true)
      setCurrentSection(nextSection)
    },
    [setCurrentSection],
  )

  const markSectionCompleteLocal = useWillStore((s) => s.markSectionComplete)

  /** Advance to the next section in the dynamic sections list */
  const handleNextSection = useCallback(async () => {
    // Trigger extraction for AI sections before advancing
    if (willId && AI_SECTIONS.has(currentSection)) {
      try {
        await extractConversationData(willId, currentSection)
      } catch (err) {
        console.error('Extraction failed, continuing anyway:', err)
      }
    }
    markSectionCompleteLocal(currentSection)
    // Fire-and-forget backend sync for section completion
    if (willId) {
      markSectionCompleteApi(willId, currentSection).catch((err) =>
        console.error('Failed to sync section complete:', err)
      )
    }
    const currentIndex = sections.findIndex((s) => s.key === currentSection)
    const nextIndex = currentIndex + 1
    if (nextIndex < sections.length) {
      const nextSection = sections[nextIndex].key
      setCurrentSection(nextSection)
      if (willId) {
        updateCurrentSection(willId, nextSection).catch((err) =>
          console.error('Failed to sync current section:', err)
        )
      }
    }
  }, [currentSection, sections, markSectionCompleteLocal, setCurrentSection, willId])

  /**
   * Determine if we should show the scenario detection interstitial.
   * Triggers when user navigates past residue and detection has not run yet.
   */
  const shouldShowScenarioDetector =
    !scenariosDetected &&
    currentSection !== 'personal' &&
    currentSection !== 'beneficiaries' &&
    currentSection !== 'assets' &&
    currentSection !== 'guardians' &&
    currentSection !== 'executor' &&
    currentSection !== 'bequests' &&
    currentSection !== 'residue'

  function renderSection(section: WillSection) {
    // Scenario detection interstitial — show before complex/review sections
    if (shouldShowScenarioDetector && willId) {
      return (
        <ScenarioDetector
          willId={willId}
          onContinue={handleScenarioContinue}
        />
      )
    }

    if (section === 'personal') {
      return <PersonalSection />
    }

    // Complex sections with dedicated wrapper components
    if (COMPLEX_SECTION_KEYS.has(section)) {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      switch (section) {
        case 'trust':
          return <TrustSection willId={willId} onNext={handleNextSection} />
        case 'usufruct':
          return <UsufructSection willId={willId} onNext={handleNextSection} />
        case 'business':
          return <BusinessAssetsSection willId={willId} onNext={handleNextSection} />
        case 'joint':
          return <JointWillSetup willId={willId} onNext={handleNextSection} />
      }
    }

    if (AI_SECTIONS.has(section)) {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return <ChatSection section={section} willId={willId} onNext={handleNextSection} />
    }

    if (section === 'review') {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return (
        <ReviewChat
          willId={willId}
          onNavigateToSection={handleNavigateToSection}
        />
      )
    }

    if (section === 'verification') {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return <VerificationPage />
    }

    if (section === 'document') {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return (
        <DocumentPreviewPage
          willId={willId}
          isPaidWill={isPaidWill}
          onBack={() => setCurrentSection('verification')}
          onProceedToPayment={() => setCurrentSection('payment')}
        />
      )
    }

    if (section === 'payment') {
      if (!willId) {
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return (
        <PaymentPage
          willId={willId}
          onBack={() => setCurrentSection('document')}
        />
      )
    }

    return null
  }

  // AI, complex, and review sections need full height for the chat interface;
  // form sections keep the card wrapper for a contained feel
  const isChatSection =
    (AI_SECTIONS.has(currentSection) ||
      COMPLEX_SECTION_KEYS.has(currentSection) ||
      currentSection === 'review' ||
      currentSection === 'verification' ||
      currentSection === 'document' ||
      currentSection === 'payment') &&
    !!willId

  return (
    <div className="min-h-screen bg-base-200">
      <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        <StepIndicator
          sections={sections}
          onNavigate={setCurrentSection}
        />

        {isChatSection ? (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 sm:p-6">
              {renderSection(currentSection)}
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              {renderSection(currentSection)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
