// Leerplan-algoritme. Bewust eenvoudig en uitlegbaar, zonder AI:
//
// 1. Voor elke toets plannen we `effort` leermomenten in de dagen vóór de toets.
// 2. Die momenten verdelen we gelijkmatig over de beschikbare dagen, met altijd
//    één moment op de dag vóór de toets (dan zit het vers in je hoofd).
// 3. Is een dag al vol (meer dan `maxPerDay` momenten over alle toetsen samen),
//    dan schuift een moment naar de dichtstbijzijnde rustigere dag binnen het
//    venster van die toets. Lukt dat niet, dan blijft de dag staan en krijgt
//    hij het label "drukke dag".
//
// Het plan wordt elke keer opnieuw berekend uit de huidige toetsen en de datum
// van vandaag. Zo herplant het zichzelf als je een toets toevoegt of als er een
// dag voorbij is; afgevinkte momenten blijven afgevinkt (op toets + datum).
import type { SubjectSlug } from '@/design/subjectPalette'

export type PlanTest = { id: string; subject: SubjectSlug; title: string; test_date: string; effort: number }

export type Moment = {
  key: string
  testId: string
  subject: SubjectSlug
  title: string
  date: string
  testDate: string
  daysBefore: number
  done: boolean
}

export type PlanDay = { date: string; moments: Moment[]; busy: boolean }

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Dagen tussen twee ISO-datums (b − a), puur op de kalenderdag. */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

export function addIso(date: string, n: number): string {
  return isoDate(new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000))
}

export const momentKey = (testId: string, date: string) => `${testId}#${date}`

/**
 * Kies `n` dagen gelijkmatig uit een venster van `windowLength` dagen (index 0 =
 * eerste dag, windowLength-1 = dag vóór de toets). De laatste dag zit er altijd bij.
 */
export function spreadIndices(windowLength: number, n: number): number[] {
  if (windowLength <= 0 || n <= 0) return []
  if (n >= windowLength) return Array.from({ length: windowLength }, (_, i) => i)
  if (n === 1) return [windowLength - 1]
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(Math.round((i * (windowLength - 1)) / (n - 1)))
  // Door afronden kunnen er dubbele indices ontstaan; die maken we uniek.
  return [...new Set(out)]
}

type Options = { today: string; maxPerDay: number; isDone: (key: string) => boolean }

export function buildPlan(tests: PlanTest[], { today, maxPerDay, isDone }: Options): PlanDay[] {
  const perDay = new Map<string, Moment[]>()
  const countOn = (date: string) => perDay.get(date)?.length ?? 0
  const add = (m: Moment) => {
    const list = perDay.get(m.date) ?? []
    list.push(m)
    perDay.set(m.date, list)
  }

  // Nabije toetsen eerst: die hebben voorrang op hun (schaarse) dagen.
  const sorted = [...tests].filter((t) => daysBetween(today, t.test_date) >= 1).sort((a, b) => a.test_date.localeCompare(b.test_date))

  for (const t of sorted) {
    const windowLength = daysBetween(today, t.test_date) // dagen [today .. test_date-1]
    const n = Math.min(t.effort, windowLength)
    const windowDates = Array.from({ length: windowLength }, (_, i) => addIso(today, i))
    const used = new Set<string>()

    for (const idx of spreadIndices(windowLength, n)) {
      let date = windowDates[idx]
      // Dag te vol? Zoek de dichtstbijzijnde rustigere dag binnen het venster.
      if (countOn(date) >= maxPerDay) {
        let best: string | null = null
        let bestDist = Infinity
        for (const cand of windowDates) {
          if (used.has(cand) || countOn(cand) >= maxPerDay) continue
          const dist = Math.abs(daysBetween(cand, date))
          if (dist < bestDist) {
            best = cand
            bestDist = dist
          }
        }
        if (best) date = best
      }
      used.add(date)
      add({
        key: momentKey(t.id, date),
        testId: t.id,
        subject: t.subject,
        title: t.title,
        date,
        testDate: t.test_date,
        daysBefore: daysBetween(date, t.test_date),
        done: isDone(momentKey(t.id, date)),
      })
    }
  }

  return [...perDay.entries()]
    .map(([date, moments]) => ({
      date,
      moments: moments.sort((a, b) => a.daysBefore - b.daysBefore || a.title.localeCompare(b.title)),
      busy: moments.length > maxPerDay,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Alleen de leermomenten van vandaag. */
export function momentsOn(plan: PlanDay[], date: string): Moment[] {
  return plan.find((d) => d.date === date)?.moments ?? []
}
