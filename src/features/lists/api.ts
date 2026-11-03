import type { SubjectSlug } from '@/design/subjectPalette'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { addDays, startOfDay, type SrsState } from '@/features/study/srs'
import { cacheList, cachedDue, queueReview, queueSession, readCachedList } from '@/lib/offline/sync'

const online = () => typeof navigator === 'undefined' || navigator.onLine

export type ListKind = Database['public']['Enums']['list_kind']
export type ListRow = Database['public']['Tables']['lists']['Row']
export type ItemRow = Database['public']['Tables']['list_items']['Row']
export type ListWithStats = ListRow & { item_count: number; due_count: number; new_count: number }

export const kindLabels: Record<ListKind, { name: string; term: string; definition: string }> = {
  woorden: { name: 'Woordenlijst', term: 'Woord', definition: 'Vertaling' },
  begrippen: { name: 'Begrippenlijst', term: 'Begrip', definition: 'Definitie' },
  formules: { name: 'Formulelijst', term: 'Grootheid of naam', definition: 'Formule' },
}

/** Standaard-taalcodes voor voorlezen per vak (term, betekenis). */
export const defaultLangs: Partial<Record<SubjectSlug, [string, string]>> = {
  engels: ['en', 'nl'],
  frans: ['fr', 'nl'],
  duits: ['de', 'nl'],
  spaans: ['es', 'nl'],
  nederlands: ['nl', 'nl'],
  latijn: ['la', 'nl'],
  grieks: ['el', 'nl'],
}

export function defaultKind(archetype: string): ListKind {
  return archetype === 'moderne-taal' || archetype === 'klassieke-taal' ? 'woorden' : 'begrippen'
}

const tomorrow = () => addDays(startOfDay(new Date()), 1).toISOString()

/** Lijsten (optioneel van één vak) met tellingen voor nieuw / te herhalen. */
export async function fetchLists(subject?: SubjectSlug): Promise<ListWithStats[]> {
  let q = supabase.from('lists').select('*, list_items(srs_box, due_at)').order('updated_at', { ascending: false })
  if (subject) q = q.eq('subject', subject)
  const { data, error } = await q
  if (error) throw error
  const cutoff = tomorrow()
  return data.map(({ list_items, ...l }) => ({
    ...l,
    item_count: list_items.length,
    due_count: list_items.filter((i) => i.due_at !== null && i.due_at < cutoff).length,
    new_count: list_items.filter((i) => i.srs_box === 0).length,
  }))
}

export async function fetchList(id: string): Promise<{ list: ListRow; items: ItemRow[] } | null> {
  if (online()) {
    try {
      const [l, i] = await Promise.all([
        supabase.from('lists').select('*').eq('id', id).maybeSingle(),
        supabase.from('list_items').select('*').eq('list_id', id).order('position'),
      ])
      if (l.error || i.error) throw l.error ?? i.error
      if (!l.data) return null
      void cacheList(l.data, i.data)
      return { list: l.data, items: i.data }
    } catch {
      // Geen verbinding of serverfout: val terug op de cache.
    }
  }
  return readCachedList(id)
}

export type ListMeta = Pick<ListRow, 'subject' | 'title' | 'chapter' | 'kind' | 'term_lang' | 'definition_lang'>
export type EditableItem = { id?: string; term: string; definition: string; note?: string | null; word_type?: string | null; example?: string | null }

/** Nieuwe lijst of bestaande bijwerken; items worden gesynchroniseerd (SRS-status blijft behouden). */
export async function saveList(meta: ListMeta, items: EditableItem[], id?: string): Promise<string> {
  let listId = id
  if (listId) {
    const { error } = await supabase.from('lists').update(meta).eq('id', listId)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('lists').insert(meta).select('id').single()
    if (error) throw error
    listId = data.id
  }

  const clean = items
    .map((it, position) => ({ ...it, term: it.term.trim(), definition: it.definition.trim(), position }))
    .filter((it) => it.term && it.definition)

  if (id) {
    const keep = clean.filter((it) => it.id).map((it) => it.id!)
    let del = supabase.from('list_items').delete().eq('list_id', listId)
    if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`)
    const { error } = await del
    if (error) throw error
  }

  const existing = clean.filter((it) => it.id)
  const fresh = clean.filter((it) => !it.id)
  for (const it of existing) {
    const { error } = await supabase
      .from('list_items')
      .update({ term: it.term, definition: it.definition, note: it.note || null, word_type: it.word_type || null, example: it.example || null, position: it.position })
      .eq('id', it.id!)
    if (error) throw error
  }
  if (fresh.length) {
    const { error } = await supabase.from('list_items').insert(
      fresh.map((it) => ({ list_id: listId!, term: it.term, definition: it.definition, note: it.note || null, word_type: it.word_type || null, example: it.example || null, position: it.position })),
    )
    if (error) throw error
  }
  return listId!
}

export async function deleteList(id: string) {
  const { error } = await supabase.from('lists').delete().eq('id', id)
  if (error) throw error
}

export async function saveReview(itemId: string, state: SrsState) {
  // Via de offline-wachtrij: offline wordt het bewaard en later gesynchroniseerd.
  await queueReview(itemId, state)
}

export type DueItem = ItemRow & { lists: Pick<ListRow, 'subject' | 'title' | 'kind' | 'term_lang' | 'definition_lang'> }

/** Alle items die vandaag (of eerder) aan de beurt zijn, optioneel per vak. */
export async function fetchDue(subject?: SubjectSlug): Promise<DueItem[]> {
  if (online()) {
    try {
      let q = supabase
        .from('list_items')
        .select('*, lists!inner(subject, title, kind, term_lang, definition_lang)')
        .not('due_at', 'is', null)
        .lt('due_at', tomorrow())
        .order('due_at')
        .limit(500)
      if (subject) q = q.eq('lists.subject', subject)
      const { data, error } = await q
      if (error) throw error
      return data as DueItem[]
    } catch {
      // Offline of serverfout: val terug op de cache.
    }
  }
  return cachedDue(subject ?? null)
}

export async function countDue(): Promise<number> {
  const { count, error } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .not('due_at', 'is', null)
    .lt('due_at', tomorrow())
  if (error) throw error
  return count ?? 0
}

export async function saveSession(row: Database['public']['Tables']['study_sessions']['Insert']) {
  // Via de offline-wachtrij: offline wordt de sessie bewaard en later verstuurd.
  await queueSession(row as Record<string, unknown>)
}
