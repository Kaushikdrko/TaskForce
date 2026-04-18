import { ConfirmationCard } from './ConfirmationCard'
import type { ChatMessage } from '@/types/chat.types'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Text bubble */}
      <div
        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-sky-500 text-white rounded-br-sm'
            : 'bg-white border border-sky-100 text-slate-700 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.content}
        {message.isStreaming && !message.content && (
          // placeholder space so the bubble doesn't collapse before tokens arrive
          <span className="opacity-0">​</span>
        )}
        {message.isStreaming && (
          <span className="inline-flex gap-0.5 ml-1 align-middle">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1 h-1 rounded-full bg-current opacity-60 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        )}
      </div>

      {/* Confirmation cards — only on assistant messages that triggered tools */}
      {!isUser && message.toolCalls.length > 0 && (
        <div className="w-full max-w-[75%] flex flex-col gap-1">
          {message.toolCalls.map((tc, i) => (
            <ConfirmationCard key={i} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  )
}
