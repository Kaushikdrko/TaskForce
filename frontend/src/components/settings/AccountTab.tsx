import { useState, useEffect } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import springApi from '@/lib/springApi'
import { useAuthStore } from '@/store/authStore'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const LABEL = 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider'
const INPUT = 'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition'

export function AccountTab() {
  const { profile, user, setProfile } = useAuthStore()

  // Spring Boot / Jackson returns camelCase at runtime despite the snake_case type definition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any

  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(p?.displayName ?? p?.display_name ?? '')
    setTimezone(profile?.timezone ?? 'UTC')
  }, [profile])  // eslint-disable-line react-hooks/exhaustive-deps

  const initials = (displayName || user?.email || '?').charAt(0).toUpperCase()

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data } = await springApi.put('/api/users/me', { displayName, timezone })
      setProfile(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save profile. Make sure the backend is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-7">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-sky-50/60 border border-sky-100">
        <div className="w-14 h-14 rounded-full bg-sky-200 flex items-center justify-center text-sky-600 text-xl font-semibold select-none shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">
            {displayName || 'No name set'}
          </p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <label className={LABEL}>Display Name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className={INPUT}
          autoFocus
        />
      </div>

      {/* Email — read-only */}
      <div className="space-y-1.5">
        <label className={LABEL}>Email</label>
        <input
          type="email"
          value={user?.email ?? ''}
          readOnly
          className="w-full px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50 text-sm text-slate-400 cursor-not-allowed"
        />
        <p className="text-[10px] text-slate-300">Email is managed by your auth provider.</p>
      </div>

      {/* Timezone */}
      <div className="space-y-1.5">
        <label className={LABEL}>Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
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
