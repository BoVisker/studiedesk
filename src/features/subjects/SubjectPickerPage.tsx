import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, cx, Skeleton } from '@/components/ui'
import { archetypeLabels, subjects, type Archetype } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { SubjectIcon } from './SubjectIcon'
import { useSubjects } from './SubjectsProvider'

const groups = Object.keys(archetypeLabels) as Archetype[]

export function SubjectPickerPage() {
  const { chosen, saveSelection } = useSubjects()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const onboarding = params.has('start')
  const [selected, setSelected] = useState<Set<SubjectSlug> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (chosen && !selected) setSelected(new Set(chosen.map((c) => c.def.slug)))
  }, [chosen, selected])

  if (!selected) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const toggle = (slug: SubjectSlug) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  const removedCount = (chosen ?? []).filter((c) => !selected.has(c.def.slug)).length

  async function save() {
    setBusy(true)
    setError(null)
    // Bewaar in de vaste volgorde van de config.
    const err = await saveSelection(subjects.filter((s) => selected!.has(s.slug)).map((s) => s.slug))
    setBusy(false)
    if (err) return setError(err)
    navigate('/vakken')
  }

  return (
    <>
      <PageHeader eyebrow={onboarding ? 'Welkom' : 'Vakken'} title={onboarding ? 'Welke vakken heb je?' : 'Vakken kiezen'}>
        Kies de vakken in je profiel. Je kunt dit later altijd aanpassen.
      </PageHeader>

      <div className="flex flex-col gap-8 pb-24">
        {groups.map((g) => (
          <section key={g} aria-labelledby={`groep-${g}`}>
            <h2 id={`groep-${g}`} className="mb-3 text-sm uppercase tracking-[0.14em] text-muted">
              {archetypeLabels[g]}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {subjects
                .filter((s) => s.archetype === g)
                .map((s) => {
                  const on = selected.has(s.slug)
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(s.slug)}
                      {...accentProps(
                        s.slug,
                        cx(
                          'group relative flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition',
                          on ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:border-accent/60',
                        ),
                      )}
                    >
                      <span className={cx('grid size-9 shrink-0 place-items-center rounded-lg transition', on ? 'bg-accent text-on-accent' : 'bg-surface-2 text-accent')}>
                        <SubjectIcon name={s.icon} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{s.name}</span>
                        {s.focus && <span className="block truncate text-xs text-muted">{s.focus}</span>}
                      </span>
                      {on && <Check className="absolute right-2 top-2 size-4 text-accent" aria-hidden="true" />}
                    </button>
                  )
                })}
            </div>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted" aria-live="polite">
            {selected.size === 0 ? 'Nog geen vakken gekozen' : `${selected.size} ${selected.size === 1 ? 'vak' : 'vakken'} gekozen`}
            {removedCount > 0 && ` · ${removedCount} weggehaald (blokinstellingen van die vakken vervallen)`}
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          {!onboarding && (
            <Button variant="ghost" onClick={() => navigate('/vakken')}>
              Annuleren
            </Button>
          )}
          <Button onClick={save} loading={busy} disabled={selected.size === 0}>
            Opslaan
          </Button>
        </div>
      </div>
    </>
  )
}
