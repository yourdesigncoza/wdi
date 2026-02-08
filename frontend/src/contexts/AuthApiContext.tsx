import { createContext, useContext, type ReactNode } from 'react'
import { useAuthApi } from '../hooks/useAuthApi'
import type { ApiClient } from '../services/api'

const AuthApiContext = createContext<ApiClient | null>(null)

export function AuthApiProvider({ children }: { children: ReactNode }) {
  const api = useAuthApi()
  return (
    <AuthApiContext.Provider value={api}>
      {children}
    </AuthApiContext.Provider>
  )
}

export function useApi(): ApiClient {
  const ctx = useContext(AuthApiContext)
  if (!ctx) {
    throw new Error('useApi must be used within AuthApiProvider')
  }
  return ctx
}
