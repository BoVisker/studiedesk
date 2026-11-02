// Controle van getypte antwoorden. Regels (ook zichtbaar in de instellingen):
// - meerdere goede antwoorden gescheiden door komma, puntkomma of slash;
//   één daarvan noemen is genoeg, meerdere noemen mag ook (dan moeten ze allemaal kloppen);
// - tekst tussen haakjes is optioneel: "(de) hond" ⇒ "hond" én "de hond";
// - hoofdletters en accenten zijn aparte instellingen;
// - "bijna goed" bij een kleine typefout of alleen een accentverschil.

export type CheckOptions = {
  ignoreCase: boolean
  ignoreAccents: boolean
  /** Toon "bijna goed" bij kleine fouten (anders gewoon fout). */
  allowAlmost: boolean
  /** Splits het verwachte antwoord op , ; / (uit voor formules). */
  splitAlternatives: boolean
}

export const defaultCheckOptions: CheckOptions = {
  ignoreCase: true,
  ignoreAccents: false,
  allowAlmost: true,
  splitAlternatives: true,
}

export type Verdict = 'correct' | 'almost' | 'wrong'
export type CheckResult = { verdict: Verdict; reason?: 'typo' | 'accent' }

const SPLIT = /[;,/]/

function stripAccents(s: string) {
  return s
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Basisnormalisatie die altijd geldt: witruimte en afsluitende leestekens. */
function base(s: string) {
  return s
    .normalize('NFC')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .trim()
}

function normalize(s: string, o: Pick<CheckOptions, 'ignoreCase' | 'ignoreAccents'>) {
  let r = base(s)
  if (o.ignoreAccents) r = stripAccents(r)
  if (o.ignoreCase) r = r.toLocaleLowerCase('nl')
  return r
}

/** Alle varianten van één alternatief met optionele haakjes-delen (max 16). */
export function expandParentheses(alt: string): string[] {
  const parts = alt.split(/(\([^()]*\))/).filter((p) => p !== '')
  let variants = ['']
  for (const p of parts) {
    if (/^\(.*\)$/.test(p) && variants.length < 16) {
      const inner = p.slice(1, -1)
      variants = variants.flatMap((v) => [v, v + inner])
    } else {
      variants = variants.map((v) => v + p.replace(/[()]/g, ''))
    }
  }
  return [...new Set(variants.map((v) => v.replace(/\s+/g, ' ').trim()).filter(Boolean))]
}

export function alternatives(expected: string, split: boolean): string[] {
  const alts = split ? expected.split(SPLIT) : [expected]
  return alts.map((a) => a.trim()).filter(Boolean)
}

/** Damerau-Levenshtein (optimal string alignment). */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 1; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[m][n]
}

/** Hoeveel typefouten we "bijna goed" noemen, afhankelijk van de woordlengte. */
export function typoTolerance(length: number) {
  return length < 4 ? 0 : length < 8 ? 1 : 2
}

function checkPart(given: string, expectedVariants: string[], o: CheckOptions): CheckResult {
  const g = normalize(given, o)
  if (!g) return { verdict: 'wrong' }
  const norm = expectedVariants.map((v) => normalize(v, o))
  if (norm.includes(g)) return { verdict: 'correct' }
  if (!o.allowAlmost) return { verdict: 'wrong' }

  // Alleen accenten verschillen (terwijl accenten wél meetellen).
  const loose = { ignoreCase: o.ignoreCase, ignoreAccents: true }
  if (!o.ignoreAccents && expectedVariants.some((v) => normalize(v, loose) === normalize(given, loose))) {
    return { verdict: 'almost', reason: 'accent' }
  }
  for (const v of norm) {
    if (editDistance(g, v) <= typoTolerance(v.length)) return { verdict: 'almost', reason: 'typo' }
  }
  return { verdict: 'wrong' }
}

export function checkAnswer(given: string, expected: string, options: Partial<CheckOptions> = {}): CheckResult {
  const o = { ...defaultCheckOptions, ...options }
  const variants = alternatives(expected, o.splitAlternatives).flatMap(expandParentheses)
  if (!variants.length) return { verdict: 'wrong' }

  // Eerst het hele antwoord als één geheel (bijv. "hond, viervoeter" letterlijk).
  const whole = checkPart(given, [...variants, ...expandParentheses(expected)], o)
  if (whole.verdict === 'correct' || !o.splitAlternatives) return whole

  // Meerdere antwoorden gegeven: elk deel moet kloppen.
  const parts = given.split(SPLIT).map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) return whole
  const results = parts.map((p) => checkPart(p, variants, o))
  if (results.every((r) => r.verdict === 'correct')) return { verdict: 'correct' }
  const bad = results.find((r) => r.verdict === 'wrong')
  if (bad) return { verdict: 'wrong' }
  return results.find((r) => r.verdict === 'almost')!
}
