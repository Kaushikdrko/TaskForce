import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle, Ticket } from 'lucide-react'
import springApi from '@/lib/springApi'

interface SupportTicket {
  id: string
  subject: string
  description: string
  status: string
  priority: string
  createdAt?: string
}

const STATUS_STYLES: Record<string, string> = {
  open:        'bg-sky-50 text-sky-600 border-sky-100',
  in_progress: 'bg-amber-50 text-amber-600 border-amber-100',
  resolved:    'bg-green-50 text-green-600 border-green-100',
  closed:      'bg-slate-100 text-slate-500 border-slate-200',
}

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: 'bg-slate-200 text-slate-600' },
  { value: 'normal', label: 'Normal', color: 'bg-sky-100 text-sky-700' },
  { value: 'high',   label: 'High',   color: 'bg-red-100 text-red-700' },
]

const LABEL = 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider'

export function SupportTab() {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loadingTickets, setLoadingTickets] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await springApi.get<SupportTicket[]>('/api/tickets')
      if (Array.isArray(data)) setTickets(data)
    } catch { /* silently ignore */ }
    finally { setLoadingTickets(false) }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await springApi.post('/api/tickets', { subject: subject.trim(), description: description.trim(), priority })
      setSubmitted(true)
      setSubject('')
      setDescription('')
      setPriority('normal')
      setTimeout(() => setSubmitted(false), 2500)
      fetchTickets()
    } catch {
      setError('Failed to submit ticket. Make sure the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Submission form */}
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Submit a Ticket</h3>
          <p className="text-xs text-slate-400 mt-0.5">We'll get back to you as soon as possible.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div className="space-y-1.5">
            <label className={LABEL}>
              Subject <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className={LABEL}>
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className={LABEL}>Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
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

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || submitted}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
              submitted
                ? 'bg-green-500 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white disabled:opacity-60'
            }`}
          >
            {submitted ? (
              <><CheckCircle size={15} /> Submitted!</>
            ) : submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Submitting…</>
            ) : (
              'Submit Ticket'
            )}
          </button>
        </form>
      </div>

      {/* Past tickets */}
      <div className="border-t border-sky-50 pt-6 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Past Tickets</h3>

        {loadingTickets ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Loading tickets…
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center">
              <Ticket size={16} className="text-sky-200" />
            </div>
            <p className="text-xs text-slate-400 italic">No tickets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-white hover:border-sky-100 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Ticket size={13} className="text-slate-300 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{t.subject}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    STATUS_STYLES[t.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {t.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
