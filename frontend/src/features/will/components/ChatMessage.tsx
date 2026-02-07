import type { Message } from '../hooks/useConversation.ts'

interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
}

/**
 * DaisyUI chat bubble wrapper.
 *
 * - AI messages: chat-start with primary bubble and WC avatar
 * - User messages: chat-end with secondary bubble and You avatar
 * - Shows loading dots when streaming and message is the current assistant reply
 */
export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isAI = message.role === 'assistant'

  return (
    <div className={`chat ${isAI ? 'chat-start' : 'chat-end'}`}>
      <div className="chat-image avatar placeholder">
        <div className={`${isAI ? 'bg-neutral text-neutral-content' : 'bg-primary text-primary-content'} w-10 rounded-full`}>
          <span className="text-xs">{isAI ? 'WC' : 'You'}</span>
        </div>
      </div>
      <div className={`chat-bubble${isAI ? '' : ' chat-bubble-secondary'}`}>
        {message.content}
        {isStreaming && isAI && (
          <span className="loading loading-dots loading-xs ml-1 align-bottom" />
        )}
      </div>
    </div>
  )
}
