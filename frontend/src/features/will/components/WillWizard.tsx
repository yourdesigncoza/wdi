import { useWillStore } from '../store/useWillStore.ts'
import { useWillProgress } from '../hooks/useWillProgress.ts'
import { StepIndicator } from './StepIndicator.tsx'
import { PersonalForm } from './PersonalForm.tsx'
import { MaritalForm } from './MaritalForm.tsx'
import type { WillSection } from '../types/will.ts'

/** Placeholder for sections that will be built in later plans */
function SectionPlaceholder({ section }: { section: WillSection }) {
  const labels: Record<string, string> = {
    beneficiaries: 'Beneficiaries',
    assets: 'Assets',
    guardians: 'Guardians',
    executor: 'Executor',
    bequests: 'Bequests',
    residue: 'Residue',
    review: 'Review',
  }

  return (
    <div className="text-center py-12">
      <p className="text-base-content/50 text-lg">
        {labels[section] ?? section} section coming soon...
      </p>
    </div>
  )
}

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

function renderSection(section: WillSection) {
  switch (section) {
    case 'personal':
      return <PersonalSection />
    case 'beneficiaries':
    case 'assets':
    case 'guardians':
    case 'executor':
    case 'bequests':
    case 'residue':
    case 'review':
      return <SectionPlaceholder section={section} />
  }
}

export function WillWizard() {
  const currentSection = useWillStore((s) => s.currentSection)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)
  const { sections } = useWillProgress()

  return (
    <div className="min-h-screen bg-base-200">
      <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">
        <StepIndicator
          sections={sections}
          onNavigate={setCurrentSection}
        />

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            {renderSection(currentSection)}
          </div>
        </div>
      </div>
    </div>
  )
}
