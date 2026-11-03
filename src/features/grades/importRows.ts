// Omzetten en controleren van regels uit een screenshot, los van de UI (getest).
import type { SubjectSlug } from '@/design/subjectPalette'
import { gradeExternalId, type GradeInput } from '@/sources'
import type { Grade } from './api'
import { parseGrade, parseWeight } from './calc'
import { matchSubject } from './subjectMatch'

export type RawGradeRow = { vak: string; omschrijving: string; cijfer: string; weging: string | null; datum: string | null; onzeker: boolean }

export type ImportRow = {
  key: string
  rawSubject: string
  subject: SubjectSlug | ''
  description: string
  grade: string
  weight: string
  date: string
  uncertain: boolean
  include: boolean
  /** Staat (vrijwel zeker) al in je cijfers. */
  duplicate: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function toImportRows(raw: RawGradeRow[], existing: Grade[]): ImportRow[] {
  const rows = raw.map((r, i) => {
    const subject = matchSubject(r.vak) ?? ''
    const row: ImportRow = {
      key: `r${i}`,
      rawSubject: r.vak,
      subject,
      description: r.omschrijving.trim() || 'Cijfer',
      grade: r.cijfer.trim(),
      weight: r.weging?.trim() || '1',
      date: r.datum && DATE_RE.test(r.datum) ? r.datum : '',
      uncertain: r.onzeker || !subject,
      include: true,
      duplicate: false,
    }
    return row
  })
  return markDuplicates(rows, existing)
}

/**
 * Een regel is dubbel als er al een cijfer is met hetzelfde vak, cijfer en
 * (bij beide bekend) dezelfde datum of omschrijving. Dubbele regels gaan
 * standaard uit; de gebruiker kan ze alsnog aanzetten.
 */
export function markDuplicates(rows: ImportRow[], existing: Grade[]): ImportRow[] {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const seen = new Set<string>()
  return rows.map((r) => {
    const g = parseGrade(r.grade)
    const inDb =
      g !== null &&
      existing.some(
        (e) =>
          e.subject === r.subject &&
          Math.abs(e.grade - g) < 0.001 &&
          ((r.date && e.graded_on === r.date) || norm(e.description) === norm(r.description)),
      )
    // Ook dubbel binnen dezelfde import (bijv. twee overlappende screenshots).
    const sig = `${r.subject}|${g}|${r.date}|${norm(r.description)}`
    const inBatch = seen.has(sig)
    seen.add(sig)
    const duplicate = inDb || inBatch
    return { ...r, duplicate, include: duplicate ? false : r.include }
  })
}

export type RowProblem = 'vak' | 'cijfer' | 'weging' | null

export function rowProblem(r: ImportRow): RowProblem {
  if (!r.subject) return 'vak'
  if (parseGrade(r.grade) === null) return 'cijfer'
  if (parseWeight(r.weight) === null) return 'weging'
  return null
}

/** Alleen aangevinkte, geldige regels; met stabiele external_id voor duplicaatdetectie in de database. */
export function toGradeInputs(rows: ImportRow[]): GradeInput[] {
  return rows
    .filter((r) => r.include && rowProblem(r) === null)
    .map((r) => {
      const base = {
        subject: r.subject as SubjectSlug,
        description: r.description.trim().slice(0, 200) || 'Cijfer',
        grade: parseGrade(r.grade)!,
        weight: parseWeight(r.weight)!,
        graded_on: r.date || null,
      }
      return { ...base, counts: true, source: 'screenshot' as const, external_id: gradeExternalId(base) }
    })
}
