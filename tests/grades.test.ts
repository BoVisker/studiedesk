import type { Grade } from '@/features/grades/api'
import { formatGrade, gradeTone, neededGrade, parseGrade, parseWeight, rollingAverages, schoolYear, weightedAverage, whatIf } from '@/features/grades/calc'
import { markDuplicates, rowProblem, toGradeInputs, toImportRows } from '@/features/grades/importRows'
import { matchSubject } from '@/features/grades/subjectMatch'

const g = (grade: number, weight = 1, graded_on: string | null = null, counts = true) => ({ grade, weight, graded_on, counts })

describe('gemiddelden', () => {
  it('gewogen gemiddelde', () => {
    expect(weightedAverage([g(6), g(8, 3)])).toBe(7.5)
    expect(weightedAverage([])).toBeNull()
  })
  it('cijfers die niet meetellen worden genegeerd', () => {
    expect(weightedAverage([g(6), g(1, 5, null, false)])).toBe(6)
    expect(weightedAverage([g(1, 5, null, false)])).toBeNull()
  })
  it('lopend gemiddelde op datum', () => {
    const r = rollingAverages([g(8, 1, '2026-10-02'), g(6, 1, '2026-09-01'), g(4, 2, '2026-11-01')])
    expect(r.map((x) => x.average)).toEqual([6, 7, 5.5])
  })
})

describe('wat moet ik halen', () => {
  it('rekent het benodigde cijfer uit', () => {
    // (6 × 2 − 5) / 1 = 7
    expect(neededGrade([g(5)], 6, 1)).toEqual({ grade: 7, status: 'mogelijk' })
    // (6 × 3 − 5) / 2 = 6,5
    expect(neededGrade([g(5)], 6, 2)).toEqual({ grade: 6.5, status: 'mogelijk' })
  })
  it('meldt onhaalbaar en al gehaald', () => {
    expect(neededGrade([g(2, 3)], 8, 1)?.status).toBe('onhaalbaar')
    expect(neededGrade([g(9, 3)], 5.5, 1)?.status).toBe('al-gehaald')
  })
  it('zonder cijfers is het doel zelf nodig', () => {
    expect(neededGrade([], 6.5, 2)).toEqual({ grade: 6.5, status: 'mogelijk' })
  })
  it('wat als', () => {
    expect(whatIf([g(6)], [{ grade: 9, weight: 2 }])).toBe(8)
  })
})

describe('notatie en invoer', () => {
  it('Nederlandse notatie, half naar boven', () => {
    expect(formatGrade(7.45)).toBe('7,5')
    expect(formatGrade(5.449)).toBe('5,4')
    expect(formatGrade(7.456, 2)).toBe('7,46')
    expect(formatGrade(null)).toBe('–')
  })
  it('cijfers en wegingen lezen', () => {
    expect(parseGrade('7,4')).toBe(7.4)
    expect(parseGrade(' 10 ')).toBe(10)
    expect(parseGrade('V')).toBeNull()
    expect(parseGrade('11')).toBeNull()
    expect(parseGrade('0,5')).toBeNull()
    expect(parseWeight('2x')).toBe(2)
    expect(parseWeight('20%')).toBe(20)
    expect(parseWeight('0')).toBeNull()
  })
  it('schooljaar loopt van augustus tot juli', () => {
    expect(schoolYear('2026-07-31')).toBe('2025-2026')
    expect(schoolYear('2026-08-01')).toBe('2026-2027')
  })
  it('onvoldoende onder 5,5 na afronden', () => {
    expect(gradeTone(5.45)).toBe('voldoende')
    expect(gradeTone(5.44)).toBe('onvoldoende')
  })
})

describe('vaknamen herkennen', () => {
  it.each([
    ['entl', 'engels'],
    ['Engelse taal en literatuur', 'engels'],
    ['Wiskunde B', 'wiskunde-b'],
    ['wisB', 'wiskunde-b'],
    ['biol', 'biologie'],
    ['Scheikunde 5V', 'scheikunde'],
    ['netl', 'nederlands'],
    ['Lichamelijke opvoeding', null],
  ])('%s → %s', (name, slug) => {
    expect(matchSubject(name)).toBe(slug)
  })
})

describe('import uit screenshot', () => {
  const existing = [{ id: '1', subject: 'engels', description: 'SO Unit 3', grade: 7.4, weight: 1, graded_on: '2026-10-01', counts: true }] as Grade[]
  const raw = [
    { vak: 'entl', omschrijving: 'SO unit 3', cijfer: '7,4', weging: '1', datum: '2026-10-01', onzeker: false },
    { vak: 'entl', omschrijving: 'PW 1', cijfer: '6,8', weging: '2x', datum: null, onzeker: false },
    { vak: 'entl', omschrijving: 'PW 1', cijfer: '6,8', weging: '2x', datum: null, onzeker: false },
    { vak: 'lo', omschrijving: 'Turnen', cijfer: 'V', weging: null, datum: null, onzeker: false },
  ]

  it('herkent dubbele regels (al opgeslagen én binnen de import)', () => {
    const rows = toImportRows(raw, existing)
    expect(rows.map((r) => r.duplicate)).toEqual([true, false, true, false])
    expect(rows.map((r) => r.include)).toEqual([false, true, false, true])
  })

  it('markeert problemen en slaat alleen geldige regels op', () => {
    const rows = toImportRows(raw, existing)
    expect(rows[3].uncertain).toBe(true) // onbekend vak
    expect(rowProblem(rows[3])).toBe('vak')
    expect(rowProblem({ ...rows[3], subject: 'engels' })).toBe('cijfer')
    const inputs = toGradeInputs(rows)
    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toMatchObject({ subject: 'engels', description: 'PW 1', grade: 6.8, weight: 2, graded_on: null, source: 'screenshot' })
    expect(inputs[0].external_id).toBeTruthy()
  })

  it('opnieuw markeren na wijzigen blijft werken', () => {
    const rows = markDuplicates(toImportRows(raw, []), existing)
    expect(rows[0].duplicate).toBe(true)
  })
})
