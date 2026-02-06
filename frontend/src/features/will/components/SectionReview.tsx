import { useWillStore } from '../store/useWillStore.ts'
import { MaritalStatus } from '../types/will.ts'
import type { WillSection } from '../types/will.ts'

interface SectionReviewProps {
  section: WillSection
  onEdit: (section: WillSection) => void
}

/** Human-readable labels for marital status values */
const MARITAL_LABELS: Record<string, string> = {
  [MaritalStatus.SINGLE]: 'Single',
  [MaritalStatus.MARRIED_IN_COMMUNITY]: 'Married in community of property',
  [MaritalStatus.MARRIED_ANC]: 'Married with ANC',
  [MaritalStatus.MARRIED_COP]: 'Married with COP',
  [MaritalStatus.DIVORCED]: 'Divorced',
  [MaritalStatus.WIDOWED]: 'Widowed',
}

/** Human-readable labels for asset type values */
const ASSET_TYPE_LABELS: Record<string, string> = {
  property: 'Property',
  vehicle: 'Vehicle',
  bank_account: 'Bank Account',
  investment: 'Investment',
  insurance: 'Insurance',
  business: 'Business',
  other: 'Other',
}

/** Section display names */
const SECTION_LABELS: Record<string, string> = {
  personal: 'Personal Details',
  beneficiaries: 'Beneficiaries',
  assets: 'Assets',
  guardians: 'Guardians',
  executor: 'Executor',
  bequests: 'Specific Bequests',
  residue: 'Residual Estate',
}

function DataRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <tr>
      <td className="font-medium text-base-content/70 pr-4 py-1 whitespace-nowrap align-top">
        {label}
      </td>
      <td className="py-1">{value}</td>
    </tr>
  )
}

function EmptySection({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="text-center py-6">
      <p className="text-base-content/50 text-sm mb-3">Not yet completed</p>
      <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
        Start
      </button>
    </div>
  )
}

function PersonalReview() {
  const testator = useWillStore((s) => s.testator)
  const marital = useWillStore((s) => s.marital)

  const hasData = !!(testator.firstName || testator.lastName)
  if (!hasData) return null

  const fullAddress = [testator.address, testator.city, testator.province, testator.postalCode]
    .filter(Boolean)
    .join(', ')

  return (
    <table className="text-sm">
      <tbody>
        <DataRow label="Name" value={[testator.firstName, testator.lastName].filter(Boolean).join(' ')} />
        <DataRow label="ID Number" value={testator.idNumber} />
        <DataRow label="Date of Birth" value={testator.dateOfBirth} />
        <DataRow label="Address" value={fullAddress || undefined} />
        <DataRow label="Phone" value={testator.phone} />
        <DataRow label="Email" value={testator.email} />
        <DataRow label="Marital Status" value={marital.status ? MARITAL_LABELS[marital.status] ?? marital.status : undefined} />
        {marital.spouseFirstName && (
          <DataRow
            label="Spouse"
            value={[marital.spouseFirstName, marital.spouseLastName].filter(Boolean).join(' ')}
          />
        )}
      </tbody>
    </table>
  )
}

