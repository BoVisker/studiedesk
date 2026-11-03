import { ShieldCheck, Sparkles, WandSparkles, WifiOff, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, cx, Dialog, Field, Select, Spinner } from '@/components/ui'
import { isSubjectSlug, subjects, subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { cleanupTmp, removePaths, uploadTmp } from '@/features/imports/photoStorage'
import { PhotoPicker, type PickedPhoto } from '@/features/imports/PhotoPicker'
import { aiErrorMessage, callFunction } from '@/lib/functions'
import { useAiUsage } from '@/lib/useAiUsage'
import { useOnline } from '@/lib/useOnline'
import { createNote } from './api'
import { SummaryView, WorkedView } from './NoteViews'
import { lengthLabels, noteKindLabels, type NoteKind, type SummaryContent, type SummaryLength, type WorkedContent } from './types'

type ExplainResponse =
  | { mode: 'samenvatting'; content: SummaryContent; remaining: number }
  | { mode: 'uitwerking'; content: WorkedContent; remaining: number }

/** Uitwerkingen passen het best bij wiskunde; de rest begint met een samenvatting. */
const defaultMode = (slug: SubjectSlug): NoteKind => (subjectsBySlug[slug].archetype === 'wiskunde' ? 'uitwerking' : 'samenvatting')

export function NotePhotoPage() {
  const { session } = useAuth()
  const userId = session!.user.id
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const online = useOnline()
  const { usage, refresh: refreshUsage } = useAiUsage()

  const initialSubject = (isSubjectSlug(params.get('vak') ?? '') ? params.get('vak') : 'biologie') as SubjectSlug
  const modeParam = params.get('soort')
  const [subject, setSubject] = useState<SubjectSlug>(initialSubject)
  const [mode, setMode] = useState<NoteKind>(modeParam === 'samenvatting' || modeParam === 'uitwerking' ? modeParam : defaultMode(initialSubject))
  const [length, setLength] = useState<SummaryLength>('normaal')
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [step, setStep] = useState<'kies' | 'bezig' | 'resultaat'>('kies')
  const [paths, setPaths] = useState<string[]>([])
  const [result, setResult] = useState<ExplainResponse | null>(null)
  const [title, setTitle] = useState('')
  const [chapter, setChapter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [zoom, setZoom] = useState(false)
  const photosRef = useRef(photos)
  photosRef.current = photos

  useEffect(() => {
    void cleanupTmp(userId)
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url))
  }, [userId])

  async function process() {
    setError(null)
    setStep('bezig')
    let uploaded: string[] = []
    try {
      uploaded = await uploadTmp(userId, photos.map((p) => p.blob))
      setPaths(uploaded)
    } catch {
      setStep('kies')
      return setError('Uploaden is mislukt. Controleer je verbinding en probeer het opnieuw.')
    }
    const res = await callFunction<ExplainResponse>('explain-photo', { paths: uploaded, mode, length, subject })
    void refreshUsage()
    if (res.error !== null) {
      await removePaths(uploaded).catch(() => {})
      setPaths([])
      setStep('kies')
      return setError(aiErrorMessage(res.error))
    }
    setResult(res.data)
    if (res.data.mode === 'samenvatting') setTitle(res.data.content.titel.slice(0, 120))
    else setTitle(`Opgave ${res.data.content.opgaven.map((o) => o.nummer).filter(Boolean).join(', ') || ''}`.trim().slice(0, 120))
    setStep('resultaat')
  }

  async function discard() {
    if (paths.length) await removePaths(paths).catch(() => {})
    navigate(-1)
  }

  async function save() {
    if (!result) return
    if (!title.trim()) return setError('Geef een titel.')
    setSaving(true)
    setError(null)
    try {
      const id = await createNote({
        subject,
        kind: result.mode,
        title: title.trim(),
        chapter: chapter.trim() || null,
        length: result.mode === 'samenvatting' ? length : null,
        content: result.content,
      })
      // Foto's zijn na opslaan niet meer nodig; mislukte opruiming gebeurt later alsnog.
      await removePaths(paths).catch(() => {})
      navigate(`/notities/${id}`, { replace: true })
    } catch {
      setSaving(false)
      setError('Opslaan is niet gelukt. Controleer je verbinding en probeer het opnieuw.')
    }
  }

  const label = noteKindLabels[mode].name

  return (
    <div {...accentProps(subject)}>
      <PageHeader eyebrow={subjectsBySlug[subject].name} title={step === 'resultaat' ? `${label} bekijken` : mode === 'samenvatting' ? 'Samenvatting uit foto' : 'Uitwerking uit foto'}>
        {step === 'resultaat'
          ? 'Vergelijk met de foto. Bewaar het als het klopt.'
          : mode === 'samenvatting'
            ? 'Maak een foto van een paragraaf; je krijgt een samenvatting, kernbegrippen en oefenvragen.'
            : 'Maak een foto van een opgave; je krijgt een uitwerking stap voor stap.'}
      </PageHeader>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 'kies' && (
        <div className="flex flex-col gap-4">
          {!online && (
            <Alert tone="warning">
              <span className="inline-flex items-center gap-2"><WifiOff className="size-4" aria-hidden="true" /> Je bent offline. Dit heeft internet nodig.</span>
            </Alert>
          )}
          <Card className="flex flex-col gap-4">
            <PhotoPicker photos={photos} onChange={setPhotos} />
            <p className="text-sm text-muted">Tip: fotografeer recht van boven, met goed licht. Meerdere pagina's? Voeg ze in volgorde toe.</p>
          </Card>
          <Card className="grid gap-4 sm:grid-cols-2">
            <Select label="Vak" value={subject} onChange={(e) => setSubject(e.target.value as SubjectSlug)} options={subjects.map((s) => ({ value: s.slug, label: s.name }))} />
            <Select
              label="Wat wil je?"
              value={mode}
              onChange={(e) => setMode(e.target.value as NoteKind)}
              options={[
                { value: 'samenvatting', label: 'Samenvatting met oefenvragen' },
                { value: 'uitwerking', label: 'Opgave stap voor stap uitwerken' },
              ]}
            />
            {mode === 'samenvatting' && (
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-sm font-medium">Lengte</legend>
                <div className="inline-flex rounded-xl border border-line p-1" role="radiogroup">
                  {(Object.keys(lengthLabels) as SummaryLength[]).map((l) => (
                    <label key={l} className={cx('cursor-pointer rounded-lg px-3 py-1.5 text-sm', length === l ? 'bg-accent font-semibold text-on-accent' : 'text-muted')}>
                      <input type="radio" name="lengte" value={l} checked={length === l} onChange={() => setLength(l)} className="sr-only" />
                      {lengthLabels[l]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" onClick={process} disabled={!photos.length || !online || usage?.remaining === 0}>
              <WandSparkles className="size-4" aria-hidden="true" /> {mode === 'samenvatting' ? 'Samenvatten' : 'Uitwerken'}
            </Button>
            {usage && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <Sparkles className="size-4" aria-hidden="true" /> Nog {usage.remaining} van {usage.daily_limit} AI-acties vandaag
              </span>
            )}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Je foto's worden privé opgeslagen, alleen voor deze verwerking naar de AI-dienst gestuurd en na het bewaren verwijderd.
          </p>
        </div>
      )}

      {step === 'bezig' && (
        <Card className="grid place-items-center gap-3 py-16 text-center" aria-live="polite">
          <Spinner className="size-8" />
          <p className="font-medium">{mode === 'samenvatting' ? 'Samenvatting wordt gemaakt…' : 'Opgave wordt uitgewerkt…'}</p>
          <p className="text-sm text-muted">Dit duurt meestal 20 tot 60 seconden.</p>
        </Card>
      )}

      {step === 'resultaat' && result && (
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
              <button type="button" onClick={() => setZoom(true)} className="relative overflow-hidden rounded-xl" aria-label="Foto vergroten">
                <img src={photos[activePhoto]?.url} alt={`Foto ${activePhoto + 1}`} className="max-h-[50vh] w-full object-contain lg:max-h-[75vh]" />
                <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-ink/80 text-on-ink"><ZoomIn className="size-4" aria-hidden="true" /></span>
              </button>
            </Card>
          </aside>

          <div className="flex flex-col gap-4">
            <Card className="grid gap-4 sm:grid-cols-2">
              <Field label="Titel" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className="sm:col-span-2" />
              <Field label="Hoofdstuk of paragraaf" maxLength={60} value={chapter} onChange={(e) => setChapter(e.target.value)} />
              <div className="flex items-end gap-2">
                <Button variant="accent" onClick={save} loading={saving}>Bewaren</Button>
                <Button variant="ghost" onClick={discard}>Weggooien</Button>
              </div>
            </Card>
            {result.mode === 'samenvatting' ? <SummaryView content={result.content} /> : <WorkedView content={result.content} />}
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
