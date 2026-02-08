import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useApi } from '../../../contexts/AuthApiContext.tsx'
import { useAdditionalDocStore } from '../store/useAdditionalDocStore.ts'
import { camelToSnake } from '../types/additionalDocument.ts'
import {
  livingWillPersonalSchema,
  livingWillTreatmentSchema,
  livingWillProxySchema,
  livingWillValuesSchema,
  type LivingWillPersonalData,
  type LivingWillTreatmentData,
  type LivingWillProxyData,
  type LivingWillValuesData,
} from '../schemas/additionalDocSchemas.ts'

const STEPS = ['Personal Details', 'Treatment Preferences', 'Healthcare Proxy', 'Values & Wishes']

interface LivingWillFormProps {
  docId: string
  onComplete: () => void
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Step indicator
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
  onNext: (data: LivingWillPersonalData) => void
}) {
  const content = useAdditionalDocStore((s) => s.livingWillContent)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LivingWillPersonalData>({
    resolver: zodResolver(livingWillPersonalSchema),
    defaultValues: {
      fullName: content.fullName ?? '',
      idNumber: content.idNumber ?? '',
      dateOfBirth: content.dateOfBirth ?? '',
      address: content.address ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">Personal Details</h3>
      <p className="text-sm text-base-content/60">
        Provide your details as they appear on your South African ID.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Date of Birth *</legend>
          <input
            type="date"
            className={`input input-bordered w-full ${errors.dateOfBirth ? 'input-error' : ''}`}
            {...register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <p className="text-error text-xs mt-1">
              {errors.dateOfBirth.message}
            </p>
          )}
        </fieldset>
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Residential Address *</legend>
        <input
          type="text"
          className={`input input-bordered w-full ${errors.address ? 'input-error' : ''}`}
          placeholder="e.g. 42 Mandela Drive, Sandton, 2196"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-error text-xs mt-1">{errors.address.message}</p>
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
// Step 1: Treatment Preferences
// ---------------------------------------------------------------------------

function TreatmentStep({
  onNext,
  onPrev,
}: {
  onNext: (data: LivingWillTreatmentData) => void
  onPrev: () => void
}) {
  const content = useAdditionalDocStore((s) => s.livingWillContent)
  const { register, handleSubmit } = useForm<LivingWillTreatmentData>({
    resolver: zodResolver(livingWillTreatmentSchema),
    defaultValues: {
      terminalIllness: content.terminalIllness ?? true,
      permanentVegetativeState: content.permanentVegetativeState ?? true,
      permanentUnconsciousness: content.permanentUnconsciousness ?? true,
      lifeSupport: content.lifeSupport ?? false,
      artificialVentilation: content.artificialVentilation ?? false,
      artificialNutrition: content.artificialNutrition ?? false,
      resuscitationCpr: content.resuscitationCpr ?? false,
      antibioticsTerminal: content.antibioticsTerminal ?? false,
      painManagement: content.painManagement ?? true,
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <h3 className="text-lg font-bold text-base-content">
        Treatment Preferences
      </h3>
      <div className="alert alert-info">
        <p className="text-sm">
          These are YOUR preferences -- we do not advise on medical treatment
          decisions. Please consult a medical professional if you need guidance.
        </p>
      </div>

      {/* Trigger conditions */}
      <div className="space-y-2">
        <h4 className="font-semibold text-base-content/80">
          When should this directive apply?
        </h4>
        <p className="text-xs text-base-content/50">
          Select the conditions under which your treatment preferences take
          effect.
        </p>

        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('terminalIllness')} />
          <span className="label-text">Terminal illness (no reasonable prospect of recovery)</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('permanentVegetativeState')} />
          <span className="label-text">Permanent vegetative state</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('permanentUnconsciousness')} />
          <span className="label-text">Permanent unconsciousness</span>
        </label>
      </div>

      {/* Treatment preferences */}
      <div className="space-y-2">
        <h4 className="font-semibold text-base-content/80">
          Treatment Decisions
        </h4>
        <p className="text-xs text-base-content/50">
          Toggle ON to accept, OFF to refuse each treatment.
        </p>

        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('lifeSupport')} />
          <span className="label-text">Life support / artificial ventilation</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('artificialVentilation')} />
          <span className="label-text">Artificial ventilation (mechanical breathing)</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('artificialNutrition')} />
          <span className="label-text">Artificial nutrition (feeding tubes)</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('resuscitationCpr')} />
          <span className="label-text">Resuscitation (CPR)</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle" {...register('antibioticsTerminal')} />
          <span className="label-text">Antibiotics when in terminal condition</span>
        </label>
        <label className="label cursor-pointer justify-start gap-3">
          <input type="checkbox" className="toggle toggle-success" {...register('painManagement')} />
          <span className="label-text">Pain management and palliative care</span>
        </label>
      </div>

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
// Step 2: Healthcare Proxy
// ---------------------------------------------------------------------------

