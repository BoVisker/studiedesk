import { blockDefs } from '@/config/blocks'
import { subjects, subjectsBySlug } from '@/config/subjects'
import { subjectPalette } from '@/design/subjectPalette'
import { defaultBlocks, moveBlock, resolveBlocks } from '@/features/subjects/blockSettings'

describe('vakken-config', () => {
  it('bevat alle 20 vakken, elk met een kleur en zonder dubbele blokken', () => {
    expect(subjects).toHaveLength(20)
    for (const s of subjects) {
      expect(subjectPalette[s.slug]).toBeDefined()
      expect(new Set(s.blocks).size).toBe(s.blocks.length)
      for (const b of s.blocks) expect(blockDefs[b]).toBeDefined()
      for (const b of s.defaultOff ?? []) expect(s.blocks).toContain(b)
    }
  })

  it('elk archetype heeft de algemene blokken', () => {
    for (const s of subjects) for (const b of ['volgende-toets', 'voortgang', 'cijfers'] as const) expect(s.blocks).toContain(b)
  })

  it('vak-specifieke blokken zitten alleen bij het juiste vak', () => {
    expect(subjectsBySlug.geschiedenis.blocks).toContain('tijdlijn')
    expect(subjectsBySlug.economie.blocks).not.toContain('tijdlijn')
    expect(subjectsBySlug.scheikunde.blocks).toContain('reacties-molrekenen')
    expect(subjectsBySlug.filosofie.blocks).toContain('bronnen-argumenten')
  })

  it('de vakkenlijst in de migratie klopt met de config', async () => {
    const { readFileSync } = await import('node:fs')
    const sql = readFileSync('supabase/migrations/20261102000006_user_subjects.sql', 'utf8')
    for (const s of subjects) expect(sql).toContain(`'${s.slug}'`)
  })
})

describe('resolveBlocks', () => {
  const frans = subjectsBySlug.frans

  it('geeft standaardblokken als er niets is opgeslagen', () => {
    const r = resolveBlocks(frans, null)
    expect(r.map((b) => b.id)).toEqual(frans.blocks)
    expect(r.find((b) => b.id === 'leesboeken')?.enabled).toBe(false)
  })

  it('behoudt opgeslagen volgorde, stand en titel en voegt nieuwe blokken achteraan toe', () => {
    const saved = [
      { id: 'cijfers', enabled: true, title: '  Mijn cijfers ' },
      { id: 'woordenlijsten', enabled: false },
    ]
    const r = resolveBlocks(frans, saved)
    expect(r[0]).toEqual({ id: 'cijfers', enabled: true, title: 'Mijn cijfers' })
    expect(r[1]).toEqual({ id: 'woordenlijsten', enabled: false })
    expect(r).toHaveLength(frans.blocks.length)
    expect(r.slice(2).map((b) => b.id)).toEqual(frans.blocks.filter((b) => b !== 'cijfers' && b !== 'woordenlijsten'))
  })

  it('negeert onbekende, vakvreemde, dubbele en kapotte items', () => {
    const saved = [{ id: 'bestaat-niet', enabled: true }, { id: 'tijdlijn', enabled: true }, { id: 'grammatica' }, { id: 'grammatica', enabled: false }, 'onzin', null]
    const r = resolveBlocks(frans, saved)
    expect(r.filter((b) => b.id === 'grammatica')).toEqual([{ id: 'grammatica', enabled: true }])
    expect(r.some((b) => (b.id as string) === 'tijdlijn' || (b.id as string) === 'bestaat-niet')).toBe(false)
    expect(r).toHaveLength(frans.blocks.length)
  })

  it('valt terug op standaard bij een ongeldig formaat', () => {
    expect(resolveBlocks(frans, { id: 'cijfers' })).toEqual(defaultBlocks(frans))
  })
})

describe('moveBlock', () => {
  const list = defaultBlocks(subjectsBySlug.informatica)

  it('verplaatst een blok', () => {
    const r = moveBlock(list, 0, 2)
    expect(r[2].id).toBe(list[0].id)
    expect(r).toHaveLength(list.length)
  })

  it('doet niets buiten de grenzen', () => {
    expect(moveBlock(list, 0, -1)).toBe(list)
    expect(moveBlock(list, 0, list.length)).toBe(list)
  })
})
