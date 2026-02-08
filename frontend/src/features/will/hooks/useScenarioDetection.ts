import { useState, useCallback } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import type { ComplexScenario } from '../types/will.ts'

import { API_BASE } from '../../../config'

export function useScenarioDetection() {
  const willId = useWillStore((s) => s.willId)
  const scenarios = useWillStore((s) => s.scenarios)
  const setScenarios = useWillStore((s) => s.setScenarios)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectScenarios = useCallback(async () => {
    if (!willId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/wills/${willId}/scenarios`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to detect scenarios')
      const data: { scenarios: ComplexScenario[] } = await res.json()
      setScenarios(data.scenarios)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [willId, setScenarios])

  const hasScenario = useCallback(
    (scenario: ComplexScenario) => scenarios.includes(scenario),
    [scenarios],
  )

  return { scenarios, loading, error, detectScenarios, hasScenario }
}
