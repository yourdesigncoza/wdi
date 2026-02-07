import type { WillSection } from '../types/will.ts'

interface SectionStep {
  key: WillSection
  label: string
  isComplete: boolean
  isCurrent: boolean
}

interface StepIndicatorProps {
  sections: SectionStep[]
  onNavigate: (key: WillSection) => void
}

/** Maps each WillSection to its importance category DaisyUI step class */
const SECTION_CATEGORY: Record<WillSection, string> = {
  personal: 'step-error',
  beneficiaries: 'step-warning',
  assets: 'step-warning',
  guardians: 'step-warning',
  executor: 'step-secondary',
  bequests: 'step-secondary',
  residue: 'step-secondary',
  trust: 'step-secondary',
  usufruct: 'step-secondary',
  business: 'step-secondary',
  joint: 'step-secondary',
  review: 'step-accent',
  verification: 'step-accent',
  document: 'step-accent',
}

function getStepClass(step: SectionStep): string {
  if (step.isComplete) return 'step step-neutral'
  if (step.isCurrent) return 'step ' + SECTION_CATEGORY[step.key]
  return 'step'
}

export function StepIndicator({ sections, onNavigate }: StepIndicatorProps) {
  return (
    <div className="overflow-x-auto w-full pb-2">
      <ul className="steps steps-horizontal w-full min-w-[600px]">
        {sections.map((step) => (
          <li
            key={step.key}
            className={getStepClass(step)}
          >
            <button
              type="button"
              className="text-xs sm:text-sm cursor-pointer hover:underline"
              onClick={() => onNavigate(step.key)}
            >
              {step.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
