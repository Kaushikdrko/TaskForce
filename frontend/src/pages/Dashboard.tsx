import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { RightPanel } from '@/components/dashboard/RightPanel'
import { TaskDrawer } from '@/components/dashboard/TaskDrawer'
import { EventModal } from '@/components/dashboard/EventModal'
import { useRealtime } from '@/hooks/useRealtime'
import { useChatStore } from '@/store/chatStore'
import type { Task } from '@/types/task.types'
import type { CalendarEvent } from '@/types/event.types'
import type { FcEvent } from '@/hooks/useCalendar'

export default function Dashboard() {
  // ── Folder filter (shared between Sidebar & CalendarView) ──────────────
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

  // ── Task Drawer state ──────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [editingTask, setEditingTask]     = useState<Task | null>(null)
  const [defaultTaskDate, setDefaultTaskDate] = useState<string | undefined>()

  const openNewTask = useCallback((date?: string) => {
    setEditingTask(null)
    setDefaultTaskDate(date)
    setDrawerOpen(true)
  }, [])

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setDefaultTaskDate(undefined)
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setEditingTask(null)
  }, [])

  // ── Event Modal state ──────────────────────────────────────────────────
  const [eventModalOpen, setEventModalOpen]   = useState(false)
  const [editingEvent, setEditingEvent]       = useState<CalendarEvent | null>(null)
  const [defaultEventDate, setDefaultEventDate] = useState<string | undefined>()

  const openNewEvent = useCallback((dateStr: string) => {
    setEditingEvent(null)
    setDefaultEventDate(dateStr)
    setEventModalOpen(true)
  }, [])

  const openEditEvent = useCallback((fcEvent: FcEvent) => {
    const ev = fcEvent.extendedProps as CalendarEvent
    setEditingEvent(ev)
    setDefaultEventDate(undefined)
    setEventModalOpen(true)
  }, [])

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false)
    setEditingEvent(null)
  }, [])

  // ── Refs exposed to children for Realtime callbacks ────────────────────
  const calendarRefetchRef = useRef<(() => void) | null>(null)
  const rightPanelRefreshRef = useRef<(() => void) | null>(null)

  const handleTaskChange = useCallback(() => {
    rightPanelRefreshRef.current?.()
  }, [])

  const handleEventChange = useCallback(() => {
    calendarRefetchRef.current?.()
    rightPanelRefreshRef.current?.()
  }, [])

  // ── Supabase Realtime ─────────────────────────────────────────────────
  useRealtime(handleTaskChange, handleEventChange)

  // ── Refresh when AI agent makes tool calls ────────────────────────────
  const dataVersion = useChatStore((s) => s.dataVersion)
  useEffect(() => {
    if (dataVersion === 0) return
    calendarRefetchRef.current?.()
    rightPanelRefreshRef.current?.()
  }, [dataVersion])

  // ── After drawer save: refresh right panel ────────────────────────────
  const handleSaved = useCallback(() => {
    rightPanelRefreshRef.current?.()
  }, [])

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeFolderId={activeFolderId}
        onFolderSelect={setActiveFolderId}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-sky-50 bg-white flex items-center px-6 shrink-0 gap-4">
          <h2 className="text-lg font-medium text-slate-700">My Dashboard</h2>
          {activeFolderId && (
            <span className="text-xs text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full font-medium">
              Filtered by folder
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => openNewTask()}
              id="btn-new-task-header"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} />
              New Task
            </button>
            <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200" />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <CalendarView
            activeFolderId={activeFolderId}
            onDateClick={(dateStr) => openNewEvent(dateStr + 'T09:00')}
            onEventClick={openEditEvent}
            calendarRefetchRef={calendarRefetchRef}
          />
        </div>
      </main>

      {/* Right Panel */}
      <RightPanel
        onNewTask={() => openNewTask()}
        onEditTask={openEditTask}
        activeFolderId={activeFolderId}
        refreshRef={rightPanelRefreshRef}
      />

      {/* Task Drawer (portal-style, fixed overlay) */}
      <TaskDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        onSaved={handleSaved}
        task={editingTask}
        defaultDate={defaultTaskDate}
      />

      {/* Event Modal */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={closeEventModal}
        onSaved={() => {
          calendarRefetchRef.current?.()
          rightPanelRefreshRef.current?.()
        }}
        event={editingEvent}
        defaultDate={defaultEventDate}
      />
    </div>
  )
}
