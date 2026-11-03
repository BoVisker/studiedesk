// Vorm van notes.content; komt uit de Edge Function explain-photo.
// Tekstvelden kunnen wiskunde bevatten tussen \( … \) of \[ … \] (zie splitMath.ts).
import type { Database } from '@/types/database'

export type NoteKind = Database['public']['Enums']['note_kind']
export type NoteRow = Database['public']['Tables']['notes']['Row']
export type SummaryLength = 'kort' | 'normaal' | 'uitgebreid'

export type Question = {
  soort: 'meerkeuze' | 'kort' | 'open'
  vraag: string
  opties: string[]
  juist: number | null
  antwoord: string
  uitleg: string
}

export type SummaryContent = {
  titel: string
  secties: { kop: string; punten: string[] }[]
  kernbegrippen: { term: string; uitleg: string }[]
  formules: { naam: string; latex: string; uitleg: string }[]
  vragen: Question[]
  waarschuwing: string | null
}

export type WorkedContent = {
  opgaven: {
    nummer: string | null
    opgave: string
    stappen: { titel: string; uitleg: string; berekening: string | null }[]
    antwoord: string
    controle: string
    onzeker: boolean
  }[]
  waarschuwing: string | null
}

export const lengthLabels: Record<SummaryLength, string> = { kort: 'Kort', normaal: 'Normaal', uitgebreid: 'Uitgebreid' }

export const noteKindLabels: Record<NoteKind, { name: string; plural: string }> = {
  samenvatting: { name: 'Samenvatting', plural: 'Samenvattingen' },
  uitwerking: { name: 'Uitwerking', plural: 'Uitwerkingen' },
}

/** Meerkeuzevragen zonder geldige opties worden een open vraag; zo crasht de quiz nooit op rare AI-uitvoer. */
export function normalizeQuestion(q: Question): Question {
  if (q.soort === 'meerkeuze' && (q.opties.length < 2 || q.juist === null || q.juist < 0 || q.juist >= q.opties.length)) {
    return { ...q, soort: 'open', opties: [], juist: null }
  }
  return q
}
