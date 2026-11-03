// Rekenregels voor cijfers. Bewust eenvoudig en uitlegbaar: een gewogen
// gemiddelde, zonder overgangs- of slaag/zakregels.

export type GradeLike = { grade: number; weight: number; counts: boolean; graded_on: string | null; created_at?: string }

const counted = (gs: GradeLike[]) => gs.filter((g) => g.counts && g.weight > 0)

/** Gewogen gemiddelde Σ(cijfer × weging) / Σ weging; null zonder meetellende cijfers. */
export function weightedAverage(gs: GradeLike[]): number | null {
  const c = counted(gs)
  const w = c.reduce((n, g) => n + g.weight, 0)
  if (!w) return null
  return c.reduce((n, g) => n + g.grade * g.weight, 0) / w
}

/** Op datum (zonder datum: op invoermoment, achteraan). */
export function sortByDate<T extends GradeLike>(gs: T[]): T[] {
  return [...gs].sort((a, b) => {
    const da = a.graded_on ?? '9999'
    const db = b.graded_on ?? '9999'
    return da === db ? (a.created_at ?? '').localeCompare(b.created_at ?? '') : da.localeCompare(db)
  })
}

/** Verloop van het gemiddelde: na elk meetellend cijfer het gemiddelde tot dan toe. */
export function rollingAverages<T extends GradeLike>(gs: T[]): { grade: T; average: number }[] {
  const out: { grade: T; average: number }[] = []
  let sum = 0
  let w = 0
  for (const g of sortByDate(gs)) {
    if (!g.counts || g.weight <= 0) continue
    sum += g.grade * g.weight
    w += g.weight
    out.push({ grade: g, average: sum / w })
  }
  return out
}

export type Needed = { grade: number; status: 'mogelijk' | 'onhaalbaar' | 'al-gehaald' }

/**
 * Welk cijfer heb je nodig voor `target` als het volgende cijfer `weight` telt?
 * x = (target × (W + w) − Σ cijfer × weging) / w
 */
export function neededGrade(gs: GradeLike[], target: number, weight: number): Needed | null {
  if (!(weight > 0)) return null
  const c = counted(gs)
  const W = c.reduce((n, g) => n + g.weight, 0)
  const S = c.reduce((n, g) => n + g.grade * g.weight, 0)
  const x = (target * (W + weight) - S) / weight
  if (x > 10) return { grade: x, status: 'onhaalbaar' }
  if (x <= 1) return { grade: Math.max(x, 1), status: 'al-gehaald' }
  return { grade: x, status: 'mogelijk' }
}

/** Gemiddelde als je er (fictieve) cijfers bij zou halen. */
export function whatIf(gs: GradeLike[], extra: { grade: number; weight: number }[]): number | null {
  return weightedAverage([...gs, ...extra.map((e) => ({ ...e, counts: true, graded_on: null }))])
}

/** Nederlandse notatie met één decimaal: 7,4. Afronden op één decimaal zoals op school (half naar boven). */
export function formatGrade(n: number | null, decimals = 1): string {
  if (n === null || Number.isNaN(n)) return '–'
  const f = 10 ** decimals
  return (Math.round(n * f + 1e-9) / f).toLocaleString('nl-NL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** "7,4", "7.4", " 8 " → getal tussen 1 en 10; anders null (bijv. "V", "G", "-"). */
export function parseGrade(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n >= 1 && n <= 10 ? n : null
}

/** "2", "2,5", "2x", "x2", "20%" → weging > 0; anders null. */
export function parseWeight(s: string): number | null {
  const t = s.trim().toLowerCase().replace(/x|×|%/g, '').replace(',', '.').trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null
  const n = Number(t)
  return n > 0 && n <= 100 ? n : null
}

/** Schooljaar van een datum, van 1 augustus t/m 31 juli: "2026-2027". */
export function schoolYear(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00`) : date
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-${y + 1}`
}

/** Kleur-categorie voor een cijfer (onvoldoende onder 5,5 na afronden). */
export function gradeTone(n: number | null): 'onvoldoende' | 'voldoende' | 'geen' {
  if (n === null) return 'geen'
  return Math.round(n * 10 + 1e-9) / 10 < 5.5 ? 'onvoldoende' : 'voldoende'
}
