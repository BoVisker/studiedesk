import { AlertTriangle, Copy, ScanText, ShieldCheck, Sparkles, WifiOff, ZoomIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, cx, Dialog, Spinner } from '@/components/ui'
import { subjects } from '@/config/subjects'
import type { SubjectSlug } from '@/design/subjectPalette'
import { cleanupTmp, removePaths, uploadTmp } from '@/features/imports/photoStorage'
import { PhotoPicker, type PickedPhoto } from '@/features/imports/PhotoPicker'
import { aiErrorMessage, callFunction } from '@/lib/functions'
import { useAiUsage } from '@/lib/useAiUsage'
import { useOnline } from '@/lib/useOnline'
import { fetchGrades, importGrades } from './api'
import { rowProblem, toGradeInputs, toImportRows, type ImportRow, type RawGradeRow } from './importRows'

type ExtractResponse = { rows: RawGradeRow[]; warning: string | null; remaining: number }

const problemText = { vak: 'Kies het vak', cijfer: 'Geen geldig cijfer (1–10)', weging: 'Ongeldige weging' } as const

export function GradeImportPage() {
  const { session } = useAuth()
  const userId = session!.user.id
  const navigate = useNavigate()
  const online = useOnline()
  const { usage, refresh: refreshUsage } = useAiUsage()
  const [photos, setPhotos] = useState<PickedPhoto[]>([])
  const [step, setStep] = useState<'kies' | 'bezig' | 'controle'>('kies')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [warning, setWarning] = useState<string | null>(null)
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
    } catch {
      setStep('kies')
      return setError('Uploaden is mislukt. Controleer je verbinding en probeer het opnieuw.')
    }
    const [res, existing] = await Promise.all([callFunction<ExtractResponse>('extract-grades', { paths: uploaded }), fetchGrades().catch(() => [])])
    void refreshUsage()
    // Het screenshot is na het uitlezen niet meer nodig.
    await removePaths(uploaded).catch(() => {})
    if (res.error !== null) {
      setStep('kies')
      return setError(aiErrorMessage(res.error))
    }
    setRows(toImportRows(res.data.rows, existing))
    setWarning(res.data.warning)
    setStep('controle')
  }

  const update = (key: string, patch: Partial<ImportRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const ready = toGradeInputs(rows)
  const blocked = rows.filter((r) => r.include && rowProblem(r) !== null).length

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const added = await importGrades(ready)
      navigate('/cijfers', { replace: true, state: { imported: added } })
    } catch {
      setSaving(false)
      setError('Opslaan is niet gelukt. Probeer het opnieuw.')
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Cijfers" title={step === 'controle' ? 'Controleer je cijfers' : 'Cijfers uit screenshot'}>
        {step === 'controle'
          ? 'Vergelijk met het screenshot. Oranje regels waren lastig te lezen; regels die je al hebt staan uit.'
          : 'Maak in Magister (of een andere app) een screenshot van je cijferoverzicht. Je hoeft nergens in te loggen.'}
      </PageHeader>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {step === 'kies' && (
        <div className="flex flex-col gap-4">
          {!online && (
            <Alert tone="warning">
              <span className="inline-flex items-center gap-2"><WifiOff className="size-4" aria-hidden="true" /> Je bent offline. Importeren heeft internet nodig.</span>
            </Alert>
          )}
          <Card className="flex flex-col gap-4">
            <PhotoPicker photos={photos} onChange={setPhotos} />
            <p className="text-sm text-muted">Tip: open het cijferoverzicht, zoom zo dat de cijfers goed leesbaar zijn en maak een screenshot. Meerdere screenshots mag; dubbele regels worden herkend.</p>
          </Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" onClick={process} disabled={!photos.length || !online || usage?.remaining === 0}>
              <ScanText className="size-4" aria-hidden="true" /> Uitlezen
            </Button>
            {usage && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <Sparkles className="size-4" aria-hidden="true" /> Nog {usage.remaining} van {usage.daily_limit} AI-acties vandaag
              </span>
            )}
          </div>
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Het screenshot wordt alleen voor het uitlezen naar de AI-dienst gestuurd en daarna meteen verwijderd. StudieDesk vraagt nooit om je Magister-wachtwoord.
          </p>
        </div>
      )}

      {step === 'bezig' && (
        <Card className="grid place-items-center gap-3 py-16 text-center" aria-live="polite">
          <Spinner className="size-8" />
          <p className="font-medium">Cijfers worden uitgelezen…</p>
          <p className="text-sm text-muted">Dit duurt meestal 10 tot 40 seconden.</p>
        </Card>
      )}

      {step === 'controle' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Screenshots">
            <Card className="flex flex-col gap-2 p-2">
              {photos.length > 1 && (
                <div role="tablist" aria-label="Kies screenshot" className="flex gap-1">
                  {photos.map((p, i) => (
                    <button key={p.id} role="tab" aria-selected={activePhoto === i} onClick={() => setActivePhoto(i)} className={cx('rounded-lg px-3 py-1 text-sm', activePhoto === i ? 'bg-surface-2 font-semibold' : 'text-muted')}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setZoom(true)} className="relative overflow-hidden rounded-xl" aria-label="Screenshot vergroten">
                <img src={photos[activePhoto]?.url} alt={`Screenshot ${activePhoto + 1}`} className="max-h-[50vh] w-full object-contain lg:max-h-[75vh]" />
                <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-ink/80 text-on-ink"><ZoomIn className="size-4" aria-hidden="true" /></span>
              </button>
            </Card>
          </aside>

          <div className="flex flex-col gap-4">
            {warning && <Alert tone="warning">{warning}</Alert>}
            {rows.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Er zijn geen cijfers gevonden. Probeer een scherper screenshot, of <Link to="/cijfers" className="underline">voer ze zelf in</Link>.</p>
              </Card>
            ) : (
              <Card className="-mx-1 overflow-x-auto p-3">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th scope="col" className="px-1 py-2 font-medium"><span className="sr-only">Opslaan</span></th>
                      <th scope="col" className="px-1 py-2 font-medium">Vak</th>
                      <th scope="col" className="px-1 py-2 font-medium">Omschrijving</th>
                      <th scope="col" className="px-1 py-2 font-medium">Cijfer</th>
                      <th scope="col" className="px-1 py-2 font-medium">Weging</th>
                      <th scope="col" className="px-1 py-2 font-medium">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const problem = rowProblem(r)
                      return (
                        <tr key={r.key} className={cx('border-t border-line align-top', r.uncertain && 'bg-warning/10', !r.include && 'opacity-60')}>
                          <td className="px-1 py-2">
                            <input type="checkbox" checked={r.include} onChange={(e) => update(r.key, { include: e.target.checked })} className="mt-2 size-4 accent-[var(--accent)]" aria-label={`Regel ${i + 1} opslaan`} />
                          </td>
                          <td className="px-1 py-2">
                            <select value={r.subject} onChange={(e) => update(r.key, { subject: e.target.value as SubjectSlug | '', uncertain: false })} className="h-9 w-36 rounded-lg border border-line bg-surface px-2" aria-label={`Vak regel ${i + 1}`}>
                              <option value="">Kies…</option>
                              {subjects.map((s) => (
                                <option key={s.slug} value={s.slug}>{s.name}</option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-muted">“{r.rawSubject}”</p>
                          </td>
                          <td className="px-1 py-2">
                            <input value={r.description} onChange={(e) => update(r.key, { description: e.target.value })} maxLength={200} className="h-9 w-full min-w-32 rounded-lg border border-line bg-surface px-2" aria-label={`Omschrijving regel ${i + 1}`} />
                            {r.duplicate && (
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted"><Copy className="size-3" aria-hidden="true" /> Heb je al</p>
                            )}
                            {r.include && problem && (
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-danger"><AlertTriangle className="size-3" aria-hidden="true" /> {problemText[problem]}</p>
                            )}
                          </td>
                          <td className="px-1 py-2">
                            <input value={r.grade} onChange={(e) => update(r.key, { grade: e.target.value })} inputMode="decimal" className="h-9 w-16 rounded-lg border border-line bg-surface px-2 tabular-nums" aria-label={`Cijfer regel ${i + 1}`} />
                          </td>
                          <td className="px-1 py-2">
                            <input value={r.weight} onChange={(e) => update(r.key, { weight: e.target.value })} inputMode="decimal" className="h-9 w-16 rounded-lg border border-line bg-surface px-2 tabular-nums" aria-label={`Weging regel ${i + 1}`} />
                          </td>
                          <td className="px-1 py-2">
                            <input type="date" value={r.date} onChange={(e) => update(r.key, { date: e.target.value })} className="h-9 rounded-lg border border-line bg-surface px-2" aria-label={`Datum regel ${i + 1}`} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="accent" onClick={save} loading={saving} disabled={!ready.length || blocked > 0}>
                {ready.length === 1 ? '1 cijfer opslaan' : `${ready.length} cijfers opslaan`}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/cijfers')}>Annuleren</Button>
              {blocked > 0 && <span className="text-sm text-danger">Los eerst {blocked === 1 ? '1 regel' : `${blocked} regels`} op, of vink {blocked === 1 ? 'hem' : 'ze'} uit.</span>}
            </div>
          </div>
        </div>
      )}

      <Dialog open={zoom} onClose={() => setZoom(false)} title={`Screenshot ${activePhoto + 1}`}>
        <div className="max-h-[70vh] overflow-auto rounded-xl">
          <img src={photos[activePhoto]?.url} alt={`Screenshot ${activePhoto + 1}, vergroot`} className="max-w-none" style={{ width: '200%' }} />
        </div>
        <Button variant="ghost" onClick={() => setZoom(false)} className="self-end">Sluiten</Button>
      </Dialog>
    </div>
  )
}
