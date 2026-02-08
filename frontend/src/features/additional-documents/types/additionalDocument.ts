// Additional document types for WillCraft SA
// Covers living will (advance healthcare directive) and funeral wishes

// --- Document type discriminator ---

export type DocumentType = 'living_will' | 'funeral_wishes'

// --- Living Will Content ---

export interface LivingWillContent {
  // Personal details
  fullName: string
  idNumber: string
  dateOfBirth: string
  address: string

  // Treatment preferences
  lifeSupport: boolean
  artificialVentilation: boolean
  artificialNutrition: boolean
  resuscitationCpr: boolean
  antibioticsTerminal: boolean
  painManagement: boolean

  // Trigger conditions
  terminalIllness: boolean
  permanentVegetativeState: boolean
  permanentUnconsciousness: boolean

  // Healthcare proxy
  proxyName: string | null
  proxyIdNumber: string | null
  proxyPhone: string | null
  proxyRelationship: string | null
  alternateProxyName: string | null

  // Values and wishes
  personalValues: string | null
  religiousConsiderations: string | null
  organDonation: boolean | null
  organDonationDetails: string | null
}

// --- Funeral Wishes Content ---

export interface FuneralWishesContent {
  // Personal details
  fullName: string
  idNumber: string

  // Body disposition
  disposition: string // "burial" | "cremation"
  embalming: boolean | null

  // Burial specifics
  cemeteryName: string | null
  burialLocationDetails: string | null
  casketPreference: string | null

  // Cremation specifics
  ashesInstruction: string | null // "scatter" | "urn" | "other"
  ashesDetails: string | null

  // Ceremony preferences
  ceremonyType: string | null // "religious" | "secular" | "celebration_of_life" | "none"
  ceremonyLocation: string | null
  religiousDenomination: string | null
  officiantPreference: string | null

  // Music and readings
  musicPreferences: string | null
  readingsOrPoems: string | null

  // Attendees
  specificAttendees: string | null

  // Budget
  budgetPreference: string | null // "economical" | "moderate" | "elaborate"

  // Additional wishes
  additionalWishes: string | null
  messagesToFamily: string | null
}

// --- Utility: camelCase to snake_case conversion ---

/** Convert a camelCase key to snake_case */
function camelToSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

/** Convert an object's camelCase keys to snake_case for backend API calls */
export function camelToSnake(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnakeKey(key)] = value
  }
  return result
}
