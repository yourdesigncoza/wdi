import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { api } from '../../services/api'

export interface ConsentContextType {
  hasConsent: boolean
  isLoading: boolean
  grantConsent: () => Promise<void>
  withdrawConsent: () => Promise<void>
}

export const ConsentContext = createContext<ConsentContextType | null>(null)

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [hasConsent, setHasConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    api.checkConsentStatus()
      .then((data) => setHasConsent(data.has_valid_consent))
      .catch(() => setHasConsent(false))
      .finally(() => setIsLoading(false))
  }, [])

  const grantConsent = useCallback(async () => {
    setIsLoading(true)
    try {
      await api.grantConsent(['will_generation', 'data_storage', 'ai_processing'])
      setHasConsent(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const withdrawConsent = useCallback(async () => {
    setIsLoading(true)
    try {
      await api.withdrawConsent()
      setHasConsent(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return (
    <ConsentContext.Provider value={{ hasConsent, isLoading, grantConsent, withdrawConsent }}>
      {children}
    </ConsentContext.Provider>
  )
}
