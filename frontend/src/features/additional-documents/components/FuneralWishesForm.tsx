import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useApi } from '../../../contexts/AuthApiContext.tsx'
import { useAdditionalDocStore } from '../store/useAdditionalDocStore.ts'
import { camelToSnake } from '../types/additionalDocument.ts'
import {
  funeralWishesPersonalSchema,
  funeralWishesDispositionSchema,
  funeralWishesCeremonySchema,
  funeralWishesAdditionalSchema,
  type FuneralWishesPersonalData,
  type FuneralWishesDispositionData,
  type FuneralWishesCeremonyData,
  type FuneralWishesAdditionalData,
} from '../schemas/additionalDocSchemas.ts'

const STEPS = ['Personal Details', 'Body Disposition', 'Ceremony', 'Additional Wishes']

interface FuneralWishesFormProps {
  docId: string
  onComplete: () => void
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Step indicator (shared pattern)
// ---------------------------------------------------------------------------

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <ul className="steps steps-horizontal w-full mb-8">
      {steps.map((label, i) => (
        <li
          key={label}
          className={`step ${i <= current ? 'step-neutral' : ''}`}
        >
          <span className="text-xs">{label}</span>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Step 0: Personal Details
// ---------------------------------------------------------------------------

function PersonalStep({
  onNext,
}: {
  onNext: (data: FuneralWishesPersonalData) => void
}) {
  const content = useAdditionalDocStore((s) => s.funeralWishesContent)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FuneralWishesPersonalData>({
    resolver: zodResolver(funeralWishesPersonalSchema),
    defaultValues: {
      fullName: content.fullName ?? '',
      idNumber: content.idNumber ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">Personal Details</h3>
      <p className="text-sm text-base-content/60">
        Provide your details for identification purposes.
      </p>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Full Name *</legend>
        <input
          type="text"
          className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
          placeholder="e.g. Thabo Mokoena"
          {...register('fullName')}
        />
        {errors.fullName && (
          <p className="text-error text-xs mt-1">{errors.fullName.message}</p>
        )}
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">SA ID Number *</legend>
        <input
          type="text"
          className={`input input-bordered w-full ${errors.idNumber ? 'input-error' : ''}`}
          placeholder="13-digit ID number"
          maxLength={13}
          {...register('idNumber')}
        />
        {errors.idNumber && (
          <p className="text-error text-xs mt-1">{errors.idNumber.message}</p>
        )}
      </fieldset>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-neutral">
          Next
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Body Disposition
// ---------------------------------------------------------------------------

function DispositionStep({
  onNext,
  onPrev,
}: {
  onNext: (data: FuneralWishesDispositionData) => void
  onPrev: () => void
}) {
  const content = useAdditionalDocStore((s) => s.funeralWishesContent)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FuneralWishesDispositionData>({
    resolver: zodResolver(funeralWishesDispositionSchema),
    defaultValues: {
      disposition: (content.disposition as 'burial' | 'cremation') || undefined,
      embalming: (content.embalming === true
        ? 'yes'
        : content.embalming === false
          ? 'no'
          : '') as '' | 'yes' | 'no' | 'no_preference',
      cemeteryName: content.cemeteryName ?? '',
      burialLocationDetails: content.burialLocationDetails ?? '',
      casketPreference: content.casketPreference ?? '',
      ashesInstruction: (content.ashesInstruction as 'scatter' | 'urn' | 'other') || '',
      ashesDetails: content.ashesDetails ?? '',
    },
  })

  const disposition = watch('disposition')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">Body Disposition</h3>
      <p className="text-sm text-base-content/60">
        Indicate your preference for what happens after you pass away.
      </p>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Disposition Preference *</legend>
        <div className="flex gap-6 mt-1">
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="burial"
              {...register('disposition')}
            />
            <span className="label-text">Burial</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="cremation"
              {...register('disposition')}
            />
            <span className="label-text">Cremation</span>
          </label>
        </div>
        {errors.disposition && (
          <p className="text-error text-xs mt-1">
            {errors.disposition.message}
          </p>
        )}
      </fieldset>

      {/* Burial-specific fields */}
      {disposition === 'burial' && (
        <div className="space-y-4 pl-2 border-l-2 border-base-300 ml-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Cemetery Name</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Westpark Cemetery"
              {...register('cemeteryName')}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Burial Location Details</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Family plot, section B"
              {...register('burialLocationDetails')}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Casket Preference</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Simple wooden casket"
              {...register('casketPreference')}
            />
          </fieldset>
        </div>
      )}

      {/* Cremation-specific fields */}
      {disposition === 'cremation' && (
        <div className="space-y-4 pl-2 border-l-2 border-base-300 ml-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">What should be done with the ashes?</legend>
            <select
              className="select select-bordered w-full"
              {...register('ashesInstruction')}
            >
              <option value="">Select an option</option>
              <option value="scatter">Scatter at a specific location</option>
              <option value="urn">Keep in an urn</option>
              <option value="other">Other arrangement</option>
            </select>
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Ashes Details</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Scatter at Camps Bay beach"
              {...register('ashesDetails')}
            />
          </fieldset>
        </div>
      )}

      {/* Embalming */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Embalming Preference</legend>
        <div className="flex flex-wrap gap-4 mt-1">
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="yes"
              {...register('embalming')}
            />
            <span className="label-text">Yes</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="no"
              {...register('embalming')}
            />
            <span className="label-text">No</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="no_preference"
              {...register('embalming')}
            />
            <span className="label-text">No preference</span>
          </label>
        </div>
      </fieldset>

      <div className="flex justify-between">
        <button type="button" className="btn btn-soft" onClick={onPrev}>
          Back
        </button>
        <button type="submit" className="btn btn-neutral">
          Next
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Ceremony Preferences
// ---------------------------------------------------------------------------

function CeremonyStep({
  onNext,
  onPrev,
}: {
  onNext: (data: FuneralWishesCeremonyData) => void
  onPrev: () => void
}) {
  const content = useAdditionalDocStore((s) => s.funeralWishesContent)
  const {
    register,
    handleSubmit,
    watch,
  } = useForm<FuneralWishesCeremonyData>({
    resolver: zodResolver(funeralWishesCeremonySchema),
    defaultValues: {
      ceremonyType: (content.ceremonyType as 'religious' | 'secular' | 'celebration_of_life' | 'none') || '',
      ceremonyLocation: content.ceremonyLocation ?? '',
      religiousDenomination: content.religiousDenomination ?? '',
      officiantPreference: content.officiantPreference ?? '',
      musicPreferences: content.musicPreferences ?? '',
      readingsOrPoems: content.readingsOrPoems ?? '',
    },
  })

  const ceremonyType = watch('ceremonyType')

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">
        Ceremony Preferences
      </h3>
      <p className="text-sm text-base-content/60">
        Share your preferences for the funeral or memorial service.
      </p>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Type of Ceremony</legend>
        <select
          className="select select-bordered w-full"
          {...register('ceremonyType')}
        >
          <option value="">Select a type</option>
          <option value="religious">Religious service</option>
          <option value="secular">Secular (non-religious) service</option>
          <option value="celebration_of_life">Celebration of life</option>
          <option value="none">No ceremony</option>
        </select>
      </fieldset>

      {ceremonyType === 'religious' && (
        <div className="space-y-4 pl-2 border-l-2 border-base-300 ml-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Religious Denomination</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Dutch Reformed, Catholic, Methodist"
              {...register('religiousDenomination')}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Officiant Preference</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Pastor John at Grace Church"
              {...register('officiantPreference')}
            />
          </fieldset>
        </div>
      )}

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Ceremony Location</legend>
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="e.g. St. Mary's Church, Rosebank, or at the graveside"
          {...register('ceremonyLocation')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Music Preferences</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="List any hymns, songs, or music you would like played"
          {...register('musicPreferences')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Readings or Poems</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Any specific scripture, poems, or readings?"
          {...register('readingsOrPoems')}
        />
      </fieldset>

      <div className="flex justify-between">
        <button type="button" className="btn btn-soft" onClick={onPrev}>
          Back
        </button>
        <button type="submit" className="btn btn-neutral">
          Next
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Additional Wishes
// ---------------------------------------------------------------------------

function AdditionalStep({
  onPrev,
  onSave,
  saving,
}: {
  onPrev: () => void
  onSave: (data: FuneralWishesAdditionalData) => void
  saving: boolean
}) {
  const content = useAdditionalDocStore((s) => s.funeralWishesContent)
  const { register, handleSubmit } = useForm<FuneralWishesAdditionalData>({
    resolver: zodResolver(funeralWishesAdditionalSchema),
    defaultValues: {
      specificAttendees: content.specificAttendees ?? '',
      budgetPreference: (content.budgetPreference as 'economical' | 'moderate' | 'elaborate') || '',
      additionalWishes: content.additionalWishes ?? '',
      messagesToFamily: content.messagesToFamily ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">
        Additional Wishes
      </h3>
      <p className="text-sm text-base-content/60">
        Any final wishes, messages, or preferences you would like to record.
      </p>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">People Who Must Be Notified</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="List people who should be informed of your passing"
          {...register('specificAttendees')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Budget Preference</legend>
        <div className="flex flex-wrap gap-4 mt-1">
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="economical"
              {...register('budgetPreference')}
            />
            <span className="label-text">Economical</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="moderate"
              {...register('budgetPreference')}
            />
            <span className="label-text">Moderate</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="elaborate"
              {...register('budgetPreference')}
            />
            <span className="label-text">Elaborate</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Additional Wishes</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Any other wishes for your funeral arrangements?"
          {...register('additionalWishes')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Messages to Family</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Any personal messages you wish to leave for your loved ones"
          {...register('messagesToFamily')}
        />
      </fieldset>

      <div className="alert alert-warning">
        <p className="text-sm">
          This document records your wishes but is not legally binding. Your
          executor has final authority over funeral arrangements.
        </p>
      </div>

      <div className="flex justify-between mt-6">
        <button type="button" className="btn btn-soft" onClick={onPrev}>
          Back
        </button>
        <button type="submit" className="btn btn-neutral" disabled={saving}>
          {saving ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            'Save & Complete'
          )}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main form component
// ---------------------------------------------------------------------------

export function FuneralWishesForm({ docId, onComplete, onBack }: FuneralWishesFormProps) {
  const [step, setStep] = useState(
    useAdditionalDocStore.getState().currentStep,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const api = useApi()
  const updateFuneralWishes = useAdditionalDocStore((s) => s.updateFuneralWishes)
  const setStoreStep = useAdditionalDocStore((s) => s.setStep)
  const content = useAdditionalDocStore((s) => s.funeralWishesContent)

  function goTo(n: number) {
    setStep(n)
    setStoreStep(n)
  }

  function handlePersonal(data: FuneralWishesPersonalData) {
    updateFuneralWishes(data)
    goTo(1)
  }

  function handleDisposition(data: FuneralWishesDispositionData) {
    // Convert embalming radio to boolean | null
    const embalming =
      data.embalming === 'yes'
        ? true
        : data.embalming === 'no'
          ? false
          : null

    updateFuneralWishes({
      disposition: data.disposition,
      embalming,
      cemeteryName: data.cemeteryName || null,
      burialLocationDetails: data.burialLocationDetails || null,
      casketPreference: data.casketPreference || null,
      ashesInstruction: data.ashesInstruction || null,
      ashesDetails: data.ashesDetails || null,
    })
    goTo(2)
  }

  function handleCeremony(data: FuneralWishesCeremonyData) {
    updateFuneralWishes({
      ceremonyType: data.ceremonyType || null,
      ceremonyLocation: data.ceremonyLocation || null,
      religiousDenomination: data.religiousDenomination || null,
      officiantPreference: data.officiantPreference || null,
      musicPreferences: data.musicPreferences || null,
      readingsOrPoems: data.readingsOrPoems || null,
    })
    goTo(3)
  }

  async function handleSave(data: FuneralWishesAdditionalData) {
    setSaving(true)
    setError(null)

    const additionalUpdate = {
      specificAttendees: data.specificAttendees || null,
      budgetPreference: data.budgetPreference || null,
      additionalWishes: data.additionalWishes || null,
      messagesToFamily: data.messagesToFamily || null,
    }
    updateFuneralWishes(additionalUpdate)

    // Merge all content and convert to snake_case for backend
    const fullContent = {
      ...content,
      ...additionalUpdate,
    }
    const snakeContent = camelToSnake(
      fullContent as unknown as Record<string, unknown>,
    )

    try {
      await api.updateAdditionalDocument(docId, {
        content: snakeContent,
        status: 'completed',
      })
      onComplete()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save funeral wishes',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h2 className="card-title">Funeral Wishes</h2>
          <button type="button" className="btn btn-warning btn-sm" onClick={onBack}>
            Cancel
          </button>
        </div>

        <StepIndicator current={step} steps={STEPS} />

        {error && (
          <div className="alert alert-error mb-4">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {step === 0 && <PersonalStep onNext={handlePersonal} />}
        {step === 1 && (
          <DispositionStep onNext={handleDisposition} onPrev={() => goTo(0)} />
        )}
        {step === 2 && (
          <CeremonyStep onNext={handleCeremony} onPrev={() => goTo(1)} />
        )}
        {step === 3 && (
          <AdditionalStep
            onPrev={() => goTo(2)}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
