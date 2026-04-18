import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, CheckCircle, Trash2 } from 'lucide-react'
import springApi from '@/lib/springApi'
import type { CalendarEvent, CalendarEventRequest } from '@/types/event.types'

interface Folder {
  id: string
  name: string
  color: string
}

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  /** Pass an existing event to enter edit mode */
  event?: CalendarEvent | null
  /** Pre-populate date when opened from a calendar day click (ISO date string) */
  defaultDate?: string
}

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#0ea5e9', label: 'Sky' },
  { value: '#10b981', label: 'Emerald' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#8b5cf6', label: 'Violet' },
]

function toLocalInput(iso: string): string {
  // Convert ISO string to datetime-local input format (YYYY-MM-DDTHH:mm)
  return iso.slice(0, 16)
}

function defaultEnd(start: string): string {
  // Default end = start + 1 hour
  const d = new Date(start)
  d.setHours(d.getHours() + 1)
  return d.toISOString().slice(0, 16)
}

export function EventModal({ isOpen, onClose, onSaved, event, defaultDate }: EventModalProps) {
  const isEdit = !!event

  const [title, setTitle]         = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime]     = useState('')
  const [allDay, setAllDay]       = useState(false)
  const [color, setColor]         = useState(PRESET_COLORS[0].value)
  const [folderId, setFolderId]   = useState('')

  const [folders, setFolders]   = useState<Folder[]>([])
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return
    if (event) {
      setTitle(event.title)
      setStartTime(toLocalInput(event.startTime))
      setEndTime(toLocalInput(event.endTime))
      setAllDay(event.allDay)
      setColor(event.color || PRESET_COLORS[0].value)
      setFolderId(event.folderId || '')
    } else {
      const start = defaultDate ? defaultDate.slice(0, 16) : toLocalInput(new Date().toISOString())
      setTitle('')
      setStartTime(start)
      setEndTime(defaultEnd(start))
      setAllDay(false)
      setColor(PRESET_COLORS[0].value)
      setFolderId('')
    }
    setSaved(false)
    setError(null)
  }, [isOpen, event, defaultDate])

  // Auto-adjust end time when start changes (new events only)
  const handleStartChange = (val: string) => {
    setStartTime(val)
    if (!isEdit && val) {
      setEndTime(defaultEnd(val))
    }
  }

  const fetchFolders = useCallback(async () => {
    try {
      const { data } = await springApi.get<Folder[]>('/api/folders')
      if (Array.isArray(data)) setFolders(data)
    } catch {
      // ignore if Spring Boot is down
    }
  }, [])

  useEffect(() => {
    if (isOpen) fetchFolders()
  }, [isOpen, fetchFolders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!startTime)    { setError('Start time is required'); return }
    if (!allDay && !endTime) { setError('End time is required'); return }

    setSaving(true)
    setError(null)

    const payload: CalendarEventRequest = {
      title: title.trim(),
      startTime: new Date(startTime).toISOString(),
      endTime: allDay ? new Date(startTime).toISOString() : new Date(endTime).toISOString(),
      allDay,
      ...(color && { color }),
      ...(folderId && { folderId }),
    }

    try {
      if (isEdit && event) {
        await springApi.put(`/api/events/${event.id}`, payload)
      } else {
        await springApi.post('/api/events', payload)
      }
      setSaved(true)
      onSaved()
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save event'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    try {
      await springApi.delete(`/api/events/${event.id}`)
      onSaved()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete event'
      setError(msg)
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {isEdit ? 'Edit Event' : 'New Event'}
              </h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isEdit ? 'Update event details' : 'Add an event to your calendar'}
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
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Event name"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition"
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAllDay(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${allDay ? 'bg-sky-500' : 'bg-slate-200'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allDay ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
              <span className="text-xs text-slate-600 font-medium">All day</span>
            </div>

            {/* Start / End */}
            {!allDay ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Start <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => handleStartChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    End <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    min={startTime}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={startTime.slice(0, 10)}
                  onChange={e => setStartTime(e.target.value + 'T00:00')}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                />
              </div>
            )}

            {/* Color */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      color === c.value ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
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

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
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
                isEdit ? 'Update' : 'Create Event'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
