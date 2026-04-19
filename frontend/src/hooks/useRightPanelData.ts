import { useState, useEffect, useCallback } from 'react'
import { startOfDay, endOfDay, addDays, formatISO } from 'date-fns'
import springApi from '@/lib/springApi'
import type { CalendarEvent } from '@/types/event.types'
import type { Task } from '@/types/task.types'

export function useRightPanelData(folderId?: string | null) {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [currentTasks, setCurrentTasks] = useState<Task[]>([])
  const [upcomingItems, setUpcomingItems] = useState<{ events: CalendarEvent[], tasks: Task[] }>({ events: [], tasks: [] })
  const [loading, setLoading] = useState(false)

  const fetchTodayEvents = useCallback(async () => {
    const start = formatISO(startOfDay(new Date()))
    const end = formatISO(endOfDay(new Date()))
    try {
      const params: Record<string, string> = { start, end }
      if (folderId) params.folder_id = folderId
      const { data } = await springApi.get<CalendarEvent[]>('/api/events', { params })
      if (Array.isArray(data)) {
        setTodayEvents(data)
      } else {
        setTodayEvents([])
      }
    } catch (err) { 
      console.error('Error fetching today events', err instanceof Error ? err.message : err)
      setTodayEvents([])
    }
  }, [])

  const fetchCurrentTasks = useCallback(async () => {
    try {
      const baseParams = folderId ? { folder_id: folderId } : {}
      const [pending, inProgress] = await Promise.all([
        springApi.get<Task[]>('/api/tasks', { params: { status: 'pending', ...baseParams } }),
        springApi.get<Task[]>('/api/tasks', { params: { status: 'in_progress', ...baseParams } })
      ])
      const pendingData = Array.isArray(pending.data) ? pending.data : []
      const inProgressData = Array.isArray(inProgress.data) ? inProgress.data : []
      setCurrentTasks([...pendingData, ...inProgressData])
    } catch (err) { 
      console.error('Error fetching current tasks', err instanceof Error ? err.message : err)
      setCurrentTasks([])
    }
  }, [])

  const fetchUpcoming = useCallback(async () => {
    const start = formatISO(addDays(startOfDay(new Date()), 1)) // Tomorrow
    const end = formatISO(endOfDay(addDays(new Date(), 7)))    // 7 days from now
    try {
      const folderParam = folderId ? { folder_id: folderId } : {}
      const [events, tasks] = await Promise.all([
        springApi.get<CalendarEvent[]>('/api/events', { params: { start, end, ...folderParam } }),
        springApi.get<Task[]>('/api/tasks', { params: { due_date: formatISO(endOfDay(addDays(new Date(), 7))), ...folderParam } })
      ])
      const eventData = Array.isArray(events.data) ? events.data : []
      const taskData = Array.isArray(tasks.data) ? tasks.data : []
      setUpcomingItems({ events: eventData, tasks: taskData })
    } catch (err) { 
      console.error('Error fetching upcoming items', err instanceof Error ? err.message : err)
      setUpcomingItems({ events: [], tasks: [] })
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchTodayEvents(), fetchCurrentTasks(), fetchUpcoming()])
    setLoading(false)
  }, [fetchTodayEvents, fetchCurrentTasks, fetchUpcoming])

  useEffect(() => {
    refreshAll()
  }, [refreshAll, folderId])

  return {
    todayEvents,
    currentTasks,
    upcomingItems,
    loading,
    refreshAll
  }
}
