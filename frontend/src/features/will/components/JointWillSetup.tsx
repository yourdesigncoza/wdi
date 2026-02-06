import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jointWillSchema } from '../schemas/willSchemas.ts'
import type { JointWillFormData } from '../schemas/willSchemas.ts'
import { useWillStore } from '../store/useWillStore.ts'
import { ChatSection } from './ChatSection.tsx'

interface JointWillSetupProps {
  willId: string
}

/** Warning icon SVG for DaisyUI alerts */
function WarningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0 stroke-current"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

/**
 * Joint/mirror will setup section.
 *
 * Provides a structured form for co-testator details using React Hook Form
 * with Zod validation, plus a prominent irrevocability warning and
 * explanatory ChatSection for discussing implications.
 */
export function JointWillSetup({ willId }: JointWillSetupProps) {
  const jointWill = useWillStore((s) => s.jointWill)
  const updateJointWill = useWillStore((s) => s.updateJointWill)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JointWillFormData>({
    resolver: zodResolver(jointWillSchema),
    defaultValues: {
      coTestatorFirstName: jointWill.coTestatorFirstName ?? '',
      coTestatorLastName: jointWill.coTestatorLastName ?? '',
      coTestatorIdNumber: jointWill.coTestatorIdNumber ?? '',
      willStructure: jointWill.willStructure ?? 'mutual',
      massing: jointWill.massing ?? false,
      irrevocabilityAcknowledged: jointWill.irrevocabilityAcknowledged ?? false,
    },
  })

  function onSubmit(data: JointWillFormData) {
    updateJointWill(data)
  }

  return (
    <div className="space-y-6">
      {/* Irrevocability warning */}
      <div className="alert alert-warning">
        <WarningIcon />
        <span>
          Joint wills become effectively IRREVOCABLE after the first spouse
          passes away. The surviving spouse who accepts benefits is typically
          bound by all terms. Consider separate mirror wills for more
          flexibility.
        </span>
      </div>

      {/* Co-testator details form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-xl font-bold text-base-content">
          Joint Will Configuration
        </h2>
        <p className="text-sm text-base-content/60">
          Provide your co-testator&apos;s details and choose the will structure.
        </p>

        {/* Co-testator name fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Co-testator First Name *
            </legend>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.coTestatorFirstName ? 'input-error' : ''}`}
              placeholder="e.g. Nomsa"
              {...register('coTestatorFirstName')}
            />
            {errors.coTestatorFirstName && (
              <p className="text-error text-xs mt-1">
                {errors.coTestatorFirstName.message}
              </p>
            )}
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">
              Co-testator Last Name *
            </legend>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.coTestatorLastName ? 'input-error' : ''}`}
              placeholder="e.g. Mokoena"
              {...register('coTestatorLastName')}
            />
            {errors.coTestatorLastName && (
              <p className="text-error text-xs mt-1">
                {errors.coTestatorLastName.message}
              </p>
            )}
          </fieldset>
        </div>

        {/* Co-testator ID number */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Co-testator SA ID Number *</legend>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.coTestatorIdNumber ? 'input-error' : ''}`}
            placeholder="13-digit ID number"
            maxLength={13}
            {...register('coTestatorIdNumber')}
          />
          {errors.coTestatorIdNumber && (
            <p className="text-error text-xs mt-1">
              {errors.coTestatorIdNumber.message}
            </p>
          )}
        </fieldset>

        {/* Will structure radio */}
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Will Structure *</legend>
          <div className="flex flex-col gap-2">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="radio"
                className="radio radio-primary"
                value="mutual"
                {...register('willStructure')}
              />
              <div>
                <span className="label-text font-medium">Mutual Will</span>
                <p className="text-xs text-base-content/60">
                  Both testators leave assets to each other and then to shared
                  beneficiaries
                </p>
              </div>
            </label>
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="radio"
                className="radio radio-primary"
                value="mirror"
                {...register('willStructure')}
              />
              <div>
                <span className="label-text font-medium">Mirror Will</span>
                <p className="text-xs text-base-content/60">
                  Two separate but identical wills — each testator mirrors the
                  other&apos;s provisions
                </p>
              </div>
            </label>
          </div>
          {errors.willStructure && (
            <p className="text-error text-xs mt-1">
              {errors.willStructure.message}
            </p>
          )}
        </fieldset>

        {/* Massing checkbox */}
        <fieldset className="fieldset">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className="checkbox checkbox-primary"
              {...register('massing')}
            />
            <div>
              <span className="label-text font-medium">
                Enable massing of estates
              </span>
              <p className="text-xs text-base-content/60">
                Both estates are treated as one combined estate for distribution
                purposes
              </p>
            </div>
          </label>
        </fieldset>

        {/* Irrevocability acknowledgement */}
        <fieldset className="fieldset">
          <label className="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              className={`checkbox checkbox-warning ${errors.irrevocabilityAcknowledged ? 'checkbox-error' : ''}`}
              {...register('irrevocabilityAcknowledged')}
            />
            <div>
              <span className="label-text font-medium">
                I acknowledge the irrevocability implications *
              </span>
              <p className="text-xs text-base-content/60">
                I understand that after the first spouse passes away, the
                surviving spouse who accepts benefits may not be able to change
                the will terms
              </p>
            </div>
          </label>
          {errors.irrevocabilityAcknowledged && (
            <p className="text-error text-xs mt-1">
              {errors.irrevocabilityAcknowledged.message}
            </p>
          )}
        </fieldset>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
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

      {/* AI-guided explanation of joint will implications */}
      <div className="divider">Discuss Joint Will Implications</div>
      <ChatSection section="joint" willId={willId} />
    </div>
  )
}
