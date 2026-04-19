import { useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import { useCalendar } from '@/hooks/useCalendar'
import type { FcEvent } from '@/hooks/useCalendar'

interface CalendarViewProps {
  activeFolderId: string | null
  onDateClick?: (dateStr: string) => void
  onEventClick?: (event: FcEvent) => void
  /** Passed from Dashboard so Realtime can trigger a refetch */
  calendarRefetchRef?: React.MutableRefObject<(() => void) | null>
}

export function CalendarView({
  activeFolderId,
  onDateClick,
  onEventClick,
  calendarRefetchRef,
}: CalendarViewProps) {
  const { events, fetchEvents, refetch } = useCalendar()
  const fcRef = useRef<InstanceType<typeof FullCalendar>>(null)
  const currentRangeRef = useRef<{ start: string; end: string } | null>(null)

  // Expose refetch to parent (for Realtime)
  if (calendarRefetchRef) {
    calendarRefetchRef.current = refetch
  }

  // Re-fetch when folder filter changes without waiting for datesSet
  useEffect(() => {
    const range = currentRangeRef.current
    if (range) {
      fetchEvents(range.start, range.end, activeFolderId)
    }
  }, [activeFolderId, fetchEvents])

  const handleDateClick = (arg: DateClickArg) => {
    onDateClick?.(arg.dateStr)
  }

  const handleEventClick = (arg: EventClickArg) => {
    onEventClick?.(arg.event as unknown as FcEvent)
  }

  return (
    <div className="flex-1 h-full p-6 bg-white overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <FullCalendar
          ref={fcRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          events={events}
          datesSet={(arg) => {
            currentRangeRef.current = { start: arg.startStr, end: arg.endStr }
            fetchEvents(arg.startStr, arg.endStr, activeFolderId)
          }}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="100%"
          themeSystem="standard"
          dayMaxEvents={true}
          nowIndicator={true}
          editable={true}
          selectable={true}
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
        />
      </div>
    </div>
  )
}
