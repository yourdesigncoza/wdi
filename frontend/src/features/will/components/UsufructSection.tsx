import { useWillStore } from '../store/useWillStore.ts'
import { ChatSection } from './ChatSection.tsx'

interface UsufructSectionProps {
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

/** Warning icon SVG for DaisyUI alerts */
function WarningIcon() {
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

/**
 * Usufruct provision configuration section.
 *
 * Displays SA legal context about usufruct rights,
 * warns about the fideicommissum distinction,
 * shows existing usufruct data summary if available,
 * and renders ChatSection for AI-guided usufruct setup.
 */
export function UsufructSection({ willId, onNext }: UsufructSectionProps) {
  const usufruct = useWillStore((s) => s.usufruct)

  const hasUsufructData =
    usufruct.propertyDescription ||
    usufruct.usufructuaryName ||
    (usufruct.bareDominiumHolders && usufruct.bareDominiumHolders.length > 0)

  return (
    <div className="space-y-4">
      {/* SA legal context about usufruct */}
      <div className="alert alert-info">
        <InfoIcon />
        <span>
          A usufruct gives someone the right to USE and ENJOY a property for
          their lifetime, while actual ownership passes to other beneficiaries.
          The usufructuary does NOT own the property.
        </span>
      </div>

      {/* Fideicommissum distinction warning */}
      <div className="alert alert-warning">
        <WarningIcon />
        <span>
          Important: A usufruct is different from a fideicommissum. If you need
          conditional ownership transfer, please consult an attorney.
        </span>
      </div>

      {/* Existing usufruct data summary */}
      {hasUsufructData && (
        <div className="bg-base-200 rounded-lg p-3 text-sm space-y-1">
          <p className="font-semibold">Usufruct configuration:</p>
          {usufruct.propertyDescription && (
            <p>
              <strong>Property:</strong> {usufruct.propertyDescription}
            </p>
          )}
          {usufruct.usufructuaryName && (
            <p>
              <strong>Usufructuary:</strong> {usufruct.usufructuaryName}
            </p>
          )}
          {usufruct.duration && (
            <p>
              <strong>Duration:</strong> {usufruct.duration}
            </p>
          )}
          {usufruct.bareDominiumHolders &&
            usufruct.bareDominiumHolders.length > 0 && (
              <p>
                <strong>Bare dominium holders:</strong>{' '}
                {usufruct.bareDominiumHolders.map((h) => h.name).join(', ')}
              </p>
            )}
        </div>
      )}

      {/* AI-guided usufruct setup conversation */}
      <ChatSection section="usufruct" willId={willId} onNext={onNext} />
    </div>
  )
}
