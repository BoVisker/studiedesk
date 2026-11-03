import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Dialog, EmptyState, Field, Skeleton } from '@/components/ui'
import { isSubjectSlug, subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { saveList } from '@/features/lists/api'
import { deleteNote, fetchNote, updateNoteMeta } from './api'
import { SummaryView, WorkedView } from './NoteViews'
import { lengthLabels, noteKindLabels, type NoteRow, type SummaryContent, type SummaryLength, type WorkedContent } from './types'

export function NotePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState<NoteRow | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetchNote(id)
      .then(setNote)
      .catch(() => setError('Kon deze notitie niet laden.'))
  }, [id])

  if (error && note === undefined) return <Alert tone="error">{error}</Alert>
  if (note === undefined) return <Skeleton className="h-64" />
  if (note === null) return <EmptyState title="Niet gevonden">Deze samenvatting of uitwerking bestaat niet (meer).</EmptyState>

  const subject = (isSubjectSlug(note.subject) ? note.subject : 'biologie') as SubjectSlug
  const meta = [noteKindLabels[note.kind].name, note.length ? lengthLabels[note.length as SummaryLength] : null, note.chapter].filter(Boolean).join(' · ')

  async function saveMeta() {
    if (!title.trim()) return
    setBusy(true)
    try {
      await updateNoteMeta(id, { title: title.trim(), chapter: chapter.trim() || null })
      setNote((n) => n && { ...n, title: title.trim(), chapter: chapter.trim() || null })
      setEditing(false)
    } catch {
      setError('Opslaan is niet gelukt.')
    }
    setBusy(false)
  }

  async function remove() {
    setBusy(true)
    try {
      await deleteNote(id)
      navigate(`/vakken/${subject}`, { replace: true })
    } catch {
      setBusy(false)
      setConfirmDelete(false)
      setError('Verwijderen is niet gelukt.')
    }
  }

  async function makeList() {
    const c = note!.content as unknown as SummaryContent
    setBusy(true)
    setError(null)
    try {
      const listId = await saveList(
        { subject, title: `${note!.title} – begrippen`.slice(0, 120), chapter: note!.chapter, kind: 'begrippen', term_lang: null, definition_lang: null },
        c.kernbegrippen.map((b) => ({ term: b.term, definition: b.uitleg })),
      )
      navigate(`/lijsten/${listId}`)
    } catch {
      setBusy(false)
      setError('De begrippenlijst kon niet worden gemaakt.')
    }
  }

  return (
    <div {...accentProps(subject)}>
      <Link to={`/vakken/${subject}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" aria-hidden="true" /> {subjectsBySlug[subject].name}
      </Link>
      <PageHeader eyebrow={meta} title={note.title} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setTitle(note.title); setChapter(note.chapter ?? ''); setEditing(true) }}>
          <Pencil className="size-4" aria-hidden="true" /> Naam wijzigen
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="size-4" aria-hidden="true" /> Verwijderen
        </Button>
      </div>
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {note.kind === 'samenvatting' ? (
        <SummaryView content={note.content as unknown as SummaryContent} onMakeList={makeList} makingList={busy} />
      ) : (
        <WorkedView content={note.content as unknown as WorkedContent} />
      )}

      <Dialog open={editing} onClose={() => setEditing(false)} title="Naam wijzigen">
        <Field label="Titel" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Field label="Hoofdstuk of paragraaf" maxLength={60} value={chapter} onChange={(e) => setChapter(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(false)}>Annuleren</Button>
          <Button variant="accent" onClick={saveMeta} loading={busy} disabled={!title.trim()}>Opslaan</Button>
        </div>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`${noteKindLabels[note.kind].name} verwijderen?`}>
        <p className="text-sm text-muted">“{note.title}” wordt definitief verwijderd. Lijsten die je ervan hebt gemaakt blijven bestaan.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Annuleren</Button>
          <Button variant="danger" onClick={remove} loading={busy}>Verwijderen</Button>
        </div>
      </Dialog>
    </div>
  )
}
