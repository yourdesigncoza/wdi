import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type InfoOfficerResponse } from '../../services/api'

type RequestType = 'access' | 'correction' | 'deletion'

export function InfoOfficerContact() {
  const navigate = useNavigate()

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const [officer, setOfficer] = useState<InfoOfficerResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [requestType, setRequestType] = useState<RequestType>('access')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    api.getInfoOfficer()
      .then(setOfficer)
      .catch(() => setError('Failed to load contact details.'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    setConfirmation(null)

    try {
      const result = await api.submitDataRequest({
        request_type: requestType,
        details: details || undefined,
      })
      setConfirmation(result.message)
      setDetails('')
    } catch {
      setSubmitError('Failed to submit request. Please try again or contact us directly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (error || !officer) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-sm max-w-md">
          <div className="card-body items-center text-center">
            <p className="text-error mb-4">{error ?? 'Contact details unavailable.'}</p>
            <button
              onClick={goBack}
              className="btn btn-neutral"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={goBack}
            className="link link-primary text-sm mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-base-content">Information Officer</h1>
          <p className="mt-2 text-sm text-base-content/50">
            Contact details as required by POPIA Section 55
          </p>
        </div>

        {/* Contact Details */}
        <section className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body">
            <h2 className="card-title">Contact Details</h2>
            <dl className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Name</dt>
                <dd className="text-base-content">{officer.name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Organisation</dt>
                <dd className="text-base-content">{officer.organisation}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Email</dt>
                <dd>
                  <a href={`mailto:${officer.email}`} className="link link-primary">
                    {officer.email}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Phone</dt>
                <dd>
                  <a href={`tel:${officer.phone}`} className="link link-primary">
                    {officer.phone}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Address</dt>
                <dd className="text-base-content">{officer.address}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Information Regulator */}
        <section className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body">
            <h2 className="card-title">Information Regulator</h2>
            <p className="text-sm text-base-content/60 mb-3">
              You have the right to lodge a complaint with the Information Regulator if you
              believe your personal information has been mishandled.
            </p>
            <dl className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Name</dt>
                <dd className="text-base-content">{officer.regulator.name}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Email</dt>
                <dd>
                  <a href={`mailto:${officer.regulator.email}`} className="link link-primary">
                    {officer.regulator.email}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Phone</dt>
                <dd>
                  <a href={`tel:${officer.regulator.phone}`} className="link link-primary">
                    {officer.regulator.phone}
                  </a>
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-base-content/50 sm:w-32">Website</dt>
                <dd>
                  <a
                    href={officer.regulator.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    {officer.regulator.website}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Data Request Form */}
        <section className="card bg-base-100 shadow-sm mb-6">
          <div className="card-body">
            <h2 className="card-title">Submit a Data Request</h2>
            <p className="text-sm text-base-content/60 mb-4">
              Under POPIA, you have the right to request access to, correction of, or deletion
              of your personal information. We will respond within 30 days.
            </p>

            {confirmation && (
              <div role="alert" className="alert alert-success alert-soft mb-4">
                <span>{confirmation}</span>
              </div>
            )}

            {submitError && (
              <div role="alert" className="alert alert-error alert-soft mb-4">
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Request Type</legend>
                <select
                  id="request-type"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as RequestType)}
                  className="select w-full"
                >
                  <option value="access">Access my data</option>
                  <option value="correction">Correct my data</option>
                  <option value="deletion">Delete my data</option>
                </select>
              </fieldset>

              <fieldset className="fieldset">
                <legend className="fieldset-legend">Details (optional)</legend>
                <textarea
                  id="details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  placeholder="Provide additional details about your request..."
                  className="textarea w-full"
                />
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-neutral w-full"
              >
                {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={goBack}
            className="btn btn-neutral"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
