export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string
  userId: string
  folderId?: string
  eventId?: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string // ISO date-time string (TIMESTAMPTZ in DB)
  scheduledStart?: string
  estimatedMinutes?: number
  actualMinutes?: number
  tags?: string[]
  createdBy: 'user' | 'ai'
  createdAt?: string
  updatedAt?: string
}

export interface TaskRequest {
  title: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  folderId?: string
  eventId?: string
  estimatedMinutes?: number
  tags?: string[]
}
