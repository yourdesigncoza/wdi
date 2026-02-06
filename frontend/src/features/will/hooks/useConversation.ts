import { useState, useCallback, useRef, useEffect } from 'react'
import { getConversationHistory } from '../../../services/api.ts'
import type { WillSection } from '../types/will.ts'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseConversationOptions {
  section: WillSection
  willContext: Record<string, unknown>
  willId: string | null
}

const API_BASE = '/api'

/**
 * SSE streaming conversation hook.
 *
 * Connects to POST /api/conversation/stream and parses
 * the dual-event SSE pattern (delta / filtered / done / error).
 *
 * On section change, loads existing conversation history from the backend.
 */
export function useConversation({ section, willContext, willId }: UseConversationOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /** Load conversation history when section or willId changes */
  useEffect(() => {
    if (!willId) {
      setMessages([])
      return
    }

    let cancelled = false

    async function loadHistory() {
      try {
        const history = await getConversationHistory(willId!, section)
        if (!cancelled) {
          setMessages(
            history.messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          )
        }
      } catch {
        // First visit to section -- no history yet, start fresh
        if (!cancelled) {
          setMessages([])
        }
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [willId, section])

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!willId) return

      setError(null)
      const userMsg: Message = { role: 'user', content: userMessage }

      setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
      setIsStreaming(true)

      abortRef.current = new AbortController()

      try {
        const response = await fetch(`${API_BASE}/conversation/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            will_id: willId,
            messages: [...messages, userMsg].slice(-20).map(({ role, content }) => ({
              role,
              content,
            })),
            current_section: section,
            will_context: willContext,
          }),
          signal: abortRef.current.signal,
        })

        if (!response.ok) {
          const errText = await response.text().catch(() => response.statusText)
          throw new Error(errText || `HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE lines from buffer
          const lines = buffer.split('\n')
          // Keep last potentially-incomplete line in buffer
          buffer = lines.pop() ?? ''

          let currentEvent = ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim()
              continue
            }

            if (line.startsWith('data:')) {
              const rawData = line.slice(5).trim()
              if (!rawData) continue

              try {
                const data = JSON.parse(rawData) as Record<string, unknown>

                if (currentEvent === 'delta' && typeof data.content === 'string') {
                  // Append streaming chunk to the last assistant message
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last && last.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + (data.content as string),
                      }
                    }
                    return updated
                  })
                } else if (currentEvent === 'filtered' && typeof data.content === 'string') {
                  // UPL filter activated -- replace assistant message content
                  setMessages((prev) => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last && last.role === 'assistant') {
                      updated[updated.length - 1] = {
                        ...last,
                        content: data.content as string,
                      }
                    }
                    return updated
                  })
                } else if (currentEvent === 'error' && typeof data.message === 'string') {
                  setError(data.message as string)
                }
                // 'done' event -- no action needed, streaming will end naturally
              } catch {
                // Ignore malformed JSON lines
              }
            }

            // Empty line resets event type per SSE spec
            if (line === '') {
              currentEvent = ''
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message ?? 'Something went wrong')
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, section, willContext, willId],
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { messages, isStreaming, error, sendMessage, stopStreaming, setMessages }
}
