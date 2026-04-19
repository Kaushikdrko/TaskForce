import { create } from 'zustand'
import type { ChatMessage, ToolCall } from '@/types/chat.types'

let msgCounter = 0
const nextId = () => `msg-${++msgCounter}-${Date.now()}`

interface ChatState {
  messages: ChatMessage[]
  isConnected: boolean
  isTyping: boolean
  dataVersion: number

  addUserMessage: (content: string) => void
  startAssistantMessage: () => string
  appendToken: (id: string, token: string) => void
  appendToolCall: (id: string, toolCall: ToolCall) => void
  finalizeMessage: (id: string) => void
  setConnected: (connected: boolean) => void
  setTyping: (typing: boolean) => void
  bumpDataVersion: () => void
  clear: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  dataVersion: 0,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { id: nextId(), role: 'user', content, toolCalls: [], timestamp: new Date() },
      ],
    })),

  startAssistantMessage: () => {
    const id = nextId()
    set((state) => ({
      messages: [
        ...state.messages,
        { id, role: 'assistant', content: '', toolCalls: [], isStreaming: true, timestamp: new Date() },
      ],
    }))
    return id
  },

  appendToken: (id, token) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + token } : m
      ),
    })),

  appendToolCall: (id, toolCall) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, toolCalls: [...m.toolCalls, toolCall] } : m
      ),
    })),

  finalizeMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      ),
    })),

  setConnected: (connected) => set({ isConnected: connected }),
  setTyping: (typing) => set({ isTyping: typing }),
  bumpDataVersion: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  clear: () => set({ messages: [] }),
}))
