// Will data types for WillCraft SA
// Covers all sections: testator, marital, beneficiaries, assets, guardians, executor, bequests, residue

// --- Enums ---

export const MaritalStatus = {
  SINGLE: 'single',
  MARRIED_IN_COMMUNITY: 'married_in_community',
  MARRIED_ANC: 'married_anc',
  MARRIED_COP: 'married_cop',
  DIVORCED: 'divorced',
  WIDOWED: 'widowed',
} as const

export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus]

export const Province = {
  EC: 'EC',
  FS: 'FS',
  GP: 'GP',
  KZN: 'KZN',
  LP: 'LP',
  MP: 'MP',
  NC: 'NC',
  NW: 'NW',
  WC: 'WC',
} as const

export type Province = (typeof Province)[keyof typeof Province]

export const AssetType = {
  PROPERTY: 'property',
  VEHICLE: 'vehicle',
  BANK_ACCOUNT: 'bank_account',
  INVESTMENT: 'investment',
  INSURANCE: 'insurance',
  BUSINESS: 'business',
  OTHER: 'other',
} as const

export type AssetType = (typeof AssetType)[keyof typeof AssetType]

// --- Interfaces ---

export interface Testator {
  firstName: string
  lastName: string
  idNumber: string
  dateOfBirth: string
  address: string
  city: string
  province: Province
  postalCode: string
  phone: string
  email: string
}

export interface MaritalInfo {
  status: MaritalStatus
  spouseFirstName?: string
  spouseLastName?: string
  spouseIdNumber?: string
  marriedOutsideSa: boolean
  marriageCountry?: string
}

export interface Beneficiary {
  id: string
  fullName: string
  relationship: string
  idNumber?: string
  sharePercent?: number
  alternateBeneficiary?: string
  isCharity: boolean
}

export interface Asset {
  id: string
  assetType: AssetType
  description: string
  details?: string
}

export interface Guardian {
  id: string
  fullName: string
  relationship: string
  idNumber?: string
  isPrimary: boolean
}

export interface ExecutorInfo {
  name: string
  relationship?: string
  isProfessional: boolean
  backupName?: string
  backupRelationship?: string
}

export interface Bequest {
  id: string
  itemDescription: string
  recipientName: string
  recipientRelationship?: string
}

export interface ResidueBeneficiary {
  name: string
  sharePercent: number
}

export interface ResidueInfo {
  beneficiaries: ResidueBeneficiary[]
  simultaneousDeathClause?: string
}

// --- Section tracking ---

export const WILL_SECTIONS = [
  'personal',
  'beneficiaries',
  'assets',
  'guardians',
  'executor',
  'bequests',
  'residue',
  'review',
] as const

export type WillSection = (typeof WILL_SECTIONS)[number]

export type SectionsComplete = Record<string, boolean>

// --- Store types ---

export interface WillState {
  willId: string | null
  testator: Partial<Testator>
  marital: Partial<MaritalInfo>
  beneficiaries: Beneficiary[]
  assets: Asset[]
  guardians: Guardian[]
  executor: Partial<ExecutorInfo>
  bequests: Bequest[]
  residue: Partial<ResidueInfo>
  sectionsComplete: SectionsComplete
  currentSection: WillSection
}

export interface WillActions {
  setWillId: (id: string) => void
  updateTestator: (data: Partial<Testator>) => void
  updateMarital: (data: Partial<MaritalInfo>) => void
  addBeneficiary: (beneficiary: Beneficiary) => void
  removeBeneficiary: (id: string) => void
  updateBeneficiary: (id: string, data: Partial<Beneficiary>) => void
  addAsset: (asset: Asset) => void
  removeAsset: (id: string) => void
  addGuardian: (guardian: Guardian) => void
  removeGuardian: (id: string) => void
  updateExecutor: (data: Partial<ExecutorInfo>) => void
  addBequest: (bequest: Bequest) => void
  removeBequest: (id: string) => void
  updateResidue: (data: Partial<ResidueInfo>) => void
  markSectionComplete: (section: string) => void
  setCurrentSection: (section: WillSection) => void
  resetWill: () => void
}
