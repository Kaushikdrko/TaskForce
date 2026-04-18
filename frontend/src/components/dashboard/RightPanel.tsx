import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useRightPanelData } from '@/hooks/useRightPanelData'
import type { CalendarEvent } from '@/types/event.types'
import type { Task } from '@/types/task.types'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

type Tab = 'events' | 'tasks' | 'upcoming'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const { todayEvents, currentTasks, upcomingItems, loading } = useRightPanelData()

  const tabs: { id: Tab; label: string }[] = [
    { id: 'events', label: 'Events' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'upcoming', label: 'Upcoming' },
  ]

  return (
    <aside className="w-[320px] border-l border-sky-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-sky-50">
        {tabs.map((tab) => (
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
            {activeTab === 'events' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-700">Today's Schedule</h3>
                <div className="space-y-3">
                  {todayEvents.length > 0 ? (
                    todayEvents.map(e => <EventItem key={e.id} event={e} />)
                  ) : (
                    <EmptyState message="No events scheduled for today" />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-700">Current Tasks</h3>
                <div className="space-y-3">
                  {currentTasks.length > 0 ? (
                    currentTasks.map(t => <TaskItem key={t.id} task={t} />)
                  ) : (
                    <EmptyState message="You're all caught up!" />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'upcoming' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold text-slate-700">Next 7 Days</h3>
                <div className="space-y-6">
                  {upcomingItems.events.length > 0 || upcomingItems.tasks.length > 0 ? (
                    <>
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
                            {upcomingItems.tasks.map(t => <TaskItem key={t.id} task={t} showDate />)}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState message="Nothing upcoming" />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer / Quick Stats */}
      <div className="p-4 bg-sky-50/30 border-t border-sky-50">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          <span>Daily Focus</span>
          <span className="text-sky-500">75%</span>
        </div>
        <div className="mt-2 h-1 w-full bg-sky-100 rounded-full overflow-hidden">
          <div className="h-full bg-sky-400" style={{ width: '75%' }} />
        </div>
      </div>
    </aside>
  )
}

function EventItem({ event, showDate }: { event: CalendarEvent; showDate?: boolean }) {
  const startTime = parseISO(event.startTime)
  return (
    <div className="flex gap-3 group">
      <div className="w-1 bg-sky-400 rounded-full shrink-0 group-hover:w-1.5 transition-all" 
           style={{ backgroundColor: event.color || undefined }} />
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

function TaskItem({ task, showDate }: { task: Task; showDate?: boolean }) {
  const isCompleted = task.status === 'completed'
  return (
    <div className="flex items-start gap-2.5 group">
      <button className={`shrink-0 mt-0.5 transition-colors ${isCompleted ? 'text-green-500' : 'text-slate-300 hover:text-sky-400'}`}>
        {isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {task.title}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
          {task.dueDate && (
            <>
              <Clock size={10} />
              {showDate ? format(parseISO(task.dueDate), 'MMM d') : 'Today'}
            </>
          )}
          {task.priority !== 'medium' && (
             <span className={`capitalize ${task.priority === 'urgent' || task.priority === 'high' ? 'text-red-400' : 'text-sky-400'}`}>
               • {task.priority}
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
      <div className="w-12 h-12 bg-sky-50 rounded-full flex items-center justify-center text-sky-200 mb-2">
        ✨
      </div>
      <p className="text-xs text-slate-400 italic">{message}</p>
    </div>
  )
}
