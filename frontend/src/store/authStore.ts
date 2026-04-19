import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import springApi from '@/lib/springApi'
import type { Profile } from '@/types/user.types'
import { useChatStore } from '@/store/chatStore'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean

  // Actions
  initialize: () => Promise<void>
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  initialize: async () => {
    // 1. Get current session (handles page refresh — reads from localStorage)
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, user: session?.user ?? null })

    // 2. Fetch profile if session exists
    if (session?.user) {
      await fetchAndSetProfile(session.user.id, set)
    }

    set({ isLoading: false })

    // 3. Subscribe to auth changes for the lifetime of the app
    //    Covers: sign-in, sign-out, token refresh, OAuth redirect
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session, user: session?.user ?? null })

      if (session?.user) {
        // SIGNED_IN or TOKEN_REFRESHED — ensure profile is loaded
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const currentProfile = get().profile
          if (!currentProfile || currentProfile.id !== session.user.id) {
            await fetchAndSetProfile(session.user.id, set)
          }
        }
      } else {
        // SIGNED_OUT — clear everything
        set({ profile: null })
        useChatStore.getState().clear()
      }
    })
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  setProfile: (profile) => {
    set({ profile })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    // onAuthStateChange above will clear session + profile
  },
}))

async function fetchAndSetProfile(
  _userId: string,
  set: (partial: Partial<AuthState>) => void
) {
  try {
    const { data } = await springApi.get<Profile>('/api/users/me')
    if (data) set({ profile: data })
  } catch {
    // Spring Boot may not be running in dev — silently ignore
  }
}
