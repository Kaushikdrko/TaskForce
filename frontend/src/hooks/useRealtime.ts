import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'

/**
 * Subscribes to Supabase Realtime for `tasks` and `events` tables.
 * Calls the provided callbacks on any INSERT/UPDATE/DELETE so the UI
 * can refetch without polling.
 *
 * The channel is torn down when the component unmounts or the user
 * signs out (user becomes null).
 */
export function useRealtime(onTaskChange: () => void, onEventChange: () => void) {
  const user = useAuthStore(s => s.user)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!user) return

    const filter = `user_id=eq.${user.id}`

    const channel = supabase
      .channel(`taskforce-realtime-${user.id}`)
      // ── Tasks ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter },
        () => { onTaskChange() }
      )
      // ── Events ─────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter },
        () => { onEventChange() }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // We only want to re-run when user.id changes, not on every callback re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
}
