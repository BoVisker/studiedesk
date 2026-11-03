// Register van alle blokken (widgets) op een vak-voorpagina. Titel en
// omschrijving zijn de standaard; de gebruiker kan de titel per vak wijzigen.
export const blockDefs = {
  'volgende-toets': { title: 'Volgende toets', description: 'Aftelling naar je eerstvolgende toets voor dit vak.', available: 'later' },
  voortgang: { title: 'Voortgang', description: 'Hoeveel je al beheerst en wat er nog openstaat.', available: 'now' },
  cijfers: { title: 'Cijfers', description: 'Je cijfers en gemiddelde voor dit vak.', available: 'now' },
  'vandaag-herhalen': { title: 'Vandaag te herhalen', description: 'Woorden en begrippen die vandaag aan de beurt zijn.', available: 'now' },
  woordenlijsten: { title: 'Woordenlijsten', description: 'Leer woorden met flashcards, typen en overhoren.', available: 'now' },
  grammatica: { title: 'Grammatica', description: 'Je eigen grammatica-notities en regels.', available: 'later' },
  'onregelmatige-werkwoorden': { title: 'Onregelmatige werkwoorden', description: 'Stamtijden oefenen.', available: 'later' },
  schrijfvaardigheid: { title: 'Schrijfvaardigheid', description: 'Je eigen teksten en feedback.', available: 'later' },
  leesboeken: { title: 'Leesboeken', description: 'Je leeslijst met notities per boek.', available: 'later' },
  vormleer: { title: 'Vormleer-trainer', description: 'Verbuigingen en vervoegingen als invultabel.', available: 'later' },
  vertaalteksten: { title: 'Vertaalteksten', description: 'Teksten met aantekeningen per zin.', available: 'later' },
  formulekaart: { title: 'Formulekaart', description: 'Formules per hoofdstuk, netjes gezet.', available: 'later' },
  'opgaven-logboek': { title: 'Opgaven-logboek', description: 'Foto van een opgave met stap-voor-stap-uitleg.', available: 'now' },
  stappenplannen: { title: 'Stappenplannen', description: 'Vaste aanpakken voor soorten opgaven.', available: 'later' },
  foutenlijst: { title: 'Foutenlijst', description: 'Fouten die je vaker maakt, zodat je ze herkent.', available: 'later' },
  grafiekplotter: { title: 'Grafiekplotter', description: 'Functies tekenen en onderzoeken.', available: 'later' },
  begrippen: { title: 'Begrippen', description: 'Begrippen met definities om te leren.', available: 'now' },
  'formules-eenheden': { title: 'Formules en eenheden', description: 'Formules met betekenis en eenheden.', available: 'now' },
  samenvattingen: { title: 'Samenvattingen', description: 'Samenvattingen en oefenvragen uit een foto van je boek.', available: 'now' },
  'reacties-molrekenen': { title: 'Reacties en molrekenen', description: 'Stoffen, reactievergelijkingen en rekenhulp.', available: 'later' },
  'formule-trainer': { title: 'Formule-trainer', description: 'Formules oefenen, inclusief eenheden.', available: 'later' },
  'processen-afbeeldingen': { title: 'Processen en afbeeldingen', description: 'Afbeeldingen met labels om te oefenen.', available: 'later' },
  tijdlijn: { title: 'Tijdlijn', description: 'Gebeurtenissen en tijdvakken op een rij.', available: 'later' },
  'jaartallen-trainer': { title: 'Jaartallen-trainer', description: 'Jaartallen en gebeurtenissen oefenen.', available: 'later' },
  'bronnen-argumenten': { title: 'Bronnen en argumenten', description: 'Filosofen, citaten en argumenten verzamelen.', available: 'later' },
  rekenvoorbeelden: { title: 'Rekenvoorbeelden en formules', description: 'Uitgewerkte voorbeelden om na te rekenen.', available: 'later' },
  kaartoefening: { title: 'Kaartoefening', description: 'Topografie oefenen.', available: 'later' },
  'code-snippets': { title: 'Code-snippets', description: 'Stukjes code met syntax-highlighting.', available: 'later' },
  aantekeningen: { title: 'Aantekeningen', description: 'Vrije notities.', available: 'later' },
  'uitleg-videos': { title: 'Uitlegvideo\u2019s', description: 'Zoek uitlegvideo\u2019s bij dit vak (YouTube).', available: 'now' },
} as const satisfies Record<string, { title: string; description: string; available: 'now' | 'later' }>

export type BlockId = keyof typeof blockDefs

export function isBlockId(v: unknown): v is BlockId {
  return typeof v === 'string' && v in blockDefs
}
