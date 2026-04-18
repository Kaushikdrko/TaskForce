export type MessageRole = 'user' | 'assistant'

export type ToolName =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'create_event'
  | 'delete_event'
  | 'get_schedule'
  | 'suggest_schedule'

export interface ToolCall {
  tool: ToolName
  args: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  toolCalls: ToolCall[]
  isStreaming?: boolean
  timestamp: Date
}
