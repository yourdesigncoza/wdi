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

/** Human-readable labels for business type values */
const BUSINESS_TYPE_LABELS: Record<string, string> = {
  cc_member_interest: 'CC',
  company_shares: 'Pty Ltd',
  partnership: 'Partnership',
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
  trust: 'Testamentary Trust',
  usufruct: 'Usufruct',
  business: 'Business Assets',
  joint: 'Joint Will',
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
      <button type="button" className="btn btn-neutral btn-sm" onClick={onEdit}>
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

function TrustReview() {
  const trust = useWillStore((s) => s.trustProvisions)

  const hasData =
    trust.trustName ||
    trust.vestingAge ||
    (trust.trustees && trust.trustees.length > 0)
  if (!hasData) return null

  return (
    <div className="space-y-2">
      <table className="text-sm">
        <tbody>
          <DataRow label="Trust Name" value={trust.trustName} />
          <DataRow label="Vesting Age" value={trust.vestingAge?.toString()} />
          <DataRow
            label="Maintenance"
            value={trust.incomeForMaintenance ? 'Income may be used for maintenance' : undefined}
          />
          <DataRow
            label="Education"
            value={trust.capitalForEducation ? 'Capital may be used for education' : undefined}
          />
        </tbody>
      </table>
      {trust.trustees && trust.trustees.length > 0 && (
        <div className="text-sm">
          <span className="font-medium text-base-content/70">Trustees: </span>
          {trust.trustees.map((t, i) => (
            <span key={i}>
              {t.name}
              <span className="text-base-content/50 text-xs ml-1">({t.relationship})</span>
              {i < trust.trustees!.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
      {trust.minorBeneficiaries && trust.minorBeneficiaries.length > 0 && (
        <div className="text-sm">
          <span className="font-medium text-base-content/70">Minor beneficiaries: </span>
          {trust.minorBeneficiaries.join(', ')}
        </div>
      )}
    </div>
  )
}

function UsufructReview() {
  const usufruct = useWillStore((s) => s.usufruct)

  const hasData =
    usufruct.propertyDescription ||
    usufruct.usufructuaryName ||
    (usufruct.bareDominiumHolders && usufruct.bareDominiumHolders.length > 0)
  if (!hasData) return null

  return (
    <div className="space-y-2">
      <table className="text-sm">
        <tbody>
          <DataRow label="Property" value={usufruct.propertyDescription} />
          <DataRow label="Usufructuary" value={usufruct.usufructuaryName} />
          <DataRow label="Duration" value={usufruct.duration} />
        </tbody>
      </table>
      {usufruct.bareDominiumHolders && usufruct.bareDominiumHolders.length > 0 && (
        <div className="text-sm">
          <span className="font-medium text-base-content/70">Bare dominium holders: </span>
          {usufruct.bareDominiumHolders.map((h, i) => (
            <span key={i}>
              {h.name}
              <span className="badge badge-sm badge-outline ml-1">{h.sharePercent}%</span>
              {i < usufruct.bareDominiumHolders!.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function BusinessReview() {
  const businessAssets = useWillStore((s) => s.businessAssets)
  if (businessAssets.length === 0) return null

  return (
    <div className="space-y-2">
      {businessAssets.map((asset) => (
        <div key={asset.id} className="flex flex-wrap items-baseline gap-x-3 text-sm">
          <span className="badge badge-sm badge-ghost">
            {BUSINESS_TYPE_LABELS[asset.businessType] ?? asset.businessType}
          </span>
          <span className="font-medium">{asset.businessName}</span>
          {asset.percentageHeld != null && (
            <span className="text-base-content/60">({asset.percentageHeld}%)</span>
          )}
          {asset.heirName && (
            <span className="text-xs text-base-content/50">
              Heir: {asset.heirName}
            </span>
          )}
          {asset.businessType === 'cc_member_interest' && (
            <span className="badge badge-sm badge-warning">Requires consent</span>
          )}
        </div>
      ))}
    </div>
  )
}

function JointWillReview() {
  const jointWill = useWillStore((s) => s.jointWill)

  const hasData = !!(jointWill.coTestatorFirstName || jointWill.willStructure)
  if (!hasData) return null

  const coTestatorName = [jointWill.coTestatorFirstName, jointWill.coTestatorLastName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="space-y-2">
      <table className="text-sm">
        <tbody>
          <DataRow label="Co-testator" value={coTestatorName || undefined} />
          <DataRow label="ID Number" value={jointWill.coTestatorIdNumber} />
          <DataRow
            label="Structure"
            value={jointWill.willStructure === 'mutual' ? 'Mutual Will' : jointWill.willStructure === 'mirror' ? 'Mirror Will' : undefined}
          />
          <DataRow label="Massing" value={jointWill.massing ? 'Estates massed' : jointWill.massing === false ? 'Not massed' : undefined} />
          <DataRow
            label="Irrevocability"
            value={jointWill.irrevocabilityAcknowledged ? 'Acknowledged' : undefined}
          />
        </tbody>
      </table>
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
  trust: TrustReview,
  usufruct: UsufructReview,
  business: BusinessReview,
  joint: JointWillReview,
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
  const trustProvisions = useWillStore((s) => s.trustProvisions)
  const usufruct = useWillStore((s) => s.usufruct)
  const businessAssets = useWillStore((s) => s.businessAssets)
  const jointWill = useWillStore((s) => s.jointWill)

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
    case 'trust':
      return !!(
        trustProvisions.trustName ||
        trustProvisions.vestingAge ||
        (trustProvisions.trustees && trustProvisions.trustees.length > 0)
      )
    case 'usufruct':
      return !!(
        usufruct.propertyDescription ||
        usufruct.usufructuaryName ||
        (usufruct.bareDominiumHolders && usufruct.bareDominiumHolders.length > 0)
      )
    case 'business':
      return businessAssets.length > 0
    case 'joint':
      return !!(jointWill.coTestatorFirstName || jointWill.willStructure)
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
 *
 * Supports both basic sections and complex sections (trust, usufruct,
 * business, joint).
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
