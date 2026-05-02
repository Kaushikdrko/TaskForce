import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import { useChatStore } from '@/store/chatStore'

const WS_BASE = import.meta.env.VITE_FASTAPI_WS_URL as string

export function useChat() {
  const wsRef = useRef<WebSocket | null>(null)
  const currentMsgIdRef = useRef<string | null>(null)
  const toolCallIndexRef = useRef<number>(0)
  const { user } = useAuthStore()
  const {
    addUserMessage,
    startAssistantMessage,
    appendToken,
    appendToolCall,
    markToolFailed,
    finalizeMessage,
    setConnected,
    setTyping,
    bumpDataVersion,
  } = useChatStore()

  const connect = useCallback(async () => {
    if (!user) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const url = `${WS_BASE}/ai/ws/chat/${user.id}?token=${session.access_token}`
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch (err) {
      console.error('WebSocket connection failed:', err)
      return
    }
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onerror = (e) => console.error('WebSocket error:', e)
    ws.onclose = (e) => {
      console.log('WebSocket closed:', e.code, e.reason)
      setConnected(false)
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
          appendToken(currentMsgIdRef.current, frame.text ?? '')
        } else if (frame.type === 'tool') {
          if (!currentMsgIdRef.current) {
            currentMsgIdRef.current = startAssistantMessage()
            toolCallIndexRef.current = 0
            setTyping(false)
          }
          appendToolCall(currentMsgIdRef.current, { tool: frame.name, args: frame.args ?? {} })
          toolCallIndexRef.current++
        } else if (frame.type === 'tool_result') {
          if (currentMsgIdRef.current && !frame.success) {
            markToolFailed(currentMsgIdRef.current, toolCallIndexRef.current - 1)
          }
        } else if (frame.type === 'done') {
          if (currentMsgIdRef.current) {
            const msg = useChatStore.getState().messages.find(m => m.id === currentMsgIdRef.current)
            if (msg?.toolCalls?.length) bumpDataVersion()
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
  }, [user, startAssistantMessage, appendToken, appendToolCall, finalizeMessage, setConnected, setTyping, bumpDataVersion])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null  // prevent stale onclose from firing after remount
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [setConnected])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      if (wsRef.current?.readyState !== WebSocket.OPEN) return

      addUserMessage(trimmed)
      setTyping(true)
      toolCallIndexRef.current = 0
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
