import { Check, Eye, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { Button, cx } from '@/components/ui'
import { checkAnswer } from '@/features/study/answerCheck'
import { MathText } from './MathText'
import { normalizeQuestion, type Question } from './types'

// Oefenvragen met directe controle:
// - meerkeuze: meteen goed/fout;
// - kort: getypt antwoord, gecontroleerd met dezelfde regels als bij woordjes;
// - open: modelantwoord tonen, daarna zelf beoordelen (geen extra AI-call).
type Outcome = 'goed' | 'fout'

/**
 * Kort antwoord: varianten staan gescheiden door " / ". Niet splitsen op komma's,
 * want "3,5" is een decimaal getal. Kleine typefouten en accenten tellen als goed.
 */
export function shortAnswerCorrect(given: string, expected: string) {
  const plain = expected.replace(/\\[()[\]]/g, '')
  return plain
    .split(/\s+\/\s+/)
    .some((alt) => alt.trim() && checkAnswer(given, alt.trim(), { splitAlternatives: false, ignoreAccents: true }).verdict !== 'wrong')
}

export function Quiz({ questions }: { questions: Question[] }) {
  const [outcomes, setOutcomes] = useState<(Outcome | null)[]>(() => questions.map(() => null))
  const [round, setRound] = useState(0)
  const qs = questions.map(normalizeQuestion)
  const done = outcomes.filter(Boolean).length
  const right = outcomes.filter((o) => o === 'goed').length

  const set = (i: number, o: Outcome) => setOutcomes((prev) => prev.map((p, j) => (j === i ? o : p)))
  const reset = () => {
    setOutcomes(qs.map(() => null))
    setRound((r) => r + 1)
  }

  if (!qs.length) return <p className="text-sm text-muted">Geen oefenvragen bij deze stof.</p>

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {qs.map((q, i) => (
          <li key={`${round}-${i}`} className="rounded-xl border border-line p-4">
            <p className="mb-3 font-medium">
              <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
              <MathText text={q.vraag} />
            </p>
            {q.soort === 'meerkeuze' ? (
              <ChoiceQuestion q={q} onResult={(o) => set(i, o)} />
            ) : q.soort === 'kort' ? (
              <ShortQuestion q={q} onResult={(o) => set(i, o)} />
            ) : (
              <OpenQuestion q={q} onResult={(o) => set(i, o)} />
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <p className="text-sm text-muted">
          {done === qs.length ? (
            <>
              Klaar: <strong className="text-text">{right} van {qs.length}</strong> goed.
            </>
          ) : (
            `${done} van ${qs.length} beantwoord`
          )}
        </p>
        {done > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" /> Opnieuw
          </Button>
        )}
      </div>
    </div>
  )
}

function Feedback({ ok, q, children }: { ok: boolean | null; q: Question; children?: React.ReactNode }) {
  return (
    <div className={cx('mt-3 rounded-lg px-3 py-2 text-sm', ok === null ? 'bg-surface-2' : ok ? 'bg-success/10' : 'bg-danger/10')}>
      {ok !== null && (
        <p className="mb-1 inline-flex items-center gap-1 font-semibold">
          {ok ? <Check className="size-4 text-success" aria-hidden="true" /> : <X className="size-4 text-danger" aria-hidden="true" />}
          {ok ? 'Goed!' : 'Helaas.'}
        </p>
      )}
      {children}
      <p className="mt-1 text-muted">
        <MathText text={q.uitleg} />
      </p>
    </div>
  )
}

function ChoiceQuestion({ q, onResult }: { q: Question; onResult: (o: Outcome) => void }) {
  const [picked, setPicked] = useState<number | null>(null)
  const choose = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    onResult(i === q.juist ? 'goed' : 'fout')
  }
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Antwoordopties">
        {q.opties.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => choose(i)}
            disabled={picked !== null}
            className={cx(
              'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
              picked === null && 'border-line hover:border-accent hover:bg-surface-2',
              picked !== null && i === q.juist && 'border-success bg-success/10',
              picked === i && i !== q.juist && 'border-danger bg-danger/10',
              picked !== null && i !== q.juist && picked !== i && 'border-line opacity-60',
            )}
          >
            <span className="mr-2 font-semibold text-muted">{'ABCD'[i] ?? i + 1}</span>
            <MathText text={o} />
          </button>
        ))}
      </div>
      {picked !== null && <Feedback ok={picked === q.juist} q={q} />}
    </>
  )
}

function ShortQuestion({ q, onResult }: { q: Question; onResult: (o: Outcome) => void }) {
  const [value, setValue] = useState('')
  const [ok, setOk] = useState<boolean | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ok !== null || !value.trim()) return
    const good = shortAnswerCorrect(value, q.antwoord)
    setOk(good)
    onResult(good ? 'goed' : 'fout')
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={ok !== null}
          aria-label="Jouw antwoord"
          placeholder="Typ je antwoord"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm" disabled={ok !== null || !value.trim()}>
          Controleer
        </Button>
      </div>
      {ok !== null && (
        <Feedback ok={ok} q={q}>
          <p>
            Antwoord: <MathText text={q.antwoord} className="font-medium" />
          </p>
        </Feedback>
      )}
    </form>
  )
}

function OpenQuestion({ q, onResult }: { q: Question; onResult: (o: Outcome) => void }) {
  const [value, setValue] = useState('')
  const [shown, setShown] = useState(false)
  const [judged, setJudged] = useState<Outcome | null>(null)
  const judge = (o: Outcome) => {
    setJudged(o)
    onResult(o)
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        aria-label="Jouw antwoord"
        placeholder="Schrijf eerst je eigen antwoord (optioneel)"
        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      />
      {!shown ? (
        <Button variant="outline" size="sm" className="self-start" onClick={() => setShown(true)}>
          <Eye className="size-4" aria-hidden="true" /> Toon modelantwoord
        </Button>
      ) : (
        <Feedback ok={judged === null ? null : judged === 'goed'} q={q}>
          <p>
            <span className="font-medium">Modelantwoord:</span> <MathText text={q.antwoord} />
          </p>
          {judged === null && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-muted">Had je het goed?</span>
              <Button size="sm" variant="outline" onClick={() => judge('goed')}>
                <Check className="size-4" aria-hidden="true" /> Goed
              </Button>
              <Button size="sm" variant="outline" onClick={() => judge('fout')}>
                <X className="size-4" aria-hidden="true" /> Niet goed
              </Button>
            </div>
          )}
        </Feedback>
      )}
    </div>
  )
}
