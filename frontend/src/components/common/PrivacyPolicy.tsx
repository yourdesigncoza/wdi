import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type PrivacyPolicyResponse } from '../../services/api'

export function PrivacyPolicy() {
  const navigate = useNavigate()

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  const [policy, setPolicy] = useState<PrivacyPolicyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getPrivacyPolicy()
      .then(setPolicy)
      .catch(() => setError('Failed to load privacy policy.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }

  if (error || !policy) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-sm max-w-md">
          <div className="card-body items-center text-center">
            <p className="text-error mb-4">{error ?? 'Privacy policy unavailable.'}</p>
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
          <h1 className="text-3xl font-bold text-base-content">{policy.title}</h1>
          <p className="mt-2 text-sm text-base-content/50">
            Version {policy.version} &middot; Effective {policy.effective_date}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {policy.sections.map((section, index) => (
            <section key={index} className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title">{section.heading}</h2>
                <p className="text-base-content/70 leading-relaxed">{section.body}</p>
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
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
