import { useState, useCallback, useEffect } from 'react'
import { useWillStore } from '../store/useWillStore.ts'
import { useVerification } from '../hooks/useVerification.ts'
import { acknowledgeWarnings } from '../../../services/api.ts'
import type { WillSection } from '../types/will.ts'
import type {
  VerificationIssue,
  SectionResult,
} from '../types/verification.ts'

/** Human-readable labels for will sections */
const SECTION_LABELS: Record<string, string> = {
  personal: 'Personal Details',
  testator: 'Personal Details',
  marital: 'Marital Information',
  beneficiaries: 'Beneficiaries',
  assets: 'Assets',
  guardians: 'Guardians',
  executor: 'Executor',
  bequests: 'Specific Bequests',
  residue: 'Residual Estate',
  trust: 'Testamentary Trust',
  trust_provisions: 'Testamentary Trust',
  usufruct: 'Usufruct',
  business: 'Business Assets',
  business_assets: 'Business Assets',
  joint: 'Joint Will',
  joint_will: 'Joint Will',
}

/** Map a backend section name to a navigable WillSection key */
function toWillSection(section: string): WillSection | null {
  const mapping: Record<string, WillSection> = {
    personal: 'personal',
    testator: 'personal',
    marital: 'personal',
    beneficiaries: 'beneficiaries',
    assets: 'assets',
    guardians: 'guardians',
    executor: 'executor',
    bequests: 'bequests',
    residue: 'residue',
    trust: 'trust',
    trust_provisions: 'trust',
    usufruct: 'usufruct',
    business: 'business',
    business_assets: 'business',
    joint: 'joint',
    joint_will: 'joint',
  }
  return mapping[section] ?? null
}

/** Severity badge: colour and icon */
function SeverityBadge({ severity }: { severity: VerificationIssue['severity'] }) {
  const classes: Record<string, string> = {
    error: 'badge badge-error gap-1',
    warning: 'badge badge-warning gap-1',
    info: 'badge badge-info gap-1',
  }
  return (
    <span className={classes[severity] ?? 'badge'}>
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        {severity === 'error' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        )}
        {severity === 'warning' && (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        )}
        {severity === 'info' && (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01" />
        )}
      </svg>
      {severity}
    </span>
  )
}

/** Status badge for a section result */
function StatusBadge({ status }: { status: SectionResult['status'] }) {
  const classes: Record<string, string> = {
    pass: 'badge badge-success',
    warning: 'badge badge-warning',
    error: 'badge badge-error',
  }
  const labels: Record<string, string> = {
    pass: 'Pass',
    warning: 'Warning',
    error: 'Error',
  }
  return <span className={classes[status] ?? 'badge'}>{labels[status] ?? status}</span>
}

/** Individual issue card */
function IssueCard({
  issue,
  onNavigate,
}: {
  issue: VerificationIssue
  onNavigate: (section: WillSection) => void
}) {
  const targetSection = toWillSection(issue.section)

  return (
    <div className="flex flex-col gap-1 p-3 bg-base-200 rounded-lg">
      <div className="flex items-center gap-2 flex-wrap">
        <SeverityBadge severity={issue.severity} />
        <span className="font-medium text-sm">{issue.title}</span>
      </div>
      <p className="text-sm text-base-content/70">{issue.explanation}</p>
      <p className="text-sm text-base-content/60 italic">{issue.suggestion}</p>
      {targetSection && (
        <button
          type="button"
          className="btn btn-ghost btn-xs self-start mt-1"
          onClick={() => onNavigate(targetSection)}
        >
          Go to {SECTION_LABELS[issue.section] ?? issue.section}
        </button>
      )}
    </div>
  )
}

