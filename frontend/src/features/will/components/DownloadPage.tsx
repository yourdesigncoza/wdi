import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { downloadWill } from '../../../services/api.ts'
import { ThemeToggle } from '../../../components/ui/ThemeToggle.tsx'
import { UserButton } from '@clerk/clerk-react'

type PageState = 'ready' | 'downloading' | 'success' | 'error'

const FILE_NAME = 'WillCraft-SA-Will.pdf'

export function DownloadPage() {
  const { token } = useParams<{ token: string }>()
  const [pageState, setPageState] = useState<PageState>(token ? 'ready' : 'error')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : 'Invalid download link.',
  )

  const handleDownload = useCallback(async () => {
    if (!token) return
    setPageState('downloading')
    setErrorMessage(null)
    try {
      const blob = await downloadWill(token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = FILE_NAME
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Revoke after a short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      setPageState('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed'
      setErrorMessage(
        msg.includes('expired') || msg.includes('invalid')
          ? 'This download link has expired or is invalid.'
          : msg,
      )
      setPageState('error')
    }
  }, [token])

  return (
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <span className="text-xl font-bold">WillCraft SA</span>
        </div>
        <div className="navbar-end gap-2">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center space-y-4">

            {/* Ready state */}
            {pageState === 'ready' && (
              <>
                <svg
                  className="w-16 h-16 text-neutral"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
                <h2 className="card-title text-xl">Download Your Will</h2>
                <p className="text-base-content/70">
                  Your will document is ready. Click below to download.
                </p>
                <p className="text-sm text-base-content/70 font-mono">
                  {FILE_NAME}
                </p>
                <button
                  type="button"
                  className="btn btn-neutral btn-lg w-full"
                  onClick={handleDownload}
                >
                  Download PDF
                </button>
              </>
            )}

            {/* Downloading state */}
            {pageState === 'downloading' && (
              <>
                <span className="loading loading-spinner loading-lg" />
                <h2 className="card-title text-xl">Preparing Download...</h2>
                <p className="text-base-content/70">
                  Please wait while we prepare your document.
                </p>
              </>
            )}

            {/* Success state */}
            {pageState === 'success' && (
              <>
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
                    <h4 className="font-bold">Download Complete</h4>
                    <p className="text-sm mt-1">
                      Your will has been downloaded. Remember to print it and
                      sign in the presence of two competent witnesses as required
                      by the Wills Act 7 of 1953.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={handleDownload}
                >
                  Download Again
                </button>
                <Link to="/" className="btn btn-soft">
                  Return Home
                </Link>
              </>
            )}

            {/* Error state */}
            {pageState === 'error' && (
              <>
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
                  <span>{errorMessage}</span>
                </div>
                {token && (
                  <button
                    type="button"
                    className="btn btn-neutral"
                    onClick={handleDownload}
                  >
                    Retry Download
                  </button>
                )}
                <Link to="/will" className="btn btn-soft">
                  Return to Will
                </Link>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
