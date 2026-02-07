import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maritalSchema } from '../schemas/willSchemas.ts'
import type { MaritalFormData } from '../schemas/willSchemas.ts'
import { useWillStore } from '../store/useWillStore.ts'

const MARITAL_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married_in_community', label: 'Married in Community of Property' },
  { value: 'married_anc', label: 'Married with ANC (Antenuptial Contract)' },
  { value: 'married_cop', label: 'Married with Accrual (COP)' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
] as const

const MARRIED_PREFIXES = ['married_in_community', 'married_anc', 'married_cop']

interface MaritalFormProps {
  /** Navigate back to the personal details sub-step */
  onBackToPersonal: () => void
}

export function MaritalForm({ onBackToPersonal }: MaritalFormProps) {
  const marital = useWillStore((s) => s.marital)
  const updateMarital = useWillStore((s) => s.updateMarital)
  const markSectionComplete = useWillStore((s) => s.markSectionComplete)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MaritalFormData>({
    resolver: zodResolver(maritalSchema),
    defaultValues: {
      status: marital.status,
      spouseFirstName: marital.spouseFirstName ?? '',
      spouseLastName: marital.spouseLastName ?? '',
      spouseIdNumber: marital.spouseIdNumber ?? '',
      marriedOutsideSa: marital.marriedOutsideSa ?? false,
      marriageCountry: marital.marriageCountry ?? '',
    },
  })

  const watchedStatus = watch('status')
  const watchedMarriedOutsideSa = watch('marriedOutsideSa')
  const isMarried = MARRIED_PREFIXES.includes(watchedStatus)

  function onSubmit(data: MaritalFormData) {
    updateMarital(data)
    markSectionComplete('personal')
    setCurrentSection('beneficiaries')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-xl font-bold text-base-content">Marital Status</h2>
      <p className="text-sm text-base-content/60">
        Your marital status affects how your estate is distributed under South African law.
      </p>

      {/* Marital status select */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Marital Status *</legend>
        <select
          className={`select select-bordered w-full ${errors.status ? 'select-error' : ''}`}
          {...register('status')}
        >
          <option value="">Select your marital status</option>
          {MARITAL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {errors.status && (
          <p className="text-error text-xs mt-1">{errors.status.message}</p>
        )}
      </fieldset>

      {/* Conditional spouse fields */}
      {isMarried && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-base-content">Spouse Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Spouse First Name *</legend>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.spouseFirstName ? 'input-error' : ''}`}
                placeholder="Spouse first name"
                {...register('spouseFirstName')}
              />
              {errors.spouseFirstName && (
                <p className="text-error text-xs mt-1">{errors.spouseFirstName.message}</p>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Spouse Last Name *</legend>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.spouseLastName ? 'input-error' : ''}`}
                placeholder="Spouse last name"
                {...register('spouseLastName')}
              />
              {errors.spouseLastName && (
                <p className="text-error text-xs mt-1">{errors.spouseLastName.message}</p>
              )}
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Spouse SA ID Number (optional)</legend>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.spouseIdNumber ? 'input-error' : ''}`}
              placeholder="13-digit ID number"
              maxLength={13}
              {...register('spouseIdNumber')}
            />
            {errors.spouseIdNumber && (
              <p className="text-error text-xs mt-1">{errors.spouseIdNumber.message}</p>
            )}
          </fieldset>

          {/* Married outside SA */}
          <fieldset className="fieldset">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="checkbox"
                {...register('marriedOutsideSa')}
              />
              <span className="text-base-content">Married outside South Africa</span>
            </label>
          </fieldset>

          {watchedMarriedOutsideSa && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Country of Marriage *</legend>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.marriageCountry ? 'input-error' : ''}`}
                placeholder="e.g. United Kingdom"
                {...register('marriageCountry')}
              />
              {errors.marriageCountry && (
                <p className="text-error text-xs mt-1">{errors.marriageCountry.message}</p>
              )}
            </fieldset>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          className="btn btn-soft"
          onClick={onBackToPersonal}
        >
          Back to Personal
        </button>
        <button
          type="submit"
          className="btn btn-neutral"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            'Save & Continue'
          )}
        </button>
      </div>
    </form>
  )
}
