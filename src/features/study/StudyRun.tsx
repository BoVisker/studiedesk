import { Check, Volume2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Button, cx } from '@/components/ui'
import { checkAnswer, type CheckResult } from './answerCheck'
import { answer, buildOptions, createSession, current, gradeFor, isFinished, summary, type Card, type QuestionType } from './session'
import { canSpeak, speak } from './speech'
import { review, type SrsState } from './srs'
import type { SessionItem, SessionResult, StudySettings } from './types'

type Props = {
  items: SessionItem[]
  settings: StudySettings
  isFormula: boolean
  saveSrs: (id: string, s: SrsState) => Promise<void>
  onFinish: (r: SessionResult) => void
  onExit: () => void
}

function typesFor(mode: StudySettings['mode'], n: number): QuestionType[] {
  if (mode === 'flashcards') return ['flashcard']
  if (mode === 'meerkeuze') return n >= 2 ? ['meerkeuze'] : ['typen']
  if (mode === 'toets') return n >= 4 ? ['typen', 'meerkeuze'] : ['typen']
  return ['typen']
}

/** Bij welke kant van een kaart hoort welke taal (voor voorlezen). */
const promptLang = (c: Card, it: SessionItem) => (c.dir === 'vooruit' ? it.termLang : it.definitionLang)
const answerLang = (c: Card, it: SessionItem) => (c.dir === 'vooruit' ? it.definitionLang : it.termLang)

