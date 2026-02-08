import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Beneficiary,
  Asset,
  Guardian,
  Bequest,
  ExecutorInfo,
  MaritalInfo,
  ResidueInfo,
  Testator,
  TrustProvisions,
  UsufructProvision,
  BusinessAssetDetail,
  JointWillConfig,
  ComplexScenario,
  WillActions,
  WillSection,
  WillState,
} from '../types/will.ts'
import { snakeToCamel, type WillResponse } from '../../../services/api.ts'

const initialState: WillState = {
  willId: null,
  testator: {},
  marital: {},
  beneficiaries: [],
  assets: [],
  guardians: [],
  executor: {},
  bequests: [],
  residue: {},
  trustProvisions: {},
  usufruct: {},
  businessAssets: [],
  jointWill: {},
  scenarios: [],
  sectionsComplete: {
    personal: false,
    beneficiaries: false,
    assets: false,
    guardians: false,
    executor: false,
    bequests: false,
    residue: false,
    trust: false,
    usufruct: false,
    business: false,
    joint: false,
  },
  currentSection: 'personal',
  verificationResult: null,
  acknowledgedWarnings: [],
}

export const useWillStore = create<WillState & WillActions>()(
  persist(
    immer((set) => ({
      ...initialState,

      setWillId: (id: string) =>
        set((state) => {
          state.willId = id
        }),

      updateTestator: (data: Partial<Testator>) =>
        set((state) => {
          Object.assign(state.testator, data)
        }),

      updateMarital: (data: Partial<MaritalInfo>) =>
        set((state) => {
          Object.assign(state.marital, data)
        }),

      addBeneficiary: (beneficiary: Beneficiary) =>
        set((state) => {
          state.beneficiaries.push(beneficiary)
        }),

      removeBeneficiary: (id: string) =>
        set((state) => {
          state.beneficiaries = state.beneficiaries.filter((b) => b.id !== id)
        }),

      updateBeneficiary: (id: string, data: Partial<Beneficiary>) =>
        set((state) => {
          const index = state.beneficiaries.findIndex((b) => b.id === id)
          if (index !== -1) {
            Object.assign(state.beneficiaries[index], data)
          }
        }),

      addAsset: (asset: Asset) =>
        set((state) => {
          state.assets.push(asset)
        }),

      removeAsset: (id: string) =>
        set((state) => {
          state.assets = state.assets.filter((a) => a.id !== id)
        }),

      addGuardian: (guardian: Guardian) =>
        set((state) => {
          state.guardians.push(guardian)
        }),

      removeGuardian: (id: string) =>
        set((state) => {
          state.guardians = state.guardians.filter((g) => g.id !== id)
        }),

      updateExecutor: (data: Partial<ExecutorInfo>) =>
        set((state) => {
          Object.assign(state.executor, data)
        }),

      addBequest: (bequest: Bequest) =>
        set((state) => {
          state.bequests.push(bequest)
        }),

      removeBequest: (id: string) =>
        set((state) => {
          state.bequests = state.bequests.filter((b) => b.id !== id)
        }),

      updateResidue: (data: Partial<ResidueInfo>) =>
        set((state) => {
          Object.assign(state.residue, data)
        }),

      updateTrustProvisions: (data: Partial<TrustProvisions>) =>
        set((state) => {
          Object.assign(state.trustProvisions, data)
        }),

      updateUsufruct: (data: Partial<UsufructProvision>) =>
        set((state) => {
          Object.assign(state.usufruct, data)
        }),

      addBusinessAsset: (asset: BusinessAssetDetail) =>
        set((state) => {
          state.businessAssets.push(asset)
        }),

      removeBusinessAsset: (id: string) =>
        set((state) => {
          state.businessAssets = state.businessAssets.filter((b) => b.id !== id)
        }),

      updateJointWill: (data: Partial<JointWillConfig>) =>
        set((state) => {
          Object.assign(state.jointWill, data)
        }),

      setScenarios: (scenarios: ComplexScenario[]) =>
        set((state) => {
          state.scenarios = scenarios
        }),

      markSectionComplete: (section: string) =>
        set((state) => {
          state.sectionsComplete[section] = true
        }),

      setCurrentSection: (section: WillSection) =>
        set((state) => {
          state.currentSection = section
        }),

      setVerificationResult: (result: Record<string, unknown> | null) =>
        set((state) => {
          state.verificationResult = result
        }),

      setAcknowledgedWarnings: (codes: string[]) =>
        set((state) => {
          state.acknowledgedWarnings = codes
        }),

      loadFromServer: (will: WillResponse) =>
        set((state) => {
          state.willId = will.id
          state.testator = snakeToCamel(will.testator || {}) as Partial<Testator>
          state.marital = snakeToCamel(will.marital || {}) as Partial<MaritalInfo>
          state.beneficiaries = (will.beneficiaries || []).map(b => snakeToCamel(b) as unknown as Beneficiary)
          state.assets = (will.assets || []).map(a => snakeToCamel(a) as unknown as Asset)
          state.guardians = (will.guardians || []).map(g => snakeToCamel(g) as unknown as Guardian)
          state.executor = snakeToCamel(will.executor || {}) as unknown as Partial<ExecutorInfo>
          state.bequests = (will.bequests || []).map(b => snakeToCamel(b) as unknown as Bequest)
          state.residue = snakeToCamel(will.residue || {}) as Partial<ResidueInfo>
          state.trustProvisions = snakeToCamel(will.trust_provisions || {}) as Partial<TrustProvisions>
          state.usufruct = snakeToCamel(will.usufruct || {}) as Partial<UsufructProvision>
          state.businessAssets = (will.business_assets || []).map(b => snakeToCamel(b) as unknown as BusinessAssetDetail)
          state.jointWill = snakeToCamel(will.joint_will || {}) as Partial<JointWillConfig>
          state.scenarios = (will.scenarios || []) as ComplexScenario[]
          state.sectionsComplete = will.sections_complete || {}
          state.currentSection = (will.current_section || 'personal') as WillSection
        }),

      resetWill: () => set(initialState),
    })),
    { name: 'wdi-will-draft' },
  ),
)
