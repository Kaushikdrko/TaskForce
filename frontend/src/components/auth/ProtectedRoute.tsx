import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: React.ReactNode
}

/**
 * Wraps any route that requires an active session.
 * Shows a spinner while auth is initialising, then redirects to / if no session.
 */
export function ProtectedRoute({ children }: Props) {
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return session ? <>{children}</> : <Navigate to="/" replace />
}

/**
 * Wraps guest-only routes (login, register).
 * Redirects authenticated users straight to /dashboard.
 */
export function GuestRoute({ children }: Props) {
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) return null

  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>
}
