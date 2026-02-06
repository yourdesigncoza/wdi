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

function getStepClass(step: SectionStep): string {
  if (step.isComplete) return 'step step-primary'
  if (step.isCurrent) return 'step step-neutral'
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
