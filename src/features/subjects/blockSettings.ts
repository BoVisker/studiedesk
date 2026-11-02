import { isBlockId, type BlockId } from '@/config/blocks'
import type { SubjectDef } from '@/config/subjects'

/** Zoals opgeslagen in user_subjects.blocks. */
export type BlockSetting = { id: BlockId; enabled: boolean; title?: string }

/** Standaardinstelling voor een vak: alle blokken in config-volgorde. */
export function defaultBlocks(subject: SubjectDef): BlockSetting[] {
  const off = new Set(subject.defaultOff ?? [])
  return subject.blocks.map((id) => ({ id, enabled: !off.has(id) }))
}

/**
 * Combineer opgeslagen instellingen met de huidige config:
 * - opgeslagen volgorde, aan/uit en titels blijven behouden;
 * - blokken die niet (meer) bij het vak horen of onbekend zijn, vallen weg;
 * - nieuwe blokken uit de config komen achteraan, met hun standaardstand;
 * - dubbele of kapotte items worden genegeerd.
 */
export function resolveBlocks(subject: SubjectDef, saved: unknown): BlockSetting[] {
  const allowed = new Set<BlockId>(subject.blocks)
  const seen = new Set<BlockId>()
  const out: BlockSetting[] = []

  if (Array.isArray(saved)) {
    for (const raw of saved) {
      if (!raw || typeof raw !== 'object') continue
      const { id, enabled, title } = raw as Record<string, unknown>
      if (!isBlockId(id) || !allowed.has(id) || seen.has(id)) continue
      seen.add(id)
      const clean = typeof title === 'string' ? title.trim().slice(0, 60) : ''
      out.push({ id, enabled: enabled !== false, ...(clean ? { title: clean } : {}) })
    }
  }

  for (const d of defaultBlocks(subject)) if (!seen.has(d.id)) out.push(d)
  return out
}

/** Verplaats een blok (voor drag & drop en de toetsenbord-knoppen). */
export function moveBlock(list: BlockSetting[], from: number, to: number): BlockSetting[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
