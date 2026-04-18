import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, CheckCircle } from 'lucide-react'
import springApi from '@/lib/springApi'
import type { Task, TaskRequest, TaskPriority, TaskStatus } from '@/types/task.types'

interface Folder {
  id: string
  name: string
  color: string
}

interface TaskDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  /** Pass an existing task to enter edit mode */
  task?: Task | null
  /** Pre-populate due date when opened from a calendar day click */
  defaultDate?: string
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'bg-slate-200 text-slate-600' },
  { value: 'medium', label: 'Medium', color: 'bg-sky-100 text-sky-700' },
  { value: 'high',   label: 'High',   color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
]

export function TaskDrawer({ isOpen, onClose, onSaved, task, defaultDate }: TaskDrawerProps) {
  const isEdit = !!task

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('pending')
  const [folderId, setFolderId] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [tags, setTags] = useState('')

  const [folders, setFolders] = useState<Folder[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when drawer opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title)
        setDueDate(task.dueDate ? task.dueDate.slice(0, 16) : '')
        setPriority(task.priority)
        setStatus(task.status)
        setFolderId(task.folderId || '')
        setEstimatedMinutes(task.estimatedMinutes?.toString() || '')
        setTags(task.tags?.join(', ') || '')
      } else {
        setTitle('')
        setDueDate(defaultDate ? defaultDate.slice(0, 16) : '')
        setPriority('medium')
        setStatus('pending')
        setFolderId('')
        setEstimatedMinutes('')
        setTags('')
      }
      setSaved(false)
      setError(null)
    }
  }, [isOpen, task, defaultDate])

  const fetchFolders = useCallback(async () => {
    try {
      const { data } = await springApi.get<Folder[]>('/api/folders')
      if (Array.isArray(data)) setFolders(data)
    } catch {
      // silently ignore if Spring Boot is down
    }
  }, [])

  useEffect(() => {
    if (isOpen) fetchFolders()
  }, [isOpen, fetchFolders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)

    const payload: TaskRequest = {
      title: title.trim(),
      priority,
      status,
      ...(dueDate && { dueDate: new Date(dueDate).toISOString() }),
      ...(folderId && { folderId }),
      ...(estimatedMinutes && { estimatedMinutes: parseInt(estimatedMinutes, 10) }),
      ...(tags && { tags: tags.split(',').map(t => t.trim()).filter(Boolean) }),
    }

    try {
      if (isEdit && task) {
        await springApi.put(`/api/tasks/${task.id}`, payload)
      } else {
        await springApi.post('/api/tasks', payload)
      }
      setSaved(true)
      onSaved()
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save task'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              {isEdit ? 'Edit Task' : 'New Task'}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isEdit ? 'Update task details' : 'Add a task to your schedule'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition"
              autoFocus
            />
          </div>

          {/* Priority Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all border-2 ${
                    priority === p.value
                      ? `${p.color} border-current scale-105`
                      : 'border-transparent bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status (edit mode only) */}
          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
          </div>

          {/* Folder */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Folder</label>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            >
              <option value="">No folder</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {/* Estimated Time */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Time (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              placeholder="e.g. 30"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tags <span className="text-slate-300 font-normal normal-case">comma separated</span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="work, design, urgent"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || saved}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-60'
            }`}
          >
            {saved ? (
              <><CheckCircle size={15} /> Saved!</>
            ) : saving ? (
              <><Loader2 size={15} className="animate-spin" /> Saving...</>
            ) : (
              isEdit ? 'Update Task' : 'Create Task'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