export function VerificationPage() {
  const willId = useWillStore((s) => s.willId)
  const setCurrentSection = useWillStore((s) => s.setCurrentSection)
  const setVerificationResult = useWillStore((s) => s.setVerificationResult)
  const storedAcknowledged = useWillStore((s) => s.acknowledgedWarnings)
  const setAcknowledgedWarnings = useWillStore((s) => s.setAcknowledgedWarnings)

  const {
    isVerifying,
    progress,
    sectionResults,
    result,
    error,
    startVerification,
  } = useVerification(willId)

  // Local state for warning acknowledgment checkboxes
  const [checkedWarnings, setCheckedWarnings] = useState<Set<string>>(
    new Set(storedAcknowledged),
  )
  const [acknowledging, setAcknowledging] = useState(false)
  const [canProceed, setCanProceed] = useState(false)

  // Persist result to store when verification completes
  useEffect(() => {
    if (result) {
      setVerificationResult(result as unknown as Record<string, unknown>)
      // Check if already can proceed (no errors AND no warnings, or all warnings acknowledged)
      const hasErrors = result.sections.some((s) =>
        s.issues.some((i) => i.severity === 'error'),
      )
      const warningCodes = result.sections
        .flatMap((s) => s.issues)
        .filter((i) => i.severity === 'warning')
        .map((i) => i.code)
      const allWarningsAcked =
        warningCodes.length === 0 ||
        warningCodes.every((c) => checkedWarnings.has(c))
      setCanProceed(!hasErrors && allWarningsAcked)
    }
  }, [result, setVerificationResult, checkedWarnings])

  /** Navigate to a section for fixing */
  const handleNavigate = useCallback(
    (section: WillSection) => {
      setCurrentSection(section)
    },
    [setCurrentSection],
  )

  /** Find first section with errors and navigate to it */
  const handleFixIssues = useCallback(() => {
    if (!result) return
    for (const section of result.sections) {
      if (section.status === 'error') {
        const target = toWillSection(section.section)
        if (target) {
          setCurrentSection(target)
          return
        }
      }
    }
  }, [result, setCurrentSection])

  /** Toggle a warning checkbox */
  const toggleWarning = useCallback((code: string) => {
    setCheckedWarnings((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  /** Acknowledge all checked warnings via API */
  const handleAcknowledgeWarnings = useCallback(async () => {
    if (!willId || checkedWarnings.size === 0) return
    setAcknowledging(true)
    try {
      const response = await acknowledgeWarnings(willId, [...checkedWarnings])
      setAcknowledgedWarnings(response.acknowledged)
      setCanProceed(response.can_proceed)
    } catch (err) {
      console.error('Failed to acknowledge warnings:', err)
    } finally {
      setAcknowledging(false)
    }
  }, [willId, checkedWarnings, setAcknowledgedWarnings])

  /** Bulk-select all warnings */
  const handleAcknowledgeAll = useCallback(() => {
    if (!result) return
    const warningCodes = result.sections
      .flatMap((s) => s.issues)
      .filter((i) => i.severity === 'warning')
      .map((i) => i.code)
    setCheckedWarnings(new Set(warningCodes))
  }, [result])

  // Collect warning issues for the acknowledgment section
  const warningIssues = result
    ? result.sections.flatMap((s) => s.issues).filter((i) => i.severity === 'warning')
    : []
  const allWarningsChecked =
    warningIssues.length > 0 && warningIssues.every((w) => checkedWarnings.has(w.code))
  const hasBlockingErrors = result
    ? result.sections.some((s) => s.issues.some((i) => i.severity === 'error'))
    : false

  // ──────────────────────────────────────────────────────────────────
  // STATE A: Not yet verified (no result, not verifying)
  // ──────────────────────────────────────────────────────────────────
  if (!isVerifying && !result && !error) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Verify Your Will</h2>
          <p className="text-base-content/70">
            Before generating your will document, we will verify all sections for
            completeness and compliance with South African law.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-neutral btn-lg"
          onClick={startVerification}
          disabled={!willId}
        >
          Verify My Will
        </button>
        {!willId && (
          <p className="text-sm text-warning">
            Please complete at least one section before verifying.
          </p>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────
  // STATE B: Verification in progress
  // ──────────────────────────────────────────────────────────────────
  if (isVerifying) {
    return (
      <div className="flex flex-col gap-6 py-6">
        <h2 className="text-xl font-bold">Verifying Your Will...</h2>

        {/* Progress checklist */}
        <ul className="steps steps-vertical">
          {progress.map((p, i) => {
            const isLast = i === progress.length - 1
            return (
              <li
                key={`${p.step}-${i}`}
                className={`step ${isLast ? 'step-neutral' : 'step-primary'}`}
              >
                <div className="flex items-center gap-2">
                  {isLast ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg
                      className="w-4 h-4 text-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  <span className="text-sm">{p.message}</span>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Streamed section results */}
        {sectionResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-base-content/70">
              Section Results
            </h3>
            {sectionResults.map((sr) => (
              <div
                key={sr.section}
                className="flex items-center justify-between px-3 py-2 bg-base-200 rounded-lg"
              >
                <span className="text-sm font-medium">
                  {SECTION_LABELS[sr.section] ?? sr.section}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={sr.status} />
                  {sr.issue_count > 0 && (
                    <span className="text-xs text-base-content/60">
                      {sr.issue_count} issue{sr.issue_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────
  // ERROR state
  // ──────────────────────────────────────────────────────────────────
  if (error && !result) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="alert alert-error max-w-md">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span>{error}</span>
        </div>
        <button type="button" className="btn btn-neutral" onClick={startVerification}>
          Try Again
        </button>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────
  // STATE C: Verification complete — show results
  // ──────────────────────────────────────────────────────────────────
  if (!result) return null

  const alertClass: Record<string, string> = {
    pass: 'alert alert-success',
    warning: 'alert alert-warning',
    error: 'alert alert-error',
  }
  const alertMessages: Record<string, string> = {
    pass: 'Your will is ready for document generation.',
    warning: 'Your will has warnings that need acknowledgment before proceeding.',
    error: 'Your will has errors that must be fixed before proceeding.',
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Summary card */}
      <div className={alertClass[result.overall_status] ?? 'alert'}>
        <svg
          className="w-6 h-6 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          {result.overall_status === 'pass' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          )}
          {result.overall_status === 'warning' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          )}
          {result.overall_status === 'error' && (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          )}
        </svg>
        <div>
          <h3 className="font-bold">
            {alertMessages[result.overall_status]}
          </h3>
          <p className="text-sm mt-1">{result.summary}</p>
        </div>
      </div>

      {/* Section-by-section breakdown */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Section Breakdown</h3>
        {result.sections.map((section) => (
          <SectionAccordion
            key={section.section}
            section={section}
            onNavigate={handleNavigate}
          />
        ))}
      </div>

      {/* Attorney referral notification */}
      {result.attorney_referral.recommended && (
        <div className="alert alert-info">
          <svg
            className="w-6 h-6 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="font-bold">Attorney Consultation Recommended</h4>
            <p className="text-sm mt-1">
              We recommend consulting a qualified attorney for the following reasons:
            </p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              {result.attorney_referral.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Warning acknowledgment */}
      {warningIssues.length > 0 && !hasBlockingErrors && (
        <div className="card card-border bg-base-100">
          <div className="card-body p-4">
            <h3 className="card-title text-sm">Acknowledge Warnings</h3>
            <p className="text-sm text-base-content/70 mb-3">
              Please review and acknowledge the following warnings to proceed.
            </p>
            <div className="space-y-2">
              {warningIssues.map((issue) => (
                <label
                  key={issue.code}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="checkbox mt-0.5"
                    checked={checkedWarnings.has(issue.code)}
                    onChange={() => toggleWarning(issue.code)}
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium">{issue.title}</span>
                    <p className="text-xs text-base-content/60">{issue.explanation}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="card-actions mt-4 flex gap-2">
              {!allWarningsChecked && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleAcknowledgeAll}
                >
                  Select All
                </button>
              )}
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={handleAcknowledgeWarnings}
                disabled={checkedWarnings.size === 0 || acknowledging}
              >
                {acknowledging ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  'Acknowledge Warnings'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {hasBlockingErrors && (
          <button
            type="button"
            className="btn btn-neutral"
            onClick={handleFixIssues}
          >
            Fix Issues
          </button>
        )}
        {!hasBlockingErrors && canProceed && (
          <button
            type="button"
            className="btn btn-neutral"
            onClick={() => setCurrentSection('document')}
          >
            Proceed to Document Generation
          </button>
        )}
        <button
          type="button"
          className="btn btn-outline"
          onClick={startVerification}
        >
          Re-verify
        </button>
      </div>
    </div>
  )
}

/** Expandable section accordion showing issues */
function SectionAccordion({
  section,
  onNavigate,
}: {
  section: SectionResult
  onNavigate: (section: WillSection) => void
}) {
  const label = SECTION_LABELS[section.section] ?? section.section
  const issueCount = section.issues.length

  return (
    <div className="collapse collapse-arrow bg-base-200">
      <input type="checkbox" />
      <div className="collapse-title flex items-center justify-between pr-12">
        <span className="font-medium text-sm">{label}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={section.status} />
          {issueCount > 0 && (
            <span className="text-xs text-base-content/60">
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="collapse-content">
        {issueCount === 0 ? (
          <p className="text-sm text-base-content/60 pt-2">
            No issues found in this section.
          </p>
        ) : (
          <div className="space-y-3 pt-2">
            {section.issues.map((issue, i) => (
              <IssueCard key={`${issue.code}-${i}`} issue={issue} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
