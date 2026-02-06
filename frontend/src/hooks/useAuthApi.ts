import { useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { createAuthenticatedApi, type ApiClient } from '../services/api'

/**
 * Returns an API client that automatically injects the Clerk session token
 * as a Bearer token on each request. Token is fetched lazily per-request
 * to ensure it is always fresh.
 */
export function useAuthApi(): ApiClient {
  const { getToken } = useAuth()
  return useMemo(() => createAuthenticatedApi(getToken), [getToken])
}
