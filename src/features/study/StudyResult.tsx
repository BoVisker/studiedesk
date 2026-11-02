import { RotateCcw, Trophy } from 'lucide-react'
import { Alert, Button, Card } from '@/components/ui'
import type { SessionItem, SessionResult } from './types'

type Props = {
  result: SessionResult
  items: SessionItem[]
  onRetryWrong: () => void
  onRestart: () => void
  onBack: () => void
  sessionSaveFailed: boolean
}

export function StudyResult({ result, items, onRetryWrong, onRestart, onBack, sessionSaveFailed }: Props) {
  const wrong = items.filter((i) => result.wrongIds.includes(i.id))
  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0
  const minutes = Math.max(1, Math.round((result.endedAt.getTime() - result.startedAt.getTime()) / 60000))

  return (
    <div className="rise-in flex flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 py-8 text-center">
        <Trophy className="size-8 text-accent" aria-hidden="true" />
        {result.grade !== null ? (
          <>
            <p className="text-sm uppercase tracking-[0.14em] text-muted">Je cijfer</p>
            <p className={`font-display text-6xl font-semibold ${result.grade < 5.5 ? 'text-danger' : 'text-accent'}`}>{result.grade.toFixed(1).replace('.', ',')}</p>
          </>
        ) : (
          <p className="font-display text-5xl font-semibold text-accent">{pct}%</p>
        )}
        <p className="text-muted">
          {result.correct} van {result.total} in één keer goed · {minutes} min
        </p>
      </Card>

      {result.unsaved > 0 && (
        <Alert tone="warning">
          {result.unsaved} {result.unsaved === 1 ? 'antwoord is' : 'antwoorden zijn'} niet opgeslagen in je herhaalschema (geen verbinding?). Je score hierboven klopt wel.
        </Alert>
      )}
      {sessionSaveFailed && <Alert tone="warning">De sessie kon niet in je statistieken worden opgeslagen.</Alert>}

      {wrong.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Nog even oefenen ({wrong.length})</h2>
          <ul className="divide-y divide-line text-sm">
            {wrong.map((w) => (
              <li key={w.id} className="grid grid-cols-2 gap-2 py-2">
                <span>{w.term}</span>
                <span className="text-muted">{w.definition}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {wrong.length > 0 && (
          <Button variant="accent" onClick={onRetryWrong} autoFocus>
            <RotateCcw className="size-4" aria-hidden="true" /> Alleen de foute herhalen
          </Button>
        )}
        <Button variant={wrong.length ? 'outline' : 'accent'} onClick={onRestart} autoFocus={!wrong.length}>
          Opnieuw
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Klaar
        </Button>
      </div>
    </div>
  )
}
