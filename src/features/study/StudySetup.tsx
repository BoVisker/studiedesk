import { Play } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button, Card, cx } from '@/components/ui'
import type { DirectionMode } from './session'
import type { Mode, StudySettings } from './types'

const modeLabels: Record<Mode, string> = { flashcards: 'Flashcards', typen: 'Typen', meerkeuze: 'Meerkeuze', toets: 'Toets' }

type Props = {
  settings: StudySettings
  onChange: (s: StudySettings) => void
  onStart: () => void
  itemCount: number
  labels: { term: string; definition: string }
  isFormula: boolean
}

export function StudySetup({ settings, onChange, onStart, itemCount, labels, isFormula }: Props) {
  const set = (patch: Partial<StudySettings>) => onChange({ ...settings, ...patch })
  const setCheck = (patch: Partial<StudySettings['check']>) => onChange({ ...settings, check: { ...settings.check, ...patch } })
  const tooFewForChoice = itemCount < 2 && (settings.mode === 'meerkeuze')

  return (
    <Card className="rise-in flex flex-col gap-6">
      <Segmented
        label="Leervorm"
        value={settings.mode}
        onChange={(mode) => set({ mode })}
        options={(Object.keys(modeLabels) as Mode[]).map((m) => ({ value: m, label: modeLabels[m] }))}
      />
      <Segmented<DirectionMode>
        label="Richting"
        value={settings.direction}
        onChange={(direction) => set({ direction })}
        options={[
          { value: 'vooruit', label: `${labels.term} → ${labels.definition.toLowerCase()}` },
          { value: 'achteruit', label: `${labels.definition} → ${labels.term.toLowerCase()}` },
          { value: 'gemixt', label: 'Gemixt' },
        ]}
      />

      {settings.mode === 'toets' && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Aantal vragen: {Math.min(settings.count, itemCount)}</span>
          <input
            type="range"
            min={Math.min(5, itemCount)}
            max={itemCount}
            value={Math.min(settings.count, itemCount)}
            onChange={(e) => set({ count: Number(e.target.value) })}
            className="accent-[var(--accent)]"
          />
        </label>
      )}

      {(settings.mode === 'typen' || settings.mode === 'toets') && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-sm font-medium">Nakijken</legend>
          <Toggle checked={settings.check.ignoreCase} onChange={(v) => setCheck({ ignoreCase: v })}>Hoofdletters negeren</Toggle>
          <Toggle checked={settings.check.ignoreAccents} onChange={(v) => setCheck({ ignoreAccents: v })}>
            Accenten negeren <span className="text-muted">(é, ü, ñ, ß …)</span>
          </Toggle>
          <Toggle checked={settings.check.allowAlmost} onChange={(v) => setCheck({ allowAlmost: v })}>
            “Bijna goed” bij kleine typefouten
          </Toggle>
          {!isFormula && <p className="text-xs text-muted">Meerdere antwoorden (komma/puntkomma) en (haakjes) worden altijd herkend.</p>}
        </fieldset>
      )}

      {tooFewForChoice && <p className="text-sm text-warning">Meerkeuze heeft minstens 2 regels nodig; je krijgt typvragen.</p>}

      <Button variant="accent" onClick={onStart} className="self-start" autoFocus>
        <Play className="size-4" aria-hidden="true" /> Start ({settings.mode === 'toets' ? Math.min(settings.count, itemCount) : itemCount})
      </Button>
      <p className="hidden text-xs text-muted md:block">Sneltoetsen: spatie = omdraaien, 1/2 of ←/→ = fout/goed, 1–4 = meerkeuze, Enter = verder.</p>
    </Card>
  )
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx('flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition', value === o.value ? 'bg-surface font-semibold shadow-paper' : 'text-muted hover:text-text')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      <span>{children}</span>
    </label>
  )
}
