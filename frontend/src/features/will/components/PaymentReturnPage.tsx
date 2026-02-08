import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../../contexts/AuthApiContext'

const PAYMENT_STORAGE_KEY = 'willcraft_payment_id'
const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 10

type PageState = 'polling' | 'completed' | 'timeout' | 'error' | 'no-payment'

export function PaymentReturnPage() {
  const api = useApi()
  const [pageState, setPageState] = useState<PageState>('polling')
  const [downloadToken, setDownloadToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const paymentId = localStorage.getItem(PAYMENT_STORAGE_KEY)

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const pollStatus = useCallback(async () => {
    if (!paymentId) {
      setPageState('no-payment')
      return
    }

    attemptRef.current += 1
    try {
      const result = await api.getPaymentStatus(paymentId)
      if (result.status === 'completed' && result.download_token) {
        stopPolling()
        setDownloadToken(result.download_token)
        setPageState('completed')
        localStorage.removeItem(PAYMENT_STORAGE_KEY)
      } else if (result.status === 'cancelled' || result.status === 'failed') {
        stopPolling()
        setErrorMessage(`Payment ${result.status}. Please try again.`)
        setPageState('error')
      } else if (attemptRef.current >= MAX_ATTEMPTS) {
        stopPolling()
        setPageState('timeout')
      }
    } catch (err) {
      stopPolling()
      setErrorMessage(err instanceof Error ? err.message : 'Failed to check payment status')
      setPageState('error')
    }
  }, [paymentId, stopPolling, api])

  useEffect(() => {
    if (!paymentId) {
      setPageState('no-payment')
      return
    }
    // Initial poll
    void pollStatus()
    // Subsequent polls
    timerRef.current = setInterval(() => {
      void pollStatus()
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  }, [paymentId, pollStatus, stopPolling])

  const handleRetry = () => {
    attemptRef.current = 0
    setPageState('polling')
    setErrorMessage(null)
    void pollStatus()
    timerRef.current = setInterval(() => {
      void pollStatus()
    }, POLL_INTERVAL_MS)
  }

  return (
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body items-center text-center space-y-4">

            {/* Polling state */}
            {pageState === 'polling' && (
              <>
                <span className="loading loading-spinner loading-lg" />
                <h2 className="card-title text-xl">Confirming your payment...</h2>
                <p className="text-base-content/70">
                  Please wait while we verify your payment with PayFast.
                  This usually takes a few seconds.
                </p>
              </>
            )}

            {/* Completed state */}
            {pageState === 'completed' && downloadToken && (
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
                    <h4 className="font-bold">Payment Successful</h4>
                    <p className="text-sm mt-1">
                      Your payment has been confirmed. You can now download your will.
                    </p>
                  </div>
                </div>
                <Link
                  to={`/download/${downloadToken}`}
                  className="btn btn-neutral btn-lg w-full"
                >
                  Download Your Will
                </Link>
                <p className="text-sm text-base-content/70">
                  A download link has been emailed to you as backup.
                </p>
              </>
            )}

            {/* Timeout state */}
            {pageState === 'timeout' && (
              <>
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
                    <h4 className="font-bold">Payment Processing</h4>
                    <p className="text-sm mt-1">
                      Your payment is being processed. You will receive an email
                      with your download link shortly.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={handleRetry}
                >
                  Check Again
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
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={handleRetry}
                >
                  Retry
                </button>
                <Link to="/will" className="btn btn-soft">
                  Return to Will
                </Link>
              </>
            )}

            {/* No payment ID state */}
            {pageState === 'no-payment' && (
              <>
                <div className="alert alert-warning">
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
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span>No payment session found. Please start from your will.</span>
                </div>
                <Link to="/will" className="btn btn-neutral">
                  Go to Will
                </Link>
              </>
            )}

          </div>
        </div>
      </main>
  )
}
