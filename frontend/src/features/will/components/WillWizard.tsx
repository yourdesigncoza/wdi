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
import { createWill } from '../../../services/api.ts'
import type { WillSection } from '../types/will.ts'

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
 */
function PersonalSection() {
  const testator = useWillStore((s) => s.testator)
  const hasTestator = !!(testator.firstName && testator.lastName && testator.idNumber)

  if (!hasTestator) {
    return <PersonalForm />
  }

  return <MaritalForm />
}


export function WillWizard() {
  const currentSection = useWillStore((s) => s.currentSection)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)
  const willId = useWillStore((s) => s.willId)
  const setWillId = useWillStore((s) => s.setWillId)
  const scenarios = useWillStore((s) => s.scenarios)
  const { sections, activeComplexSections } = useWillProgress()

  // Track whether scenario detection interstitial has been shown
  const [scenariosDetected, setScenariosDetected] = useState(false)

  // Track whether will creation is in-flight to prevent duplicate calls
  const creatingRef = useRef(false)

  // Auto-create a will when user navigates to an AI section without one
  const ensureWillExists = useCallback(async () => {
    if (willId || creatingRef.current) return
    creatingRef.current = true
    try {
      const will = await createWill()
      setWillId(will.id)
    } catch (err) {
      console.error('Failed to create will:', err)
    } finally {
      creatingRef.current = false
    }
  }, [willId, setWillId])

  // When switching to an AI, complex, or review section, ensure a will exists
  useEffect(() => {
    if (
      AI_SECTIONS.has(currentSection) ||
      COMPLEX_SECTION_KEYS.has(currentSection) ||
      currentSection === 'review'
    ) {
      void ensureWillExists()
    }
  }, [currentSection, ensureWillExists])

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
    },
    [setCurrentSection],
  )

  /** Handle ScenarioDetector completion */
  const handleScenarioContinue = useCallback(
    (nextSection: WillSection) => {
      setScenariosDetected(true)
      setCurrentSection(nextSection)
    },
    [setCurrentSection],
  )

  const markSectionComplete = useWillStore((s) => s.markSectionComplete)

  /** Advance to the next section in the dynamic sections list */
  const handleNextSection = useCallback(() => {
    markSectionComplete(currentSection)
    const currentIndex = sections.findIndex((s) => s.key === currentSection)
    const nextIndex = currentIndex + 1
    if (nextIndex < sections.length) {
      setCurrentSection(sections[nextIndex].key)
    }
  }, [currentSection, sections, markSectionComplete, setCurrentSection])

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

    return null
  }

  // AI, complex, and review sections need full height for the chat interface;
  // form sections keep the card wrapper for a contained feel
  const isChatSection =
    (AI_SECTIONS.has(currentSection) ||
      COMPLEX_SECTION_KEYS.has(currentSection) ||
      currentSection === 'review') &&
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
