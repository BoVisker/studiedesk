// Gedeelde Anthropic-client voor alle AI-functies. De key staat alleen als
// Supabase secret (ANTHROPIC_API_KEY), nooit in de frontend of de repo.
import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0'
import { AI_MODEL } from './config.ts'

export { Anthropic }

// Modellen die de server-side fallback "default" ondersteunen: bij een
// (onterechte) weigering door de veiligheidsfilters probeert de API het
// automatisch opnieuw op een ander model.
const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1'])

export function aiConfigured() {
  return !!Deno.env.get('ANTHROPIC_API_KEY')
}

export function aiClient() {
  // Edge Functions hebben een tijdslimiet; liever één snelle retry dan een time-out.
  return new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), timeout: 110_000, maxRetries: 1 })
}

/** Gemeenschappelijke request-velden: model en fallback. */
export function baseRequest() {
  return FALLBACK_MODELS.has(AI_MODEL)
    ? { model: AI_MODEL, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
    : { model: AI_MODEL }
}

/** Vertaal SDK-fouten naar vaste foutcodes voor de frontend. */
export function aiErrorCode(e: unknown): { code: string; status: number } {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { code: 'ai_not_configured', status: 500 }
  if (e instanceof Anthropic.RateLimitError) return { code: 'ai_busy', status: 503 }
  if (e instanceof Anthropic.BadRequestError) return { code: 'ai_bad_request', status: 400 }
  if (e instanceof Anthropic.APIConnectionError) return { code: 'ai_unavailable', status: 503 }
  if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) return { code: 'ai_unavailable', status: 503 }
  return { code: 'ai_failed', status: 500 }
}
