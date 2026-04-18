import { useState, useCallback, useRef } from 'react'
import springApi from '@/lib/springApi'
import type { CalendarEvent as ApiEvent } from '@/types/event.types'

// The shape FullCalendar expects
export interface FcEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  backgroundColor?: string
  borderColor?: string
  extendedProps: Partial<ApiEvent>
}

export function useCalendar() {
  const [events, setEvents] = useState<FcEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Store the last-used range so Realtime can trigger a silent refetch
  const lastRangeRef = useRef<{ start: string; end: string } | null>(null)
  const lastFolderRef = useRef<string | null>(null)

  const fetchEvents = useCallback(async (
    start: string,
    end: string,
    folderId?: string | null
  ) => {
    setLoading(true)
    lastRangeRef.current = { start, end }
    lastFolderRef.current = folderId ?? null

    try {
      const params: Record<string, string> = { start, end }
      if (folderId) params.folder_id = folderId

      const { data } = await springApi.get<ApiEvent[]>('/api/events', { params })

      if (!Array.isArray(data)) {
        setEvents([])
        return
      }

      const transformed: FcEvent[] = data.map(e => ({
        id: e.id,
        title: e.title,
        start: e.startTime,
        end: e.endTime,
        allDay: e.allDay,
        backgroundColor: e.color || undefined,
        borderColor: e.color || undefined,
        extendedProps: e,
      }))

      setEvents(transformed)
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  /** Silent refetch using the last known range — called by Realtime hook */
  const refetch = useCallback(() => {
    const range = lastRangeRef.current
    if (range) {
      fetchEvents(range.start, range.end, lastFolderRef.current)
    }
  }, [fetchEvents])

  return { events, loading, fetchEvents, refetch }
}
