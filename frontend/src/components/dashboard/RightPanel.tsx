import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, CheckCircle2, Circle, Clock } from 'lucide-react'
import { useRightPanelData } from '@/hooks/useRightPanelData'
import type { CalendarEvent } from '@/types/event.types'
import type { Task } from '@/types/task.types'

type Tab = 'events' | 'tasks' | 'upcoming'

interface RightPanelProps {
  onNewTask: () => void
  onEditTask: (task: Task) => void
  /** Passed from Dashboard so Realtime can call refreshAll */
  refreshRef?: React.MutableRefObject<(() => void) | null>
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: 'text-red-500',
  high:   'text-orange-500',
  low:    'text-sky-400',
}

export function RightPanel({ onNewTask, onEditTask, refreshRef }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const { todayEvents, currentTasks, upcomingItems, loading, refreshAll } = useRightPanelData()

  // Expose refreshAll to parent (for Realtime)
  if (refreshRef) refreshRef.current = refreshAll

  const tabs: { id: Tab; label: string }[] = [
    { id: 'events',   label: 'Events' },
    { id: 'tasks',    label: 'Tasks' },
    { id: 'upcoming', label: 'Upcoming' },
  ]

  return (
    <aside className="w-[320px] border-l border-sky-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-sky-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-sky-400 text-sky-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── TODAY'S EVENTS ── */}
            {activeTab === 'events' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-600">Today's Schedule</h3>
                {todayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {todayEvents.map(e => <EventItem key={e.id} event={e} />)}
                  </div>
                ) : (
                  <EmptyState message="No events scheduled for today" />
                )}
              </div>
            )}

            {/* ── CURRENT TASKS ── */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-600">Current Tasks</h3>
                  <button
                    onClick={onNewTask}
                    className="flex items-center gap-1 text-[11px] text-sky-500 hover:text-sky-700 font-medium transition-colors"
                  >
                    <Plus size={12} />
                    New task
                  </button>
                </div>
                {currentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {currentTasks.map(t => (
                      <TaskItem key={t.id} task={t} onClick={() => onEditTask(t)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="You're all caught up!" />
                )}
              </div>
            )}

            {/* ── UPCOMING ── */}
            {activeTab === 'upcoming' && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-600">Next 7 Days</h3>
                {upcomingItems.events.length > 0 || upcomingItems.tasks.length > 0 ? (
                  <div className="space-y-6">
                    {upcomingItems.events.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Events</p>
                        <div className="space-y-3">
                          {upcomingItems.events.map(e => <EventItem key={e.id} event={e} showDate />)}
                        </div>
                      </div>
                    )}
                    {upcomingItems.tasks.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Tasks</p>
                        <div className="space-y-3">
                          {upcomingItems.tasks.map(t => (
                            <TaskItem key={t.id} task={t} showDate onClick={() => onEditTask(t)} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState message="Nothing upcoming in the next 7 days" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - quick add task */}
      <div className="p-4 border-t border-sky-50">
        <button
          onClick={onNewTask}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 text-xs font-semibold transition-colors"
        >
          <Plus size={14} />
          Add Task
        </button>
      </div>
    </aside>
  )
}

function EventItem({ event, showDate }: { event: CalendarEvent; showDate?: boolean }) {
  const startTime = parseISO(event.startTime)
  return (
    <div className="flex gap-3 group">
      <div
        className="w-1 bg-sky-400 rounded-full shrink-0 group-hover:w-1.5 transition-all"
        style={{ backgroundColor: event.color || undefined }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 truncate">{event.title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {showDate && format(startTime, 'MMM d, ')}
          {format(startTime, 'h:mm a')}
        </p>
      </div>
    </div>
  )
}

function TaskItem({
  task,
  showDate,
  onClick,
}: {
  task: Task
  showDate?: boolean
  onClick: () => void
}) {
  const isCompleted = task.status === 'completed'
  return (
    <div
      className="flex items-start gap-2.5 group cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
      onClick={onClick}
    >
      <span className={`shrink-0 mt-0.5 transition-colors ${isCompleted ? 'text-green-500' : 'text-slate-300 group-hover:text-sky-400'}`}>
        {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {task.title}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
          {task.dueDate && (
            <>
              <Clock size={10} />
              {showDate ? format(parseISO(task.dueDate), 'MMM d') : 'Due today'}
            </>
          )}
          {task.priority !== 'medium' && (
            <span className={`capitalize ${PRIORITY_COLOR[task.priority] ?? ''}`}>
              {task.dueDate ? ' · ' : ''}{task.priority}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-200 mb-2 text-lg">
        ✨
      </div>
      <p className="text-xs text-slate-400 italic">{message}</p>
    </div>
  )
}
