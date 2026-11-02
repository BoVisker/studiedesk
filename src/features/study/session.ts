// Pure sessielogica. React-componenten houden een SessionState vast en roepen
// `answer()` aan; zo is het gedrag (terugkomen van foute items, eerste-poging-
// telling, cijfer) los te testen.

export type DirectionMode = 'vooruit' | 'achteruit' | 'gemixt'
/** vooruit = term gevraagd, betekenis antwoorden. */
export type Dir = 'vooruit' | 'achteruit'
export type QuestionType = 'flashcard' | 'typen' | 'meerkeuze'

export type StudyItem = { id: string; term: string; definition: string; note?: string | null; example?: string | null; word_type?: string | null }

export type Card = {
  key: string
  item: StudyItem
  dir: Dir
  type: QuestionType
  prompt: string
  answer: string
}

export type SessionState = {
  queue: Card[]
  /** Uitslag van de eerste poging per kaart (telt voor SRS en het cijfer). */
  first: Record<string, boolean>
  attempts: number
  /** Toets: geen herhaling binnen de sessie. */
  requeueWrong: boolean
  /** Hoeveel kaarten een fout antwoord later terugkomt. */
  requeueGap: number
}

export type Rng = () => number

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function makeCard(item: StudyItem, dir: Dir, type: QuestionType): Card {
  return {
    key: `${item.id}:${dir}`,
    item,
    dir,
    type,
    prompt: dir === 'vooruit' ? item.term : item.definition,
    answer: dir === 'vooruit' ? item.definition : item.term,
  }
}

export function pickDir(mode: DirectionMode, rng: Rng): Dir {
  return mode === 'gemixt' ? (rng() < 0.5 ? 'vooruit' : 'achteruit') : mode
}

export function createSession(
  items: StudyItem[],
  opts: { direction: DirectionMode; types: QuestionType[]; limit?: number; requeueWrong?: boolean; rng?: Rng },
): SessionState {
  const rng = opts.rng ?? Math.random
  const picked = shuffle(items, rng).slice(0, opts.limit ?? items.length)
  const queue = picked.map((it, i) => makeCard(it, pickDir(opts.direction, rng), opts.types[opts.types.length === 1 ? 0 : i % opts.types.length]))
  return { queue: opts.types.length > 1 ? shuffle(queue, rng) : queue, first: {}, attempts: 0, requeueWrong: opts.requeueWrong ?? true, requeueGap: 3 }
}

export function current(s: SessionState): Card | undefined {
  return s.queue[0]
}

export function answer(s: SessionState, correct: boolean): SessionState {
  const [card, ...rest] = s.queue
  if (!card) return s
  const first = card.key in s.first ? s.first : { ...s.first, [card.key]: correct }
  let queue = rest
  if (!correct && s.requeueWrong) {
    // Komt een paar kaarten later terug (of meteen als er niets meer is).
    const at = Math.min(s.requeueGap, rest.length)
    queue = [...rest.slice(0, at), card, ...rest.slice(at)]
  }
  return { ...s, queue, first, attempts: s.attempts + 1 }
}

export function isFinished(s: SessionState) {
  return s.queue.length === 0
}

export function summary(s: SessionState) {
  const keys = Object.keys(s.first)
  const correct = keys.filter((k) => s.first[k]).length
  return { total: keys.length, correct, wrongKeys: keys.filter((k) => !s.first[k]) }
}

/** Nederlands cijfer: 1 + 9 × score, afgerond op één decimaal. */
export function gradeFor(correct: number, total: number) {
  if (total === 0) return 1
  return Math.round((1 + (9 * correct) / total) * 10) / 10
}

/** Meerkeuze-opties: het goede antwoord plus afleiders uit dezelfde lijst. */
export function buildOptions(card: Card, pool: StudyItem[], n = 4, rng: Rng = Math.random): string[] {
  const side = (it: StudyItem) => (card.dir === 'vooruit' ? it.definition : it.term)
  const norm = (s: string) => s.trim().toLocaleLowerCase('nl')
  const seen = new Set([norm(card.answer)])
  const distractors: string[] = []
  for (const it of shuffle(pool, rng)) {
    const v = side(it)
    if (it.id === card.item.id || seen.has(norm(v))) continue
    seen.add(norm(v))
    distractors.push(v)
    if (distractors.length === n - 1) break
  }
  return shuffle([card.answer, ...distractors], rng)
}
