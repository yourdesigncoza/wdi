import { useState, useCallback } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import type { ComplexScenario } from '../types/will.ts'
import { useApi } from '../../../contexts/AuthApiContext'

export function useScenarioDetection() {
  const willId = useWillStore((s) => s.willId)
  const scenarios = useWillStore((s) => s.scenarios)
  const setScenarios = useWillStore((s) => s.setScenarios)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const api = useApi()

  const detectScenarios = useCallback(async () => {
    if (!willId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.detectScenarios(willId)
      setScenarios(data.scenarios as ComplexScenario[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [willId, setScenarios, api])

  const hasScenario = useCallback(
    (scenario: ComplexScenario) => scenarios.includes(scenario),
    [scenarios],
  )

  return { scenarios, loading, error, detectScenarios, hasScenario }
}
