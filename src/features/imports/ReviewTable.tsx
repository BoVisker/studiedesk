import { AlertTriangle, ArrowLeftRight, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button, cx } from '@/components/ui'

export type ReviewRow = {
  key: string
  term: string
  definition: string
  note: string
  word_type: string
  example: string
  uncertain: boolean
}

let seq = 0
export const newReviewRow = (r: Partial<ReviewRow> = {}): ReviewRow => ({
  key: `rv${seq++}`,
  term: '',
  definition: '',
  note: '',
  word_type: '',
  example: '',
  uncertain: false,
  ...r,
})

type Props = { rows: ReviewRow[]; onChange: (r: ReviewRow[]) => void; labels: { term: string; definition: string } }

export function ReviewTable({ rows, onChange, labels }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const uncertain = rows.filter((r) => r.uncertain).length
  const set = (key: string, patch: Partial<ReviewRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm" aria-live="polite">
          {rows.length} {rows.length === 1 ? 'regel' : 'regels'}
          {uncertain > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="size-4" aria-hidden="true" /> {uncertain} om te controleren
            </span>
          )}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(rows.map((r) => ({ ...r, term: r.definition, definition: r.term })))}>
          <ArrowLeftRight className="size-4" aria-hidden="true" /> Kolommen omwisselen
        </Button>
      </div>

      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={r.key} className={cx('rounded-xl border p-2', r.uncertain ? 'border-warning bg-warning/10' : 'border-line')}>
            <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input aria-label={`${labels.term} ${i + 1}`} value={r.term} onChange={(e) => set(r.key, { term: e.target.value })} placeholder={labels.term} className="h-10 rounded-lg border border-line bg-surface px-3" />
              <input aria-label={`${labels.definition} ${i + 1}`} value={r.definition} onChange={(e) => set(r.key, { definition: e.target.value })} placeholder={labels.definition} className="col-start-1 h-10 rounded-lg border border-line bg-surface px-3 sm:col-start-auto" />
              <div className="row-span-2 flex items-center gap-1 self-center sm:row-span-1 sm:col-start-3 sm:row-start-1">
                {r.uncertain && (
                  <button type="button" onClick={() => set(r.key, { uncertain: false })} className="grid size-9 place-items-center rounded-lg text-warning hover:bg-surface-2" aria-label={`Regel ${i + 1} gecontroleerd`} title="Markeer als gecontroleerd">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(open === r.key ? null : r.key)} aria-expanded={open === r.key} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label={`Extra velden regel ${i + 1}`}>
                  <ChevronDown className={cx('size-4 transition', open === r.key && 'rotate-180')} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => onChange(rows.filter((x) => x.key !== r.key))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Regel ${i + 1} verwijderen`}>
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {open === r.key && (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input aria-label="Opmerking" value={r.note} onChange={(e) => set(r.key, { note: e.target.value })} placeholder="Opmerking (bijv. meervoud, genitief)" className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" />
                <input aria-label="Woordsoort" value={r.word_type} onChange={(e) => set(r.key, { word_type: e.target.value })} placeholder="Woordsoort" className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" />
                <input aria-label="Voorbeeldzin" value={r.example} onChange={(e) => set(r.key, { example: e.target.value })} placeholder="Voorbeeldzin" className="h-9 rounded-lg border border-line bg-surface px-3 text-sm" />
              </div>
            )}
            {!open && (r.note || r.word_type) && (
              <p className="mt-1 px-1 text-xs text-muted">{[r.word_type, r.note].filter(Boolean).join(' · ')}</p>
            )}
          </li>
        ))}
      </ol>
      <Button type="button" variant="ghost" className="self-start" onClick={() => onChange([...rows, newReviewRow()])}>
        <Plus className="size-4" aria-hidden="true" /> Regel toevoegen
      </Button>
    </div>
  )
}
