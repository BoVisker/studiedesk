import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

/** Client die namens de aanroeper werkt: RLS blijft gewoon gelden. */
export function userClient(req: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}

/** Service-role client. Alleen gebruiken waar het echt moet (account verwijderen). */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export async function requireUser(req: Request): Promise<{ user: User; client: SupabaseClient } | null> {
  const client = userClient(req)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return null
  return { user: data.user, client }
}
