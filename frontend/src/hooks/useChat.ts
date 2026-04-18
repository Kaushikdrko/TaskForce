import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

const WS_BASE = import.meta.env.VITE_FASTAPI_WS_URL as string

export function useChat() {
  const wsRef = useRef<WebSocket | null>(null)
  const currentMsgIdRef = useRef<string | null>(null)
  const { user } = useAuthStore()
  const {
    addUserMessage,
    startAssistantMessage,
    appendToken,
    appendToolCall,
    finalizeMessage,
    setConnected,
    setTyping,
  } = useChatStore()

  const connect = useCallback(async () => {
    if (!user) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const url = `${WS_BASE}/ai/ws/chat/${user.id}?token=${session.access_token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      // clear any stuck typing state
      setTyping(false)
      if (currentMsgIdRef.current) {
        finalizeMessage(currentMsgIdRef.current)
        currentMsgIdRef.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data as string)

        if (frame.type === 'token') {
          if (!currentMsgIdRef.current) {
            currentMsgIdRef.current = startAssistantMessage()
            setTyping(false)
          }
          // backend sends { type: 'token', text: '...' }
          appendToken(currentMsgIdRef.current, frame.text ?? '')
        } else if (frame.type === 'tool') {
          if (!currentMsgIdRef.current) {
            currentMsgIdRef.current = startAssistantMessage()
            setTyping(false)
          }
          // backend sends { type: 'tool', name: '...', args: {...} }
          appendToolCall(currentMsgIdRef.current, { tool: frame.name, args: frame.args ?? {} })
        } else if (frame.type === 'done') {
          if (currentMsgIdRef.current) {
            finalizeMessage(currentMsgIdRef.current)
            currentMsgIdRef.current = null
          }
          setTyping(false)
        } else if (frame.type === 'error') {
          if (currentMsgIdRef.current) {
            finalizeMessage(currentMsgIdRef.current)
            currentMsgIdRef.current = null
          }
          setTyping(false)
        }
      } catch {
        // ignore malformed frames
      }
    }
  }, [user, startAssistantMessage, appendToken, appendToolCall, finalizeMessage, setConnected, setTyping])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (wsRef.current?.readyState !== WebSocket.OPEN) return

      addUserMessage(trimmed)
      setTyping(true)
      wsRef.current.send(JSON.stringify({ message: trimmed }))
    },
    [addUserMessage, setTyping]
  )

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return { sendMessage, connect, disconnect }
}
