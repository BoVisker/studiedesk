import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from './env'

// PKCE: Supabase stuurt na een magic link terug met `?code=` in de query
// string in plaats van tokens in de hash, zodat het niet botst met HashRouter.
export const supabase = createClient<Database>(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

/** De URL waar Supabase-mails naar terugverwijzen (zonder hash). */
export function authRedirectUrl(params?: Record<string, string>) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return url.toString()
}
