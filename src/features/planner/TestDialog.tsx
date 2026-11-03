import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, Field, Select } from '@/components/ui'
import { subjects } from '@/config/subjects'
import type { SubjectSlug } from '@/design/subjectPalette'
import { saveTest, type TestRow } from './api'
import { isoDate } from './planner'

type Props = { open: boolean; onClose: () => void; onSaved: () => void; test?: TestRow | null; subjectOptions?: SubjectSlug[] }

const effortOptions = [
  { value: '1', label: '1 (even doornemen)' },
  { value: '2', label: '2' },
  { value: '3', label: '3 (normaal)' },
  { value: '4', label: '4' },
  { value: '5', label: '5 (grote toets)' },
  { value: '7', label: '7' },
  { value: '10', label: '10 (examen)' },
]

export function TestDialog({ open, onClose, onSaved, test, subjectOptions }: Props) {
  const [subject, setSubject] = useState<SubjectSlug>('nederlands')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [effort, setEffort] = useState('3')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubject((test?.subject as SubjectSlug) ?? subjectOptions?.[0] ?? 'nederlands')
    setTitle(test?.title ?? '')
    setDate(test?.test_date ?? isoDate(new Date()))
    setEffort(String(test?.effort ?? 3))
    setError(null)
  }, [open, test, subjectOptions])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Geef een omschrijving, bijv. "PW hoofdstuk 3".')
    if (!date) return setError('Kies een datum.')
    setBusy(true)
    try {
      await saveTest({ subject, title: title.trim().slice(0, 200), test_date: date, effort: Number(effort) }, test?.id)
      onSaved()
      onClose()
    } catch {
      setError('Opslaan is niet gelukt. Probeer het opnieuw.')
    }
    setBusy(false)
  }

  const options = (subjectOptions?.length ? subjects.filter((s) => subjectOptions.includes(s.slug)) : subjects).map((s) => ({ value: s.slug, label: s.name }))

  return (
    <Dialog open={open} onClose={onClose} title={test ? 'Toets bewerken' : 'Toets toevoegen'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Select label="Vak" value={subject} onChange={(e) => setSubject(e.target.value as SubjectSlug)} options={options} />
        <Field label="Wat voor toets" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bijv. PW hoofdstuk 3" />
        <Field label="Datum" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="Hoeveel leermomenten" value={effort} onChange={(e) => setEffort(e.target.value)} options={effortOptions} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
          <Button type="submit" variant="accent" loading={busy}>Opslaan</Button>
        </div>
      </form>
    </Dialog>
  )
}
