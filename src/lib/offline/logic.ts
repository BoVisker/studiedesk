// Pure offline-logica, los van IndexedDB en Supabase (dus testbaar):
// - welke items zijn offline "te herhalen";
// - hoe een herhaling de cache bijwerkt;
// - hoe de sync-wachtrij klein blijft;
// - de conflictregel: de herhaling met de laatste tijd wint.
import type { DueItem, ItemRow, ListRow } from '@/features/lists/api'
import { isDue, type SrsState } from '@/features/study/srs'

export type OutboxReview = { id: string; type: 'review'; itemId: string; state: SrsState; ts: string; attempts: number }
export type OutboxSession = { id: string; type: 'session'; row: Record<string, unknown>; ts: string; attempts: number }
export type OutboxEntry = OutboxReview | OutboxSession

/** Te herhalen items uit de cache, samengevoegd met hun lijst (zoals fetchDue). */
export function dueFromCache(lists: ListRow[], items: ItemRow[], subject: string | null, now = new Date()): DueItem[] {
  const byId = new Map(lists.map((l) => [l.id, l]))
  return items
    .filter((it) => isDue(it, now))
    .map((it) => ({ it, list: byId.get(it.list_id) }))
    .filter((x): x is { it: ItemRow; list: ListRow } => !!x.list && (!subject || x.list.subject === subject))
    .sort((a, b) => (a.it.due_at ?? '').localeCompare(b.it.due_at ?? ''))
    .map(({ it, list }) => ({ ...it, lists: { subject: list.subject, title: list.title, kind: list.kind, term_lang: list.term_lang, definition_lang: list.definition_lang } }))
}

/** Optimistische update: zet de nieuwe SRS-status op het gecachte item. */
export function applyReview(items: ItemRow[], itemId: string, state: SrsState): ItemRow[] {
  return items.map((it) => (it.id === itemId ? { ...it, ...state } : it))
}

/**
 * Voeg een herhaling toe aan de wachtrij. Staat er al een herhaling voor
 * hetzelfde item, dan houden we alleen de nieuwste (laatste tijd wint). Zo
 * groeit de wachtrij niet bij veel oefenen offline.
 */
export function enqueueReview(outbox: OutboxEntry[], entry: OutboxReview): OutboxEntry[] {
  const rest = outbox.filter((e) => !(e.type === 'review' && e.itemId === entry.itemId))
  const existing = outbox.find((e): e is OutboxReview => e.type === 'review' && e.itemId === entry.itemId)
  if (existing && existing.ts > entry.ts) return outbox // bestaande is nieuwer
  return [...rest, entry]
}

/**
 * PostgREST-filter voor "laatste herhaling wint": pas de server alleen aan als
 * de bestaande last_reviewed_at leeg is of niet nieuwer dan onze herhaling.
 */
export function conflictFilter(ts: string | null): string {
  return ts ? `last_reviewed_at.is.null,last_reviewed_at.lte.${ts}` : 'last_reviewed_at.is.null'
}

/** Na te veel mislukte pogingen laten we een regel vallen (geen eindeloze wachtrij). */
export const MAX_ATTEMPTS = 6
export const isPoison = (e: OutboxEntry) => e.attempts >= MAX_ATTEMPTS
