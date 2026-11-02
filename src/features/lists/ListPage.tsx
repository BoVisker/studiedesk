import { BookOpenCheck, Keyboard, Layers, ListChecks, Pencil, RotateCcw, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, Button, buttonClass, Card, Dialog, EmptyState, Skeleton } from '@/components/ui'
import { subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { canSpeak, speak } from '@/features/study/speech'
import { boxLabel, isDue, MAX_BOX } from '@/features/study/srs'
import { deleteList, fetchList, kindLabels, type ItemRow, type ListRow } from './api'

export const modes = [
  { id: 'flashcards', label: 'Flashcards', Icon: Layers, hint: 'Omdraaien en zelf beoordelen' },
  { id: 'typen', label: 'Typen', Icon: Keyboard, hint: 'Overhoren met typen' },
  { id: 'meerkeuze', label: 'Meerkeuze', Icon: ListChecks, hint: 'Kies uit vier antwoorden' },
  { id: 'toets', label: 'Toets', Icon: BookOpenCheck, hint: 'Mix van vragen, met cijfer' },
] as const

export function ListPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<{ list: ListRow; items: ItemRow[] } | null | undefined>(undefined)
  const [error, setError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchList(id).then(setData).catch(() => setError(true))
  }, [id])

  if (error) return <Alert tone="error">Kon de lijst niet laden. Controleer je verbinding.</Alert>
  if (data === undefined) return <Skeleton className="h-64" />
  if (data === null) return <EmptyState title="Lijst niet gevonden">Misschien is hij verwijderd.</EmptyState>

  const { list, items } = data
  const subject = subjectsBySlug[list.subject as SubjectSlug]
  const labels = kindLabels[list.kind]
  const due = items.filter((i) => isDue(i)).length
  const mastered = items.filter((i) => i.srs_box >= MAX_BOX).length
  const learning = items.filter((i) => i.srs_box > 0 && i.srs_box < MAX_BOX).length
  const fresh = items.length - mastered - learning

  async function remove() {
    setDeleting(true)
    try {
      await deleteList(list.id)
      navigate(`/vakken/${list.subject}`, { replace: true })
    } catch {
      setDeleting(false)
      setError(true)
    }
  }

  return (
    <div {...accentProps(list.subject as SubjectSlug)}>
      <header className="rise-in mb-6 flex flex-col gap-2">
        <Link to={`/vakken/${list.subject}`} className="text-sm uppercase tracking-[0.14em] text-accent hover:underline">
          {subject?.name ?? list.subject}
          {list.chapter && ` · ${list.chapter}`}
        </Link>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{list.title}</h1>
        <p className="text-muted">
          {labels.name} · {items.length} {items.length === 1 ? 'regel' : 'regels'}
        </p>
      </header>

      {items.length > 0 && (
        <Card className="mb-4 flex flex-col gap-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${mastered} beheerst, ${learning} bezig, ${fresh} nieuw`}>
            <div className="bg-accent" style={{ width: `${(mastered / items.length) * 100}%` }} />
            <div className="bg-accent/45" style={{ width: `${(learning / items.length) * 100}%` }} />
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div><dt className="inline text-muted">Beheerst </dt><dd className="inline font-semibold">{mastered}</dd></div>
            <div><dt className="inline text-muted">Bezig </dt><dd className="inline font-semibold">{learning}</dd></div>
            <div><dt className="inline text-muted">Nieuw </dt><dd className="inline font-semibold">{fresh}</dd></div>
            <div><dt className="inline text-muted">Vandaag herhalen </dt><dd className="inline font-semibold">{due}</dd></div>
          </dl>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState title="Deze lijst is nog leeg" action={<Link to={`/lijsten/${list.id}/bewerken`} className={buttonClass('accent')}>Regels toevoegen</Link>} />
      ) : (
        <>
          {due > 0 && (
            <Link to={`/lijsten/${list.id}/leren?modus=typen&alleen=herhalen`} className={buttonClass('accent', 'md', 'mb-4 w-full sm:w-auto')}>
              <RotateCcw className="size-4" aria-hidden="true" /> {due} te herhalen
            </Link>
          )}
          <nav aria-label="Leervormen" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {modes.map(({ id: m, label, Icon, hint }) => (
              <Link
                key={m}
                to={`/lijsten/${list.id}/leren?modus=${m}`}
                className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-paper transition hover:-translate-y-0.5 hover:border-accent"
              >
                <Icon className="size-6 text-accent" aria-hidden="true" />
                <span className="font-semibold">{label}</span>
                <span className="text-xs text-muted">{hint}</span>
              </Link>
            ))}
          </nav>

          <Card className="p-0">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Inhoud van de lijst</caption>
              <thead className="border-b border-line text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">{labels.term}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{labels.definition}</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1">
                        {it.term}
                        {canSpeak() && list.term_lang && (
                          <button type="button" onClick={() => speak(it.term, list.term_lang)} className="rounded p-1 text-muted hover:text-text" aria-label={`Spreek ${it.term} uit`}>
                            <Volume2 className="size-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted">{it.definition}</td>
                    <td className="hidden px-4 py-2 text-muted sm:table-cell">{boxLabel(it.srs_box)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to={`/lijsten/${list.id}/bewerken`} className={buttonClass('outline')}>
          <Pencil className="size-4" aria-hidden="true" /> Bewerken
        </Link>
        <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" aria-hidden="true" /> Verwijderen
        </Button>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Lijst verwijderen?">
        <p className="text-sm text-muted">“{list.title}” en je voortgang ermee worden verwijderd. Dit kan niet ongedaan worden gemaakt.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Annuleren</Button>
          <Button variant="danger" loading={deleting} onClick={remove}>Verwijderen</Button>
        </div>
      </Dialog>
    </div>
  )
}
