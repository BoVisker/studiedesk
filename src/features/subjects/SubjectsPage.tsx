import { Settings2 } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, buttonClass, Skeleton } from '@/components/ui'
import { archetypeLabels } from '@/config/subjects'
import { accentProps } from '@/design/subjectPalette'
import { SubjectIcon } from './SubjectIcon'
import { useSubjects } from './SubjectsProvider'

export function SubjectsPage() {
  const { chosen, error } = useSubjects()

  if (!chosen) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }
  if (!error && chosen.length === 0) return <Navigate to="/vakken/kiezen?start" replace />

  return (
    <>
      <PageHeader eyebrow="Vakken" title="Jouw vakken">
        Open een vak voor lijsten, samenvattingen en toetsen.
      </PageHeader>
      {error && <Alert tone="error" className="mb-4">Kon je vakken niet laden. Controleer je verbinding.</Alert>}

      <ul className="grid gap-3 sm:grid-cols-2">
        {chosen.map(({ def }, i) => (
          <li key={def.slug} className="rise-in" style={{ animationDelay: `${i * 30}ms` }}>
            <Link
              to={`/vakken/${def.slug}`}
              {...accentProps(def.slug, 'group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-paper transition hover:-translate-y-0.5 hover:border-accent/60')}
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-on-accent">
                <SubjectIcon name={def.icon} className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold">{def.name}</span>
                <span className="block truncate text-sm text-muted">{def.focus ?? archetypeLabels[def.archetype]}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link to="/vakken/kiezen" className={buttonClass('outline')}>
          <Settings2 className="size-4" aria-hidden="true" /> Vakken wijzigen
        </Link>
      </div>
    </>
  )
}
