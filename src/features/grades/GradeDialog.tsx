import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, Field, Select } from '@/components/ui'
import { subjects, subjectsBySlug } from '@/config/subjects'
import type { SubjectSlug } from '@/design/subjectPalette'
import { saveGrade, type Grade } from './api'
import { formatGrade, parseGrade, parseWeight } from './calc'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** Bestaand cijfer bewerken; anders nieuw. */
  grade?: Grade | null
  subject?: SubjectSlug
  /** Vakken om uit te kiezen (standaard: alle). */
  subjectOptions?: SubjectSlug[]
}

const today = () => new Date().toISOString().slice(0, 10)

export function GradeDialog({ open, onClose, onSaved, grade, subject, subjectOptions }: Props) {
  const [subj, setSubj] = useState<SubjectSlug>(subject ?? 'nederlands')
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [weight, setWeight] = useState('1')
  const [date, setDate] = useState(today())
  const [counts, setCounts] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubj((grade?.subject as SubjectSlug) ?? subject ?? subjectOptions?.[0] ?? 'nederlands')
    setDescription(grade?.description ?? '')
    setValue(grade ? formatGrade(grade.grade, 2).replace(/,?0+$/, '') : '')
    setWeight(grade ? String(grade.weight).replace('.', ',') : '1')
    setDate(grade?.graded_on ?? today())
    setCounts(grade?.counts ?? true)
    setError(null)
  }, [open, grade, subject, subjectOptions])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const g = parseGrade(value)
    const w = parseWeight(weight)
    if (!description.trim()) return setError('Geef een omschrijving, bijv. "SO hoofdstuk 3".')
    if (g === null) return setError('Vul een cijfer in tussen 1 en 10, bijv. 7,4.')
    if (w === null) return setError('Vul een weging in groter dan 0, bijv. 1 of 2.')
    setBusy(true)
    try {
      await saveGrade({ subject: subj, description: description.trim().slice(0, 200), grade: g, weight: w, graded_on: date || null, counts }, grade?.id)
      onSaved()
      onClose()
    } catch {
      setError('Opslaan is niet gelukt. Probeer het opnieuw.')
    }
    setBusy(false)
  }

  const options = (subjectOptions?.length ? subjectOptions.map((s) => subjectsBySlug[s]) : subjects).map((s) => ({ value: s.slug, label: s.name }))

  return (
    <Dialog open={open} onClose={onClose} title={grade ? 'Cijfer bewerken' : 'Cijfer toevoegen'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Select label="Vak" value={subj} onChange={(e) => setSubj(e.target.value as SubjectSlug)} options={options} />
        <Field label="Omschrijving" required maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="bijv. SO hoofdstuk 3" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cijfer" required inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="7,4" />
          <Field label="Weging" required inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} hint="Hoe vaak telt het mee" />
        </div>
        <Field label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={counts} onChange={(e) => setCounts(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>
            Telt mee in het gemiddelde <span className="text-muted">(uitzetten voor bijv. een oefentoets)</span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button type="submit" variant="accent" loading={busy}>Opslaan</Button>
        </div>
      </form>
    </Dialog>
  )
}
