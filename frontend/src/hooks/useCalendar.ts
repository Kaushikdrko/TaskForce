import { useState, useCallback } from 'react'
import springApi from '@/lib/springApi'
import type { CalendarEvent as ApiEvent } from '@/types/event.types'

// The format FullCalendar expects
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

  const fetchEvents = useCallback(async (start: string, end: string) => {
    setLoading(true)
    try {
      const { data } = await springApi.get<ApiEvent[]>('/api/events', {
        params: { start, end }
      })

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
        extendedProps: e
      }))

      setEvents(transformed)
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    events,
    loading,
    fetchEvents
  }
}
