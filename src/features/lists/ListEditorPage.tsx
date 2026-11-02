import { ArrowLeftRight, ClipboardPaste, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, Field, Select, Skeleton } from '@/components/ui'
import { isSubjectSlug, subjects, subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { defaultKind, defaultLangs, fetchList, kindLabels, saveList, type EditableItem, type ListKind } from './api'
import { PasteImportDialog } from './PasteImportDialog'

const LANGS = [
  { value: '', label: 'Niet voorlezen' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'en', label: 'Engels' },
  { value: 'fr', label: 'Frans' },
  { value: 'de', label: 'Duits' },
  { value: 'es', label: 'Spaans' },
  { value: 'la', label: 'Latijn' },
  { value: 'el', label: 'Grieks' },
]

type Row = EditableItem & { key: string }
let keySeq = 0
const newRow = (it: Partial<EditableItem> = {}): Row => ({ key: `r${keySeq++}`, term: '', definition: '', ...it })

export function ListEditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialSubject = (isSubjectSlug(params.get('vak') ?? '') ? params.get('vak') : 'engels') as SubjectSlug
  const [loading, setLoading] = useState(!!id)
  const [subject, setSubject] = useState<SubjectSlug>(initialSubject)
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const kindParam = params.get('soort')
  const [kind, setKind] = useState<ListKind>(
    kindParam === 'woorden' || kindParam === 'begrippen' || kindParam === 'formules' ? kindParam : defaultKind(subjectsBySlug[initialSubject].archetype),
  )
  const [termLang, setTermLang] = useState(defaultLangs[initialSubject]?.[0] ?? '')
  const [defLang, setDefLang] = useState(defaultLangs[initialSubject]?.[1] ?? '')
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastTermRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    fetchList(id)
      .then((r) => {
        if (!r) return navigate('/vakken', { replace: true })
        const l = r.list
        setSubject(l.subject as SubjectSlug)
        setTitle(l.title)
        setChapter(l.chapter ?? '')
        setKind(l.kind)
        setTermLang(l.term_lang ?? '')
        setDefLang(l.definition_lang ?? '')
        setRows(r.items.length ? r.items.map((it) => newRow(it)) : [newRow()])
      })
      .catch(() => setError('Kon de lijst niet laden. Controleer je verbinding.'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const labels = kindLabels[kind]
  const filled = rows.filter((r) => r.term.trim() && r.definition.trim())
  const half = rows.filter((r) => !!r.term.trim() !== !!r.definition.trim()).length

  const changeSubject = (s: SubjectSlug) => {
    setSubject(s)
    if (!id) {
      setKind(defaultKind(subjectsBySlug[s].archetype))
      setTermLang(defaultLangs[s]?.[0] ?? '')
      setDefLang(defaultLangs[s]?.[1] ?? '')
    }
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const addRow = () => {
    setRows((rs) => [...rs, newRow()])
    setTimeout(() => lastTermRef.current?.focus(), 0)
  }
  const swapColumns = () => {
    setRows((rs) => rs.map((r) => ({ ...r, term: r.definition, definition: r.term })))
    setTermLang(defLang)
    setDefLang(termLang)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Geef de lijst een titel.')
    if (!filled.length) return setError(`Vul minstens één ${labels.term.toLowerCase()} met ${labels.definition.toLowerCase()} in.`)
    setBusy(true)
    setError(null)
    try {
      const listId = await saveList(
        { subject, title: title.trim(), chapter: chapter.trim() || null, kind, term_lang: termLang || null, definition_lang: defLang || null },
        rows,
        id,
      )
      navigate(`/lijsten/${listId}`, { replace: true })
    } catch {
      setError('Opslaan is niet gelukt. Controleer je verbinding en probeer het opnieuw.')
      setBusy(false)
    }
  }

  if (loading) return <Skeleton className="h-64" />

  return (
    <div {...accentProps(subject)}>
      <PageHeader eyebrow={subjectsBySlug[subject].name} title={id ? 'Lijst bewerken' : 'Nieuwe lijst'} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bijv. Unit 3 – Travel" className="sm:col-span-2" />
          <Field label="Hoofdstuk of paragraaf" maxLength={60} value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="bijv. H3 §2" />
          <Select label="Vak" value={subject} onChange={(e) => changeSubject(e.target.value as SubjectSlug)} options={subjects.map((s) => ({ value: s.slug, label: s.name }))} />
          <Select label="Soort lijst" value={kind} onChange={(e) => setKind(e.target.value as ListKind)} options={Object.entries(kindLabels).map(([value, l]) => ({ value, label: l.name }))} />
          <div className="grid grid-cols-2 gap-2">
            <Select label={`Taal ${labels.term.toLowerCase()}`} value={termLang} onChange={(e) => setTermLang(e.target.value)} options={LANGS} />
            <Select label={`Taal ${labels.definition.toLowerCase()}`} value={defLang} onChange={(e) => setDefLang(e.target.value)} options={LANGS} />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 font-display text-lg font-semibold">
              {filled.length} {filled.length === 1 ? 'regel' : 'regels'}
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
              <ClipboardPaste className="size-4" aria-hidden="true" /> Plakken
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={swapColumns}>
              <ArrowLeftRight className="size-4" aria-hidden="true" /> Kolommen omwisselen
            </Button>
          </div>

          <div className="hidden grid-cols-[1fr_1fr_2.25rem] gap-2 px-1 text-sm font-medium text-muted sm:grid">
            <span>{labels.term}</span>
            <span>{labels.definition}</span>
          </div>
          <ol className="flex flex-col gap-2">
            {rows.map((r, i) => (
              <li key={r.key} className="grid grid-cols-[1fr_2.25rem] gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_2.25rem] sm:border-0 sm:p-0">
                <input
                  ref={i === rows.length - 1 ? lastTermRef : undefined}
                  aria-label={`${labels.term} ${i + 1}`}
                  placeholder={labels.term}
                  value={r.term}
                  maxLength={500}
                  onChange={(e) => update(r.key, { term: e.target.value })}
                  className="h-10 rounded-lg border border-line bg-surface px-3"
                />
                <input
                  aria-label={`${labels.definition} ${i + 1}`}
                  placeholder={labels.definition}
                  value={r.definition}
                  maxLength={1000}
                  onChange={(e) => update(r.key, { definition: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && i === rows.length - 1) {
                      e.preventDefault()
                      addRow()
                    }
                  }}
                  className="col-start-1 h-10 rounded-lg border border-line bg-surface px-3 sm:col-start-auto"
                />
                <button
                  type="button"
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [newRow()]))}
                  className="row-span-2 grid size-9 place-items-center self-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger sm:row-span-1 sm:col-start-3 sm:row-start-1"
                  aria-label={`Regel ${i + 1} verwijderen`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          <Button type="button" variant="ghost" onClick={addRow} className="self-start">
            <Plus className="size-4" aria-hidden="true" /> Regel toevoegen
          </Button>
          <p className="text-xs text-muted">Tip: meerdere goede antwoorden scheid je met een komma of puntkomma; (haakjes) zijn optioneel bij overhoren.</p>
        </Card>

        {half > 0 && <Alert tone="warning">{half} {half === 1 ? 'regel is' : 'regels zijn'} maar half ingevuld en {half === 1 ? 'wordt' : 'worden'} niet opgeslagen.</Alert>}
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex gap-2">
          <Button type="submit" variant="accent" loading={busy}>Opslaan</Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Annuleren</Button>
        </div>
      </form>

      <PasteImportDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onImport={(parsed) =>
          setRows((rs) => [...rs.filter((r) => r.term.trim() || r.definition.trim()), ...parsed.map((p) => newRow(p))])
        }
      />
    </div>
  )
}
