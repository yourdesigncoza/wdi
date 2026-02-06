import { useWillStore } from '../store/useWillStore.ts'
import { ChatSection } from './ChatSection.tsx'

interface TrustSectionProps {
  willId: string
}

/** Info icon SVG for DaisyUI alerts */
function InfoIcon() {
  return (
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

/**
 * Testamentary trust configuration section.
 *
 * Displays SA legal context about minors and inheritance,
 * shows existing trust data summary if available,
 * and renders ChatSection for AI-guided trust setup.
 */
export function TrustSection({ willId }: TrustSectionProps) {
  const trustProvisions = useWillStore((s) => s.trustProvisions)

  const hasTrustData =
    trustProvisions.trustName ||
    trustProvisions.vestingAge ||
    (trustProvisions.trustees && trustProvisions.trustees.length > 0)

  return (
    <div className="space-y-4">
      {/* SA legal context about testamentary trusts */}
      <div className="alert alert-info">
        <InfoIcon />
        <span>
          A testamentary trust protects minor children&apos;s inheritance. In
          South Africa, children under 18 cannot inherit directly — assets must
          be held in trust until they reach a specified age (typically 18–25).
        </span>
      </div>

      {/* Existing trust data summary */}
      {hasTrustData && (
        <div className="bg-base-200 rounded-lg p-3 text-sm space-y-1">
          <p className="font-semibold">Trust configuration:</p>
          {trustProvisions.trustName && (
            <p>
              <strong>Trust:</strong> {trustProvisions.trustName}
            </p>
          )}
          {trustProvisions.vestingAge && (
            <p>
              <strong>Vesting age:</strong> {trustProvisions.vestingAge}
            </p>
          )}
          {trustProvisions.trustees && trustProvisions.trustees.length > 0 && (
            <p>
              <strong>Trustees:</strong>{' '}
              {trustProvisions.trustees.map((t) => t.name).join(', ')}
            </p>
          )}
          {trustProvisions.minorBeneficiaries &&
            trustProvisions.minorBeneficiaries.length > 0 && (
              <p>
                <strong>Minor beneficiaries:</strong>{' '}
                {trustProvisions.minorBeneficiaries.join(', ')}
              </p>
            )}
        </div>
      )}

      {/* AI-guided trust setup conversation */}
      <ChatSection section="trust" willId={willId} />
    </div>
  )
}
