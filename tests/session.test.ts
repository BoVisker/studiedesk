import { answer, buildOptions, createSession, current, gradeFor, isFinished, makeCard, summary, type StudyItem } from '@/features/study/session'

const items: StudyItem[] = ['een', 'twee', 'drie', 'vier', 'vijf'].map((t, i) => ({ id: `i${i}`, term: t, definition: `def-${t}` }))
const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

describe('leersessie', () => {
  it('maakt kaarten in de gevraagde richting', () => {
    const s = createSession(items, { direction: 'achteruit', types: ['typen'], rng: seq(0.3) })
    expect(s.queue).toHaveLength(5)
    expect(s.queue.every((c) => c.prompt.startsWith('def-') && c.dir === 'achteruit')).toBe(true)
  })

  it('beperkt het aantal vragen', () => {
    expect(createSession(items, { direction: 'vooruit', types: ['typen'], limit: 3 }).queue).toHaveLength(3)
  })

  it('fout antwoord komt terug tot het goed is; alleen de eerste poging telt', () => {
    let s = createSession(items.slice(0, 2), { direction: 'vooruit', types: ['typen'], rng: seq(0.9) })
    const firstKey = current(s)!.key
    s = answer(s, false)
    expect(s.queue.map((c) => c.key)).toContain(firstKey)
    while (!isFinished(s)) s = answer(s, true)
    const sum = summary(s)
    expect(sum).toEqual({ total: 2, correct: 1, wrongKeys: [firstKey] })
    expect(s.attempts).toBe(3)
  })

  it('in toets-modus komen foute items niet terug', () => {
    let s = createSession(items, { direction: 'vooruit', types: ['typen'], requeueWrong: false })
    s = answer(s, false)
    expect(s.queue).toHaveLength(4)
  })

  it('cijfer = 1 + 9 × score, op één decimaal', () => {
    expect(gradeFor(10, 10)).toBe(10)
    expect(gradeFor(0, 10)).toBe(1)
    expect(gradeFor(8, 10)).toBe(8.2)
    expect(gradeFor(2, 3)).toBe(7)
    expect(gradeFor(0, 0)).toBe(1)
  })

  it('meerkeuze: goed antwoord plus unieke afleiders uit dezelfde lijst', () => {
    const card = makeCard(items[0], 'vooruit', 'meerkeuze')
    const opts = buildOptions(card, [...items, { id: 'dup', term: 'x', definition: 'DEF-een' }], 4)
    expect(opts).toHaveLength(4)
    expect(opts).toContain('def-een')
    expect(new Set(opts.map((o) => o.toLowerCase())).size).toBe(4)
  })

  it('meerkeuze met een kleine lijst geeft minder opties', () => {
    const card = makeCard(items[0], 'achteruit', 'meerkeuze')
    expect(buildOptions(card, items.slice(0, 2), 4)).toHaveLength(2)
  })
})
