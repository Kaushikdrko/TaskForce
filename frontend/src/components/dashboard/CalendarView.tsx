import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useCalendar } from '@/hooks/useCalendar'

export function CalendarView() {
  const { events, fetchEvents } = useCalendar()

  return (
    <div className="flex-1 h-full p-6 bg-white overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          events={events}
          datesSet={(arg) => {
            fetchEvents(arg.startStr, arg.endStr)
          }}
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
