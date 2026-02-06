// Verification types matching backend schemas (app/schemas/verification.py)

// --- Shared types ---

export type IssueSeverity = 'error' | 'warning' | 'info'
export type SectionStatus = 'pass' | 'warning' | 'error'
export type OverallStatus = 'pass' | 'warning' | 'error'

// --- Gemini structured output types ---

export interface VerificationIssue {
  code: string
  severity: IssueSeverity
  section: string
  title: string
  explanation: string
  suggestion: string
}

export interface SectionResult {
  section: string
  status: SectionStatus
  issues: VerificationIssue[]
}

export interface AttorneyReferral {
  recommended: boolean
  reasons: string[]
}

export interface VerificationResult {
  overall_status: OverallStatus
  sections: SectionResult[]
  attorney_referral: AttorneyReferral
  summary: string
}

// --- API response types ---

export interface VerificationResponse extends VerificationResult {
  verified_at: string
  has_blocking_errors: boolean
}

export interface AcknowledgeWarningsResponse {
  acknowledged: string[]
  can_proceed: boolean
}

// --- SSE progress event types ---

export interface VerificationProgress {
  step: string
  message: string
}

export interface SectionProgressEvent {
  section: string
  status: SectionStatus
  issue_count: number
}
