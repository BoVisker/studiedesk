import { Pencil, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, EmptyState, Skeleton } from '@/components/ui'
import { archetypeLabels, isSubjectSlug, subjectsBySlug } from '@/config/subjects'
import { accentProps } from '@/design/subjectPalette'
import { fetchLists, type ListWithStats } from '@/features/lists/api'
import { BlockCard } from './BlockCard'
import { BlockEditor } from './BlockEditor'
import { defaultBlocks, type BlockSetting } from './blockSettings'
import { SubjectIcon } from './SubjectIcon'
import { useSubjects } from './SubjectsProvider'

export function SubjectPage() {
  const { slug = '' } = useParams()
  const { chosen, saveBlocks } = useSubjects()
  const [draft, setDraft] = useState<BlockSetting[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null)
  const [lists, setLists] = useState<ListWithStats[] | null>(null)
  const [listsError, setListsError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSubjectSlug(slug)) return
    setLists(null)
    fetchLists(slug)
      .then(setLists)
      .catch(() => setListsError(true))
  }, [slug])

  if (!isSubjectSlug(slug)) return <Navigate to="/vakken" replace />
  const def = subjectsBySlug[slug]
  if (!chosen) return <Skeleton className="h-40" />
  const mine = chosen.find((c) => c.def.slug === slug)

  if (!mine) {
    return (
      <EmptyState title={`${def.name} staat niet in je vakken`} action={<Link to="/vakken/kiezen" className="underline underline-offset-4">Vakken wijzigen</Link>}>
        Voeg het vak toe om de voorpagina te gebruiken.
      </EmptyState>
    )
  }

  const editing = draft !== null
  const visible = mine.blocks.filter((b) => b.enabled)

  // "Begin met leren": eerst wat te herhalen is, anders de meest recente lijst,
  // anders een nieuwe lijst maken.
  function startLearning() {
    const due = (lists ?? []).reduce((n, l) => n + l.due_count, 0)
    if (due > 0) return navigate(`/herhalen?vak=${slug}`)
    const recent = (lists ?? []).find((l) => l.item_count > 0)
    if (recent) return navigate(`/lijsten/${recent.id}/leren?modus=flashcards`)
    setMsg({ tone: 'info', text: 'Je hebt nog geen lijsten voor dit vak. Maak er eerst een via “Nieuwe lijst”.' })
  }

  async function save() {
    setBusy(true)
    const err = await saveBlocks(slug as typeof def.slug, draft!)
    setBusy(false)
    if (err) return setMsg({ tone: 'error', text: err })
    setDraft(null)
    setMsg({ tone: 'success', text: 'Voorpagina opgeslagen.' })
  }

  return (
    <div {...accentProps(def.slug)}>
      <header className="rise-in mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent">
            <SubjectIcon name={def.icon} className="size-7" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-accent">{def.focus ?? archetypeLabels[def.archetype]}</p>
            <h1 className="font-display text-3xl font-semibold md:text-4xl">{def.name}</h1>
          </div>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <Button variant="accent" onClick={startLearning}>
              <Play className="size-4" aria-hidden="true" /> Begin met leren
            </Button>
            <Button variant="outline" onClick={() => { setMsg(null); setDraft(mine.blocks) }}>
              <Pencil className="size-4" aria-hidden="true" /> Aanpassen
            </Button>
          </div>
        )}
      </header>

      {msg && <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert>}

      {editing ? (
        <section aria-labelledby="aanpassen-titel" className="flex flex-col gap-4">
          <div>
            <h2 id="aanpassen-titel" className="font-display text-xl font-semibold">Voorpagina aanpassen</h2>
            <p className="text-sm text-muted">Sleep om de volgorde te wijzigen, zet blokken aan of uit en geef ze een eigen naam.</p>
          </div>
          <BlockEditor blocks={draft} onChange={setDraft} />
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={save} loading={busy}>Opslaan</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>Annuleren</Button>
            <Button variant="ghost" className="ml-auto" onClick={() => setDraft(defaultBlocks(def))}>
              <RotateCcw className="size-4" aria-hidden="true" /> Standaard herstellen
            </Button>
          </div>
        </section>
      ) : visible.length === 0 ? (
        <EmptyState title="Alle blokken staan uit">Kies “Aanpassen” om blokken weer aan te zetten.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((b) => (
            <BlockCard key={b.id} block={b} ctx={{ slug: def.slug, lists, error: listsError }} />
          ))}
        </div>
      )}
    </div>
  )
}
