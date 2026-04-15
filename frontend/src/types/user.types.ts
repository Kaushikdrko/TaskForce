export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  timezone: string
  google_calendar_token: Record<string, unknown> | null
  microsoft_calendar_token: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
