import { BookOpen, CalendarDays, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardTitle, EmptyState } from '@/components/ui'

function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 6 ? 'Goedenacht' : h < 12 ? 'Goedemorgen' : h < 18 ? 'Goedemiddag' : 'Goedenavond'
}

export function HomePage() {
  const { profile } = useAuth()
  const today = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

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
          <CardTitle className="mb-2">Je vakken</CardTitle>
          <p className="mb-4 text-sm text-muted">Kies je vakken om per vak lijsten, samenvattingen en toetsen bij te houden.</p>
          <Link to="/vakken" className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
            <BookOpen className="size-4" aria-hidden="true" /> Naar vakken
          </Link>
        </Card>
        <Card className="rise-in">
          <CardTitle className="mb-2">Te herhalen</CardTitle>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sparkles className="size-4" aria-hidden="true" /> Nog geen woordenlijsten. Die komen in een volgende versie.
          </p>
        </Card>
      </div>
    </>
  )
}