export function StudyRun({ items, settings, isFormula, saveSrs, onFinish, onExit }: Props) {
  const startedAt = useRef(new Date())
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const srs = useRef(new Map<string, SrsState>(items.map((i) => [i.id, i])))
  const unsaved = useRef(0)
  const [session, setSession] = useState(() =>
    createSession(items, {
      direction: settings.direction,
      types: typesFor(settings.mode, items.length),
      limit: settings.mode === 'toets' ? settings.count : undefined,
      requeueWrong: settings.mode !== 'toets',
    }),
  )
  const totalCards = useRef(session.queue.length).current
  const card = current(session)
  const check = { ...settings.check, splitAlternatives: !isFormula }

  function record(correct: boolean) {
    if (!card) return
    if (!(card.key in session.first)) {
      // Alleen de eerste poging telt voor het Leitner-bakje.
      const next = review(srs.current.get(card.item.id)!, correct)
      srs.current.set(card.item.id, next)
      saveSrs(card.item.id, next).catch(() => (unsaved.current += 1))
    }
    const next = answer(session, correct)
    if (isFinished(next)) {
      const sum = summary(next)
      onFinish({
        mode: settings.mode,
        total: sum.total,
        correct: sum.correct,
        wrongIds: [...new Set(sum.wrongKeys.map((k) => k.split(':')[0]))],
        grade: settings.mode === 'toets' ? gradeFor(sum.correct, sum.total) : null,
        startedAt: startedAt.current,
        endedAt: new Date(),
        unsaved: unsaved.current,
      })
    } else setSession(next)
  }

  if (!card) return null
  const item = byId.get(card.item.id)!
  const done = Object.keys(session.first).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Voortgang" aria-valuemin={0} aria-valuemax={totalCards} aria-valuenow={done}>
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(done / totalCards) * 100}%` }} />
        </div>
        <span className="text-sm tabular-nums text-muted">
          {done}/{totalCards}
        </span>
        <Button variant="ghost" size="sm" onClick={onExit}>Stoppen</Button>
      </div>

      {card.type === 'flashcard' && <FlashcardView key={session.attempts} card={card} item={item} onGrade={record} />}
      {card.type === 'typen' && <TypeView key={session.attempts} card={card} item={item} check={check} onResult={record} />}
      {card.type === 'meerkeuze' && <ChoiceView key={session.attempts} card={card} item={item} pool={items} onResult={record} />}
    </div>
  )
}

function Prompt({ text, lang, hint }: { text: string; lang: string | null; hint?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="font-display text-3xl font-semibold leading-tight break-words md:text-4xl" lang={lang ?? undefined}>
        {text}
      </p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {canSpeak() && lang && (
        <button type="button" onClick={() => speak(text, lang)} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Voorlezen">
          <Volume2 className="size-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function useKeys(handler: (e: KeyboardEvent) => void, deps: unknown[]) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Enter/spatie op een knop of in een veld doet de browser al zelf; niet dubbel afhandelen.
      const tag = (e.target as HTMLElement | null)?.tagName
      if ((e.key === 'Enter' || e.key === ' ') && (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA')) return
      handler(e)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function FlashcardView({ card, item, onGrade }: { card: Card; item: SessionItem; onGrade: (ok: boolean) => void }) {
  const [flipped, setFlipped] = useState(false)
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)

  useKeys(
    (e) => {
      if (e.key === ' ' || (e.key === 'Enter' && !flipped)) {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && (e.key === '1' || e.key === 'ArrowLeft')) onGrade(false)
      else if (flipped && (e.key === '2' || e.key === 'ArrowRight')) onGrade(true)
    },
    [flipped, onGrade],
  )

  // Swipen op mobiel: na omdraaien naar rechts = wist ik, links = wist ik niet.
  const onDown = (e: ReactPointerEvent) => {
    if (flipped) start.current = e.clientX
  }
  const onMove = (e: ReactPointerEvent) => {
    if (start.current !== null) setDx(e.clientX - start.current)
  }
  const onUp = () => {
    if (start.current === null) return
    const d = dx
    start.current = null
    setDx(0)
    if (d > 90) onGrade(true)
    else if (d < -90) onGrade(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => Math.abs(dx) < 5 && setFlipped((f) => !f)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label={flipped ? 'Kaart omdraaien naar de vraag' : 'Kaart omdraaien naar het antwoord'}
        className={cx(
          'relative grid min-h-64 touch-pan-y select-none place-items-center rounded-3xl border bg-surface p-8 shadow-paper transition-[border-color]',
          dx > 40 ? 'border-success' : dx < -40 ? 'border-danger' : 'border-line',
        )}
        style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: start.current === null ? 'transform 0.2s' : 'none' }}
      >
        <span className="absolute left-4 top-3 text-xs uppercase tracking-[0.14em] text-muted">{flipped ? 'Antwoord' : 'Vraag'}</span>
        <div className="rise-in" key={String(flipped)}>
          {flipped ? (
            <Prompt text={card.answer} lang={answerLang(card, item)} hint={item.example ?? item.note} />
          ) : (
            <Prompt text={card.prompt} lang={promptLang(card, item)} hint={card.dir === 'vooruit' ? item.word_type : null} />
          )}
        </div>
      </button>

      {flipped ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onGrade(false)} className="h-14 border-danger/40">
            <X className="size-5 text-danger" aria-hidden="true" /> Wist ik niet
          </Button>
          <Button variant="outline" onClick={() => onGrade(true)} className="h-14 border-success/40">
            <Check className="size-5 text-success" aria-hidden="true" /> Wist ik
          </Button>
        </div>
      ) : (
        <Button variant="accent" onClick={() => setFlipped(true)} className="h-14">
          Omdraaien
        </Button>
      )}
      <p className="text-center text-xs text-muted md:hidden">{flipped ? 'Of swipe: rechts = wist ik, links = wist ik niet' : 'Tik op de kaart om om te draaien'}</p>
    </div>
  )
}

function Feedback({ ok, card, item, given, onNext, extra }: { ok: boolean; card: Card; item: SessionItem; given?: string; onNext: () => void; extra?: ReactNode }) {
  useKeys(
    (e) => {
      if (e.key === 'Enter' && !extra) {
        e.preventDefault()
        onNext()
      }
    },
    [onNext, extra],
  )
  return (
    <div role="status" className={cx('rise-in flex flex-col gap-3 rounded-2xl border p-4', ok ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10')}>
      <p className="flex items-center gap-2 font-semibold">
        {ok ? <Check className="size-5 text-success" aria-hidden="true" /> : <X className="size-5 text-danger" aria-hidden="true" />}
        {ok ? 'Goed!' : 'Helaas'}
      </p>
      {!ok && (
        <p>
          Het antwoord is <strong lang={answerLang(card, item) ?? undefined}>{card.answer}</strong>
          {given ? <span className="text-muted"> (jij: {given})</span> : null}
        </p>
      )}
      {(item.example || item.note) && <p className="text-sm text-muted">{item.example ?? item.note}</p>}
      {extra ?? (
        <Button onClick={onNext} className="self-start" autoFocus>
          Verder
        </Button>
      )}
    </div>
  )
}

function TypeView({ card, item, check, onResult }: { card: Card; item: SessionItem; check: StudySettings['check'] & { splitAlternatives: boolean }; onResult: (ok: boolean) => void }) {
  const [value, setValue] = useState('')
  const [result, setResult] = useState<CheckResult | null>(null)
  const [final, setFinal] = useState<boolean | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (final !== null) return onResult(final)
    if (result) return
    const r = checkAnswer(value, card.answer, check)
    setResult(r)
    if (r.verdict !== 'almost') setFinal(r.verdict === 'correct')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-paper">
        <Prompt text={card.prompt} lang={promptLang(card, item)} hint={card.dir === 'vooruit' ? item.word_type : null} />
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="antwoord" className="sr-only">Jouw antwoord</label>
        <input
          ref={inputRef}
          id="antwoord"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={!!result}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          lang={answerLang(card, item) ?? undefined}
          placeholder="Typ je antwoord"
          className={cx(
            'h-14 flex-1 rounded-xl border bg-surface px-4 text-lg',
            final === true ? 'border-success' : final === false ? 'border-danger' : 'border-line',
          )}
        />
        {!result && (
          <Button type="submit" variant="accent" className="h-14">
            Check
          </Button>
        )}
      </form>

      {result?.verdict === 'almost' && final === null && (
        <div role="status" className="rise-in flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <p className="font-semibold">Bijna goed{result.reason === 'accent' ? ' — let op de accenten' : ' — een kleine typefout'}</p>
          <p>
            Het antwoord is <strong>{card.answer}</strong> <span className="text-muted">(jij: {value})</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFinal(true)}>Toch goed rekenen</Button>
            <Button onClick={() => setFinal(false)} autoFocus>Fout rekenen</Button>
          </div>
        </div>
      )}
      {final !== null && <Feedback ok={final} card={card} item={item} given={final ? undefined : value} onNext={() => onResult(final)} />}
    </div>
  )
}

function ChoiceView({ card, item, pool, onResult }: { card: Card; item: SessionItem; pool: SessionItem[]; onResult: (ok: boolean) => void }) {
  const options = useMemo(() => buildOptions(card, pool), [card, pool])
  const [picked, setPicked] = useState<string | null>(null)
  const ok = picked === card.answer

  useKeys(
    (e) => {
      const n = Number(e.key)
      if (!picked && n >= 1 && n <= options.length) setPicked(options[n - 1])
    },
    [picked, options],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl border border-line bg-surface p-8 shadow-paper">
        <Prompt text={card.prompt} lang={promptLang(card, item)} hint={card.dir === 'vooruit' ? item.word_type : null} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o, i) => {
          const state = !picked ? 'idle' : o === card.answer ? 'right' : o === picked ? 'wrong' : 'dim'
          return (
            <button
              key={o}
              type="button"
              disabled={!!picked}
              onClick={() => setPicked(o)}
              className={cx(
                'flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                state === 'idle' && 'border-line bg-surface hover:border-accent',
                state === 'right' && 'border-success bg-success/10',
                state === 'wrong' && 'border-danger bg-danger/10',
                state === 'dim' && 'border-line bg-surface opacity-50',
              )}
            >
              <kbd className="hidden size-6 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-xs text-muted md:grid">{i + 1}</kbd>
              <span lang={answerLang(card, item) ?? undefined}>{o}</span>
            </button>
          )
        })}
      </div>
      {picked && <Feedback ok={ok} card={card} item={item} onNext={() => onResult(ok)} />}
    </div>
  )
}
