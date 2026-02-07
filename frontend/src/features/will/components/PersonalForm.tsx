import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { testatorSchema } from '../schemas/willSchemas.ts'
import type { TestatorFormData } from '../schemas/willSchemas.ts'
import { useWillStore } from '../store/useWillStore.ts'

const SA_PROVINCES = [
  { value: 'EC', label: 'Eastern Cape' },
  { value: 'FS', label: 'Free State' },
  { value: 'GP', label: 'Gauteng' },
  { value: 'KZN', label: 'KwaZulu-Natal' },
  { value: 'LP', label: 'Limpopo' },
  { value: 'MP', label: 'Mpumalanga' },
  { value: 'NC', label: 'Northern Cape' },
  { value: 'NW', label: 'North West' },
  { value: 'WC', label: 'Western Cape' },
] as const

interface PersonalFormProps {
  /** Called after testator data is saved — parent uses this to advance sub-step */
  onSaved?: () => void
}

export function PersonalForm({ onSaved }: PersonalFormProps) {
  const testator = useWillStore((s) => s.testator)
  const updateTestator = useWillStore((s) => s.updateTestator)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TestatorFormData>({
    resolver: zodResolver(testatorSchema),
    defaultValues: {
      firstName: testator.firstName ?? '',
      lastName: testator.lastName ?? '',
      idNumber: testator.idNumber ?? '',
      dateOfBirth: testator.dateOfBirth ?? '',
      address: testator.address ?? '',
      city: testator.city ?? '',
      province: testator.province,
      postalCode: testator.postalCode ?? '',
      phone: testator.phone ?? '',
      email: testator.email ?? '',
    },
  })

  function onSubmit(data: TestatorFormData) {
    updateTestator(data)
    onSaved?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h2 className="text-xl font-bold text-base-content">Personal Details</h2>
      <p className="text-sm text-base-content/60">
        Please provide your personal information as it appears on your South African ID.
      </p>

      {/* Name fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">First Name *</legend>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.firstName ? 'input-error' : ''}`}
            placeholder="e.g. Thabo"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-error text-xs mt-1">{errors.firstName.message}</p>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Last Name *</legend>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.lastName ? 'input-error' : ''}`}
            placeholder="e.g. Mokoena"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-error text-xs mt-1">{errors.lastName.message}</p>
          )}
        </fieldset>
      </div>

      {/* ID and DOB */}
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
            <p className="text-error text-xs mt-1">{errors.dateOfBirth.message}</p>
          )}
        </fieldset>
      </div>

      {/* Address */}
      <fieldset className="fieldset">
        <legend className="fieldset-legend">Street Address *</legend>
        <input
          type="text"
          className={`input input-bordered w-full ${errors.address ? 'input-error' : ''}`}
          placeholder="e.g. 42 Mandela Drive"
          {...register('address')}
        />
        {errors.address && (
          <p className="text-error text-xs mt-1">{errors.address.message}</p>
        )}
      </fieldset>

      {/* City, Province, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">City *</legend>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.city ? 'input-error' : ''}`}
            placeholder="e.g. Johannesburg"
            {...register('city')}
          />
          {errors.city && (
            <p className="text-error text-xs mt-1">{errors.city.message}</p>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Province *</legend>
          <select
            className={`select select-bordered w-full ${errors.province ? 'select-error' : ''}`}
            {...register('province')}
          >
            <option value="">Select province</option>
            {SA_PROVINCES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {errors.province && (
            <p className="text-error text-xs mt-1">{errors.province.message}</p>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Postal Code *</legend>
          <input
            type="text"
            className={`input input-bordered w-full ${errors.postalCode ? 'input-error' : ''}`}
            placeholder="e.g. 2000"
            maxLength={4}
            {...register('postalCode')}
          />
          {errors.postalCode && (
            <p className="text-error text-xs mt-1">{errors.postalCode.message}</p>
          )}
        </fieldset>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Phone Number *</legend>
          <input
            type="tel"
            className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
            placeholder="e.g. 082 123 4567"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-error text-xs mt-1">{errors.phone.message}</p>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email (optional)</legend>
          <input
            type="email"
            className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
            placeholder="e.g. thabo@example.co.za"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-error text-xs mt-1">{errors.email.message}</p>
          )}
        </fieldset>
      </div>

      <div className="flex justify-end">
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
