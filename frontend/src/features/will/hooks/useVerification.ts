import { useState, useCallback, useRef } from 'react'
import { getStoredConsentToken } from '../../../services/api'
import type { ApiClient } from '../../../services/api'
import type {
  VerificationProgress,
  SectionProgressEvent,
  VerificationResult,
} from '../types/verification.ts'

import { API_BASE } from '../../../config'

/**
 * SSE streaming hook for will verification progress.
 *
 * Uses fetch + ReadableStream (not EventSource) to stream from
 * POST /api/wills/{willId}/verify, matching the established
 * dual-event SSE pattern from useConversation.
 *
 * Event types parsed:
 * - check     -> appended to progress[]
 * - section_result -> appended to sectionResults[]
 * - done      -> sets result
 * - error     -> sets error
 */
export function useVerification(willId: string | null, api: ApiClient) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [progress, setProgress] = useState<VerificationProgress[]>([])
  const [sectionResults, setSectionResults] = useState<SectionProgressEvent[]>([])
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const startVerification = useCallback(async () => {
    if (!willId) return

    // Reset state for new verification run
    setIsVerifying(true)
    setProgress([])
    setSectionResults([])
    setResult(null)
    setError(null)

    abortRef.current = new AbortController()

    try {
      // Get Bearer token for SSE streaming request
      const token = await api.getToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const ct = getStoredConsentToken()
      if (ct) headers['X-POPIA-Consent'] = ct

      const response = await fetch(`${API_BASE}/wills/${willId}/verify`, {
        method: 'POST',
        headers,
        credentials: 'include',
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        throw new Error(errText || `HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        let currentEvent = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            continue
          }

          if (line.startsWith('data:')) {
            const rawData = line.slice(5).trim()
            if (!rawData) continue

            try {
              const data = JSON.parse(rawData) as Record<string, unknown>

              if (currentEvent === 'check') {
                setProgress((prev) => [
                  ...prev,
                  {
                    step: data.step as string,
                    message: data.message as string,
                  },
                ])
              } else if (currentEvent === 'section_result') {
                setSectionResults((prev) => [
                  ...prev,
                  {
                    section: data.section as string,
                    status: data.status as SectionProgressEvent['status'],
                    issue_count: data.issue_count as number,
                  },
                ])
              } else if (currentEvent === 'done') {
                setResult(data as unknown as VerificationResult)
                setIsVerifying(false)
              } else if (currentEvent === 'error') {
                setError(data.message as string)
                setIsVerifying(false)
              }
            } catch {
              // Ignore malformed JSON lines
            }
          }

          // Empty line resets event type per SSE spec
          if (line === '') {
            currentEvent = ''
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message ?? 'Something went wrong')
      }
    } finally {
      setIsVerifying(false)
    }
  }, [willId, api])

  const stopVerification = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    isVerifying,
    progress,
    sectionResults,
    result,
    error,
    startVerification,
    stopVerification,
  }
}
