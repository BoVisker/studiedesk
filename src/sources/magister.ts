// Magister: bewust een lege stub. Er is géén netwerk- of inlogcode.
//
// Harde regels (zie docs/magister-later.md):
// - nooit om een Magister-gebruikersnaam of -wachtwoord vragen of die bewaren;
// - geen onofficiële API, geen scraping, niet het client-ID van Magisters eigen app;
// - nooit toegangs- of refresh-tokens van een schoolaccount op onze server bewaren.
//
// Pas als er een officiële, door Magister/de school goedgekeurde koppeling is,
// komt hier een implementatie. Tot die tijd blijft deze bron uit, ook als
// VITE_FEATURE_MAGISTER per ongeluk op "true" staat.
import { FEATURE_MAGISTER } from '@/lib/featureFlags'
import type { CalendarSource, GradeSource } from './types'

/** Er bestaat nog geen officiële koppeling; deze constante gaat pas om samen met een echte implementatie. */
export const MAGISTER_IMPLEMENTED = false

const enabled = () => FEATURE_MAGISTER && MAGISTER_IMPLEMENTED

export const magisterGradeSource: GradeSource = {
  id: 'magister',
  label: 'Magister',
  description: 'Nog niet beschikbaar. Gebruik een screenshot van je cijferlijst.',
  mode: 'sync',
  isEnabled: enabled,
  async fetchGrades() {
    return []
  },
}

export const magisterCalendarSource: CalendarSource = {
  id: 'magister',
  label: 'Magister',
  description: 'Nog niet beschikbaar. Gebruik de agenda-link (ICS) van je school.',
  mode: 'sync',
  isEnabled: enabled,
  async fetchItems() {
    return []
  },
}
