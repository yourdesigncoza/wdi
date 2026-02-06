import { z } from 'zod'

// --- SA-specific validation helpers ---

const SA_ID_REGEX = /^\d{13}$/
const SA_POSTAL_CODE_REGEX = /^\d{4}$/

const SA_PROVINCES = ['EC', 'FS', 'GP', 'KZN', 'LP', 'MP', 'NC', 'NW', 'WC'] as const

// --- Testator schema ---

export const testatorSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  idNumber: z.string().regex(SA_ID_REGEX, 'SA ID must be 13 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.enum(SA_PROVINCES, { message: 'Select a valid province' }),
  postalCode: z.string().regex(SA_POSTAL_CODE_REGEX, 'Postal code must be 4 digits'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
})

export type TestatorFormData = z.infer<typeof testatorSchema>

// --- Marital schema ---

const MARRIED_STATUSES = ['married_in_community', 'married_anc', 'married_cop'] as const

const maritalBaseSchema = z.object({
  status: z.enum(
    ['single', 'married_in_community', 'married_anc', 'married_cop', 'divorced', 'widowed'],
    { message: 'Select a marital status' },
  ),
  spouseFirstName: z.string().optional().or(z.literal('')),
  spouseLastName: z.string().optional().or(z.literal('')),
  spouseIdNumber: z
    .string()
    .regex(SA_ID_REGEX, 'Spouse SA ID must be 13 digits')
    .optional()
    .or(z.literal('')),
  marriedOutsideSa: z.boolean(),
  marriageCountry: z.string().optional().or(z.literal('')),
})

export const maritalSchema = maritalBaseSchema.superRefine((data, ctx) => {
  const isMarried = (MARRIED_STATUSES as readonly string[]).includes(data.status)

  if (isMarried) {
    if (!data.spouseFirstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Spouse first name is required when married',
        path: ['spouseFirstName'],
      })
    }
    if (!data.spouseLastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Spouse last name is required when married',
        path: ['spouseLastName'],
      })
    }
  }

  if (data.marriedOutsideSa && !data.marriageCountry) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Country is required for marriages outside South Africa',
      path: ['marriageCountry'],
    })
  }
})

export type MaritalFormData = z.infer<typeof maritalSchema>

// --- Beneficiary schema (inline validation when adding) ---

export const beneficiarySchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, 'Full name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  idNumber: z
    .string()
    .regex(SA_ID_REGEX, 'SA ID must be 13 digits')
    .optional()
    .or(z.literal('')),
  sharePercent: z.number().min(0).max(100).optional(),
  alternateBeneficiary: z.string().optional().or(z.literal('')),
  isCharity: z.boolean(),
})

export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>

// --- Asset schema ---

export const assetSchema = z.object({
  id: z.string().min(1),
  assetType: z.enum(
    ['property', 'vehicle', 'bank_account', 'investment', 'insurance', 'business', 'other'],
    { message: 'Select an asset type' },
  ),
  description: z.string().min(1, 'Description is required'),
  details: z.string().optional().or(z.literal('')),
})

export type AssetFormData = z.infer<typeof assetSchema>

// --- Guardian schema ---

export const guardianSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, 'Full name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  idNumber: z
    .string()
    .regex(SA_ID_REGEX, 'SA ID must be 13 digits')
    .optional()
    .or(z.literal('')),
  isPrimary: z.boolean(),
})

export type GuardianFormData = z.infer<typeof guardianSchema>

// --- Executor schema ---

export const executorSchema = z.object({
  name: z.string().min(1, 'Executor name is required'),
  relationship: z.string().optional().or(z.literal('')),
  isProfessional: z.boolean(),
  backupName: z.string().optional().or(z.literal('')),
  backupRelationship: z.string().optional().or(z.literal('')),
})

export type ExecutorFormData = z.infer<typeof executorSchema>

// --- Bequest schema ---

export const bequestSchema = z.object({
  id: z.string().min(1),
  itemDescription: z.string().min(1, 'Item description is required'),
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientRelationship: z.string().optional().or(z.literal('')),
})

export type BequestFormData = z.infer<typeof bequestSchema>

// --- Residue schema ---

export const residueBeneficiarySchema = z.object({
  name: z.string().min(1, 'Beneficiary name is required'),
  sharePercent: z.number().min(0).max(100, 'Share must be between 0 and 100'),
})

export const residueSchema = z.object({
  beneficiaries: z.array(residueBeneficiarySchema).min(1, 'At least one residue beneficiary is required'),
  simultaneousDeathClause: z.string().optional().or(z.literal('')),
})

export type ResidueFormData = z.infer<typeof residueSchema>
