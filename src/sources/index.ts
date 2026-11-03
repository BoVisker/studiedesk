// Register van alle bronnen. De UI toont alleen bronnen waarvoor isEnabled() true is.
import { magisterCalendarSource, magisterGradeSource } from './magister'
import type { CalendarSource, GradeInput, GradeSource, SourceId } from './types'

export type { CalendarItemInput, CalendarSource, GradeInput, GradeSource, SourceId, SourceMode } from './types'

export const manualGradeSource: GradeSource = {
  id: 'manual',
  label: 'Zelf invoeren',
  description: 'Typ een cijfer met weging en datum.',
  mode: 'invoer',
  isEnabled: () => true,
}

export const screenshotGradeSource: GradeSource = {
  id: 'screenshot',
  label: 'Screenshot',
  description: 'Maak een screenshot van je cijferoverzicht; je controleert alles vóór het opslaan.',
  mode: 'import',
  isEnabled: () => true,
}

export const manualCalendarSource: CalendarSource = {
  id: 'manual',
  label: 'Zelf invoeren',
  description: 'Zet een toets met datum in de planner.',
  mode: 'invoer',
  isEnabled: () => true,
}

export const icsCalendarSource: CalendarSource = {
  id: 'ics',
  label: 'Agenda-link (ICS)',
  description: 'Importeer toetsen uit de agenda-link van je school.',
  mode: 'import',
  // Wordt in fase 7 (planner) gebouwd.
  isEnabled: () => false,
}

export const gradeSources: GradeSource[] = [manualGradeSource, screenshotGradeSource, magisterGradeSource]
export const calendarSources: CalendarSource[] = [manualCalendarSource, icsCalendarSource, magisterCalendarSource]

export const enabledGradeSources = () => gradeSources.filter((s) => s.isEnabled())
export const enabledCalendarSources = () => calendarSources.filter((s) => s.isEnabled())

export const sourceLabel = (id: SourceId) => gradeSources.find((s) => s.id === id)?.label ?? calendarSources.find((s) => s.id === id)?.label ?? id

/**
 * Stabiele id voor een geïmporteerd cijfer: dezelfde regel uit twee screenshots
 * levert dezelfde id, dus de database slaat hem maar één keer op.
 */
export function gradeExternalId(g: Pick<GradeInput, 'subject' | 'description' | 'grade' | 'graded_on' | 'weight'>): string {
  const desc = g.description.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim()
  return [g.subject, desc, g.grade.toFixed(2), g.weight.toFixed(2), g.graded_on ?? ''].join('|').slice(0, 300)
}
