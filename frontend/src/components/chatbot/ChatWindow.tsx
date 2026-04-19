import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Wifi, WifiOff } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useChat } from '@/hooks/useChat'
import { MessageBubble } from './MessageBubble'
import logo from '@/assets/logo.png'

export function ChatWindow() {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { messages, isConnected, isTyping } = useChatStore()
  const { sendMessage } = useChat()

  // Scroll to bottom on new messages or typing indicator
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || !isConnected || isTyping) return
    sendMessage(text)
    setInput('')
    // reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    textareaRef.current?.focus()
  }, [input, isConnected, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    setInput(el.value)
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <header className="h-16 border-b border-sky-50 bg-white flex items-center px-6 shrink-0 gap-3">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="TaskForce" className="h-12 w-auto object-contain" />
          <h2 className="text-lg font-medium text-slate-700">AI Assistant</h2>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {isConnected ? (
            <>
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-500 font-medium tracking-wide">connected</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-slate-300" />
              <span className="text-[10px] text-slate-400">disconnected</span>
            </>
          )}
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
            <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center">
              <img src={logo} alt="TaskForce" className="h-16 w-auto object-contain" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-500 font-medium">How can I help you today?</p>
              <p className="text-xs text-slate-300">
                Create tasks · Schedule events · Manage your calendar
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {[
                'Schedule a team meeting tomorrow at 2pm',
                'Add a dentist appointment Friday',
                'What do I have this week?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    if (!isConnected) return
                    sendMessage(prompt)
                  }}
                  disabled={!isConnected}
                  className="px-3 py-1.5 rounded-full border border-sky-100 bg-white text-xs text-slate-500 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {/* Typing indicator — shown before the first token arrives */}
        {isTyping && (
          <div className="flex items-start">
            <div className="flex items-center gap-1 px-3.5 py-2.5 bg-white border border-sky-100 rounded-2xl rounded-bl-sm shadow-sm">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-sky-300 animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-sky-50 bg-white px-4 py-3">
        <div
          className={`flex items-end gap-2 border rounded-xl px-3 py-2 transition-colors bg-white ${
            isConnected
              ? 'border-sky-200 focus-within:border-sky-400'
              : 'border-slate-100 opacity-60'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onInput={handleInput}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Message your AI assistant…' : 'Connecting…'}
            disabled={!isConnected || isTyping}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none leading-relaxed py-0.5 disabled:cursor-not-allowed"
            style={{ minHeight: '24px', maxHeight: '128px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isConnected || isTyping}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-[10px] text-slate-300 mt-1.5 px-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
