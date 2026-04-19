import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import authLogos from '@/assets/authlogos.png'

type View = 'login' | 'register' | 'mfa' | 'verify-email'

export default function LandingPage() {
  const navigate = useNavigate()

  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setError('')
    setPassword('')
    setConfirmPassword('')
    setTotpCode('')
  }

  // ── Register ─────────────────────────────────────────────────────────────

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Supabase returns a session immediately if email confirmation is OFF,
      // or a user with no session if confirmation is required.
      if (data.session) {
        navigate('/dashboard')
      } else {
        setView('verify-email')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError) {
        setError(signInError.message)
        return
      }

      // Check whether MFA step-up is required
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.[0]
        if (totp) {
          setFactorId(totp.id)
          setView('mfa')
          return
        }
      }

      navigate('/dashboard')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── MFA ───────────────────────────────────────────────────────────────────

  const handleMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const { error: mfaError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: totpCode,
      })

      if (mfaError) {
        setError(mfaError.message)
        return
      }

      navigate('/dashboard')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  // ── Shared styles ─────────────────────────────────────────────────────────

  const inputClass =
    'w-full bg-transparent border-b border-sky-300 py-2 pr-8 text-sm text-slate-700 ' +
    'placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition-colors'

  const primaryBtn =
    'self-start px-6 py-1.5 bg-sky-400 hover:bg-sky-500 disabled:opacity-50 ' +
    'text-white text-sm rounded transition-colors cursor-pointer'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-sky-100 flex">

      {/* ── Left panel ───────────────────────────────────────────────── */}
      <div className="w-1/2 flex flex-col justify-center px-20 border-r border-sky-200">

        {/* ── Login ── */}
        {view === 'login' && (
          <>
            <h1 className="text-3xl font-light text-slate-700 mb-10">Log In</h1>

            <form onSubmit={handleLogin} className="flex flex-col gap-7">
              <ClearableInput
                type="email" placeholder="Email" value={email}
                onChange={setEmail} inputClass={inputClass}
              />

              <div>
                <ClearableInput
                  type="password" placeholder="Password" value={password}
                  onChange={setPassword} inputClass={inputClass}
                  autoComplete="current-password"
                />
                <div className="text-right mt-1">
                  <button type="button" className="text-xs text-slate-400 hover:text-sky-500 transition-colors">
                    Forgot password?
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button type="submit" disabled={isSubmitting} className={primaryBtn}>
                {isSubmitting ? 'Signing in…' : 'Login'}
              </button>

              <Divider />

              <button type="button" onClick={handleGoogleSignIn}
                className="self-start flex items-center gap-2 px-6 py-1.5 border border-sky-300 hover:border-sky-400 text-slate-600 text-sm rounded transition-colors cursor-pointer">
                <GoogleIcon />
                Sign in with Google
              </button>
            </form>

            <p className="mt-10 text-xs text-slate-400">
              Don't have an account?{' '}
              <button onClick={() => { resetForm(); setView('register') }}
                className="text-sky-500 hover:text-sky-600 transition-colors">
                Sign up
              </button>
            </p>
          </>
        )}

        {/* ── Register ── */}
        {view === 'register' && (
          <>
            <h1 className="text-3xl font-light text-slate-700 mb-10">Create account</h1>

            <form onSubmit={handleRegister} className="flex flex-col gap-7">
              <ClearableInput
                type="email" placeholder="Email" value={email}
                onChange={setEmail} inputClass={inputClass}
              />

              <ClearableInput
                type="password" placeholder="Password (min. 8 characters)" value={password}
                onChange={setPassword} inputClass={inputClass}
                autoComplete="new-password"
              />

              <ClearableInput
                type="password" placeholder="Confirm password" value={confirmPassword}
                onChange={setConfirmPassword} inputClass={inputClass}
                autoComplete="new-password"
              />

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button type="submit" disabled={isSubmitting} className={primaryBtn}>
                {isSubmitting ? 'Creating account…' : 'Sign up'}
              </button>

              <Divider />

              <button type="button" onClick={handleGoogleSignIn}
                className="self-start flex items-center gap-2 px-6 py-1.5 border border-sky-300 hover:border-sky-400 text-slate-600 text-sm rounded transition-colors cursor-pointer">
                <GoogleIcon />
                Sign up with Google
              </button>
            </form>

            <p className="mt-10 text-xs text-slate-400">
              Already have an account?{' '}
              <button onClick={() => { resetForm(); setView('login') }}
                className="text-sky-500 hover:text-sky-600 transition-colors">
                Log in
              </button>
            </p>
          </>
        )}

        {/* ── Verify email ── */}
        {view === 'verify-email' && (
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-200 flex items-center justify-center text-sky-500 text-xl">
              ✉
            </div>
            <h1 className="text-3xl font-light text-slate-700">Check your email</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              We sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
              Click it to activate your account, then come back to log in.
            </p>
            <button onClick={() => { resetForm(); setView('login') }}
              className="self-start mt-4 text-sm text-sky-500 hover:text-sky-600 transition-colors">
              ← Back to login
            </button>
          </div>
        )}

        {/* ── MFA ── */}
        {view === 'mfa' && (
          <>
            <button onClick={() => { setView('login'); resetForm() }}
              className="text-xs text-sky-500 hover:text-sky-600 mb-8 self-start">
              ← Back
            </button>

            <h1 className="text-3xl font-light text-slate-700 mb-2">Two-factor auth</h1>
            <p className="text-sm text-slate-400 mb-10">
              Enter the 6-digit code from your authenticator app.
            </p>

            <form onSubmit={handleMfa} className="flex flex-col gap-7">
              <input
                type="text" inputMode="numeric" placeholder="000000" maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                required autoFocus
                className={`${inputClass} tracking-[0.4em] text-center text-lg`}
              />

              {error && <p className="text-red-500 text-xs">{error}</p>}

              <button type="submit" disabled={isSubmitting || totpCode.length < 6}
                className={primaryBtn}>
                {isSubmitting ? 'Verifying…' : 'Verify'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ── Right panel — branding ────────────────────────────────────── */}
      <div className="w-1/2 flex flex-col items-center justify-center select-none">
        <img src={authLogos} alt="TaskForce" className="w-3/4 max-w-sm object-contain" />
      </div>

    </div>
  )
}

// ── Reusable clearable input ─────────────────────────────────────────────────

interface ClearableInputProps {
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  inputClass: string
  autoComplete?: string
}

function ClearableInput({ type, placeholder, value, onChange, inputClass, autoComplete }: ClearableInputProps) {
  return (
    <div className="relative">
      <input
        type={type} placeholder={placeholder} value={value} required
        autoComplete={autoComplete ?? (type === 'email' ? 'email' : 'off')}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute right-0 top-2 text-slate-400 hover:text-slate-600">
          <X size={15} />
        </button>
      )}
    </div>
  )
}

// ── Misc sub-components ──────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-sky-200" />
      <span className="text-xs text-slate-400">or</span>
      <div className="flex-1 border-t border-sky-200" />
    </div>
  )
}

function TaskForceLogo() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-24 h-16 bg-violet-400 flex items-center justify-center shadow-md"
        style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}>
        <span className="text-white text-xl font-semibold tracking-tight">tf</span>
      </div>
      <span className="text-violet-400 text-2xl font-light tracking-widest">taskforce</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.3 0-9.7-3.5-11.3-8.3l-6.5 5C9.5 39.8 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.7-2.7 4.9-5 6.3l6.2 5.2C40.4 36.1 44 30.5 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}
