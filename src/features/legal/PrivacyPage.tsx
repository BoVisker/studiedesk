import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui'

export function PrivacyPage() {
  const { session } = useAuth()
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {!session && (
        <Link to="/inloggen" className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-text">
          <ArrowLeft className="size-4" aria-hidden="true" /> Terug
        </Link>
      )}
      <PageHeader eyebrow="Privacy" title="Wat StudieDesk bewaart">
        Kort en eerlijk. Laatst bijgewerkt: november 2026.
      </PageHeader>
      <Card className="flex flex-col gap-5 leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold">
        <section>
          <h2>Wat we bewaren</h2>
          <p>Je e-mailadres, je weergavenaam en instellingen, en wat je zelf invoert: vakken, lijsten, samenvattingen, toetsen en cijfers. Foto’s die je uploadt worden privé opgeslagen en standaard verwijderd zodra ze verwerkt zijn.</p>
        </section>
        <section>
          <h2>Wat we níét doen</h2>
          <p>Geen advertenties, geen tracking, geen analytics van derden. Lettertypes worden vanaf deze site geladen, niet van Google. We vragen nooit om je Magister-wachtwoord.</p>
        </section>
        <section>
          <h2>AI-functies</h2>
          <p>Als je een foto laat verwerken, een samenvatting maakt of een screenshot van je cijfers importeert, sturen we die afbeelding naar een AI-dienst (Anthropic) om het resultaat te maken. Dat gebeurt alleen als jij op de knop drukt.</p>
        </section>
        <section>
          <h2>Waar het staat</h2>
          <p>Je gegevens staan in een database van Supabase in de EU. Andere gebruikers kunnen jouw gegevens niet zien; dat wordt per rij in de database afgedwongen.</p>
        </section>
        <section>
          <h2>Jouw rechten</h2>
          <p>Op je profielpagina kun je al je gegevens downloaden (JSON) en je account met alle gegevens en foto’s definitief verwijderen. Ben je jonger dan 16? Bespreek het gebruik dan met een ouder of verzorger.</p>
        </section>
      </Card>
    </div>
  )
}
