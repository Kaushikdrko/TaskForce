import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

type Tone = 'concise' | 'friendly' | 'detailed'

interface AiSettings {
  suggestionsEnabled: boolean
  protectFocusTime: boolean
  tone: Tone
}

const STORAGE_KEY = 'tf_ai_settings'

function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { suggestionsEnabled: true, protectFocusTime: false, tone: 'concise', ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { suggestionsEnabled: true, protectFocusTime: false, tone: 'concise' }
}

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}

function ToggleRow({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50">
      <div className="pr-8">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          checked ? 'bg-sky-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

const TONES: { value: Tone; label: string; description: string }[] = [
  { value: 'concise',  label: 'Concise',  description: 'Short, direct responses' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and conversational' },
  { value: 'detailed', label: 'Detailed', description: 'Full context and explanations' },
]

export function AiTab() {
  const [settings, setSettings] = useState<AiSettings>(loadSettings)
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<AiSettings>) =>
    setSettings((s) => ({ ...s, ...patch }))

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg space-y-8">
      {/* Behaviour toggles */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Behaviour
        </label>
        <ToggleRow
          checked={settings.suggestionsEnabled}
          onChange={(v) => update({ suggestionsEnabled: v })}
          label="AI Suggestions"
          description="Let the assistant proactively suggest tasks and optimal time slots"
        />
        <ToggleRow
          checked={settings.protectFocusTime}
          onChange={(v) => update({ protectFocusTime: v })}
          label="Protect Focus Time"
          description="Never schedule tasks during your designated focus blocks"
        />
      </div>

      {/* Tone selector */}
      <div className="space-y-3">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Response Tone
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ tone: t.value })}
              className={`px-3 py-3.5 rounded-xl border-2 text-left transition-all ${
                settings.tone === t.value
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-100 bg-white hover:border-sky-200'
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  settings.tone === t.value ? 'text-sky-600' : 'text-slate-600'
                }`}
              >
                {t.label}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleSave}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
            saved ? 'bg-green-500 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'
          }`}
        >
          {saved ? <><CheckCircle size={15} /> Saved!</> : 'Save Preferences'}
        </button>
        <p className="text-[11px] text-slate-300">
          Preferences are saved locally and applied on your next conversation.
        </p>
      </div>
    </div>
  )
}
