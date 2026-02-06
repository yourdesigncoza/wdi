import type { Message } from '../hooks/useConversation.ts'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

/**
 * DaisyUI chat bubble wrapper.
 *
 * - AI messages: chat-start with neutral bubble and WC avatar
 * - User messages: chat-end with primary bubble
 * - Shows loading dots when streaming and message is the current assistant reply
 */
export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isAI = message.role === 'assistant'

  return (
    <div className={`chat ${isAI ? 'chat-start' : 'chat-end'}`}>
      {isAI && (
        <div className="chat-image avatar placeholder">
          <div className="bg-primary text-primary-content w-8 rounded-full">
            <span className="text-xs">WC</span>
          </div>
        </div>
      )}
      <div
        className={`chat-bubble whitespace-pre-wrap ${
          isAI ? 'chat-bubble-neutral' : 'chat-bubble-primary'
        }`}
      >
        {message.content}
        {isStreaming && isAI && (
          <span className="loading loading-dots loading-xs ml-1 align-bottom" />
        )}
      </div>
    </div>
  )
}
