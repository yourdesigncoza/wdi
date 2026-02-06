import { useState, useRef, useEffect, useCallback } from 'react'
import { useConversation } from '../hooks/useConversation.ts'
import { ChatMessage } from './ChatMessage.tsx'
import { useWillStore } from '../store/useWillStore.ts'
import type { WillSection } from '../types/will.ts'

interface ChatSectionProps {
  section: WillSection
  willId: string
  onNext?: () => void
}

/** Section-specific AI greeting messages to initiate conversation */
const SECTION_GREETINGS: Record<string, string> = {
  beneficiaries:
    "Let's talk about who you'd like to inherit from your estate. Who would you like to name as a beneficiary?",
  assets:
    "Now let's go through your assets. What property, vehicles, bank accounts, or other assets would you like to include?",
  guardians:
    "If you have children under 18, it's important to nominate a guardian. Would you like to discuss this?",
  executor:
    "An executor manages your estate after your passing. Would you like to nominate someone, or would you prefer a professional executor?",
  bequests:
    "Would you like to leave any specific items to specific people? This is completely optional.",
  residue:
    "Finally, how would you like the remainder of your estate distributed?",
  trust:
    "Let's set up a testamentary trust to protect your minor children's inheritance. In South Africa, children under 18 cannot inherit directly. What would you like to name this trust?",
  usufruct:
    "Let's discuss a usufruct over your property. This allows someone to use and enjoy the property while ownership passes to other beneficiaries. Which property would you like to set this up for?",
  business:
    "Let's go through your business interests. What is the name and type of your business (Close Corporation, Pty Ltd, or partnership)?",
}

/** Section headings displayed at the top of the chat area */
const SECTION_HEADINGS: Record<string, string> = {
  beneficiaries: 'Beneficiaries',
  assets: 'Your Assets',
  guardians: 'Guardians for Minor Children',
  executor: 'Executor Nomination',
  bequests: 'Specific Bequests',
  residue: 'Residual Estate',
  trust: 'Testamentary Trust',
  usufruct: 'Usufruct Provision',
  business: 'Business Assets',
  joint: 'Joint Will',
}

/**
 * Full chat interface for AI-driven will sections.
 *
 * Renders a scrollable message list with DaisyUI chat bubbles,
 * a sticky input area at the bottom, and auto-scrolls on new messages.
 * Uses useConversation hook for SSE streaming with the backend.
 */
export function ChatSection({ section, willId, onNext }: ChatSectionProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Build will context from store for the AI system prompt
  const testator = useWillStore((s) => s.testator)
  const marital = useWillStore((s) => s.marital)
  const beneficiaries = useWillStore((s) => s.beneficiaries)
  const assets = useWillStore((s) => s.assets)
  const guardians = useWillStore((s) => s.guardians)
  const executor = useWillStore((s) => s.executor)
  const bequests = useWillStore((s) => s.bequests)
  const residue = useWillStore((s) => s.residue)

  const willContext: Record<string, unknown> = {
    testator,
    marital,
    beneficiaries,
    assets,
    guardians,
    executor,
    bequests,
    residue,
  }

  const { messages, isStreaming, error, sendMessage, stopStreaming, setMessages } =
    useConversation({ section, willContext, willId })

  // Show greeting message when entering a section with no history
  useEffect(() => {
    if (messages.length === 0 && SECTION_GREETINGS[section]) {
      setMessages([
        { role: 'assistant', content: SECTION_GREETINGS[section] },
      ])
    }
  }, [messages.length, section, setMessages])

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    void sendMessage(trimmed)
    // Refocus textarea after sending
    textareaRef.current?.focus()
  }, [input, isStreaming, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift for newline)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const heading = SECTION_HEADINGS[section] ?? section

  return (
    <div className="flex flex-col h-[calc(100dvh-theme(spacing.32))] min-h-80">
      {/* Section heading */}
      <div className="pb-3 border-b border-base-300">
        <h2 className="text-lg font-semibold text-base-content">{heading}</h2>
        <p className="text-xs text-base-content/60 mt-1">
          Chat with WillCraft AI to complete this section
        </p>
      </div>

      {/* Scrollable message list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.map((msg, index) => (
          <ChatMessage
            key={`${section}-${index}`}
            message={msg}
            isStreaming={isStreaming && index === messages.length - 1}
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

      {/* Sticky input area */}
      <div className="sticky bottom-0 pt-3 border-t border-base-300 bg-base-100">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="textarea textarea-bordered flex-1 min-h-10 max-h-32 resize-none text-sm leading-snug"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={stopStreaming}
              aria-label="Stop streaming"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSend}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          )}
        </div>

        {/* Next Section navigation */}
        {onNext && !isStreaming && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={onNext}
            >
              Next Section &rarr;
            </button>
          </div>
        )}

        <p className="text-[10px] text-base-content/40 mt-1 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
