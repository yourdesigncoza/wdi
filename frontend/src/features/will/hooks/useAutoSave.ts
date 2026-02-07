import { useEffect, useRef, useCallback } from 'react'
import { updateWillSection } from '../../../services/api'

/**
 * Debounced auto-save hook for form-based will sections.
 * Saves section data to the backend after a period of inactivity.
 * Returns a `flush` function to trigger an immediate save (e.g., before navigation).
 */
export function useAutoSave(
  willId: string | null,
  section: string,
  data: Record<string, unknown>,
  delay = 2000,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const dataRef = useRef(data)
  const inflightRef = useRef<AbortController | null>(null)
  dataRef.current = data

  useEffect(() => {
    if (!willId) return

    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        inflightRef.current?.abort()
        inflightRef.current = new AbortController()
        await updateWillSection(willId, section, dataRef.current)
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error(`Auto-save failed for ${section}:`, err)
        }
      }
    }, delay)

    return () => clearTimeout(timeoutRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [willId, section, JSON.stringify(data), delay])

  const flush = useCallback(async () => {
    clearTimeout(timeoutRef.current)
    if (willId) {
      try {
        await updateWillSection(willId, section, dataRef.current)
      } catch (err) {
        console.error(`Auto-save flush failed for ${section}:`, err)
      }
    }
  }, [willId, section])

  return { flush }
}
