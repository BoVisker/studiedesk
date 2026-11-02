// Leitner-systeem met 6 bakjes. Uitlegbaar:
// - goed ⇒ één bakje verder, terug over 1/2/4/8/16/32 dagen (bakje 1..6);
// - fout ⇒ terug naar bakje 1, morgen opnieuw;
// - in een sessie komen foute items terug tot ze goed zijn, maar alleen de
//   eerste poging telt voor het bakje.
// Data rekent in lokale kalenderdagen, zodat "vandaag" overeenkomt met wat je ziet.

export const BOX_INTERVAL_DAYS = [0, 1, 2, 4, 8, 16, 32] as const
export const MAX_BOX = 6

export type SrsState = {
  srs_box: number
  due_at: string | null
  correct_count: number
  wrong_count: number
  last_reviewed_at: string | null
}

export function startOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

export function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function review(state: SrsState, correct: boolean, now = new Date()): SrsState {
  const box = correct ? Math.min(state.srs_box + 1, MAX_BOX) : 1
  return {
    srs_box: box,
    due_at: addDays(startOfDay(now), BOX_INTERVAL_DAYS[box]).toISOString(),
    correct_count: state.correct_count + (correct ? 1 : 0),
    wrong_count: state.wrong_count + (correct ? 0 : 1),
    last_reviewed_at: now.toISOString(),
  }
}

/** Te herhalen = ooit geleerd en de herhaaldatum is vandaag of eerder. */
export function isDue(state: Pick<SrsState, 'due_at'>, now = new Date()) {
  return state.due_at !== null && new Date(state.due_at) < addDays(startOfDay(now), 1)
}

export function isNew(state: Pick<SrsState, 'srs_box'>) {
  return state.srs_box === 0
}

/** Label voor de UI. */
export function boxLabel(box: number) {
  if (box === 0) return 'Nieuw'
  if (box >= MAX_BOX) return 'Beheerst'
  return `Bakje ${box}`
}
