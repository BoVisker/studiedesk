// IndexedDB-opslag voor offline leren: gecachte lijsten en items, plus een
// uitgaande wachtrij (outbox). Alles defensief: lukt IndexedDB niet (privémodus,
// oudere browser), dan werkt de app gewoon online verder.
import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { ItemRow, ListRow } from '@/features/lists/api'
import type { OutboxEntry } from './logic'

interface StudieDeskDB extends DBSchema {
  lists: { key: string; value: ListRow }
  items: { key: string; value: ItemRow; indexes: { 'by-list': string } }
  outbox: { key: string; value: OutboxEntry }
  meta: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<StudieDeskDB> | null> | null = null

function openDatabase(): Promise<IDBPDatabase<StudieDeskDB> | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return openDB<StudieDeskDB>('studiedesk', 1, {
    upgrade(db) {
      db.createObjectStore('lists', { keyPath: 'id' })
      const items = db.createObjectStore('items', { keyPath: 'id' })
      items.createIndex('by-list', 'list_id')
      db.createObjectStore('outbox', { keyPath: 'id' })
      db.createObjectStore('meta')
    },
  }).catch(() => null)
}

export function db(): Promise<IDBPDatabase<StudieDeskDB> | null> {
  if (!dbPromise) dbPromise = openDatabase()
  return dbPromise
}

/** Alle lijsten en items in de cache vervangen (na een volledige pull). */
export async function putAll(lists: ListRow[], items: ItemRow[]) {
  const d = await db()
  if (!d) return
  const tx = d.transaction(['lists', 'items', 'meta'], 'readwrite')
  await tx.objectStore('lists').clear()
  await tx.objectStore('items').clear()
  for (const l of lists) await tx.objectStore('lists').put(l)
  for (const it of items) await tx.objectStore('items').put(it)
  await tx.objectStore('meta').put(new Date().toISOString(), 'lastPull')
  await tx.done
}

/** Eén lijst met items bijwerken in de cache (na het openen van die lijst). */
export async function putList(list: ListRow, items: ItemRow[]) {
  const d = await db()
  if (!d) return
  const tx = d.transaction(['lists', 'items'], 'readwrite')
  await tx.objectStore('lists').put(list)
  const idx = tx.objectStore('items').index('by-list')
  let cursor = await idx.openCursor(list.id)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  for (const it of items) await tx.objectStore('items').put(it)
  await tx.done
}

export async function getCachedList(id: string): Promise<{ list: ListRow; items: ItemRow[] } | null> {
  const d = await db()
  if (!d) return null
  const list = await d.get('lists', id)
  if (!list) return null
  const items = await d.getAllFromIndex('items', 'by-list', id)
  return { list, items: items.sort((a, b) => a.position - b.position) }
}

export async function getCachedAll(): Promise<{ lists: ListRow[]; items: ItemRow[] }> {
  const d = await db()
  if (!d) return { lists: [], items: [] }
  const [lists, items] = await Promise.all([d.getAll('lists'), d.getAll('items')])
  return { lists, items }
}

export async function patchItem(itemId: string, patch: Partial<ItemRow>) {
  const d = await db()
  if (!d) return
  const it = await d.get('items', itemId)
  if (it) await d.put('items', { ...it, ...patch })
}

// --- Outbox ---

export async function getOutbox(): Promise<OutboxEntry[]> {
  const d = await db()
  if (!d) return []
  return d.getAll('outbox')
}

export async function putOutbox(entry: OutboxEntry) {
  const d = await db()
  if (!d) return
  await d.put('outbox', entry)
}

export async function replaceOutbox(entries: OutboxEntry[], removedIds: string[] = []) {
  const d = await db()
  if (!d) return
  const tx = d.transaction('outbox', 'readwrite')
  for (const id of removedIds) await tx.store.delete(id)
  for (const e of entries) await tx.store.put(e)
  await tx.done
}

export async function deleteOutbox(id: string) {
  const d = await db()
  if (!d) return
  await d.delete('outbox', id)
}

export async function outboxCount(): Promise<number> {
  const d = await db()
  if (!d) return 0
  return d.count('outbox')
}

/** Alle offline-gegevens wissen (bij uitloggen op een gedeeld apparaat). */
export async function clearCache() {
  const d = await db()
  if (!d) return
  const tx = d.transaction(['lists', 'items', 'outbox', 'meta'], 'readwrite')
  await Promise.all([tx.objectStore('lists').clear(), tx.objectStore('items').clear(), tx.objectStore('outbox').clear(), tx.objectStore('meta').clear()])
  await tx.done
}
