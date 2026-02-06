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
  WillActions,
  WillSection,
  WillState,
} from '../types/will.ts'

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
  sectionsComplete: {
    personal: false,
    beneficiaries: false,
    assets: false,
    guardians: false,
    executor: false,
    bequests: false,
    residue: false,
  },
  currentSection: 'personal',
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

      markSectionComplete: (section: string) =>
        set((state) => {
          state.sectionsComplete[section] = true
        }),

      setCurrentSection: (section: WillSection) =>
        set((state) => {
          state.currentSection = section
        }),

      resetWill: () => set(initialState),
    })),
    { name: 'wdi-will-draft' },
  ),
)
