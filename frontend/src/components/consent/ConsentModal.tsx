import { useState } from 'react'
import { useConsent } from '../../hooks/useConsent'

export function ConsentModal() {
  const { hasConsent, isLoading, grantConsent } = useConsent()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading || hasConsent) {
    return null
  }

  async function handleAccept() {
    setIsSubmitting(true)
    setError(null)
    try {
      await grantConsent()
    } catch {
      setError('Failed to record consent. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLeaveSite() {
    window.location.href = 'https://www.gov.za'
  }

  return (
    <div className="modal modal-open">
      <div
        className="modal-box max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h2 id="consent-title" className="text-xl font-bold">
            Privacy Consent Required
          </h2>
        </div>

        {/* Explanation */}
        <div className="space-y-3 text-sm mb-6">
          <p>
            In compliance with the <strong>Protection of Personal Information Act (POPIA)</strong>,
            we need your consent before collecting or processing any personal data.
          </p>
          <p>
            WillCraft SA will collect and process your personal information solely for the
            purpose of creating your legally compliant South African will. This includes your
            name, identification details, marital status, beneficiary information, and
            testamentary wishes.
          </p>
          <p>
            You may withdraw your consent at any time, after which we will stop processing
            and delete your personal information within 30 days.
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-col sm:flex-row gap-2 mb-6 text-sm">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Read our Privacy Policy
          </a>
          <span className="hidden sm:inline text-base-content/30">|</span>
          <a
            href="/info-officer"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Contact Information Officer
          </a>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="alert alert-error alert-soft mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-action mt-0">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="btn btn-primary flex-1"
            >
              {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
              {isSubmitting ? 'Processing...' : 'I Accept'}
            </button>
            <button
              onClick={handleLeaveSite}
              disabled={isSubmitting}
              className="btn btn-outline flex-1"
            >
              Leave Site
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
