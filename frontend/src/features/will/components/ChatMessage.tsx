import Markdown from 'react-markdown'
import type { Message } from '../hooks/useConversation.ts'
import avatarImg from '../../../assets/images/avatar.png'

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
      {isAI && (
        <div className="chat-image avatar">
          <div className="w-10 rounded-full">
            <img alt="WillCraft" src={avatarImg} />
          </div>
        </div>
      )}
      <div className={`chat-bubble${isAI ? '' : ' chat-bubble-secondary'}`}>
        {isAI ? (
          <Markdown className="prose prose-sm max-w-none [&>p]:my-1 [&>p:last-child]:mb-0">
            {message.content}
          </Markdown>
        ) : (
          message.content
        )}
        {isStreaming && isAI && (
          <span className="loading loading-dots loading-xs ml-1 align-bottom" />
        )}
      </div>
    </div>
  )
}
