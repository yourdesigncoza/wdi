import { useState, useEffect, useRef } from 'react'
import type { PaymentInitiateResponse } from '../../../services/api.ts'
import { useApi } from '../../../contexts/AuthApiContext'

const PAYMENT_STORAGE_KEY = 'willcraft_payment_id'

interface PaymentPageProps {
  willId: string
  onBack: () => void
}

export function PaymentPage({ willId, onBack }: PaymentPageProps) {
  const api = useApi()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<PaymentInitiateResponse | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    let cancelled = false
    async function initiate() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await api.initiatePayment(willId)
        if (cancelled) return
        setFormData(response)
        localStorage.setItem(PAYMENT_STORAGE_KEY, response.payment_id)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to initiate payment')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void initiate()
    return () => { cancelled = true }
  }, [willId])

  const handlePayNow = () => {
    formRef.current?.submit()
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Payment</h2>
        <p className="text-base-content/70">
          Complete your payment to receive the final, unwatermarked will document.
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      {/* Error state */}
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

      {/* Payment summary */}
      {formData && !isLoading && (
        <>
          <div className="card card-border bg-base-100">
            <div className="card-body p-4">
              <h3 className="card-title text-sm">Order Summary</h3>
              <div className="flex justify-between items-center py-2 border-b border-base-300">
                <span className="text-base-content/70">Your Will Document</span>
                <span className="font-bold">R199.00</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-bold">Total</span>
                <span className="text-lg font-bold">R199.00</span>
              </div>
            </div>
          </div>

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
                You will be redirected to PayFast, South Africa's trusted payment
                gateway, to complete your payment securely.
              </p>
            </div>
          </div>

          {/* Hidden form for PayFast redirect */}
          <form
            ref={formRef}
            action={formData.payfast_url}
            method="POST"
            className="hidden"
          >
            {Object.entries(formData.form_data).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        </>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {formData && !isLoading && (
          <button
            type="button"
            className="btn btn-neutral btn-lg"
            onClick={handlePayNow}
          >
            Pay Now
          </button>
        )}
        <button
          type="button"
          className="btn btn-soft"
          onClick={onBack}
        >
          Back to Preview
        </button>
      </div>
    </div>
  )
}
