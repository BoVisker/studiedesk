import type { CheckOptions } from './answerCheck'
import type { DirectionMode, StudyItem } from './session'
import type { SrsState } from './srs'

export type Mode = 'flashcards' | 'typen' | 'meerkeuze' | 'toets'

export type StudySettings = {
  mode: Mode
  direction: DirectionMode
  check: CheckOptions
  /** Aantal vragen in toets-modus. */
  count: number
}

/** Item zoals een sessie het nodig heeft: inhoud, SRS-stand en talen voor spraak. */
export type SessionItem = StudyItem & SrsState & { termLang: string | null; definitionLang: string | null }

export type SessionResult = {
  mode: Mode
  total: number
  correct: number
  wrongIds: string[]
  grade: number | null
  startedAt: Date
  endedAt: Date
  unsaved: number
}

const KEY = 'studiedesk-study-settings'

export function loadSettings(fallback: StudySettings): StudySettings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && typeof raw === 'object') return { ...fallback, ...raw, mode: fallback.mode, check: { ...fallback.check, ...raw.check } }
  } catch {
    /* negeren */
  }
  return fallback
}

export function storeSettings(s: StudySettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* privémodus */
  }
}
