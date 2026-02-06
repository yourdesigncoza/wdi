import { useCallback, useEffect, useRef } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import { useWillProgress } from '../hooks/useWillProgress.ts'
import { StepIndicator } from './StepIndicator.tsx'
import { PersonalForm } from './PersonalForm.tsx'
import { MaritalForm } from './MaritalForm.tsx'
import { ChatSection } from './ChatSection.tsx'
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

/** Placeholder for sections that will be built in later plans */
function SectionPlaceholder({ section }: { section: WillSection }) {
  return (
    <div className="text-center py-12">
      <p className="text-base-content/50 text-lg">
        {section.charAt(0).toUpperCase() + section.slice(1)} section coming soon...
      </p>
    </div>
  )
}

export function WillWizard() {
  const currentSection = useWillStore((s) => s.currentSection)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)
  const willId = useWillStore((s) => s.willId)
  const setWillId = useWillStore((s) => s.setWillId)
  const { sections } = useWillProgress()

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

  // When switching to an AI section, ensure a will exists
  useEffect(() => {
    if (AI_SECTIONS.has(currentSection)) {
      void ensureWillExists()
    }
  }, [currentSection, ensureWillExists])

  function renderSection(section: WillSection) {
    if (section === 'personal') {
      return <PersonalSection />
    }

    if (AI_SECTIONS.has(section)) {
      if (!willId) {
        // Will is being created -- show a brief loading state
        return (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-md" />
          </div>
        )
      }
      return <ChatSection section={section} willId={willId} />
    }

    // Review and any future sections
    return <SectionPlaceholder section={section} />
  }

  // AI sections need full height for the chat interface;
  // form sections keep the card wrapper for a contained feel
  const isAISection = AI_SECTIONS.has(currentSection) && !!willId

  return (
    <div className="min-h-screen bg-base-200">
      <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        <StepIndicator
          sections={sections}
          onNavigate={setCurrentSection}
        />

        {isAISection ? (
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
