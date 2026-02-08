import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useConversation } from '../hooks/useConversation.ts'
import { ChatMessage } from './ChatMessage.tsx'
import { SectionReview } from './SectionReview.tsx'
import { useWillStore } from '../store/useWillStore.ts'
import { useWillProgress } from '../hooks/useWillProgress.ts'
import { useApi } from '../../../contexts/AuthApiContext'
import type { WillSection } from '../types/will.ts'

/** Base sections always shown in review cards */
const BASE_REVIEWABLE_SECTIONS: WillSection[] = [
  'personal',
  'beneficiaries',
  'assets',
  'guardians',
  'executor',
  'bequests',
  'residue',
]

interface ReviewChatProps {
  willId: string
  onNavigateToSection: (section: WillSection) => void
}

/**
 * AI-led interactive will review conversation.
 *
 * On mount, the AI walks through the entire will in plain, friendly language,
 * narrating each section conversationally (e.g., "Your estate goes 50% to Sarah").
 * The user can request changes and be routed back to the relevant section.
 *
 * Below the chat: collapsible SectionReview cards for quick-reference data view.
 */
export function ReviewChat({ willId, onNavigateToSection }: ReviewChatProps) {
  const api = useApi()
  const [input, setInput] = useState('')
  const [showReviewCards, setShowReviewCards] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const greetingSentRef = useRef(false)

  // Build will context from store
  const testator = useWillStore((s) => s.testator)
  const marital = useWillStore((s) => s.marital)
  const beneficiaries = useWillStore((s) => s.beneficiaries)
  const assets = useWillStore((s) => s.assets)
  const guardians = useWillStore((s) => s.guardians)
  const executor = useWillStore((s) => s.executor)
  const bequests = useWillStore((s) => s.bequests)
  const residue = useWillStore((s) => s.residue)
  const trustProvisions = useWillStore((s) => s.trustProvisions)
  const usufruct = useWillStore((s) => s.usufruct)
  const businessAssets = useWillStore((s) => s.businessAssets)
  const jointWill = useWillStore((s) => s.jointWill)

  const { activeComplexSections } = useWillProgress()

  // Dynamic reviewable sections: base + active complex sections
  const reviewableSections = useMemo(() => {
    return [...BASE_REVIEWABLE_SECTIONS, ...activeComplexSections]
  }, [activeComplexSections])

  const willContext: Record<string, unknown> = {
    testator,
    marital,
    beneficiaries,
    assets,
    guardians,
    executor,
    bequests,
    residue,
    trustProvisions,
    usufruct,
    businessAssets,
    jointWill,
  }

  const { messages, isStreaming, error, sendMessage, stopStreaming } =
    useConversation({ section: 'review', willContext, willId, api })

  // On mount, trigger the AI to narrate the complete will
  useEffect(() => {
    if (greetingSentRef.current || messages.length > 0) return
    greetingSentRef.current = true

    // Build a concise summary of all will data for the initial prompt
    const summaryParts: string[] = []

    const name = [testator.firstName, testator.lastName].filter(Boolean).join(' ')
    if (name) summaryParts.push(`Testator: ${name}`)

    if (beneficiaries.length > 0) {
      const bList = beneficiaries.map((b) => {
        const share = b.sharePercent != null ? ` (${b.sharePercent}%)` : ''
        return `${b.fullName} - ${b.relationship}${share}`
      })
      summaryParts.push(`Beneficiaries: ${bList.join('; ')}`)
    }

    if (assets.length > 0) {
      const aList = assets.map((a) => `${a.assetType}: ${a.description}`)
      summaryParts.push(`Assets: ${aList.join('; ')}`)
    }

    if (guardians.length > 0) {
      const gList = guardians.map((g) => {
        const role = g.isPrimary ? 'Primary' : 'Backup'
        return `${g.fullName} (${role}, ${g.relationship})`
      })
      summaryParts.push(`Guardians: ${gList.join('; ')}`)
    }

    if (executor.name) {
      const prof = executor.isProfessional ? ' (professional)' : ''
      summaryParts.push(`Executor: ${executor.name}${prof}`)
      if (executor.backupName) {
        summaryParts.push(`Backup executor: ${executor.backupName}`)
      }
    }

    if (bequests.length > 0) {
      const bqList = bequests.map((b) => `${b.itemDescription} to ${b.recipientName}`)
      summaryParts.push(`Specific bequests: ${bqList.join('; ')}`)
    }

    if (residue.beneficiaries?.length) {
      const rList = residue.beneficiaries.map((r) => `${r.name} (${r.sharePercent}%)`)
      summaryParts.push(`Residue: ${rList.join('; ')}`)
    }

    // Complex section summaries
    if (trustProvisions.trustName) {
      const tParts = [`Trust: ${trustProvisions.trustName}`]
      if (trustProvisions.vestingAge) tParts.push(`vesting at age ${trustProvisions.vestingAge}`)
      if (trustProvisions.trustees?.length) {
        tParts.push(`trustees: ${trustProvisions.trustees.map((t) => t.name).join(', ')}`)
      }
      summaryParts.push(`Testamentary Trust: ${tParts.join(', ')}`)
    }

    if (usufruct.propertyDescription) {
      const uParts = [usufruct.propertyDescription]
      if (usufruct.usufructuaryName) uParts.push(`usufructuary: ${usufruct.usufructuaryName}`)
      if (usufruct.duration) uParts.push(`duration: ${usufruct.duration}`)
      summaryParts.push(`Usufruct: ${uParts.join(', ')}`)
    }

    if (businessAssets.length > 0) {
      const baList = businessAssets.map((ba) => `${ba.businessName} (${ba.businessType})`)
      summaryParts.push(`Business Assets: ${baList.join('; ')}`)
    }

    if (jointWill.coTestatorFirstName) {
      const jParts = [`Co-testator: ${[jointWill.coTestatorFirstName, jointWill.coTestatorLastName].filter(Boolean).join(' ')}`]
      if (jointWill.willStructure) jParts.push(`structure: ${jointWill.willStructure}`)
      summaryParts.push(`Joint Will: ${jParts.join(', ')}`)
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join('\n')
      : 'No will data collected yet.'

    // Send the full will state as a system-triggered user message
    // The review system prompt will instruct the AI to narrate it
    void sendMessage(
      `Please review my complete will. Here is the current data:\n${summary}`,
    )
  }, [
    messages.length,
    sendMessage,
    testator,
    beneficiaries,
    assets,
    guardians,
    executor,
    bequests,
    residue,
    trustProvisions,
    usufruct,
    businessAssets,
    jointWill,
  ])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    void sendMessage(trimmed)
    textareaRef.current?.focus()
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // Filter out the initial system-triggered message from display
  // (first user message is the auto-generated will summary request)
  const displayMessages = messages.length > 0 && messages[0].role === 'user'
    ? messages.slice(1)
    : messages

  // Show "Looks Good" button once the AI has responded (at least 1 assistant message)
  const hasAIResponse = displayMessages.some((m) => m.role === 'assistant' && m.content.length > 0)

  return (
    <div className="flex flex-col h-[calc(100dvh-theme(spacing.32))] min-h-80">
      {/* Header */}
      <div className="pb-3 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content">Will Review</h2>
        <p className="text-xs text-base-content/60 mt-1">
          WillCraft AI will walk through your will in plain language
        </p>
      </div>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {displayMessages.map((msg, index) => (
          <ChatMessage
            key={`review-${index}`}
            message={msg}
            isStreaming={isStreaming && index === displayMessages.length - 1}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-soft alert-error text-sm mb-2">
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      {hasAIResponse && !isStreaming && (
        <div className="flex flex-wrap gap-2 py-2">
          <button
            type="button"
            className="btn btn-neutral btn-sm flex-1 sm:flex-none"
            onClick={() => onNavigateToSection('verification')}
          >
            Looks Good — Proceed
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowReviewCards((prev) => !prev)}
          >
            {showReviewCards ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      )}

      {/* Collapsible section review cards */}
      {showReviewCards && (
        <div className="space-y-3 py-3 border-t border-base-300 overflow-y-auto max-h-60">
          {reviewableSections.map((section) => (
            <SectionReview
              key={section}
              section={section}
              onEdit={onNavigateToSection}
            />
          ))}
        </div>
      )}

      {/* Sticky input area */}
      <div className="sticky bottom-0 pt-3 border-t border-base-300 bg-base-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered flex-1 min-h-10 max-h-32 resize-none text-sm leading-snug"
            placeholder="Tell the AI what you'd like to change..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={stopStreaming}
              aria-label="Stop streaming"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          )}
        </div>
        <p className="text-[10px] text-base-content/40 mt-1 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
