const BASE_URL = '/api'

/** Convert snake_case keys to camelCase for frontend consumption */
export function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

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

async function requestBlob(
  path: string,
  options?: RequestInit,
  tokenGetter?: TokenGetter,
): Promise<Blob> {
  const headers: Record<string, string> = {
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
    const errorData = await response.json().catch(() => ({ detail: `Request failed: ${response.status}` }))
    throw new Error(errorData.detail || `API error: ${response.status}`)
  }

  return response.blob()
}

// ── Shared Type Exports ──────────────────────────────────────────────

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

export interface WillResponse {
  id: string
  user_id: string
  will_type: string
  status: string
  version: number
  current_section: string
  paid_at: string | null
  testator: Record<string, unknown>
  marital: Record<string, unknown>
  beneficiaries: Record<string, unknown>[]
  assets: Record<string, unknown>[]
  guardians: Record<string, unknown>[]
  executor: Record<string, unknown>
  bequests: Record<string, unknown>[]
  residue: Record<string, unknown>
  trust_provisions: Record<string, unknown>
  usufruct: Record<string, unknown>
  business_assets: Record<string, unknown>[]
  joint_will: Record<string, unknown>
  scenarios: string[]
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

export interface PaymentInitiateResponse {
  payment_id: string
  m_payment_id: string
  payfast_url: string
  form_data: Record<string, string>
}

export interface PaymentStatusResponse {
  payment_id: string
  status: string // pending | completed | cancelled | failed
  download_token: string | null
}

// ── buildApi Factory ─────────────────────────────────────────────────

function buildApi(tokenGetter?: TokenGetter) {
  return {
    // ── Consent / Privacy (public endpoints) ───────────────────────

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

    // ── Will CRUD ──────────────────────────────────────────────────

    createWill(willType = 'basic'): Promise<WillResponse> {
      return request('/wills', {
        method: 'POST',
        body: JSON.stringify({ will_type: willType }),
      }, tokenGetter)
    },

    getWill(willId: string): Promise<WillResponse> {
      return request(`/wills/${willId}`, undefined, tokenGetter)
    },

    listWills(): Promise<WillResponse[]> {
      return request('/wills', undefined, tokenGetter)
    },

    updateWillSection(
      willId: string,
      section: string,
      data: unknown,
    ): Promise<WillResponse> {
      return request(`/wills/${willId}/sections/${section}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, tokenGetter)
    },

    markSectionComplete(
      willId: string,
      section: string,
    ): Promise<WillResponse> {
      return request(`/wills/${willId}/sections/${section}/complete`, {
        method: 'POST',
      }, tokenGetter)
    },

    updateCurrentSection(
      willId: string,
      section: string,
    ): Promise<WillResponse> {
      return request(`/wills/${willId}/current-section`, {
        method: 'PATCH',
        body: JSON.stringify({ current_section: section }),
      }, tokenGetter)
    },

    // ── Conversation ───────────────────────────────────────────────

    getConversationHistory(
      willId: string,
      section: string,
    ): Promise<ConversationHistoryResponse> {
      return request(`/conversation/${willId}/${section}`, undefined, tokenGetter)
    },

    extractConversationData(
      willId: string,
      section: string,
    ): Promise<{ extracted: Record<string, unknown>; has_data: boolean }> {
      return request(`/conversation/${willId}/${section}/extract`, {
        method: 'POST',
      }, tokenGetter)
    },

    // ── Verification ───────────────────────────────────────────────

    getVerificationResult(
      willId: string,
    ): Promise<VerificationResponseData> {
      return request(`/wills/${willId}/verification`, undefined, tokenGetter)
    },

    acknowledgeWarnings(
      willId: string,
      warningCodes: string[],
    ): Promise<AcknowledgeWarningsResponseData> {
      return request(`/wills/${willId}/acknowledge-warnings`, {
        method: 'POST',
        body: JSON.stringify({ warning_codes: warningCodes }),
      }, tokenGetter)
    },

    // ── Document Generation ────────────────────────────────────────

    generatePreview(willId: string): Promise<Blob> {
      return requestBlob(`/wills/${willId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclaimer_acknowledged: true }),
      }, tokenGetter)
    },

    regenerateWill(
      willId: string,
    ): Promise<{ download_token: string; version: number }> {
      return request(`/wills/${willId}/regenerate`, {
        method: 'POST',
      }, tokenGetter)
    },

    // ── Payment & Download ─────────────────────────────────────────

    initiatePayment(willId: string): Promise<PaymentInitiateResponse> {
      return request('/payment/initiate', {
        method: 'POST',
        body: JSON.stringify({ will_id: willId }),
      }, tokenGetter)
    },

    getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
      return request(`/payment/${paymentId}/status`, undefined, tokenGetter)
    },

    downloadWill(token: string): Promise<Blob> {
      return requestBlob(`/download/${token}`, undefined, tokenGetter)
    },

    // ── Token Access (for SSE hooks that need raw fetch) ───────────

    async getToken(): Promise<string | null> {
      if (!tokenGetter) return null
      return tokenGetter()
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
