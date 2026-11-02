// Eén plek voor het AI-model. Overschrijf met: supabase secrets set AI_MODEL=...
export const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'claude-sonnet-5-5'

// Private Storage-buckets met gebruikersbestanden onder het pad `<user_id>/...`.
// Worden bij het verwijderen van een account leeggemaakt.
export const PRIVATE_BUCKETS = ['source-images'] as const
