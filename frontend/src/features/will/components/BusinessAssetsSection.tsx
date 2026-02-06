import { useWillStore } from '../store/useWillStore.ts'
import { ChatSection } from './ChatSection.tsx'

interface BusinessAssetsSectionProps {
  willId: string
  onNext?: () => void
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

/** Map business type codes to readable labels */
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  cc_member_interest: 'CC',
  company_shares: 'Pty Ltd',
  partnership: 'Partnership',
}

/**
 * Business assets questionnaire section.
 *
 * Displays SA legal context about CC Act s35 consent requirements,
 * shows existing business assets with type badges and consent warnings,
 * and renders ChatSection for AI-guided business asset data collection.
 */
export function BusinessAssetsSection({ willId, onNext }: BusinessAssetsSectionProps) {
  const businessAssets = useWillStore((s) => s.businessAssets)

  return (
    <div className="space-y-4">
      {/* SA legal context about business interests */}
      <div className="alert alert-info">
        <InfoIcon />
        <span>
          Business interests require special attention. Close Corporation member
          interests need consent from remaining members under Section 35 of the
          CC Act.
        </span>
      </div>

      {/* Existing business assets summary */}
      {businessAssets.length > 0 && (
        <div className="bg-base-200 rounded-lg p-3 text-sm space-y-2">
          <p className="font-semibold">Business assets added:</p>
          {businessAssets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-outline badge-sm">
                {BUSINESS_TYPE_LABELS[asset.businessType] ?? asset.businessType}
              </span>
              <span>{asset.businessName}</span>
              {asset.percentageHeld != null && (
                <span className="text-base-content/60">
                  ({asset.percentageHeld}%)
                </span>
              )}
              {asset.businessType === 'cc_member_interest' && (
                <span className="badge badge-warning badge-sm">
                  Requires member consent
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI-guided business asset data collection */}
      <ChatSection section="business" willId={willId} onNext={onNext} />
    </div>
  )
}
