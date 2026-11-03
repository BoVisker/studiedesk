import { AlertTriangle, ListPlus } from 'lucide-react'
import { Alert, Button, Card, CardTitle } from '@/components/ui'
import { Formula, MathText } from './MathText'
import { Quiz } from './Quiz'
import type { SummaryContent, WorkedContent } from './types'

export function SummaryView({ content, onMakeList, makingList }: { content: SummaryContent; onMakeList?: () => void; makingList?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {content.waarschuwing && <Alert tone="warning">{content.waarschuwing}</Alert>}

      <Card className="flex flex-col gap-5">
        {content.secties.map((s, i) => (
          <section key={i}>
            <h2 className="mb-2 font-display text-xl font-semibold">{s.kop}</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
              {s.punten.map((p, j) => (
                <li key={j}>
                  <MathText text={p} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Card>

      {content.kernbegrippen.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Kernbegrippen</CardTitle>
            {onMakeList && (
              <Button variant="outline" size="sm" onClick={onMakeList} loading={makingList}>
                <ListPlus className="size-4" aria-hidden="true" /> Maak begrippenlijst
              </Button>
            )}
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,auto)_1fr]">
            {content.kernbegrippen.map((b, i) => (
              <div key={i} className="contents">
                <dt className="font-semibold">{b.term}</dt>
                <dd className="text-muted sm:text-text">{b.uitleg}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {content.formules.length > 0 && (
        <Card className="flex flex-col gap-3">
          <CardTitle>Formules</CardTitle>
          <ul className="flex flex-col gap-4">
            {content.formules.map((f, i) => (
              <li key={i} className="border-l-4 border-accent pl-3">
                <p className="text-sm font-semibold">{f.naam}</p>
                <Formula tex={f.latex} display className="text-lg" />
                <p className="text-sm text-muted">
                  <MathText text={f.uitleg} />
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <CardTitle>Oefenvragen</CardTitle>
        <Quiz questions={content.vragen} />
      </Card>
    </div>
  )
}

export function CheckWarning() {
  return (
    <Alert tone="warning">
      <span className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Controleer deze uitwerking zelf.</strong> De AI kan rekenfouten maken of de opgave verkeerd lezen. Reken de stappen na, vergelijk met je antwoordenboek
          en vraag het je docent als iets niet klopt.
        </span>
      </span>
    </Alert>
  )
}

export function WorkedView({ content }: { content: WorkedContent }) {
  return (
    <div className="flex flex-col gap-4">
      <CheckWarning />
      {content.waarschuwing && <Alert tone="warning">{content.waarschuwing}</Alert>}
      {content.opgaven.map((o, i) => (
        <Card key={i} className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.14em] text-accent">Opgave {o.nummer ?? i + 1}</p>
            <p className="mt-1">
              <MathText text={o.opgave} />
            </p>
            {o.onzeker && <p className="mt-2 text-sm text-warning">Deze opgave was lastig te lezen; kijk extra goed of hij klopt met de foto.</p>}
          </div>
          <ol className="flex flex-col gap-3">
            {o.stappen.map((s, j) => (
              <li key={j} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-on-accent" aria-hidden="true">
                  {j + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <span className="sr-only">Stap {j + 1}: </span>
                    {s.titel}
                  </p>
                  <p className="text-sm">
                    <MathText text={s.uitleg} />
                  </p>
                  {s.berekening && <Formula tex={`\\begin{aligned}${s.berekening}\\end{aligned}`} display className="mt-1 rounded-lg bg-surface-2 px-3" />}
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl border-2 border-accent px-4 py-3">
            <p className="text-sm font-semibold text-accent">Antwoord</p>
            <MathText text={o.antwoord} />
          </div>
          <p className="text-sm text-muted">
            <span className="font-semibold">Zelf controleren:</span> <MathText text={o.controle} />
          </p>
        </Card>
      ))}
    </div>
  )
}