function ProxyStep({
  onNext,
  onPrev,
}: {
  onNext: (data: LivingWillProxyData) => void
  onPrev: () => void
}) {
  const content = useAdditionalDocStore((s) => s.livingWillContent)
  const [showProxy, setShowProxy] = useState(!!content.proxyName)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LivingWillProxyData>({
    resolver: zodResolver(livingWillProxySchema),
    defaultValues: {
      proxyName: content.proxyName ?? '',
      proxyIdNumber: content.proxyIdNumber ?? '',
      proxyPhone: content.proxyPhone ?? '',
      proxyRelationship: content.proxyRelationship ?? '',
      alternateProxyName: content.alternateProxyName ?? '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">Healthcare Proxy</h3>
      <p className="text-sm text-base-content/60">
        Optionally appoint someone to make medical decisions on your behalf if
        you are unable to communicate.
      </p>

      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="toggle"
          checked={showProxy}
          onChange={(e) => setShowProxy(e.target.checked)}
        />
        <span className="label-text font-medium">
          Appoint a healthcare proxy
        </span>
      </label>

      {showProxy && (
        <div className="space-y-4 pl-2 border-l-2 border-base-300 ml-2">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Proxy Full Name</legend>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.proxyName ? 'input-error' : ''}`}
              placeholder="e.g. Nomsa Dlamini"
              {...register('proxyName')}
            />
            {errors.proxyName && (
              <p className="text-error text-xs mt-1">
                {errors.proxyName.message}
              </p>
            )}
          </fieldset>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Proxy SA ID Number</legend>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.proxyIdNumber ? 'input-error' : ''}`}
                placeholder="13-digit ID number"
                maxLength={13}
                {...register('proxyIdNumber')}
              />
              {errors.proxyIdNumber && (
                <p className="text-error text-xs mt-1">
                  {errors.proxyIdNumber.message}
                </p>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Proxy Phone Number</legend>
              <input
                type="tel"
                className={`input input-bordered w-full ${errors.proxyPhone ? 'input-error' : ''}`}
                placeholder="e.g. 082 123 4567"
                {...register('proxyPhone')}
              />
              {errors.proxyPhone && (
                <p className="text-error text-xs mt-1">
                  {errors.proxyPhone.message}
                </p>
              )}
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Relationship to You</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Spouse, Sibling, Friend"
              {...register('proxyRelationship')}
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Alternate Proxy Name</legend>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Sipho Nkosi (backup if primary proxy is unavailable)"
              {...register('alternateProxyName')}
            />
          </fieldset>
        </div>
      )}

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
// Step 3: Values & Wishes
// ---------------------------------------------------------------------------

function ValuesStep({
  onPrev,
  onSave,
  saving,
}: {
  onPrev: () => void
  onSave: (data: LivingWillValuesData) => void
  saving: boolean
}) {
  const content = useAdditionalDocStore((s) => s.livingWillContent)

  // Derive organ donation default for the radio group
  const organDefault = content.organDonation === true
    ? 'yes'
    : content.organDonation === false
      ? 'no'
      : ''

  const {
    register,
    handleSubmit,
    watch,
  } = useForm<LivingWillValuesData>({
    resolver: zodResolver(livingWillValuesSchema),
    defaultValues: {
      personalValues: content.personalValues ?? '',
      religiousConsiderations: content.religiousConsiderations ?? '',
      organDonation: organDefault as '' | 'yes' | 'no' | 'undecided',
      organDonationDetails: content.organDonationDetails ?? '',
    },
  })

  const organDonation = watch('organDonation')

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <h3 className="text-lg font-bold text-base-content">Values & Wishes</h3>
      <p className="text-sm text-base-content/60">
        Share any personal values, beliefs, or additional wishes that should
        guide your healthcare decisions.
      </p>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Personal Values Statement</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="What matters most to you about your quality of life and end-of-life care?"
          {...register('personalValues')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Religious / Spiritual Considerations</legend>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          placeholder="Any religious or spiritual beliefs that should influence your care?"
          {...register('religiousConsiderations')}
        />
      </fieldset>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">Organ Donation Preference</legend>
        <div className="flex flex-wrap gap-4 mt-1">
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="yes"
              {...register('organDonation')}
            />
            <span className="label-text">Yes, I wish to donate</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="no"
              {...register('organDonation')}
            />
            <span className="label-text">No</span>
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              type="radio"
              className="radio"
              value="undecided"
              {...register('organDonation')}
            />
            <span className="label-text">Undecided</span>
          </label>
        </div>
      </fieldset>

      {organDonation === 'yes' && (
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Organ Donation Details</legend>
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="e.g. All organs, or specific organs (kidneys, corneas)"
            {...register('organDonationDetails')}
          />
        </fieldset>
      )}

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

export function LivingWillForm({ docId, onComplete, onBack }: LivingWillFormProps) {
  const [step, setStep] = useState(
    useAdditionalDocStore.getState().currentStep,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const api = useApi()
  const updateLivingWill = useAdditionalDocStore((s) => s.updateLivingWill)
  const setStoreStep = useAdditionalDocStore((s) => s.setStep)
  const content = useAdditionalDocStore((s) => s.livingWillContent)

  function goTo(n: number) {
    setStep(n)
    setStoreStep(n)
  }

  function handlePersonal(data: LivingWillPersonalData) {
    updateLivingWill(data)
    goTo(1)
  }

  function handleTreatment(data: LivingWillTreatmentData) {
    updateLivingWill(data)
    goTo(2)
  }

  function handleProxy(data: LivingWillProxyData) {
    // Convert empty strings to null for optional fields
    updateLivingWill({
      proxyName: data.proxyName || null,
      proxyIdNumber: data.proxyIdNumber || null,
      proxyPhone: data.proxyPhone || null,
      proxyRelationship: data.proxyRelationship || null,
      alternateProxyName: data.alternateProxyName || null,
    })
    goTo(3)
  }

  async function handleSave(data: LivingWillValuesData) {
    setSaving(true)
    setError(null)

    // Convert organ donation radio value to boolean | null
    const organDonation =
      data.organDonation === 'yes'
        ? true
        : data.organDonation === 'no'
          ? false
          : null

    const valuesUpdate = {
      personalValues: data.personalValues || null,
      religiousConsiderations: data.religiousConsiderations || null,
      organDonation,
      organDonationDetails: data.organDonationDetails || null,
    }
    updateLivingWill(valuesUpdate)

    // Merge all content and convert to snake_case for backend
    const fullContent = {
      ...content,
      ...valuesUpdate,
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
        err instanceof Error ? err.message : 'Failed to save living will',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body">
        <div className="flex items-center justify-between mb-2">
          <h2 className="card-title">Living Will (Advance Healthcare Directive)</h2>
          <button type="button" className="btn btn-soft btn-sm" onClick={onBack}>
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
          <TreatmentStep onNext={handleTreatment} onPrev={() => goTo(0)} />
        )}
        {step === 2 && (
          <ProxyStep onNext={handleProxy} onPrev={() => goTo(1)} />
        )}
        {step === 3 && (
          <ValuesStep onPrev={() => goTo(2)} onSave={handleSave} saving={saving} />
        )}
      </div>
    </div>
  )
}
