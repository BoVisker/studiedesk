import { BookOpen, CalendarDays, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { buttonClass, Card, CardTitle, EmptyState, Skeleton } from '@/components/ui'
import { countDue } from '@/features/lists/api'
import { accentProps } from '@/design/subjectPalette'
import { SubjectIcon } from '@/features/subjects/SubjectIcon'
import { useSubjects } from '@/features/subjects/SubjectsProvider'

function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'
}

export function HomePage() {
  const { profile } = useAuth()
  const { chosen, error } = useSubjects()
  const [due, setDue] = useState<number | null>(null)

  useEffect(() => {
    countDue().then(setDue).catch(() => setDue(null))
  }, [])
  const today = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  // Eerste keer: eerst vakken kiezen.
  if (chosen && !error && chosen.length === 0) return <Navigate to="/vakken/kiezen?start" replace />

  return (
    <>
      <PageHeader eyebrow={today} title={`${greeting()}${profile?.display_name ? `, ${profile.display_name}` : ''}`}>
        Hier verschijnt straks wat je vandaag te doen hebt.
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rise-in md:col-span-2">
          <CardTitle className="mb-4">Vandaag</CardTitle>
          <EmptyState icon={<CalendarDays className="size-8" />} title="Nog niets gepland">
            Zodra je toetsen toevoegt, verdeelt de planner de stof over de dagen ervoor.
          </EmptyState>
        </Card>
        <Card className="rise-in">
          <CardTitle className="mb-3">Je vakken</CardTitle>
          {!chosen ? (
            <Skeleton className="h-16" />
          ) : (
            <ul className="mb-4 flex flex-wrap gap-2">
              {chosen.map(({ def }) => (
                <li key={def.slug}>
                  <Link
                    to={`/vakken/${def.slug}`}
                    {...accentProps(def.slug, 'inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm transition hover:border-accent')}
                  >
                    <span className="text-accent">
                      <SubjectIcon name={def.icon} className="size-4" />
                    </span>
                    {def.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link to="/vakken" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
            <BookOpen className="size-4" aria-hidden="true" /> Alle vakken
          </Link>
        </Card>
        <Card className="rise-in">
          <CardTitle className="mb-2">Te herhalen</CardTitle>
          {due === null ? (
            <Skeleton className="h-10" />
          ) : due === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Sparkles className="size-4" aria-hidden="true" /> Niets te herhalen vandaag. Open een vak om een lijst te maken of te leren.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p>
                <span className="font-display text-3xl font-semibold">{due}</span>
                <span className="text-muted"> {due === 1 ? 'item' : 'items'} klaar om te herhalen</span>
              </p>
              <Link to="/herhalen" className={buttonClass('primary', 'sm', 'self-start')}>
                <RotateCcw className="size-4" aria-hidden="true" /> Herhalen
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
