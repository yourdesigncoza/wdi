import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { snakeToCamel, type AdditionalDocumentResponse } from '../../../services/api.ts'
import type {
  DocumentType,
  LivingWillContent,
  FuneralWishesContent,
} from '../types/additionalDocument.ts'

// --- State shape ---

export interface AdditionalDocState {
  currentDocId: string | null
  documentType: DocumentType | null
  livingWillContent: Partial<LivingWillContent>
  funeralWishesContent: Partial<FuneralWishesContent>
  currentStep: number
  status: string
}

// --- Actions ---

export interface AdditionalDocActions {
  setDocId: (id: string | null) => void
  setDocumentType: (type: DocumentType | null) => void
  updateLivingWill: (data: Partial<LivingWillContent>) => void
  updateFuneralWishes: (data: Partial<FuneralWishesContent>) => void
  setStep: (n: number) => void
  resetDoc: () => void
  loadFromServer: (response: AdditionalDocumentResponse) => void
}

// --- Initial state ---

const initialState: AdditionalDocState = {
  currentDocId: null,
  documentType: null,
  livingWillContent: {
    // Treatment defaults matching backend schema
    lifeSupport: false,
    artificialVentilation: false,
    artificialNutrition: false,
    resuscitationCpr: false,
    antibioticsTerminal: false,
    painManagement: true,
    // Trigger condition defaults
    terminalIllness: true,
    permanentVegetativeState: true,
    permanentUnconsciousness: true,
  },
  funeralWishesContent: {},
  currentStep: 0,
  status: 'draft',
}

// --- Store ---

export const useAdditionalDocStore = create<
  AdditionalDocState & AdditionalDocActions
>()(
  persist(
    immer((set) => ({
      ...initialState,

      setDocId: (id: string | null) =>
        set((state) => {
          state.currentDocId = id
        }),

      setDocumentType: (type: DocumentType | null) =>
        set((state) => {
          state.documentType = type
        }),

      updateLivingWill: (data: Partial<LivingWillContent>) =>
        set((state) => {
          Object.assign(state.livingWillContent, data)
        }),

      updateFuneralWishes: (data: Partial<FuneralWishesContent>) =>
        set((state) => {
          Object.assign(state.funeralWishesContent, data)
        }),

      setStep: (n: number) =>
        set((state) => {
          state.currentStep = n
        }),

      resetDoc: () => set(initialState),

      loadFromServer: (response: AdditionalDocumentResponse) =>
        set((state) => {
          state.currentDocId = response.id
          state.documentType = response.document_type as DocumentType
          state.status = response.status

          const content = response.content || {}
          const camelContent = snakeToCamel(content) as Record<string, unknown>

          if (response.document_type === 'living_will') {
            state.livingWillContent = {
              ...initialState.livingWillContent,
              ...camelContent,
            } as Partial<LivingWillContent>
          } else if (response.document_type === 'funeral_wishes') {
            state.funeralWishesContent =
              camelContent as Partial<FuneralWishesContent>
          }
        }),
    })),
    { name: 'additional-doc-storage' },
  ),
)
