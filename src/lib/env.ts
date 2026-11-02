const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** True als de Supabase-variabelen ontbreken; de app toont dan een setup-melding. */
  missingSupabase: !url || !anonKey,
}
