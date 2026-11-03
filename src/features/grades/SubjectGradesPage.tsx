import { ArrowLeft, Calculator, FlaskConical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, CardTitle, Dialog, Field, Skeleton } from '@/components/ui'
import { isSubjectSlug, subjectsBySlug } from '@/config/subjects'
import { accentProps } from '@/design/subjectPalette'
import { sourceLabel, type SourceId } from '@/sources'
import { deleteGrade, fetchGrades, type Grade } from './api'
import { formatGrade, neededGrade, parseGrade, parseWeight, schoolYear, sortByDate, weightedAverage, whatIf } from './calc'
import { GradeChart } from './GradeChart'
import { GradeDialog } from './GradeDialog'
import { GradeValue, inYear, YearSelect, yearsOf } from './GradeBits'

export function SubjectGradesPage() {
  const { slug = '' } = useParams()
  const [all, setAll] = useState<Grade[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(schoolYear(new Date()))
  const [editing, setEditing] = useState<Grade | null | 'new'>(null)
  const [removing, setRemoving] = useState<Grade | null>(null)

  const load = useCallback(() => {
    if (!isSubjectSlug(slug)) return
    fetchGrades(slug)
      .then(setAll)
      .catch(() => setError('Kon de cijfers niet laden.'))
  }, [slug])
  useEffect(load, [load])

  const grades = useMemo(() => (all ? sortByDate(all.filter((g) => inYear(g, year))) : null), [all, year])

  if (!isSubjectSlug(slug)) return <Navigate to="/cijfers" replace />
  const def = subjectsBySlug[slug]
  const average = grades ? weightedAverage(grades) : null

  async function remove() {
    if (!removing) return
    try {
      await deleteGrade(removing.id)
      setRemoving(null)
      load()
    } catch {
      setError('Verwijderen is niet gelukt.')
      setRemoving(null)
    }
  }

  return (
    <div {...accentProps(slug)}>
      <Link to="/cijfers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" /> Alle cijfers
      </Link>
      <PageHeader eyebrow="Cijfers" title={def.name} />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Button variant="accent" onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden="true" /> Cijfer toevoegen
        </Button>
        {all && <YearSelect years={yearsOf(all)} value={year} onChange={setYear} />}
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!grades ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-4">
            <Card className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between gap-2">
                <CardTitle>Gemiddelde</CardTitle>
                <GradeValue value={average} decimals={2} className="font-display text-4xl font-semibold" />
              </div>
              <GradeChart grades={grades} />
            </Card>
            <Card>
              <CardTitle className="mb-3">Cijfers</CardTitle>
              {grades.length === 0 ? (
                <p className="text-sm text-muted">Nog geen cijfers in dit schooljaar.</p>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted">
                        <th scope="col" className="px-2 py-2 font-medium">Omschrijving</th>
                        <th scope="col" className="px-2 py-2 font-medium">Datum</th>
                        <th scope="col" className="px-2 py-2 text-right font-medium">Weging</th>
                        <th scope="col" className="px-2 py-2 text-right font-medium">Cijfer</th>
                        <th scope="col" className="px-2 py-2"><span className="sr-only">Acties</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((g) => (
                        <tr key={g.id} className="border-t border-line">
                          <td className="px-2 py-2">
                            {g.description}
                            {!g.counts && <span className="ml-2 rounded-full bg-surface-2 px-2 text-xs text-muted">telt niet mee</span>}
                            {g.source !== 'manual' && <span className="ml-2 text-xs text-muted">via {sourceLabel(g.source as SourceId).toLowerCase()}</span>}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-muted">{g.graded_on ? new Date(`${g.graded_on}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '–'}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{formatGrade(g.weight, g.weight % 1 ? 1 : 0)}×</td>
                          <td className="px-2 py-2 text-right font-semibold">
                            <GradeValue value={g.grade} />
                          </td>
                          <td className="whitespace-nowrap px-2 py-1 text-right">
                            <button type="button" onClick={() => setEditing(g)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text" aria-label={`${g.description} bewerken`}>
                              <Pencil className="size-4" aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setRemoving(g)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger" aria-label={`${g.description} verwijderen`}>
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
          <div className="flex flex-col gap-4">
            <NeededCard grades={grades} />
            <WhatIfCard grades={grades} />
          </div>
        </div>
      )}

      <GradeDialog open={editing !== null} onClose={() => setEditing(null)} onSaved={load} grade={editing === 'new' ? null : editing} subject={slug} subjectOptions={[slug]} />
      <Dialog open={removing !== null} onClose={() => setRemoving(null)} title="Cijfer verwijderen?">
        <p className="text-sm text-muted">“{removing?.description}” ({formatGrade(removing?.grade ?? null)}) wordt verwijderd.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>Annuleren</Button>
          <Button variant="danger" onClick={remove}>Verwijderen</Button>
        </div>
      </Dialog>
    </div>
  )
}

/** "Wat moet ik halen?" */
export function NeededCard({ grades }: { grades: Grade[] }) {
  const [target, setTarget] = useState('5,5')
  const [weight, setWeight] = useState('1')
  const t = parseGrade(target)
  const w = parseWeight(weight)
  const result = t !== null && w !== null ? neededGrade(grades, t, w) : null

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="flex items-center gap-2">
        <Calculator className="size-5 text-accent" aria-hidden="true" /> Wat moet ik halen?
      </CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gewenst gemiddelde" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        <Field label="Weging volgende toets" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>
      <p aria-live="polite" className="text-sm">
        {t === null || w === null ? (
          <span className="text-muted">Vul een gemiddelde (1–10) en een weging in.</span>
        ) : !result ? null : result.status === 'onhaalbaar' ? (
          <>
            Je zou een <strong>{formatGrade(result.grade)}</strong> nodig hebben; dat is met één toets niet te halen. Probeer een lager doel of kijk wat er na meer toetsen kan.
          </>
        ) : result.status === 'al-gehaald' ? (
          <>Je haalt een {formatGrade(t)} gemiddeld met elk cijfer vanaf een 1,0. Lekker bezig.</>
        ) : (
          <>
            Je hebt minimaal een <strong className="font-display text-2xl text-accent">{formatGrade(Math.ceil(result.grade * 10 - 1e-9) / 10)}</strong> nodig.
          </>
        )}
      </p>
      <p className="text-xs text-muted">Zo gerekend: (doel × (huidige weging + nieuwe weging) − som van cijfer × weging) ÷ nieuwe weging.</p>
    </Card>
  )
}

/** "Wat als …": fictieve cijfers toevoegen zonder iets op te slaan. */
export function WhatIfCard({ grades }: { grades: Grade[] }) {
  const [extra, setExtra] = useState<{ id: number; grade: string; weight: string }[]>([{ id: 1, grade: '', weight: '1' }])
  const parsed = extra.map((e) => ({ grade: parseGrade(e.grade), weight: parseWeight(e.weight) })).filter((e): e is { grade: number; weight: number } => e.grade !== null && e.weight !== null)
  const now = weightedAverage(grades)
  const then = parsed.length ? whatIf(grades, parsed) : null
  const update = (id: number, field: 'grade' | 'weight', v: string) => setExtra((xs) => xs.map((x) => (x.id === id ? { ...x, [field]: v } : x)))

  return (
    <Card className="flex flex-col gap-3">
      <CardTitle className="flex items-center gap-2">
        <FlaskConical className="size-5 text-accent" aria-hidden="true" /> Wat als…
      </CardTitle>
      <p className="text-sm text-muted">Probeer cijfers uit. Er wordt niets opgeslagen.</p>
      <ul className="flex flex-col gap-2">
        {extra.map((e, i) => (
          <li key={e.id} className="flex items-end gap-2">
            <Field label={`Cijfer ${i + 1}`} inputMode="decimal" value={e.grade} onChange={(ev) => update(e.id, 'grade', ev.target.value)} placeholder="7" className="flex-1" />
            <Field label="Weging" inputMode="decimal" value={e.weight} onChange={(ev) => update(e.id, 'weight', ev.target.value)} className="w-24" />
            {extra.length > 1 && (
              <button type="button" onClick={() => setExtra((xs) => xs.filter((x) => x.id !== e.id))} className="mb-2 rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label={`Cijfer ${i + 1} weghalen`}>
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setExtra((xs) => [...xs, { id: Date.now(), grade: '', weight: '1' }])}>
        <Plus className="size-4" aria-hidden="true" /> Nog een cijfer
      </Button>
      <p aria-live="polite" className="text-sm">
        Nu <GradeValue value={now} decimals={2} className="font-semibold" />
        {then !== null && (
          <>
            {' '}→ dan <GradeValue value={then} decimals={2} className="font-display text-2xl font-semibold" />
          </>
        )}
      </p>
    </Card>
  )
}
