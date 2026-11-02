// Gegenereerd uit het Supabase-schema. Opnieuw genereren: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      ai_usage: {
        Row: { count: number; day: string; user_id: string }
        Insert: { count?: number; day?: string; user_id: string }
        Update: { count?: number; day?: string; user_id?: string }
        Relationships: []
      }
      app_config: {
        Row: { key: string; value: Json }
        Insert: { key: string; value: Json }
        Update: { key?: string; value?: Json }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          display_name: string
          id: string
          theme: Database['public']['Enums']['theme_pref']
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id: string
          theme?: Database['public']['Enums']['theme_pref']
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          display_name?: string
          id?: string
          theme?: Database['public']['Enums']['theme_pref']
          updated_at?: string
        }
        Relationships: []
      }
      signup_allowlist: {
        Row: { created_at: string; email: string; note: string | null }
        Insert: { created_at?: string; email: string; note?: string | null }
        Update: { created_at?: string; email?: string; note?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      ai_daily_limit: { Args: never; Returns: number }
      ai_usage_today: { Args: never; Returns: { daily_limit: number; remaining: number; used: number }[] }
      consume_ai_credit: { Args: never; Returns: number }
    }
    Enums: { theme_pref: 'light' | 'dark' | 'system' }
    CompositeTypes: { [_ in never]: never }
  }
}

export const Constants = {
  public: { Enums: { theme_pref: ['light', 'dark', 'system'] } },
} as const
