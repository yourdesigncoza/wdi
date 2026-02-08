import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserButton } from '@clerk/clerk-react'
import { ThemeToggle } from '../../../components/ui/ThemeToggle'
import { useApi } from '../../../contexts/AuthApiContext'
import type { AdditionalDocumentResponse } from '../../../services/api'

const DOC_TYPE_LABELS: Record<string, string> = {
  living_will: 'Living Will',
  funeral_wishes: 'Funeral Wishes',
}

function formatDocType(type: string): string {
  return DOC_TYPE_LABELS[type] || type
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'badge-warning',
    completed: 'badge-success',
    generated: 'badge-accent',
  }
  const label: Record<string, string> = {
    draft: 'Draft',
    completed: 'Completed',
    generated: 'Generated',
  }
  return (
    <span className={`badge ${map[status] || 'badge-ghost'}`}>
      {label[status] || status}
    </span>
  )
}

export function DocumentPreview() {
  const { docId } = useParams<{ docId: string }>()
  const api = useApi()
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [hasPreviewedOnce, setHasPreviewedOnce] = useState(false)

  const {
    data: doc,
    isLoading,
    error: fetchError,
  } = useQuery<AdditionalDocumentResponse>({
    queryKey: ['additional-document', docId],
    queryFn: () => api.getAdditionalDocument(docId!),
    enabled: !!docId,
  })

  const handlePreview = useCallback(async () => {
    if (!docId) return
    setIsPreviewing(true)
    setPreviewError(null)
    try {
      const blob = await api.previewAdditionalDocument(docId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setHasPreviewedOnce(true)
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : 'Failed to generate preview',
      )
    } finally {
      setIsPreviewing(false)
    }
  }, [docId, api])

  const handleDownload = useCallback(async () => {
    if (!docId || !doc) return
    setIsDownloading(true)
    setDownloadError(null)
    try {
      const blob = await api.generateAdditionalDocument(docId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WillCraft-SA-${formatDocType(doc.document_type).replace(/\s+/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Failed to download document',
      )
    } finally {
      setIsDownloading(false)
    }
  }, [docId, doc, api])

  const navbar = (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <span className="text-xl font-bold">WillCraft SA</span>
      </div>
      <div className="navbar-end gap-2">
        <ThemeToggle />
        <UserButton />
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-200">
        {navbar}
        <main className="max-w-2xl mx-auto px-4 py-8 flex justify-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </main>
      </div>
    )
  }

  if (fetchError || !doc) {
    return (
      <div className="min-h-screen bg-base-200">
        {navbar}
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
          <div className="alert alert-error">
            <span>
              {fetchError instanceof Error
                ? fetchError.message
                : 'Document not found.'}
            </span>
          </div>
          <Link to="/documents" className="btn btn-soft">
            Back to Documents
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base-200">
      {navbar}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link to="/documents" className="btn btn-soft btn-sm">
          Back to Documents
        </Link>

        {/* Document info card */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-xl">
                {formatDocType(doc.document_type)}
              </h2>
              {statusBadge(doc.status)}
            </div>
            <p className="text-sm text-base-content/60">
              Last updated: {new Date(doc.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Disclaimer notice */}
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
            <p className="text-sm">
              The preview includes a watermark and is for review purposes only.
              Download the final PDF for a clean copy.
            </p>
          </div>
        </div>

        {/* Error displays */}
        {previewError && (
          <div className="alert alert-error">
            <span>{previewError}</span>
          </div>
        )}
        {downloadError && (
          <div className="alert alert-error">
            <span>{downloadError}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-neutral"
            onClick={handlePreview}
            disabled={isPreviewing}
          >
            {isPreviewing ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Generating Preview...
              </>
            ) : hasPreviewedOnce ? (
              'Regenerate Preview'
            ) : (
              'Generate Preview'
            )}
          </button>
          <button
            className="btn btn-neutral"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Downloading...
              </>
            ) : (
              'Download Final PDF'
            )}
          </button>
        </div>

        {/* Success message after preview */}
        {hasPreviewedOnce && (
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
                Your document preview has been opened in a new tab. Review it
                carefully, then download the final PDF when ready.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
