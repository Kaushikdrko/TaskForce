import { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import springApi from '@/lib/springApi'

interface SchedulePrefs {
  workStartTime: string
  workEndTime: string
  workDays: number[]
  breakDurationMinutes: number
  maxDailyTasks: number
}

const DAYS = [
  { label: 'S', value: 0, full: 'Sunday' },
  { label: 'M', value: 1, full: 'Monday' },
  { label: 'T', value: 2, full: 'Tuesday' },
  { label: 'W', value: 3, full: 'Wednesday' },
  { label: 'T', value: 4, full: 'Thursday' },
  { label: 'F', value: 5, full: 'Friday' },
  { label: 'S', value: 6, full: 'Saturday' },
]

const DEFAULTS: SchedulePrefs = {
  workStartTime: '09:00',
  workEndTime: '17:00',
  workDays: [1, 2, 3, 4, 5],
  breakDurationMinutes: 15,
  maxDailyTasks: 10,
}

const LABEL = 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider'
const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition'

export function ScheduleTab() {
  const [prefs, setPrefs] = useState<SchedulePrefs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    springApi
      .get<SchedulePrefs>('/api/users/me/preferences')
      .then(({ data }) => {
        setPrefs({
          workStartTime: (data.workStartTime ?? '09:00:00').slice(0, 5),
          workEndTime: (data.workEndTime ?? '17:00:00').slice(0, 5),
          workDays: Array.isArray(data.workDays) ? data.workDays : [1, 2, 3, 4, 5],
          breakDurationMinutes: data.breakDurationMinutes ?? 15,
          maxDailyTasks: data.maxDailyTasks ?? 10,
        })
      })
      .catch(() => {/* use defaults */})
      .finally(() => setLoading(false))
  }, [])

  const toggleDay = (day: number) =>
    setPrefs((p) => ({
      ...p,
      workDays: p.workDays.includes(day)
        ? p.workDays.filter((d) => d !== day)
        : [...p.workDays, day].sort((a, b) => a - b),
    }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await springApi.put('/api/users/me/preferences', prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save preferences. Make sure the backend is running.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 size={16} className="animate-spin" />
        Loading preferences…
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      {/* Work Hours */}
      <div className="space-y-2">
        <label className={LABEL}>Work Hours</label>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-slate-400">Start</p>
            <input
              type="time"
              value={prefs.workStartTime}
              onChange={(e) => setPrefs((p) => ({ ...p, workStartTime: e.target.value }))}
              className={INPUT}
            />
          </div>
          <span className="text-slate-300 mb-2.5 text-lg leading-none">–</span>
          <div className="flex-1 space-y-1">
            <p className="text-[10px] text-slate-400">End</p>
            <input
              type="time"
              value={prefs.workEndTime}
              onChange={(e) => setPrefs((p) => ({ ...p, workEndTime: e.target.value }))}
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* Work Days */}
      <div className="space-y-2.5">
        <label className={LABEL}>Work Days</label>
        <div className="flex gap-2">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              title={d.full}
              onClick={() => toggleDay(d.value)}
              className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${
                prefs.workDays.includes(d.value)
                  ? 'bg-sky-500 text-white shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-300">
          {prefs.workDays.map((v) => DAYS[v].full).join(', ') || 'No days selected'}
        </p>
      </div>

      {/* Break Duration */}
      <div className="space-y-1.5">
        <label className={LABEL}>
          Break Duration{' '}
          <span className="text-slate-300 font-normal normal-case">(minutes)</span>
        </label>
        <input
          type="number"
          min={5}
          max={60}
          step={5}
          value={prefs.breakDurationMinutes}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, breakDurationMinutes: parseInt(e.target.value) || 15 }))
          }
          className={INPUT}
        />
      </div>

      {/* Max Daily Tasks */}
      <div className="space-y-1.5">
        <label className={LABEL}>Max Daily Tasks</label>
        <input
          type="number"
          min={1}
          max={50}
          value={prefs.maxDailyTasks}
          onChange={(e) =>
            setPrefs((p) => ({ ...p, maxDailyTasks: parseInt(e.target.value) || 10 }))
          }
          className={INPUT}
        />
        <p className="text-[10px] text-slate-300">
          The AI will not schedule more than this many tasks per day.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
          saved
            ? 'bg-green-500 text-white'
            : 'bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-60'
        }`}
      >
        {saved ? (
          <><CheckCircle size={15} /> Saved!</>
        ) : saving ? (
          <><Loader2 size={15} className="animate-spin" /> Saving…</>
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  )
}
