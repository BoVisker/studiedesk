import { detectSeparator, parsePasted } from '@/features/lists/importParser'

describe('plak-import', () => {
  it('herkent tabs (bijv. uit Excel of StudyGo)', () => {
    const r = parsePasted('chien\thond\nchat\tkat\n')
    expect(r.separator).toBe('tab')
    expect(r.rows).toEqual([{ term: 'chien', definition: 'hond' }, { term: 'chat', definition: 'kat' }])
  })

  it('herkent een streepje maar laat koppeltekens heel', () => {
    const r = parsePasted('e-mail - de e-mail\nJean-Luc – een naam')
    expect(r.separator).toBe('streep')
    expect(r.rows[0]).toEqual({ term: 'e-mail', definition: 'de e-mail' })
    expect(r.rows[1]).toEqual({ term: 'Jean-Luc', definition: 'een naam' })
  })

  it('splitst alleen op de eerste scheiding, zodat alternatieven intact blijven', () => {
    const r = parsePasted('beautiful = mooi, prachtig\nugly = lelijk')
    expect(r.separator).toBe('is')
    expect(r.rows[0].definition).toBe('mooi, prachtig')
  })

  it('verwijdert nummering en opsommingstekens', () => {
    const r = parsePasted('1. der Hund; de hond\n2) die Katze; de kat\n• das Haus; het huis')
    expect(r.separator).toBe('puntkomma')
    expect(r.rows.map((x) => x.term)).toEqual(['der Hund', 'die Katze', 'das Haus'])
  })

  it('komma als laatste keuze en regels zonder scheiding worden overgeslagen', () => {
    const r = parsePasted('dog, hond\ncat, kat\nkopje zonder vertaling')
    expect(r.separator).toBe('komma')
    expect(r.rows).toHaveLength(2)
    expect(r.skipped).toEqual(['kopje zonder vertaling'])
  })

  it('een gekozen scheiding wint van de automatische', () => {
    const r = parsePasted('a, b; c', 'puntkomma')
    expect(r.rows).toEqual([{ term: 'a, b', definition: 'c' }])
  })

  it('geeft niets terug als er geen scheiding te vinden is', () => {
    expect(parsePasted('los\nwoorden').separator).toBeNull()
    expect(detectSeparator([])).toBeNull()
  })
})
