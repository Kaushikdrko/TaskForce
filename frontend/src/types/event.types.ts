export interface CalendarEvent {
  id: string
  userId: string
  folderId?: string
  title: string
  startTime: string // ISO date-time string
  endTime: string   // ISO date-time string
  allDay: boolean
  recurrenceRule?: string
  googleEventId?: string
  outlookEventId?: string
  source: 'local' | 'google' | 'outlook' | 'ai'
  color?: string
  createdAt?: string
  updatedAt?: string
}

export interface CalendarEventRequest {
  title: string
  startTime: string
  endTime: string
  allDay?: boolean
  folderId?: string
  color?: string
}
