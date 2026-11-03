import { ScanText, ShieldCheck, Sparkles, WifiOff, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, cx, Dialog, Field, Select, Spinner } from '@/components/ui'
import { isSubjectSlug, subjects, subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { defaultKind, defaultLangs, kindLabels, saveList, type ListKind } from '@/features/lists/api'
import { aiErrorMessage, callFunction } from '@/lib/functions'
import { useAiUsage } from '@/lib/useAiUsage'
import { useOnline } from '@/lib/useOnline'
import { cleanupTmp, keepForList, removePaths, uploadTmp } from './photoStorage'
import { PhotoPicker, type PickedPhoto } from './PhotoPicker'
import { newReviewRow, ReviewTable, type ReviewRow } from './ReviewTable'

type ExtractResponse = {
  rows: { term: string; betekenis: string; opmerking: string | null; woordsoort: string | null; voorbeeldzin: string | null; onzeker: boolean }[]
  termLang: string | null
  definitionLang: string | null
  warning: string | null
  remaining: number
}

const LANG_RE = /^[a-z]{2,3}$/

export function PhotoImportPage() {
  const { session } = useAuth()
  const userId = session!.user.id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { usage, refresh: refreshUsage } = useAiUsage()

  const initialSubject = (isSubjectSlug(params.get('vak') ?? '') ? params.get('vak') : 'engels') as SubjectSlug
  const kindParam = params.get('soort')
  const [subject, setSubject] = useState<SubjectSlug>(initialSubject)
  const [kind, setKind] = useState<ListKind>(kindParam === 'woorden' || kindParam === 'begrippen' || kindParam === 'formules' ? kindParam : defaultKind(subjectsBySlug[initialSubject].archetype))
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [autoDelete, setAutoDelete] = useState(true)
  const [step, setStep] = useState<'kies' | 'bezig' | 'controle'>('kies')
  const [paths, setPaths] = useState<string[]>([])
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [langs, setLangs] = useState<[string, string]>(['', ''])
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [zoom, setZoom] = useState(false)
  const photosRef = useRef(photos)
  photosRef.current = photos

  // Oude, afgebroken imports opruimen; object-URL's vrijgeven bij vertrek.
  useEffect(() => {
    void cleanupTmp(userId)
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url))
  }, [userId])

  const labels = kindLabels[kind]

  async function process() {
    setError(null)
    setWarning(null)
    setStep('bezig')
    let uploaded: string[] = []
    try {
      uploaded = await uploadTmp(userId, photos.map((p) => p.blob))
      setPaths(uploaded)
    } catch {
      setStep('kies')
      return setError('Uploaden is mislukt. Controleer je verbinding en probeer het opnieuw.')
    }
    const res = await callFunction<ExtractResponse>('extract-list', { paths: uploaded, kind, subject })
    void refreshUsage()
    if (res.error !== null) {
      // Mislukt: tijdelijke foto's meteen weer weghalen.
      await removePaths(uploaded).catch(() => {})
      setPaths([])
      setStep('kies')
      return setError(aiErrorMessage(res.error))
    }
    const d = res.data
    setRows(
      d.rows.map((r) =>
        newReviewRow({ term: r.term, definition: r.betekenis, note: r.opmerking ?? '', word_type: r.woordsoort ?? '', example: r.voorbeeldzin ?? '', uncertain: r.onzeker }),
      ),
    )
    const fallback = defaultLangs[subject] ?? ['', '']
    setLangs([d.termLang && LANG_RE.test(d.termLang) ? d.termLang : fallback[0], d.definitionLang && LANG_RE.test(d.definitionLang) ? d.definitionLang : fallback[1]])
    setWarning(d.warning)
    setStep('controle')
  }

  async function cancel() {
    if (paths.length) await removePaths(paths).catch(() => {})
    navigate(-1)
  }

  async function save() {
    const filled = rows.filter((r) => r.term.trim() && r.definition.trim())
    if (!title.trim()) return setError('Geef de lijst een titel.')
    if (!filled.length) return setError('Er is geen enkele volledige regel om op te slaan.')
    setSaving(true)
    setError(null)
    try {
      const listId = await saveList(
        { subject, title: title.trim(), chapter: chapter.trim() || null, kind, term_lang: langs[0] || null, definition_lang: langs[1] || null },
        filled.map((r) => ({ term: r.term, definition: r.definition, note: r.note || null, word_type: r.word_type || null, example: r.example || null })),
      )
      // Foto's: standaard weg, anders bewaren bij de lijst. Een mislukte
      // opruiming blokkeert het opslaan niet; tmp wordt later opgeruimd.
      if (autoDelete) await removePaths(paths).catch(() => {})
      else await keepForList(userId, paths, listId).catch(() => {})
      navigate(`/lijsten/${listId}`, { replace: true })
    } catch {
      setSaving(false)
      setError('Opslaan is niet gelukt. Controleer je verbinding en probeer het opnieuw.')
    }
  }

  return (
    <div {...accentProps(subject)}>
      <PageHeader eyebrow={subjectsBySlug[subject].name} title={step === 'controle' ? 'Controleer de lijst' : 'Lijst uit foto'}>
        {step === 'controle' ? 'Vergelijk met de foto en verbeter waar nodig. Oranje regels waren lastig te lezen.' : 'Maak een foto van een woordenlijst of begrippenlijst; de AI zet hem om in regels.'}
      </PageHeader>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 'kies' && (
        <div className="flex flex-col gap-4">
          {!online && (
            <Alert tone="warning">
              <span className="inline-flex items-center gap-2"><WifiOff className="size-4" aria-hidden="true" /> Je bent offline. Foto-import heeft internet nodig.</span>
            </Alert>
          )}
          <Card className="flex flex-col gap-4">
            <PhotoPicker photos={photos} onChange={setPhotos} />
            <p className="text-sm text-muted">Tip: fotografeer recht van boven, met goed licht en zonder schaduw. Meerdere pagina's? Voeg ze allemaal toe.</p>
          </Card>
          <Card className="grid gap-4 sm:grid-cols-2">
            <Select label="Vak" value={subject} onChange={(e) => setSubject(e.target.value as SubjectSlug)} options={subjects.map((s) => ({ value: s.slug, label: s.name }))} />
            <Select label="Soort lijst" value={kind} onChange={(e) => setKind(e.target.value as ListKind)} options={Object.entries(kindLabels).map(([value, l]) => ({ value, label: l.name }))} />
            <label className="flex items-start gap-3 text-sm sm:col-span-2">
              <input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span>
                Foto's na het opslaan verwijderen <span className="text-muted">(aanbevolen; anders worden ze privé bij de lijst bewaard)</span>
              </span>
            </label>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" onClick={process} disabled={!photos.length || !online || usage?.remaining === 0}>
              <ScanText className="size-4" aria-hidden="true" /> Verwerken
            </Button>
            {usage && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <Sparkles className="size-4" aria-hidden="true" /> Nog {usage.remaining} van {usage.daily_limit} AI-acties vandaag
              </span>
            )}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Je foto's worden privé opgeslagen en alleen voor deze verwerking naar de AI-dienst gestuurd.
          </p>
        </div>
      )}

      {step === 'bezig' && (
        <Card className="grid place-items-center gap-3 py-16 text-center" aria-live="polite">
          <Spinner className="size-8" />
          <p className="font-medium">Foto's worden gelezen…</p>
          <p className="text-sm text-muted">Dit duurt meestal 10 tot 40 seconden.</p>
        </Card>
      )}

      {step === 'controle' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Foto's">
            <Card className="flex flex-col gap-2 p-2">
              {photos.length > 1 && (
                <div role="tablist" aria-label="Kies foto" className="flex gap-1">
                  {photos.map((p, i) => (
                    <button key={p.id} role="tab" aria-selected={activePhoto === i} onClick={() => setActivePhoto(i)} className={cx('rounded-lg px-3 py-1 text-sm', activePhoto === i ? 'bg-surface-2 font-semibold' : 'text-muted')}>
                      Foto {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setZoom(true)} className="group relative overflow-hidden rounded-xl" aria-label="Foto vergroten">
                <img src={photos[activePhoto]?.url} alt={`Foto ${activePhoto + 1}`} className="max-h-[50vh] w-full object-contain lg:max-h-[75vh]" />
                <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-ink/80 text-on-ink"><ZoomIn className="size-4" aria-hidden="true" /></span>
              </button>
            </Card>
          </aside>

          <div className="flex flex-col gap-4">
            {warning && <Alert tone="warning">{warning}</Alert>}
            <Card className="grid gap-4 sm:grid-cols-2">
              <Field label="Titel" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bijv. Unité 4 – vocabulaire" className="sm:col-span-2" />
              <Field label="Hoofdstuk of paragraaf" maxLength={60} value={chapter} onChange={(e) => setChapter(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Field label={`Taal ${labels.term.toLowerCase()}`} maxLength={3} value={langs[0]} onChange={(e) => setLangs([e.target.value.toLowerCase(), langs[1]])} hint="bijv. fr" />
                <Field label={`Taal ${labels.definition.toLowerCase()}`} maxLength={3} value={langs[1]} onChange={(e) => setLangs([langs[0], e.target.value.toLowerCase()])} hint="bijv. nl" />
              </div>
            </Card>
            <Card>
              <ReviewTable rows={rows} onChange={setRows} labels={labels} />
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" onClick={save} loading={saving}>Lijst opslaan</Button>
              <Button variant="ghost" onClick={cancel}>Annuleren</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={zoom} onClose={() => setZoom(false)} title={`Foto ${activePhoto + 1}`}>
        <div className="max-h-[70vh] overflow-auto rounded-xl">
          <img src={photos[activePhoto]?.url} alt={`Foto ${activePhoto + 1}, vergroot`} className="max-w-none" style={{ width: '200%' }} />
        </div>
        <Button variant="ghost" onClick={() => setZoom(false)} className="self-end">Sluiten</Button>
      </Dialog>
    </div>
  )
}
