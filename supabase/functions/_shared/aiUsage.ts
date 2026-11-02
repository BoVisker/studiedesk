import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type CreditResult = { ok: true; remaining: number } | { ok: false; reason: 'ai_limit_reached' | 'error' }

/** Verbruik één AI-credit vóór elke AI-call. Gebruik de user-client (auth.uid()). */
export async function consumeAiCredit(client: SupabaseClient): Promise<CreditResult> {
  const { data, error } = await client.rpc('consume_ai_credit')
  if (error) return { ok: false, reason: error.message.includes('ai_limit_reached') ? 'ai_limit_reached' : 'error' }
  return { ok: true, remaining: data as number }
}
