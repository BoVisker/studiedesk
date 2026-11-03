import { CalendarPlus, CheckCircle2, Circle, Pencil, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, CardTitle, cx, EmptyState, Select, Skeleton } from '@/components/ui'
import { subjectsBySlug } from '@/config/subjects'
import { accentProps } from '@/design/subjectPalette'
import { countDue } from '@/features/lists/api'
import { SubjectIcon } from '@/features/subjects/SubjectIcon'
import { deleteTest, fetchCheckoffs, fetchTests, setCheckoff, type TestRow } from './api'
import { buildPlan, daysBetween, isoDate, momentsOn, type Moment, type PlanTest } from './planner'
import { TestDialog } from './TestDialog'

const MAX_KEY = 'studiedesk-plan-maxperday'
const today = () => isoDate(new Date())

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

/** "vandaag", "morgen", "over 3 dagen". */
function relative(iso: string): string {
  const d = daysBetween(today(), iso)
  if (d <= 0) return 'vandaag'
  if (d === 1) return 'morgen'
  if (d < 14) return `over ${d} dagen`
  return `over ${Math.round(d / 7)} weken`
}

export function PlannerPage() {
  const [tests, setTests] = useState<TestRow[] | null>(null)
  const [checkoffs, setCheckoffs] = useState<Set<string>>(new Set())
  const [due, setDue] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TestRow | null | 'new'>(null)
  const [removing, setRemoving] = useState<TestRow | null>(null)
  const [maxPerDay, setMaxPerDay] = useState(() => {
    try {
      return Number(localStorage.getItem(MAX_KEY)) || 3
    } catch {
      return 3
    }
  })

  const load = useCallback(() => {
    Promise.all([fetchTests(), fetchCheckoffs(), countDue().catch(() => 0)])
      .then(([t, c, d]) => {
        setTests(t)
        setCheckoffs(c)
        setDue(d)
      })
      .catch(() => setError('Kon de planner niet laden.'))
  }, [])
  useEffect(load, [load])

  useEffect(() => {
    try {
      localStorage.setItem(MAX_KEY, String(maxPerDay))
    } catch {
      /* geen opslag: niet erg */
    }
  }, [maxPerDay])

  const planTests: PlanTest[] = useMemo(() => (tests ?? []).map((t) => ({ id: t.id, subject: t.subject as PlanTest['subject'], title: t.title, test_date: t.test_date, effort: t.effort })), [tests])
  const plan = useMemo(() => buildPlan(planTests, { today: today(), maxPerDay, isDone: (k) => checkoffs.has(k) }), [planTests, maxPerDay, checkoffs])
  const todaysMoments = momentsOn(plan, today())
  const upcoming = (tests ?? []).filter((t) => daysBetween(today(), t.test_date) >= 0)

  async function toggle(m: Moment) {
    const next = new Set(checkoffs)
    next.has(m.key) ? next.delete(m.key) : next.add(m.key)
    setCheckoffs(next)
    try {
      await setCheckoff(m.key, next.has(m.key))
    } catch {
      setError('Kon het afvinken niet opslaan.')
      load()
    }
  }

  async function remove() {
    if (!removing) return
    try {
      await deleteTest(removing.id)
      setRemoving(null)
      load()
    } catch {
      setError('Verwijderen is niet gelukt.')
      setRemoving(null)
    }
  }

  const todayDone = todaysMoments.filter((m) => m.done).length
  const allTodayDone = todaysMoments.length > 0 && todayDone === todaysMoments.length

  return (
    <div>
      <PageHeader eyebrow="Planner" title="Je toetsplanner">
        Zet je toetsen erin; de planner verdeelt je leermomenten over de dagen ervoor. Je ziet precies waarom: je leert gespreid, met de laatste keer vlak voor de toets.
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Button variant="accent" onClick={() => setEditing('new')}>
          <CalendarPlus className="size-4" aria-hidden="true" /> Toets toevoegen
        </Button>
        <Select
          label="Max. leermomenten per dag"
          value={String(maxPerDay)}
          onChange={(e) => setMaxPerDay(Number(e.target.value))}
          options={[2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          className="w-52"
        />
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      {!tests && !error && <Skeleton className="h-64" />}

      {tests && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-6">
            {/* Vandaag */}
            <Card className="flex flex-col gap-3">
              <CardTitle>Vandaag</CardTitle>
              {todaysMoments.length === 0 && due === 0 ? (
                <p className="text-sm text-muted">Niets ingepland voor vandaag. Lekker vrij, of werk alvast vooruit.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {todaysMoments.map((m) => {
                    const def = subjectsBySlug[m.subject]
                    return (
                      <li key={m.key} {...accentProps(m.subject)}>
                        <button type="button" onClick={() => toggle(m)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2" aria-pressed={m.done}>
                          {m.done ? <CheckCircle2 className="size-5 shrink-0 text-accent" aria-hidden="true" /> : <Circle className="size-5 shrink-0 text-muted" aria-hidden="true" />}
                          <span className={cx('min-w-0 flex-1', m.done && 'text-muted line-through')}>
                            <span className="font-medium">{def.name}</span>: {m.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted">{m.daysBefore === 1 ? 'toets morgen' : `toets over ${m.daysBefore} d`}</span>
                        </button>
                      </li>
                    )
                  })}
                  {due > 0 && (
                    <li>
                      <Link to="/herhalen" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                        <RotateCcw className="size-5 shrink-0 text-accent" aria-hidden="true" />
                        <span className="min-w-0 flex-1 font-medium">{due} {due === 1 ? 'woord/begrip' : 'woorden/begrippen'} herhalen</span>
                        <span className="shrink-0 text-xs text-muted">spaced repetition</span>
                      </Link>
                    </li>
                  )}
                </ul>
              )}
              {allTodayDone && due === 0 && (
                <p className="inline-flex items-center gap-2 text-sm text-accent">
                  <Sparkles className="size-4" aria-hidden="true" /> Alles van vandaag gedaan. Netjes!
                </p>
              )}
            </Card>

            {/* Komende toetsen */}
            <Card className="flex flex-col gap-3">
              <CardTitle>Komende toetsen</CardTitle>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted">Nog geen toetsen. Voeg er een toe om een leerplan te krijgen.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {upcoming.map((t) => {
                    const slug = t.subject as PlanTest['subject']
                    const def = subjectsBySlug[slug]
                    return (
                      <li key={t.id} {...accentProps(slug)} className={cx(accentProps(slug).className, 'flex items-center gap-3 py-2')}>
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-on-accent">
                          <SubjectIcon name={def.icon} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.title}</span>
                          <span className="text-sm text-muted">{def.name} · {fmtDay(t.test_date)} · {relative(t.test_date)}</span>
                        </span>
                        <button type="button" onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-text" aria-label={`${t.title} bewerken`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setRemoving(t)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-danger" aria-label={`${t.title} verwijderen`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Leerplan */}
          <Card className="flex flex-col gap-3">
            <CardTitle>Leerplan</CardTitle>
            {plan.length === 0 ? (
              <EmptyState title="Nog niets te plannen">Zodra je een toets toevoegt, verschijnt hier je leerplan per dag.</EmptyState>
            ) : (
              <ol className="flex flex-col gap-3">
                {plan.map((day) => (
                  <li key={day.date} className={cx('rounded-xl border p-3', day.date === today() ? 'border-accent' : 'border-line')}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium">
                        {fmtDay(day.date)} {day.date === today() && <span className="text-accent">· vandaag</span>}
                      </p>
                      {day.busy && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">drukke dag</span>}
                    </div>
                    <ul className="flex flex-col gap-1">
                      {day.moments.map((m) => (
                        <li key={m.key} {...accentProps(m.subject)} className={cx(accentProps(m.subject).className, 'flex items-center gap-2 text-sm')}>
                          <span className="size-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                          <span className={cx('min-w-0 flex-1 truncate', m.done && 'text-muted line-through')}>
                            <span className="font-medium">{subjectsBySlug[m.subject].name}</span>: {m.title}
                          </span>
                          <span className="shrink-0 text-xs text-muted">{m.daysBefore === 1 ? 'dag vóór toets' : `${m.daysBefore} d vóór toets`}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-muted">Het plan past zich vanzelf aan als je een toets toevoegt, verwijdert of als er een dag voorbij is. Afgevinkte momenten blijven staan.</p>
          </Card>
        </div>
      )}

      <TestDialog open={editing !== null} onClose={() => setEditing(null)} onSaved={load} test={editing === 'new' ? null : editing} />
      {removing && (
        <Alert tone="info" className="fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-md items-center justify-between gap-3 shadow-paper">
          <span>“{removing.title}” verwijderen?</span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>Nee</Button>
            <Button size="sm" variant="danger" onClick={remove}>Verwijderen</Button>
          </span>
        </Alert>
      )}
    </div>
  )
}
