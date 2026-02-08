import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../../contexts/AuthApiContext'

interface DocumentPreviewPageProps {
  willId: string
  isPaidWill?: boolean
  onBack: () => void
  onProceedToPayment?: () => void
}

export function DocumentPreviewPage({ willId, isPaidWill, onBack, onProceedToPayment }: DocumentPreviewPageProps) {
  const api = useApi()
  const [disclaimerChecked, setDisclaimerChecked] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerateResult, setRegenerateResult] = useState<{ download_token: string; version: number } | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!disclaimerChecked) return
    setIsGenerating(true)
    setError(null)
    try {
      const blob = await api.generatePreview(willId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Revoke after 60s to free memory
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setHasGenerated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    } finally {
      setIsGenerating(false)
    }
  }, [willId, disclaimerChecked, api])

  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true)
    setError(null)
    try {
      const result = await api.regenerateWill(willId)
      setRegenerateResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-generation failed')
    } finally {
      setIsRegenerating(false)
    }
  }, [willId, api])

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Document Preview</h2>
        <p className="text-base-content/70">
          Generate a preview of your will document. The preview will include a
          watermark and is not a final legal document.
        </p>
      </div>

      {/* Attorney review recommendation */}
      <div className="alert alert-info">
        <svg
          className="w-6 h-6 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <h4 className="font-bold">Attorney Review Recommended</h4>
          <p className="text-sm mt-1">
            While this tool helps you create a structured will, we strongly recommend
            having a qualified South African attorney review your will before signing.
            This ensures full compliance with the Wills Act 7 of 1953 and protects
            your estate planning intentions.
          </p>
        </div>
      </div>

      {/* Disclaimer card with checkbox */}
      <div className="card card-border bg-base-100">
        <div className="card-body p-4">
          <h3 className="card-title text-sm">Preview Disclaimer</h3>
          <div className="text-sm text-base-content/70 space-y-2">
            <p>
              By generating this preview, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                This document is a <strong>preview only</strong> and is not a legally
                binding will until properly signed and witnessed.
              </li>
              <li>
                The preview contains a watermark and should not be used as a final document.
              </li>
              <li>
                WillCraft SA provides a drafting tool and does not offer legal advice.
              </li>
              <li>
                You are responsible for ensuring the will is signed in the presence of
                two competent witnesses as required by South African law.
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-3 cursor-pointer mt-3">
            <input
              type="checkbox"
              className="checkbox mt-0.5"
              checked={disclaimerChecked}
              onChange={(e) => setDisclaimerChecked(e.target.checked)}
            />
            <span className="text-sm font-medium">
              I understand this is a preview document and not a final legal will.
            </span>
          </label>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-error">
          <svg
            className="w-6 h-6 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn btn-neutral"
          onClick={handleGenerate}
          disabled={!disclaimerChecked || isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              Generating...
            </>
          ) : hasGenerated ? (
            'Regenerate Preview'
          ) : (
            'Generate Preview'
          )}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
        >
          Back to Verification
        </button>
      </div>

      {/* Post-generation info */}
      {hasGenerated && (
        <div className="alert alert-success">
          <svg
            className="w-6 h-6 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <h4 className="font-bold">Preview Generated</h4>
            <p className="text-sm mt-1">
              Your will preview has been opened in a new browser tab. Review the
              document carefully. You can regenerate the preview after making changes
              to your will.
            </p>
          </div>
        </div>
      )}

      {/* Post-preview actions: re-generate for paid wills, payment for unpaid */}
      {hasGenerated && isPaidWill && !regenerateResult && (
        <div className="mt-4">
          <button
            type="button"
            className="btn btn-neutral btn-lg w-full"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Re-generating...
              </>
            ) : (
              'Re-generate Will (Free)'
            )}
          </button>
        </div>
      )}

      {hasGenerated && isPaidWill && regenerateResult && (
        <div className="mt-4 space-y-3">
          <div className="alert alert-success">
            <svg
              className="w-6 h-6 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <h4 className="font-bold">Will updated to version {regenerateResult.version}!</h4>
              <p className="text-sm mt-1">
                Your updated will document is ready for download.
              </p>
            </div>
          </div>
          <Link
            to={`/download/${regenerateResult.download_token}`}
            className="btn btn-neutral btn-lg w-full"
          >
            Download Updated Will
          </Link>
          <Link to="/dashboard" className="btn btn-soft w-full">
            Back to Dashboard
          </Link>
        </div>
      )}

      {hasGenerated && !isPaidWill && onProceedToPayment && (
        <div className="mt-4">
          <button
            type="button"
            className="btn btn-neutral btn-lg w-full"
            onClick={onProceedToPayment}
          >
            Proceed to Payment — R199.00
          </button>
        </div>
      )}
    </div>
  )
}
