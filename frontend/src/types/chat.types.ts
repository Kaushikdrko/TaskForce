export type MessageRole = 'user' | 'assistant'

export type ToolName =
  | 'create_task'
  | 'update_task'
  | 'delete_task'
  | 'create_event'
  | 'delete_event'
  | 'get_schedule'
  | 'suggest_schedule'
  | 'search_items'
  | 'list_all_tasks'
  | 'get_user_preferences'

export interface ToolCall {
  tool: ToolName
  args: Record<string, unknown>
  failed?: boolean
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  toolCalls: ToolCall[]
  isStreaming?: boolean
  timestamp: Date
}
