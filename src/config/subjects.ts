// Bron van waarheid voor alle vakken. Een vak = archetype + accentkleur + icoon
// + standaardblokken. Nieuwe blokken toevoegen? Eerst in blocks.ts registreren.
import type { SubjectSlug } from '@/design/subjectPalette'
import type { BlockId } from './blocks'

export type Archetype = 'moderne-taal' | 'klassieke-taal' | 'wiskunde' | 'natuurwetenschap' | 'maatschappij' | 'informatica'

export type SubjectIcon =
  | 'BookOpenText' | 'MessageSquareText' | 'Croissant' | 'Castle' | 'Sun' | 'Landmark' | 'Amphora'
  | 'Dices' | 'ChartSpline' | 'Calculator' | 'Sigma' | 'Hourglass' | 'Globe' | 'Leaf' | 'Atom'
  | 'FlaskConical' | 'TrendingUp' | 'Briefcase' | 'Code' | 'Lightbulb'

export type SubjectDef = {
  slug: SubjectSlug
  name: string
  archetype: Archetype
  icon: SubjectIcon
  /** Korte omschrijving van de nadruk, vooral voor wiskunde. */
  focus?: string
  /** Standaardblokken in weergavevolgorde. */
  blocks: BlockId[]
  /** Blokken die beschikbaar zijn maar standaard uit staan. */
  defaultOff?: BlockId[]
}

export const archetypeLabels: Record<Archetype, string> = {
  'moderne-taal': 'Moderne talen',
  'klassieke-taal': 'Klassieke talen',
  wiskunde: 'Wiskunde',
  natuurwetenschap: 'Natuurwetenschappen',
  maatschappij: 'Maatschappijvakken',
  informatica: 'Informatica',
}

// Elke vak-voorpagina begint en eindigt met dezelfde algemene blokken.
const head: BlockId[] = ['volgende-toets', 'voortgang']
const tail: BlockId[] = ['cijfers']

const archetypeBlocks: Record<Archetype, BlockId[]> = {
  'moderne-taal': ['vandaag-herhalen', 'woordenlijsten', 'grammatica', 'onregelmatige-werkwoorden', 'schrijfvaardigheid', 'leesboeken'],
  'klassieke-taal': ['vandaag-herhalen', 'woordenlijsten', 'vormleer', 'vertaalteksten', 'grammatica'],
  wiskunde: ['formulekaart', 'opgaven-logboek', 'stappenplannen', 'foutenlijst', 'grafiekplotter'],
  natuurwetenschap: ['begrippen', 'formules-eenheden', 'samenvattingen'],
  maatschappij: ['begrippen', 'samenvattingen'],
  informatica: ['begrippen', 'code-snippets', 'aantekeningen'],
}

function subject(
  slug: SubjectSlug,
  name: string,
  archetype: Archetype,
  icon: SubjectIcon,
  opts: { focus?: string; extra?: BlockId[]; defaultOff?: BlockId[] } = {},
): SubjectDef {
  return {
    slug,
    name,
    archetype,
    icon,
    focus: opts.focus,
    blocks: [...head, ...archetypeBlocks[archetype], ...(opts.extra ?? []), ...tail],
    defaultOff: opts.defaultOff,
  }
}

export const subjects: SubjectDef[] = [
  subject('nederlands', 'Nederlands', 'moderne-taal', 'BookOpenText', { defaultOff: ['onregelmatige-werkwoorden'] }),
  subject('engels', 'Engels', 'moderne-taal', 'MessageSquareText'),
  subject('frans', 'Frans', 'moderne-taal', 'Croissant', { defaultOff: ['leesboeken'] }),
  subject('duits', 'Duits', 'moderne-taal', 'Castle', { defaultOff: ['leesboeken'] }),
  subject('spaans', 'Spaans', 'moderne-taal', 'Sun', { defaultOff: ['leesboeken'] }),
  subject('latijn', 'Latijn', 'klassieke-taal', 'Landmark'),
  subject('grieks', 'Grieks', 'klassieke-taal', 'Amphora'),
  subject('wiskunde-a', 'Wiskunde A', 'wiskunde', 'Dices', { focus: 'Statistiek en kansrekening' }),
  subject('wiskunde-b', 'Wiskunde B', 'wiskunde', 'ChartSpline', { focus: 'Functies en afgeleiden' }),
  subject('wiskunde-c', 'Wiskunde C', 'wiskunde', 'Calculator', { focus: 'Functies en toepassingen' }),
  subject('wiskunde-d', 'Wiskunde D', 'wiskunde', 'Sigma', { focus: 'Verdieping' }),
  subject('geschiedenis', 'Geschiedenis', 'maatschappij', 'Hourglass', { extra: ['tijdlijn', 'jaartallen-trainer'] }),
  subject('aardrijkskunde', 'Aardrijkskunde', 'maatschappij', 'Globe', { extra: ['kaartoefening'], defaultOff: ['kaartoefening'] }),
  subject('biologie', 'Biologie', 'natuurwetenschap', 'Leaf', { extra: ['processen-afbeeldingen'] }),
  subject('natuurkunde', 'Natuurkunde', 'natuurwetenschap', 'Atom', { extra: ['formule-trainer'] }),
  subject('scheikunde', 'Scheikunde', 'natuurwetenschap', 'FlaskConical', { extra: ['reacties-molrekenen'] }),
  subject('economie', 'Economie', 'maatschappij', 'TrendingUp', { extra: ['rekenvoorbeelden'] }),
  subject('bedrijfseconomie', 'Bedrijfseconomie', 'maatschappij', 'Briefcase', { extra: ['rekenvoorbeelden'] }),
  subject('informatica', 'Informatica', 'informatica', 'Code'),
  subject('filosofie', 'Filosofie', 'maatschappij', 'Lightbulb', { extra: ['bronnen-argumenten'] }),
]

export const subjectsBySlug = Object.fromEntries(subjects.map((s) => [s.slug, s])) as Record<SubjectSlug, SubjectDef>

export function isSubjectSlug(v: string): v is SubjectSlug {
  return v in subjectsBySlug
}
