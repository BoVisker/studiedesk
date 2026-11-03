import { FileImage, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, buttonClass, Card, EmptyState, Skeleton } from '@/components/ui'
import { subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { SubjectIcon } from '@/features/subjects/SubjectIcon'
import { useSubjects } from '@/features/subjects/SubjectsProvider'
import { fetchGrades, type Grade } from './api'
import { schoolYear, weightedAverage } from './calc'
import { GradeDialog } from './GradeDialog'
import { GradeValue, inYear, YearSelect, yearsOf } from './GradeBits'

export function GradesPage() {
  const { chosen } = useSubjects()
  const [grades, setGrades] = useState<Grade[] | null>(null)
  const [error, setError] = useState(false)
  const [year, setYear] = useState(schoolYear(new Date()))
  const [adding, setAdding] = useState(false)
  const imported = (useLocation().state as { imported?: number } | null)?.imported

  const load = useCallback(() => {
    fetchGrades()
      .then(setGrades)
      .catch(() => setError(true))
  }, [])
  useEffect(load, [load])

  const rows = useMemo(() => {
    if (!grades || !chosen) return null
    const mine = chosen.map((c) => c.def.slug)
    // Vakken met cijfers die (nu) niet gekozen zijn, tonen we ook.
    const withGrades = [...new Set(grades.filter((g) => inYear(g, year)).map((g) => g.subject as SubjectSlug))]
    const slugs = [...mine, ...withGrades.filter((s) => !mine.includes(s) && s in subjectsBySlug)]
    return slugs.map((slug) => {
      const gs = grades.filter((g) => g.subject === slug && inYear(g, year))
      return { slug, count: gs.length, average: weightedAverage(gs) }
    })
  }, [grades, chosen, year])

  const averages = rows?.map((r) => r.average).filter((a): a is number => a !== null) ?? []
  const overall = averages.length ? averages.reduce((a, b) => a + b, 0) / averages.length : null

  return (
    <div>
      <PageHeader eyebrow="Cijfers" title="Je cijfers">
        Gewogen gemiddelden per vak. Er staan bewust geen overgangsregels in: je ziet alleen je eigen cijfers.
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Button variant="accent" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" /> Cijfer toevoegen
        </Button>
        <Link to="/cijfers/importeren" className={buttonClass('outline')}>
          <FileImage className="size-4" aria-hidden="true" /> Importeren uit screenshot
        </Link>
        {grades && <YearSelect years={yearsOf(grades)} value={year} onChange={setYear} />}
      </div>

      {imported !== undefined && (
        <Alert tone="success" className="mb-4">
          {imported === 0 ? 'Er waren geen nieuwe cijfers; alles stond er al in.' : `${imported} ${imported === 1 ? 'cijfer' : 'cijfers'} geïmporteerd.`}
        </Alert>
      )}
      {error && <Alert tone="error">Kon je cijfers niet laden.</Alert>}
      {!rows && !error && <Skeleton className="h-48" />}

      {rows && rows.length === 0 && (
        <EmptyState title="Nog geen vakken" action={<Link to="/vakken/kiezen" className="underline underline-offset-4">Vakken kiezen</Link>}>
          Kies eerst je vakken.
        </EmptyState>
      )}

      {rows && rows.length > 0 && (
        <>
          {overall !== null && (
            <p className="mb-4 text-muted">
              Gemiddelde van je vakgemiddelden: <GradeValue value={overall} className="font-semibold text-text" />
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
              const def = subjectsBySlug[r.slug]
              return (
                <li key={r.slug} {...accentProps(r.slug)}>
                  <Link to={`/cijfers/${r.slug}`} className="block h-full rounded-2xl focus-visible:outline-offset-4">
                    <Card className="flex h-full items-center gap-4 border-l-4 border-l-accent transition hover:bg-surface-2">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-on-accent">
                        <SubjectIcon name={def.icon} className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{def.name}</span>
                        <span className="text-sm text-muted">{r.count === 0 ? 'Nog geen cijfers' : `${r.count} ${r.count === 1 ? 'cijfer' : 'cijfers'}`}</span>
                      </span>
                      <GradeValue value={r.average} className="font-display text-3xl font-semibold" />
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <GradeDialog open={adding} onClose={() => setAdding(false)} onSaved={load} subjectOptions={chosen?.map((c) => c.def.slug)} />
    </div>
  )
}
