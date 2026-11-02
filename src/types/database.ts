// Gegenereerd uit het Supabase-schema. Opnieuw genereren: npm run db:types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      admins: {
        Row: { created_at: string; user_id: string }
        Insert: { created_at?: string; user_id: string }
        Update: { created_at?: string; user_id?: string }
        Relationships: []
      }
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
      list_items: {
        Row: {
          correct_count: number
          created_at: string
          definition: string
          due_at: string | null
          example: string | null
          id: string
          last_reviewed_at: string | null
          list_id: string
          note: string | null
          position: number
          srs_box: number
          term: string
          updated_at: string
          user_id: string
          word_type: string | null
          wrong_count: number
        }
        Insert: {
          correct_count?: number
          created_at?: string
          definition: string
          due_at?: string | null
          example?: string | null
          id?: string
          last_reviewed_at?: string | null
          list_id: string
          note?: string | null
          position?: number
          srs_box?: number
          term: string
          updated_at?: string
          user_id?: string
          word_type?: string | null
          wrong_count?: number
        }
        Update: {
          correct_count?: number
          created_at?: string
          definition?: string
          due_at?: string | null
          example?: string | null
          id?: string
          last_reviewed_at?: string | null
          list_id?: string
          note?: string | null
          position?: number
          srs_box?: number
          term?: string
          updated_at?: string
          user_id?: string
          word_type?: string | null
          wrong_count?: number
        }
        Relationships: [
          { foreignKeyName: 'list_items_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'lists'; referencedColumns: ['id'] },
        ]
      }
      lists: {
        Row: {
          chapter: string | null
          created_at: string
          definition_lang: string | null
          id: string
          kind: Database['public']['Enums']['list_kind']
          subject: string
          term_lang: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          definition_lang?: string | null
          id?: string
          kind?: Database['public']['Enums']['list_kind']
          subject: string
          term_lang?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          chapter?: string | null
          created_at?: string
          definition_lang?: string | null
          id?: string
          kind?: Database['public']['Enums']['list_kind']
          subject?: string
          term_lang?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
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
        Row: { created_at: string; email: string; invited_by: string | null; note: string | null }
        Insert: { created_at?: string; email: string; invited_by?: string | null; note?: string | null }
        Update: { created_at?: string; email?: string; invited_by?: string | null; note?: string | null }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          ended_at: string
          grade: number | null
          id: string
          items_correct: number
          items_total: number
          list_id: string | null
          mode: string
          started_at: string
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at: string
          grade?: number | null
          id?: string
          items_correct?: number
          items_total?: number
          list_id?: string | null
          mode: string
          started_at: string
          subject?: string | null
          user_id?: string
        }
        Update: {
          grade?: number | null
          items_correct?: number
          items_total?: number
        }
        Relationships: [
          { foreignKeyName: 'study_sessions_list_id_fkey'; columns: ['list_id']; isOneToOne: false; referencedRelation: 'lists'; referencedColumns: ['id'] },
        ]
      }
      user_subjects: {
        Row: { blocks: Json; created_at: string; position: number; subject: string; updated_at: string; user_id: string }
        Insert: { blocks?: Json; created_at?: string; position?: number; subject: string; updated_at?: string; user_id?: string }
        Update: { blocks?: Json; created_at?: string; position?: number; subject?: string; updated_at?: string; user_id?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_list_invites: {
        Args: never
        Returns: { created_at: string; email: string; note: string; registered: boolean }[]
      }
      ai_daily_limit: { Args: never; Returns: number }
      ai_usage_today: { Args: never; Returns: { daily_limit: number; remaining: number; used: number }[] }
      consume_ai_credit: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: { list_kind: 'woorden' | 'begrippen' | 'formules'; theme_pref: 'light' | 'dark' | 'system' }
    CompositeTypes: { [_ in never]: never }
  }
}

export const Constants = {
  public: { Enums: { list_kind: ['woorden', 'begrippen', 'formules'], theme_pref: ['light', 'dark', 'system'] } },
} as const
