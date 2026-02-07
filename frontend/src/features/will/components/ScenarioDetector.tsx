import { useEffect, useState } from 'react'
import { useScenarioDetection } from '../hooks/useScenarioDetection.ts'
import { useWillStore } from '../store/useWillStore.ts'
import type { ComplexScenario, WillSection } from '../types/will.ts'

/** Info for each detectable complex scenario */
const SCENARIO_INFO: Record<ComplexScenario, { label: string; description: string; section: WillSection }> = {
  blended_family: {
    label: 'Blended Family',
    description: 'Your family situation may benefit from specific provisions for step-children',
    section: 'trust',
  },
  testamentary_trust: {
    label: 'Testamentary Trust',
    description: 'You have minor beneficiaries who will need a testamentary trust',
    section: 'trust',
  },
  usufruct: {
    label: 'Usufruct',
    description: 'You have property and a spouse — a usufruct can protect both',
    section: 'usufruct',
  },
  business_assets: {
    label: 'Business Assets',
    description: 'Your business interests need special provisions in your will',
    section: 'business',
  },
}

/** Optional sections users can manually opt into */
const OPT_IN_SECTIONS: { key: ComplexScenario; label: string }[] = [
  { key: 'testamentary_trust', label: 'Set up a testamentary trust' },
  { key: 'usufruct', label: 'Add a usufruct provision' },
  { key: 'business_assets', label: 'Add business asset provisions' },
]

/** Determine the first complex section to navigate to based on active scenarios */
function getFirstComplexSection(activeScenarios: ComplexScenario[]): WillSection {
  if (activeScenarios.length === 0) return 'review'
  // Deduplicate target sections preserving order
  const seen = new Set<WillSection>()
  for (const s of activeScenarios) {
    seen.add(SCENARIO_INFO[s].section)
  }
  return [...seen][0]
}

interface ScenarioDetectorProps {
  willId: string
  onContinue: (nextSection: WillSection) => void
}

/**
 * Transitional component shown between basic sections and complex sections.
 *
 * Calls the scenario detection API on mount, displays what was detected
 * with explanations, allows opt-in to additional sections, and navigates
 * to the first applicable complex section (or review if none).
 */
export function ScenarioDetector({ willId: _willId, onContinue }: ScenarioDetectorProps) {
  const { scenarios, loading, error, detectScenarios } = useScenarioDetection()
  const setScenarios = useWillStore((s) => s.setScenarios)
  const [optedIn, setOptedIn] = useState<Set<ComplexScenario>>(new Set())
  const [detected, setDetected] = useState(false)

  // Detect scenarios on mount
  useEffect(() => {
    if (!detected) {
      setDetected(true)
      void detectScenarios()
    }
  }, [detected, detectScenarios])

  /** Toggle opt-in for a scenario not auto-detected */
  function toggleOptIn(scenario: ComplexScenario) {
    setOptedIn((prev) => {
      const next = new Set(prev)
      if (next.has(scenario)) {
        next.delete(scenario)
      } else {
        next.add(scenario)
      }
      return next
    })
  }

  /** Combine detected + opted-in scenarios and continue */
  function handleContinue() {
    const combined = [...new Set([...scenarios, ...optedIn])]
    // Update store with final scenario list (including user opt-ins)
    setScenarios(combined)
    const nextSection = getFirstComplexSection(combined)
    onContinue(nextSection)
  }

  // Scenarios NOT auto-detected (available for opt-in)
  const availableOptIns = OPT_IN_SECTIONS.filter(
    ({ key }) => !scenarios.includes(key),
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/70 text-sm">
          Analyzing your will for complex scenarios...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4 py-8">
        <div className="alert alert-error">
          <span>Failed to analyze scenarios: {error}</span>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={() => {
              setDetected(false)
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const hasDetected = scenarios.length > 0

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-base-content">
          Scenario Analysis
        </h2>
        <p className="text-sm text-base-content/60 mt-1">
          Based on what you have told us, we have identified the following
        </p>
      </div>

      {/* Detected scenarios */}
      {hasDetected ? (
        <div className="space-y-3">
          {scenarios.map((scenario) => {
            const info = SCENARIO_INFO[scenario]
            return (
              <div
                key={scenario}
                className="card card-border bg-base-100"
              >
                <div className="card-body p-4 flex-row items-start gap-3">
                  <div className="badge badge-primary badge-sm mt-0.5 shrink-0">
                    Detected
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{info.label}</h3>
                    <p className="text-xs text-base-content/60 mt-0.5">
                      {info.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="alert alert-success">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="h-6 w-6 shrink-0 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            Your will does not require any complex provisions. You can proceed
            to review.
          </span>
        </div>
      )}

      {/* Opt-in section */}
      {availableOptIns.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-base-content/70">
            You can also add these optional sections:
          </p>
          <div className="flex flex-col gap-3">
            {availableOptIns.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={optedIn.has(key)}
                  onChange={() => toggleOptIn(key)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="btn btn-neutral"
          onClick={handleContinue}
        >
          {hasDetected || optedIn.size > 0
            ? 'Continue to Complex Sections'
            : 'Continue to Review'}
        </button>
      </div>
    </div>
  )
}