function BeneficiariesReview() {
  const beneficiaries = useWillStore((s) => s.beneficiaries)
  if (beneficiaries.length === 0) return null

  return (
    <div className="space-y-2">
      {beneficiaries.map((b) => (
        <div key={b.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-medium">{b.fullName}</span>
          <span className="text-base-content/60">{b.relationship}</span>
          {b.sharePercent != null && (
            <span className="badge badge-sm badge-outline">{b.sharePercent}%</span>
          )}
          {b.alternateBeneficiary && (
            <span className="text-xs text-base-content/50">
              Alt: {b.alternateBeneficiary}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function AssetsReview() {
  const assets = useWillStore((s) => s.assets)
  if (assets.length === 0) return null

  return (
    <div className="space-y-2">
      {assets.map((a) => (
        <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="badge badge-sm badge-ghost">
            {ASSET_TYPE_LABELS[a.assetType] ?? a.assetType}
          </span>
          <span>{a.description}</span>
          {a.details && <span className="text-base-content/50 text-xs">{a.details}</span>}
        </div>
      ))}
    </div>
  )
}

function GuardiansReview() {
  const guardians = useWillStore((s) => s.guardians)
  if (guardians.length === 0) return null

  return (
    <div className="space-y-2">
      {guardians.map((g) => (
        <div key={g.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="font-medium">{g.fullName}</span>
          <span className="text-base-content/60">{g.relationship}</span>
          {g.isPrimary && <span className="badge badge-sm badge-primary">Primary</span>}
        </div>
      ))}
    </div>
  )
}

function ExecutorReview() {
  const executor = useWillStore((s) => s.executor)
  if (!executor.name) return null

  return (
    <table className="text-sm">
      <tbody>
        <DataRow label="Executor" value={executor.name} />
        <DataRow label="Relationship" value={executor.relationship} />
        <DataRow label="Professional" value={executor.isProfessional ? 'Yes' : 'No'} />
        <DataRow label="Backup" value={executor.backupName} />
        <DataRow label="Backup Relationship" value={executor.backupRelationship} />
      </tbody>
    </table>
  )
}

function BequestsReview() {
  const bequests = useWillStore((s) => s.bequests)
  if (bequests.length === 0) return null

  return (
    <div className="space-y-2">
      {bequests.map((b) => (
        <div key={b.id} className="text-sm">
          <span className="font-medium">{b.itemDescription}</span>
          <span className="text-base-content/60 mx-1">to</span>
          <span>{b.recipientName}</span>
          {b.recipientRelationship && (
            <span className="text-base-content/50 text-xs ml-1">
              ({b.recipientRelationship})
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function ResidueReview() {
  const residue = useWillStore((s) => s.residue)
  if (!residue.beneficiaries?.length && !residue.simultaneousDeathClause) return null

  return (
    <div className="space-y-2">
      {residue.beneficiaries?.map((rb, i) => (
        <div key={i} className="flex items-baseline gap-x-3 text-sm">
          <span className="font-medium">{rb.name}</span>
          <span className="badge badge-sm badge-outline">{rb.sharePercent}%</span>
        </div>
      ))}
      {residue.simultaneousDeathClause && (
        <p className="text-sm text-base-content/70 mt-2">
          <span className="font-medium">Simultaneous death: </span>
          {residue.simultaneousDeathClause}
        </p>
      )}
    </div>
  )
}

/** Map section keys to their review renderer */
const SECTION_RENDERERS: Record<string, () => React.ReactNode | null> = {
  personal: PersonalReview,
  beneficiaries: BeneficiariesReview,
  assets: AssetsReview,
  guardians: GuardiansReview,
  executor: ExecutorReview,
  bequests: BequestsReview,
  residue: ResidueReview,
}

/** Check if a section has any data worth displaying */
function useSectionHasData(section: WillSection): boolean {
  const testator = useWillStore((s) => s.testator)
  const beneficiaries = useWillStore((s) => s.beneficiaries)
  const assets = useWillStore((s) => s.assets)
  const guardians = useWillStore((s) => s.guardians)
  const executor = useWillStore((s) => s.executor)
  const bequests = useWillStore((s) => s.bequests)
  const residue = useWillStore((s) => s.residue)

  switch (section) {
    case 'personal':
      return !!(testator.firstName || testator.lastName)
    case 'beneficiaries':
      return beneficiaries.length > 0
    case 'assets':
      return assets.length > 0
    case 'guardians':
      return guardians.length > 0
    case 'executor':
      return !!executor.name
    case 'bequests':
      return bequests.length > 0
    case 'residue':
      return !!(residue.beneficiaries?.length || residue.simultaneousDeathClause)
    default:
      return false
  }
}

/**
 * Displays collected data for a single will section in a DaisyUI card.
 *
 * Shows section-specific data (personal info, beneficiaries list, etc.)
 * with an Edit button to navigate back to that section. Empty sections
 * show a "Not yet completed" message with a Start button.
 */
export function SectionReview({ section, onEdit }: SectionReviewProps) {
  const hasData = useSectionHasData(section)
  const Renderer = SECTION_RENDERERS[section]
  const label = SECTION_LABELS[section] ?? section

  return (
    <div className="card card-border bg-base-100">
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-sm">{label}</h3>
          {hasData && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onEdit(section)}
            >
              Edit
            </button>
          )}
        </div>
        {hasData && Renderer ? <Renderer /> : <EmptySection onEdit={() => onEdit(section)} />}
      </div>
    </div>
  )
}
