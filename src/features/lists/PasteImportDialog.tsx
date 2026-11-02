import { useMemo, useState } from 'react'
import { Alert, Button, Dialog, Select } from '@/components/ui'
import { parsePasted, separatorLabels, type ParsedRow, type Separator } from './importParser'

type Props = { open: boolean; onClose: () => void; onImport: (rows: ParsedRow[]) => void }

export function PasteImportDialog({ open, onClose, onImport }: Props) {
  const [text, setText] = useState('')
  const [sep, setSep] = useState<'auto' | Separator>('auto')
  const result = useMemo(() => parsePasted(text, sep === 'auto' ? undefined : sep), [text, sep])

  const done = () => {
    onImport(result.rows)
    setText('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Plakken uit tekst">
      <p className="text-sm text-muted">Eén woord per regel, met een tab, =, streepje, puntkomma of komma tussen woord en betekenis. Kopiëren uit Excel, Word of StudyGo werkt meestal direct.</p>
      <label htmlFor="plak-tekst" className="sr-only">Geplakte tekst</label>
      <textarea
        id="plak-tekst"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={'chien - hond\nchat - kat\nmaison - huis'}
        className="w-full rounded-xl border border-line bg-surface p-3 font-mono text-sm"
      />
      <Select
        label="Scheiding"
        value={sep}
        onChange={(e) => setSep(e.target.value as typeof sep)}
        options={[
          { value: 'auto', label: `Automatisch${sep === 'auto' && result.separator ? ` (${separatorLabels[result.separator]})` : ''}` },
          ...Object.entries(separatorLabels).map(([value, label]) => ({ value, label })),
        ]}
      />
      {text.trim() && (
        <Alert tone={result.rows.length ? 'info' : 'warning'}>
          {result.rows.length ? `${result.rows.length} regels herkend.` : 'Geen regels herkend. Kies hierboven de scheiding.'}
          {result.skipped.length > 0 && ` ${result.skipped.length} overgeslagen (geen scheiding gevonden).`}
        </Alert>
      )}
      {result.rows.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-xl border border-line text-sm" aria-label="Voorbeeld">
          {result.rows.slice(0, 50).map((r, i) => (
            <li key={i} className="grid grid-cols-2 gap-2 border-b border-line px-3 py-1.5 last:border-0">
              <span className="truncate">{r.term}</span>
              <span className="truncate text-muted">{r.definition}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Annuleren</Button>
        <Button onClick={done} disabled={!result.rows.length}>Toevoegen</Button>
      </div>
    </Dialog>
  )
}
