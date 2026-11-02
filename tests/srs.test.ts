import { addDays, boxLabel, isDue, review, startOfDay, type SrsState } from '@/features/study/srs'

const fresh: SrsState = { srs_box: 0, due_at: null, correct_count: 0, wrong_count: 0, last_reviewed_at: null }
const now = new Date(2026, 10, 2, 15, 30) // 2 nov, 15:30 lokaal

describe('Leitner-SRS', () => {
  it('goed antwoord schuift een bakje op met oplopende intervallen', () => {
    let s = review(fresh, true, now)
    expect(s.srs_box).toBe(1)
    expect(new Date(s.due_at!)).toEqual(addDays(startOfDay(now), 1))
    s = review(s, true, now)
    expect(s.srs_box).toBe(2)
    expect(new Date(s.due_at!)).toEqual(addDays(startOfDay(now), 2))
    s = review(review(s, true, now), true, now)
    expect(s.srs_box).toBe(4)
    expect(new Date(s.due_at!)).toEqual(addDays(startOfDay(now), 8))
    expect(s.correct_count).toBe(4)
  })

  it('bakje 6 is het maximum', () => {
    let s = fresh
    for (let i = 0; i < 10; i++) s = review(s, true, now)
    expect(s.srs_box).toBe(6)
    expect(new Date(s.due_at!)).toEqual(addDays(startOfDay(now), 32))
    expect(boxLabel(s.srs_box)).toBe('Beheerst')
  })

  it('fout antwoord gaat terug naar bakje 1, morgen opnieuw', () => {
    const s = review({ ...fresh, srs_box: 5, correct_count: 5 }, false, now)
    expect(s.srs_box).toBe(1)
    expect(s.wrong_count).toBe(1)
    expect(new Date(s.due_at!)).toEqual(addDays(startOfDay(now), 1))
    expect(s.last_reviewed_at).toBe(now.toISOString())
  })

  it('isDue kijkt naar lokale kalenderdagen', () => {
    expect(isDue(fresh, now)).toBe(false)
    expect(isDue({ due_at: new Date(2026, 10, 2, 23, 59).toISOString() }, now)).toBe(true)
    expect(isDue({ due_at: new Date(2026, 10, 1).toISOString() }, now)).toBe(true)
    expect(isDue({ due_at: new Date(2026, 10, 3, 0, 0).toISOString() }, now)).toBe(false)
  })
})
