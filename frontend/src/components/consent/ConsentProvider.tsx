import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
  api,
  setStoredConsentToken,
  clearStoredConsentToken,
} from '../../services/api'

export interface ConsentContextType {
  hasConsent: boolean
  isLoading: boolean
  grantConsent: () => Promise<void>
  withdrawConsent: () => Promise<void>
}

export const ConsentContext = createContext<ConsentContextType | null>(null)

const LAST_USER_KEY = 'willcraft_last_user_id'

/**
 * Clear all per-user localStorage state when a different user signs in.
 * Prevents User B from inheriting User A's consent token and stale willId.
 */
function clearStaleUserState(currentUserId: string): void {
  const lastUserId = localStorage.getItem(LAST_USER_KEY)
  if (lastUserId && lastUserId !== currentUserId) {
    clearStoredConsentToken()
    // Clear Zustand persisted will store (stale willId from previous user)
    localStorage.removeItem('wdi-will-draft')
    // Clear Zustand persisted additional doc store
    localStorage.removeItem('additional-doc-storage')
  }
  localStorage.setItem(LAST_USER_KEY, currentUserId)
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [hasConsent, setHasConsent] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()

  useEffect(() => {
    // Clear stale state if a different user signed in
    if (user?.id) {
      clearStaleUserState(user.id)
    }

    api.checkConsentStatus()
      .then((data) => {
        setHasConsent(data.has_valid_consent)
        if (data.has_valid_consent && data.consent_token) {
          setStoredConsentToken(data.consent_token)
        }
      })
      .catch(() => setHasConsent(false))
      .finally(() => setIsLoading(false))
  }, [user?.id])

  const grantConsent = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.grantConsent(['will_generation', 'data_storage', 'ai_processing'])
      if (res.consent_token) {
        setStoredConsentToken(res.consent_token)
      }
      setHasConsent(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const withdrawConsent = useCallback(async () => {
    setIsLoading(true)
    try {
      await api.withdrawConsent()
      clearStoredConsentToken()
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
