// Vaknaam of -afkorting van een cijferoverzicht (bijv. "entl", "Wiskunde B",
// "biol") → vak-slug. Onbekend? Dan null; de gebruiker kiest zelf in het controlescherm.
import type { SubjectSlug } from '@/design/subjectPalette'

const ALIASES: Record<SubjectSlug, string[]> = {
  nederlands: ['nederlands', 'nederlandse taal', 'nederlandse taal en literatuur', 'ne', 'ned', 'netl', 'nl'],
  engels: ['engels', 'engelse taal', 'engelse taal en literatuur', 'en', 'eng', 'entl'],
  frans: ['frans', 'franse taal', 'franse taal en literatuur', 'fa', 'fr', 'fatl'],
  duits: ['duits', 'duitse taal', 'duitse taal en literatuur', 'du', 'dutl', 'de'],
  spaans: ['spaans', 'spaanse taal', 'spaanse taal en literatuur', 'sp', 'sptl', 'spa'],
  latijn: ['latijn', 'latijnse taal', 'latijnse taal en literatuur', 'la', 'lat', 'latl'],
  grieks: ['grieks', 'griekse taal', 'griekse taal en literatuur', 'gr', 'grtl', 'gri'],
  'wiskunde-a': ['wiskunde a', 'wisa', 'wi a', 'wa'],
  'wiskunde-b': ['wiskunde b', 'wisb', 'wi b', 'wb'],
  'wiskunde-c': ['wiskunde c', 'wisc', 'wi c', 'wc'],
  'wiskunde-d': ['wiskunde d', 'wisd', 'wi d', 'wd'],
  geschiedenis: ['geschiedenis', 'gs', 'ges', 'gesch'],
  aardrijkskunde: ['aardrijkskunde', 'ak', 'aak', 'aardr'],
  biologie: ['biologie', 'bi', 'bio', 'biol'],
  natuurkunde: ['natuurkunde', 'na', 'nat', 'natk'],
  scheikunde: ['scheikunde', 'sk', 'sch', 'schk', 'schei'],
  economie: ['economie', 'ec', 'eco', 'econ'],
  bedrijfseconomie: ['bedrijfseconomie', 'beco', 'bec', 'm&o', 'management en organisatie'],
  informatica: ['informatica', 'in', 'inf', 'info'],
  filosofie: ['filosofie', 'fi', 'fil', 'filo'],
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const LOOKUP = new Map<string, SubjectSlug>()
for (const [slug, names] of Object.entries(ALIASES) as [SubjectSlug, string[]][]) {
  for (const n of names) LOOKUP.set(norm(n), slug)
}

export function matchSubject(name: string): SubjectSlug | null {
  const n = norm(name)
  if (!n) return null
  const exact = LOOKUP.get(n) ?? LOOKUP.get(n.replace(/ /g, ''))
  if (exact) return exact
  // "Engels (entl)", "wiskunde B 5V": eerste woordgroep die een bekende naam is.
  for (const [alias, slug] of [...LOOKUP].sort((a, b) => b[0].length - a[0].length)) {
    if (alias.length >= 4 && (n.startsWith(alias + ' ') || n.includes(` ${alias} `) || n.endsWith(` ${alias}`) || n === alias)) return slug
  }
  return null
}
