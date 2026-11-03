import type { ItemRow, ListRow } from '@/features/lists/api'
import { applyReview, conflictFilter, dueFromCache, enqueueReview, isPoison, MAX_ATTEMPTS, type OutboxReview } from '@/lib/offline/logic'
import type { SrsState } from '@/features/study/srs'

const list = (id: string, subject: string): ListRow => ({
  id, user_id: 'u', subject, title: `Lijst ${id}`, chapter: null, kind: 'woorden', term_lang: 'fr', definition_lang: 'nl', created_at: '2026-01-01', updated_at: '2026-01-01',
})

const item = (id: string, listId: string, due_at: string | null, box = 1): ItemRow => ({
  id, list_id: listId, user_id: 'u', position: 0, term: `t${id}`, definition: `d${id}`, note: null, word_type: null, example: null,
  srs_box: box, due_at, correct_count: 0, wrong_count: 0, last_reviewed_at: null, created_at: '2026-01-01', updated_at: '2026-01-01',
})

const now = new Date('2026-11-03T10:00:00Z')
const yesterday = '2026-11-02T10:00:00Z'
const nextWeek = '2026-11-10T10:00:00Z'

describe('dueFromCache', () => {
  const lists = [list('L1', 'engels'), list('L2', 'frans')]
  const items = [item('a', 'L1', yesterday), item('b', 'L1', nextWeek), item('c', 'L2', yesterday), item('d', 'L1', null)]

  it('geeft alleen items die vandaag of eerder aan de beurt zijn, met lijstinfo', () => {
    const due = dueFromCache(lists, items, null, now)
    expect(due.map((d) => d.id)).toEqual(['a', 'c'])
    expect(due[0].lists).toEqual({ subject: 'engels', title: 'Lijst L1', kind: 'woorden', term_lang: 'fr', definition_lang: 'nl' })
  })

  it('filtert op vak', () => {
    expect(dueFromCache(lists, items, 'frans', now).map((d) => d.id)).toEqual(['c'])
  })

  it('negeert items waarvan de lijst niet in de cache zit', () => {
    expect(dueFromCache([list('L1', 'engels')], [item('x', 'ONBEKEND', yesterday)], null, now)).toEqual([])
  })
})

const srs = (ts: string): SrsState => ({ srs_box: 2, due_at: nextWeek, correct_count: 1, wrong_count: 0, last_reviewed_at: ts })

describe('applyReview', () => {
  it('werkt het juiste item bij in de cache', () => {
    const items = [item('a', 'L1', yesterday, 1), item('b', 'L1', yesterday, 1)]
    const out = applyReview(items, 'a', srs('2026-11-03T10:00:00Z'))
    expect(out.find((i) => i.id === 'a')!.srs_box).toBe(2)
    expect(out.find((i) => i.id === 'b')!.srs_box).toBe(1)
  })
})

describe('enqueueReview (laatste wint, geen dubbele regels)', () => {
  const entry = (itemId: string, ts: string): OutboxReview => ({ id: `e-${ts}`, type: 'review', itemId, state: srs(ts), ts, attempts: 0 })

  it('voegt een nieuwe herhaling toe', () => {
    expect(enqueueReview([], entry('a', '1')).map((e) => e.id)).toEqual(['e-1'])
  })

  it('vervangt een oudere herhaling van hetzelfde item', () => {
    const out = enqueueReview([entry('a', '2026-11-01')], entry('a', '2026-11-03'))
    expect(out).toHaveLength(1)
    expect((out[0] as OutboxReview).ts).toBe('2026-11-03')
  })

  it('houdt de bestaande als die nieuwer is', () => {
    const out = enqueueReview([entry('a', '2026-11-05')], entry('a', '2026-11-03'))
    expect((out[0] as OutboxReview).ts).toBe('2026-11-05')
  })

  it('raakt herhalingen van andere items niet', () => {
    const out = enqueueReview([entry('a', '1')], entry('b', '1'))
    expect(out.map((e) => (e as OutboxReview).itemId).sort()).toEqual(['a', 'b'])
  })
})

describe('conflictFilter', () => {
  it('past alleen toe als de server niet nieuwer is', () => {
    expect(conflictFilter('2026-11-03T10:00:00Z')).toBe('last_reviewed_at.is.null,last_reviewed_at.lte.2026-11-03T10:00:00Z')
    expect(conflictFilter(null)).toBe('last_reviewed_at.is.null')
  })
})

describe('isPoison', () => {
  it('laat een regel vallen na te veel pogingen', () => {
    expect(isPoison({ id: 'x', type: 'session', row: {}, ts: '1', attempts: MAX_ATTEMPTS - 1 })).toBe(false)
    expect(isPoison({ id: 'x', type: 'session', row: {}, ts: '1', attempts: MAX_ATTEMPTS })).toBe(true)
  })
})
