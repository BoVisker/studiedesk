import { addIso, buildPlan, daysBetween, momentKey, type PlanTest, spreadIndices } from '@/features/planner/planner'

const T = '2026-11-02' // vandaag in deze tests

describe('datumhulp', () => {
  it('telt kalenderdagen en telt dagen op', () => {
    expect(daysBetween('2026-11-02', '2026-11-09')).toBe(7)
    expect(addIso('2026-11-02', 3)).toBe('2026-11-05')
  })
})

describe('spreadIndices', () => {
  it('één moment valt op de dag vóór de toets', () => {
    expect(spreadIndices(5, 1)).toEqual([4])
  })
  it('verdeelt gelijkmatig inclusief de laatste dag', () => {
    expect(spreadIndices(7, 3)).toEqual([0, 3, 6])
  })
  it('meer momenten dan dagen: elke dag één', () => {
    expect(spreadIndices(2, 5)).toEqual([0, 1])
  })
})

const test = (id: string, test_date: string, effort = 3, subject = 'engels'): PlanTest => ({ id, subject: subject as PlanTest['subject'], title: `Toets ${id}`, test_date, effort })

describe('buildPlan', () => {
  const opts = { today: T, maxPerDay: 2, isDone: () => false }

  it('plant effort leermomenten vóór de toets, met de laatste op de dag ervoor', () => {
    const plan = buildPlan([test('a', '2026-11-09', 3)], opts)
    const dates = plan.flatMap((d) => d.moments.map((m) => m.date))
    expect(dates).toContain('2026-11-08') // dag vóór de toets
    expect(dates).toHaveLength(3)
    expect(dates.every((d) => d >= T && d < '2026-11-09')).toBe(true)
  })

  it('plant niets op of na de toetsdatum, en niet voor een toets vandaag/verleden', () => {
    expect(buildPlan([test('a', T, 3)], opts)).toEqual([])
    expect(buildPlan([test('a', '2026-10-01', 3)], opts)).toEqual([])
  })

  it('beperkt tot het aantal beschikbare dagen', () => {
    const plan = buildPlan([test('a', '2026-11-04', 5)], opts) // 2 dagen beschikbaar
    expect(plan.flatMap((d) => d.moments)).toHaveLength(2)
  })

  it('schuift momenten weg van een te volle dag waar mogelijk', () => {
    // Drie toetsen die anders allemaal op 11-08 zouden willen → max 2 per dag.
    const plan = buildPlan([test('a', '2026-11-09', 1), test('b', '2026-11-09', 1), test('c', '2026-11-09', 1)], opts)
    const busy = plan.filter((d) => d.busy)
    expect(busy).toHaveLength(0)
    expect(plan.every((d) => d.moments.length <= 2)).toBe(true)
    expect(plan.flatMap((d) => d.moments)).toHaveLength(3)
  })

  it('markeert een drukke dag als er echt geen ruimte is', () => {
    // Vier toetsen morgen, effort 1: maar één dag beschikbaar (vandaag), max 2.
    const plan = buildPlan([test('a', '2026-11-03', 1), test('b', '2026-11-03', 1), test('c', '2026-11-03', 1), test('d', '2026-11-03', 1)], opts)
    expect(plan).toHaveLength(1)
    expect(plan[0].date).toBe(T)
    expect(plan[0].moments).toHaveLength(4)
    expect(plan[0].busy).toBe(true)
  })

  it('respecteert afgevinkte momenten', () => {
    const done = new Set([momentKey('a', '2026-11-08')])
    const plan = buildPlan([test('a', '2026-11-09', 1)], { ...opts, isDone: (k) => done.has(k) })
    expect(plan[0].moments[0].done).toBe(true)
  })
})
