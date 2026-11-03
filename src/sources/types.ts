// Bron-adapters: elke manier waarop cijfers of agenda-items binnenkomen is een
// bron met een vaste id. Geïmporteerde rijen krijgen een external_id; de
// database weigert dezelfde (user, source, external_id) twee keer.
import type { SubjectSlug } from '@/design/subjectPalette'

export type SourceId = 'manual' | 'screenshot' | 'ics' | 'magister'

/**
 * - invoer: de gebruiker typt het zelf in;
 * - import: de gebruiker levert een bestand of foto, wij zetten het om (met controlescherm);
 * - sync: de bron haalt zelf gegevens op. Alleen Magister, en die staat uit.
 */
export type SourceMode = 'invoer' | 'import' | 'sync'

export type GradeInput = {
  subject: SubjectSlug
  description: string
  grade: number
  weight: number
  graded_on: string | null
  counts: boolean
  source: SourceId
  external_id: string | null
}

export type CalendarItemInput = {
  subject: SubjectSlug | null
  title: string
  starts_on: string
  source: SourceId
  external_id: string | null
}

type SourceInfo = {
  id: SourceId
  label: string
  description: string
  mode: SourceMode
  /** Beschikbaar in deze build en voor deze gebruiker. */
  isEnabled(): boolean
}

export interface GradeSource extends SourceInfo {
  /** Alleen sync-bronnen halen zelf cijfers op. */
  fetchGrades?(): Promise<GradeInput[]>
}

export interface CalendarSource extends SourceInfo {
  /** Alleen sync-bronnen halen zelf agenda-items op. */
  fetchItems?(): Promise<CalendarItemInput[]>
}
