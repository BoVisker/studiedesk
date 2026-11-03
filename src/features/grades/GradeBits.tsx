import { Select } from '@/components/ui'
import { cx } from '@/components/ui'
import { formatGrade, gradeTone, schoolYear } from './calc'
import type { Grade } from './api'

/** Cijfer met kleur: rood onder de 5,5 (na afronden). Kleur is nooit de enige aanwijzing; het getal staat er altijd. */
export function GradeValue({ value, className, decimals = 1 }: { value: number | null; className?: string; decimals?: number }) {
  const tone = gradeTone(value)
  return <span className={cx('tabular-nums', tone === 'onvoldoende' && 'text-danger', tone === 'geen' && 'text-muted', className)}>{formatGrade(value, decimals)}</span>
}

/** Schooljaren waarin cijfers staan, plus het huidige; nieuwste eerst. */
export function yearsOf(grades: Grade[]): string[] {
  const set = new Set([schoolYear(new Date()), ...grades.map((g) => schoolYear(g.graded_on ?? g.created_at))])
  return [...set].sort().reverse()
}

export const inYear = (g: Grade, year: string) => schoolYear(g.graded_on ?? g.created_at) === year

export function YearSelect({ years, value, onChange }: { years: string[]; value: string; onChange: (y: string) => void }) {
  return (
    <Select
      label="Schooljaar"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={years.map((y) => ({ value: y, label: y.replace('-', ' – ') }))}
      className="w-40"
    />
  )
}
