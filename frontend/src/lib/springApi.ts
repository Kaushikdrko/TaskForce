import axios, { type InternalAxiosRequestConfig } from 'axios'
import { supabase } from './supabaseClient'

const springApi = axios.create({
  baseURL: import.meta.env.VITE_SPRING_URL ?? 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inject the Supabase JWT on every request
springApi.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

// On 401, attempt one token refresh then retry — handles expired sessions
springApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !session) {
        // Refresh failed — sign out so the app redirects to login
        await supabase.auth.signOut()
        return Promise.reject(error)
      }

      originalRequest.headers.Authorization = `Bearer ${session.access_token}`
      return springApi(originalRequest)
    }

    return Promise.reject(error)
  }
)

export default springApi
