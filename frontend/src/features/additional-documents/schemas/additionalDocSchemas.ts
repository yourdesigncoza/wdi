import { z } from 'zod'

// --- SA-specific validation helpers ---

const SA_ID_REGEX = /^\d{13}$/
const SA_PHONE_REGEX = /^(\+27|0)\d{9}$/

// ---------------------------------------------------------------------------
// Living Will schemas (one per step)
// ---------------------------------------------------------------------------

/** Step 0: Personal details */
export const livingWillPersonalSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  idNumber: z.string().regex(SA_ID_REGEX, 'SA ID must be 13 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
})

export type LivingWillPersonalData = z.infer<typeof livingWillPersonalSchema>

/** Step 1: Treatment preferences + trigger conditions */
export const livingWillTreatmentSchema = z.object({
  // Trigger conditions
  terminalIllness: z.boolean(),
  permanentVegetativeState: z.boolean(),
  permanentUnconsciousness: z.boolean(),
  // Treatment preferences
  lifeSupport: z.boolean(),
  artificialVentilation: z.boolean(),
  artificialNutrition: z.boolean(),
  resuscitationCpr: z.boolean(),
  antibioticsTerminal: z.boolean(),
  painManagement: z.boolean(),
})

export type LivingWillTreatmentData = z.infer<typeof livingWillTreatmentSchema>

/** Step 2: Healthcare proxy (all optional) */
export const livingWillProxySchema = z.object({
  proxyName: z.string().optional().or(z.literal('')),
  proxyIdNumber: z
    .string()
    .regex(SA_ID_REGEX, 'SA ID must be 13 digits')
    .optional()
    .or(z.literal('')),
  proxyPhone: z
    .string()
    .regex(SA_PHONE_REGEX, 'Enter a valid SA phone number (e.g. 082 123 4567)')
    .optional()
    .or(z.literal('')),
  proxyRelationship: z.string().optional().or(z.literal('')),
  alternateProxyName: z.string().optional().or(z.literal('')),
})

export type LivingWillProxyData = z.infer<typeof livingWillProxySchema>

/** Step 3: Values and wishes (all optional) */
export const livingWillValuesSchema = z.object({
  personalValues: z.string().optional().or(z.literal('')),
  religiousConsiderations: z.string().optional().or(z.literal('')),
  organDonation: z
    .enum(['yes', 'no', 'undecided'])
    .optional()
    .or(z.literal('')),
  organDonationDetails: z.string().optional().or(z.literal('')),
})

export type LivingWillValuesData = z.infer<typeof livingWillValuesSchema>

// ---------------------------------------------------------------------------
// Funeral Wishes schemas (one per step)
// ---------------------------------------------------------------------------

/** Step 0: Personal details */
export const funeralWishesPersonalSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  idNumber: z.string().regex(SA_ID_REGEX, 'SA ID must be 13 digits'),
})

export type FuneralWishesPersonalData = z.infer<
  typeof funeralWishesPersonalSchema
>

/** Step 1: Body disposition */
export const funeralWishesDispositionSchema = z.object({
  disposition: z.enum(['burial', 'cremation'], {
    message: 'Please select burial or cremation',
  }),
  embalming: z
    .enum(['yes', 'no', 'no_preference'])
    .optional()
    .or(z.literal('')),
  // Burial fields
  cemeteryName: z.string().optional().or(z.literal('')),
  burialLocationDetails: z.string().optional().or(z.literal('')),
  casketPreference: z.string().optional().or(z.literal('')),
  // Cremation fields
  ashesInstruction: z
    .enum(['scatter', 'urn', 'other'])
    .optional()
    .or(z.literal('')),
  ashesDetails: z.string().optional().or(z.literal('')),
})

export type FuneralWishesDispositionData = z.infer<
  typeof funeralWishesDispositionSchema
>

/** Step 2: Ceremony preferences */
export const funeralWishesCeremonySchema = z.object({
  ceremonyType: z
    .enum(['religious', 'secular', 'celebration_of_life', 'none'])
    .optional()
    .or(z.literal('')),
  ceremonyLocation: z.string().optional().or(z.literal('')),
  religiousDenomination: z.string().optional().or(z.literal('')),
  officiantPreference: z.string().optional().or(z.literal('')),
  musicPreferences: z.string().optional().or(z.literal('')),
  readingsOrPoems: z.string().optional().or(z.literal('')),
})

export type FuneralWishesCeremonyData = z.infer<
  typeof funeralWishesCeremonySchema
>

/** Step 3: Additional wishes */
export const funeralWishesAdditionalSchema = z.object({
  specificAttendees: z.string().optional().or(z.literal('')),
  budgetPreference: z
    .enum(['economical', 'moderate', 'elaborate'])
    .optional()
    .or(z.literal('')),
  additionalWishes: z.string().optional().or(z.literal('')),
  messagesToFamily: z.string().optional().or(z.literal('')),
})

export type FuneralWishesAdditionalData = z.infer<
  typeof funeralWishesAdditionalSchema
>
