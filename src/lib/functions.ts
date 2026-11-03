import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type FnResult<T> = { data: T; error: null } | { data: null; error: string }

/** Roep een Edge Function aan; fouten komen terug als vaste code (zie aiErrorMessage). */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<FnResult<T>> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { data: null, error: 'offline' }
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (!error) return { data: data as T, error: null }
  if (error instanceof FunctionsHttpError) {
    const payload = await error.context.json().catch(() => null)
    return { data: null, error: typeof payload?.error === 'string' ? payload.error : 'ai_failed' }
  }
  return { data: null, error: 'network' }
}

export function aiErrorMessage(code: string): string {
  switch (code) {
    case 'offline':
    case 'network':
      return 'Geen verbinding. AI-functies werken alleen met internet.'
    case 'ai_limit_reached':
      return 'Je hebt je AI-limiet voor vandaag bereikt. Morgen kun je weer verder; handmatig invoeren kan altijd.'
    case 'ai_not_configured':
      return 'De AI-functie is nog niet ingesteld door de beheerder.'
    case 'ai_busy':
      return 'De AI-dienst is even druk. Probeer het over een minuut opnieuw.'
    case 'ai_unavailable':
      return 'De AI-dienst is tijdelijk niet bereikbaar. Probeer het later opnieuw.'
    case 'ai_refused':
      return 'De AI kon deze foto niet verwerken. Probeer een andere foto of voer de lijst handmatig in.'
    case 'too_long':
      return 'Er staat te veel op deze foto’s. Verwerk ze in kleinere delen.'
    case 'image_not_found':
      return 'De foto kon niet worden gevonden. Upload hem opnieuw.'
    case 'invalid_paths':
      return 'Er ging iets mis met de upload. Probeer het opnieuw.'
    default:
      return 'Het verwerken is mislukt. Probeer het opnieuw of voer de lijst handmatig in.'
  }
}
