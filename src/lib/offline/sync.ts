// Orkestratie van de offline-laag: cache vullen, herhalingen en sessies in de
// wachtrij zetten en die naar Supabase synchroniseren zodra er verbinding is.
import type { DueItem, ItemRow, ListRow } from '@/features/lists/api'
import type { SrsState } from '@/features/study/srs'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type SessionInsert = Database['public']['Tables']['study_sessions']['Insert']
import {
  clearCache,
  db,
  deleteOutbox,
  getCachedAll,
  getCachedList,
  getOutbox,
  outboxCount,
  patchItem,
  putAll,
  putList,
  putOutbox,
  replaceOutbox,
} from './db'
import { conflictFilter, dueFromCache, enqueueReview, isPoison, type OutboxEntry, type OutboxReview } from './logic'

const online = () => typeof navigator === 'undefined' || navigator.onLine
const hasDB = async () => (await db()) !== null

// --- Luisteraars voor de UI (aantal wachtende wijzigingen) ---
const listeners = new Set<() => void>()
export function onSyncChange(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function emit() {
  for (const fn of listeners) fn()
}
export const pendingCount = () => outboxCount()

// --- Cache vullen ---

/** Alle lijsten en items ophalen en cachen, zodat offline herhalen werkt. */
export async function pullAll() {
  if (!online()) return
  const [lists, items] = await Promise.all([supabase.from('lists').select('*'), supabase.from('list_items').select('*')])
  if (lists.error || items.error) return
  await putAll(lists.data as ListRow[], items.data as ItemRow[])
}

/** Eén lijst cachen (na het online openen ervan). */
export async function cacheList(list: ListRow, items: ItemRow[]) {
  await putList(list, items).catch(() => {})
}

export const readCachedList = getCachedList

/** Bij uitloggen: eerst proberen te synchroniseren, dan de lokale cache wissen. */
export async function clearOfflineData() {
  started = false
  await flush().catch(() => {})
  await clearCache().catch(() => {})
  emit()
}

/** Te herhalen items uit de cache (offline). */
export async function cachedDue(subject: string | null): Promise<DueItem[]> {
  const { lists, items } = await getCachedAll()
  return dueFromCache(lists, items, subject)
}

// --- Schrijven via de wachtrij ---

/** Herhaling opslaan: meteen in de cache (optimistisch) en in de wachtrij; daarna syncen. */
export async function queueReview(itemId: string, state: SrsState) {
  // Geen IndexedDB (privémodus): direct wegschrijven, best effort.
  if (!(await hasDB())) {
    await supabase.from('list_items').update(state).eq('id', itemId).or(conflictFilter(state.last_reviewed_at)).then(undefined, () => {})
    return
  }
  await patchItem(itemId, state).catch(() => {})
  const entry: OutboxReview = {
    id: crypto.randomUUID(),
    type: 'review',
    itemId,
    state,
    ts: state.last_reviewed_at ?? new Date().toISOString(),
    attempts: 0,
  }
  const current = await getOutbox()
  const next = enqueueReview(current, entry)
  const nextIds = new Set(next.map((e) => e.id))
  const removed = current.filter((e) => !nextIds.has(e.id)).map((e) => e.id)
  const added = next.filter((e) => !current.some((c) => c.id === e.id))
  await replaceOutbox(added, removed)
  emit()
  void flush()
}

export async function queueSession(row: Record<string, unknown>) {
  // Geen IndexedDB: direct wegschrijven; een fout mag de aanroeper zien.
  if (!(await hasDB())) {
    const { error } = await supabase.from('study_sessions').insert(row as SessionInsert)
    if (error) throw error
    return
  }
  await putOutbox({ id: crypto.randomUUID(), type: 'session', row, ts: new Date().toISOString(), attempts: 0 })
  emit()
  void flush()
}

// --- Synchroniseren ---

async function push(entry: OutboxEntry): Promise<boolean> {
  try {
    if (entry.type === 'review') {
      const { error } = await supabase
        .from('list_items')
        .update(entry.state)
        .eq('id', entry.itemId)
        .or(conflictFilter(entry.state.last_reviewed_at))
      return !error
    }
    const { error } = await supabase.from('study_sessions').insert(entry.row as SessionInsert)
    return !error
  } catch {
    return false
  }
}

let flushing = false

/** De wachtrij afwerken, oudste eerst. Stopt bij de eerste fout (volgorde blijft behouden). */
export async function flush() {
  if (flushing || !online()) return
  flushing = true
  try {
    const outbox = (await getOutbox()).sort((a, b) => a.ts.localeCompare(b.ts))
    for (const entry of outbox) {
      if (await push(entry)) {
        await deleteOutbox(entry.id)
        continue
      }
      const bumped = { ...entry, attempts: entry.attempts + 1 }
      if (isPoison(bumped)) {
        await deleteOutbox(entry.id) // blijft hangen: laten vallen
        continue
      }
      await putOutbox(bumped)
      break
    }
  } finally {
    flushing = false
    emit()
  }
}

let started = false
/** Bij app-start en zodra er weer verbinding is: synchroniseren en de cache verversen. */
export function initSync() {
  if (typeof window === 'undefined' || started) return
  started = true
  const run = () => {
    void flush()
    void pullAll()
  }
  window.addEventListener('online', run)
  run()
}
