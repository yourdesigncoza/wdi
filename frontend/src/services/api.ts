const BASE_URL = '/api'

type TokenGetter = () => Promise<string | null>

async function request<T>(
  path: string,
  options?: RequestInit,
  tokenGetter?: TokenGetter,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (tokenGetter) {
    const token = await tokenGetter()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export interface ConsentStatusResponse {
  has_valid_consent: boolean
  consent_version?: string
}

export interface ConsentResponse {
  consent_id: string
  accepted_at: string
  consent_version: string
}

export interface PrivacyPolicySection {
  heading: string
  body: string
}

export interface PrivacyPolicyResponse {
  version: string
  effective_date: string
  title: string
  sections: PrivacyPolicySection[]
}

export interface InfoOfficerResponse {
  name: string
  organisation: string
  email: string
  phone: string
  address: string
  regulator: {
    name: string
    email: string
    phone: string
    website: string
  }
}

export interface DataRequestResponse {
  reference_id: string
  request_type: string
  status: string
  message: string
}

function buildApi(tokenGetter?: TokenGetter) {
  return {
    checkConsentStatus(): Promise<ConsentStatusResponse> {
      return request('/consent/status', undefined, tokenGetter)
    },

    grantConsent(categories: string[]): Promise<ConsentResponse> {
      return request('/consent', {
        method: 'POST',
        body: JSON.stringify({ categories }),
      }, tokenGetter)
    },

    withdrawConsent(): Promise<{ status: string; message: string }> {
      return request('/consent/withdraw', { method: 'POST' }, tokenGetter)
    },

    getPrivacyPolicy(): Promise<PrivacyPolicyResponse> {
      return request('/privacy-policy', undefined, tokenGetter)
    },

    getInfoOfficer(): Promise<InfoOfficerResponse> {
      return request('/info-officer', undefined, tokenGetter)
    },

    submitDataRequest(data: {
      request_type: string
      details?: string
    }): Promise<DataRequestResponse> {
      return request('/data-request', {
        method: 'POST',
        body: JSON.stringify(data),
      }, tokenGetter)
    },
  }
}

export type ApiClient = ReturnType<typeof buildApi>

/** Unauthenticated API client for public endpoints (consent, privacy-policy, info-officer) */
export const api = buildApi()

/** Create an authenticated API client that injects a Bearer token on each request */
export function createAuthenticatedApi(tokenGetter: TokenGetter): ApiClient {
  return buildApi(tokenGetter)
}

// ── Will & Conversation API ──────────────────────────────────────────

export interface WillResponse {
  id: string
  user_id: string
  will_type: string
  status: string
  testator: Record<string, unknown>
  marital: Record<string, unknown>
  beneficiaries: Record<string, unknown>[]
  assets: Record<string, unknown>[]
  guardians: Record<string, unknown>[]
  executor: Record<string, unknown>
  bequests: Record<string, unknown>[]
  residue: Record<string, unknown>
  sections_complete: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface ConversationHistoryMessage {
  role: string
  content: string
  timestamp?: string
}

export interface ConversationHistoryResponse {
  will_id: string
  section: string
  messages: ConversationHistoryMessage[]
}

/** Create a new will draft */
export function createWill(willType = 'basic'): Promise<WillResponse> {
  return request('/wills', {
    method: 'POST',
    body: JSON.stringify({ will_type: willType }),
  })
}

/** Retrieve a specific will */
export function getWill(willId: string): Promise<WillResponse> {
  return request(`/wills/${willId}`)
}

/** Update a will section */
export function updateWillSection(
  willId: string,
  section: string,
  data: unknown,
): Promise<WillResponse> {
  return request(`/wills/${willId}/sections/${section}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** Mark a section as complete */
export function markSectionComplete(
  willId: string,
  section: string,
): Promise<WillResponse> {
  return request(`/wills/${willId}/sections/${section}/complete`, {
    method: 'POST',
  })
}

/** Fetch conversation history for a will section */
export function getConversationHistory(
  willId: string,
  section: string,
): Promise<ConversationHistoryResponse> {
  return request(`/conversation/${willId}/${section}`)
}

// ── Verification API ─────────────────────────────────────────────────

export interface VerificationResponseData {
  overall_status: 'pass' | 'warning' | 'error'
  sections: {
    section: string
    status: 'pass' | 'warning' | 'error'
    issues: {
      code: string
      severity: 'error' | 'warning' | 'info'
      section: string
      title: string
      explanation: string
      suggestion: string
    }[]
  }[]
  attorney_referral: { recommended: boolean; reasons: string[] }
  summary: string
  verified_at: string
  has_blocking_errors: boolean
}

export interface AcknowledgeWarningsResponseData {
  acknowledged: string[]
  can_proceed: boolean
}

/** Retrieve the last verification result for a will */
export function getVerificationResult(
  willId: string,
): Promise<VerificationResponseData> {
  return request(`/wills/${willId}/verification`)
}

/** Acknowledge warning-level verification issues */
export function acknowledgeWarnings(
  willId: string,
  warningCodes: string[],
): Promise<AcknowledgeWarningsResponseData> {
  return request(`/wills/${willId}/acknowledge-warnings`, {
    method: 'POST',
    body: JSON.stringify({ warning_codes: warningCodes }),
  })
}
