import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, EmptyState, Skeleton } from '@/components/ui'
import { isSubjectSlug, subjectsBySlug } from '@/config/subjects'
import { accentProps, type SubjectSlug } from '@/design/subjectPalette'
import { fetchDue, fetchList, kindLabels, saveReview, saveSession, type ItemRow, type ListRow } from '@/features/lists/api'
import { defaultCheckOptions } from './answerCheck'
import { isDue, type SrsState } from './srs'
import { StudyResult } from './StudyResult'
import { StudyRun } from './StudyRun'
import { StudySetup } from './StudySetup'
import { loadSettings, storeSettings, type Mode, type SessionItem, type SessionResult, type StudySettings } from './types'

const MODES: Mode[] = ['flashcards', 'typen', 'meerkeuze', 'toets']

type Loaded = { title: string; subject: SubjectSlug | null; list: ListRow | null; items: SessionItem[]; formula: boolean; labels: { term: string; definition: string } }

function toSessionItem(it: ItemRow, termLang: string | null, definitionLang: string | null): SessionItem {
  return { ...it, termLang, definitionLang }
}

/**
 * Leersessie voor één lijst (/lijsten/:id/leren) of voor alles wat vandaag
 * aan de beurt is (/herhalen, optioneel ?vak=…).
 */
export function StudyPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const vak = params.get('vak')
  const onlyDue = !id || params.get('alleen') === 'herhalen'
  const initialMode = (MODES as string[]).includes(params.get('modus') ?? '') ? (params.get('modus') as Mode) : 'typen'

  const [data, setData] = useState<Loaded | null>(null)
  const [error, setError] = useState(false)
  const [settings, setSettings] = useState<StudySettings>(() =>
    loadSettings({ mode: initialMode, direction: 'vooruit', check: defaultCheckOptions, count: 20 }),
  )
  const [phase, setPhase] = useState<'setup' | 'run' | 'result'>('setup')
  const [pool, setPool] = useState<SessionItem[]>([])
  const [result, setResult] = useState<SessionResult | null>(null)
  const [sessionSaveFailed, setSessionSaveFailed] = useState(false)
  const [runKey, setRunKey] = useState(0)
  // Een item telt per bezoek aan deze pagina maar één keer mee voor het
  // herhaalschema; "opnieuw" en "alleen de foute" zijn extra oefening.
  const reviewed = useRef(new Set<string>())
  const saveSrs = useCallback((itemId: string, state: SrsState) => {
    if (reviewed.current.has(itemId)) return Promise.resolve()
    reviewed.current.add(itemId)
    return saveReview(itemId, state)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (id) {
          const r = await fetchList(id)
          if (!r) return navigate('/vakken', { replace: true })
          const items = r.items.map((it) => toSessionItem(it, r.list.term_lang, r.list.definition_lang))
          if (!cancelled)
            setData({ title: r.list.title, subject: r.list.subject as SubjectSlug, list: r.list, items: onlyDue ? items.filter((i) => isDue(i)) : items, formula: r.list.kind === 'formules', labels: kindLabels[r.list.kind] })
        } else {
          const subject = vak && isSubjectSlug(vak) ? vak : null
          const due = await fetchDue(subject ?? undefined)
          if (!cancelled)
            setData({
              title: subject ? `${subjectsBySlug[subject].name}: vandaag herhalen` : 'Vandaag herhalen',
              subject,
              list: null,
              items: due.map((d) => toSessionItem(d, d.lists.term_lang, d.lists.definition_lang)),
              formula: false,
              labels: { term: 'Vraag', definition: 'Antwoord' },
            })
        }
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, vak, onlyDue, navigate])

  const scope = useMemo(() => (data?.subject ? accentProps(data.subject) : { className: '', style: {} }), [data?.subject])

  if (error) return <Alert tone="error">Kon de lijst niet laden. Controleer je verbinding en probeer het opnieuw.</Alert>
  if (!data) return <Skeleton className="h-64" />

  if (!data.items.length) {
    return (
      <EmptyState title={onlyDue ? 'Niets meer te herhalen vandaag' : 'Deze lijst is leeg'}>
        {onlyDue ? 'Goed bezig. Morgen staat er weer iets klaar.' : 'Voeg eerst regels toe.'}
      </EmptyState>
    )
  }

  function start(items: SessionItem[]) {
    storeSettings(settings)
    setPool(items)
    setResult(null)
    setRunKey((k) => k + 1)
    setPhase('run')
  }

  async function finish(r: SessionResult) {
    setResult(r)
    setPhase('result')
    try {
      await saveSession({
        list_id: data!.list?.id ?? null,
        subject: data!.subject,
        mode: id ? r.mode : 'herhalen',
        started_at: r.startedAt.toISOString(),
        ended_at: r.endedAt.toISOString(),
        items_total: r.total,
        items_correct: r.correct,
        grade: r.grade,
      })
      setSessionSaveFailed(false)
    } catch {
      setSessionSaveFailed(true)
    }
  }

  const back = () => navigate(id ? `/lijsten/${id}` : data.subject ? `/vakken/${data.subject}` : '/')

  return (
    <div {...scope} className={`${scope.className} mx-auto max-w-2xl`}>
      <header className="mb-6">
        <p className="text-sm uppercase tracking-[0.14em] text-accent">{data.subject ? subjectsBySlug[data.subject].name : 'Alle vakken'}</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">{data.title}</h1>
        {onlyDue && id && <p className="text-sm text-muted">Alleen de {data.items.length} regels die vandaag aan de beurt zijn.</p>}
      </header>

      {phase === 'setup' && (
        <StudySetup settings={settings} onChange={setSettings} onStart={() => start(data.items)} itemCount={data.items.length} labels={data.labels} isFormula={data.formula} />
      )}
      {phase === 'run' && (
        <StudyRun key={runKey} items={pool} settings={settings} isFormula={data.formula} saveSrs={saveSrs} onFinish={finish} onExit={() => setPhase('setup')} />
      )}
      {phase === 'result' && result && (
        <StudyResult
          result={result}
          items={pool}
          sessionSaveFailed={sessionSaveFailed}
          onRetryWrong={() => {
            const wrong = pool.filter((i) => result.wrongIds.includes(i.id))
            // Herhalen van alleen de foute: oefenen zonder toetscijfer.
            if (settings.mode === 'toets') setSettings((s) => ({ ...s, mode: 'typen' }))
            start(wrong)
          }}
          onRestart={() => start(data.items)}
          onBack={back}
        />
      )}
    </div>
  )
}
