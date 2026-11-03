import { CalendarClock, Camera, Clock, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { blockDefs, type BlockId } from '@/config/blocks'
import { buttonClass, Card, Skeleton } from '@/components/ui'
import type { SubjectSlug } from '@/design/subjectPalette'
import type { ListKind, ListWithStats } from '@/features/lists/api'
import type { NoteListItem } from '@/features/notes/api'
import type { Grade } from '@/features/grades/api'
import { schoolYear, weightedAverage } from '@/features/grades/calc'
import { GradeValue, inYear } from '@/features/grades/GradeBits'
import type { NoteKind } from '@/features/notes/types'
import type { BlockSetting } from './blockSettings'

/** Gedeelde data voor alle blokken op een vakpagina (één keer geladen). */
export type BlockContext = { slug: SubjectSlug; lists: ListWithStats[] | null; notes: NoteListItem[] | null; grades: Grade[] | null; error: boolean }

const listBlocks: Partial<Record<BlockId, ListKind>> = {
  woordenlijsten: 'woorden',
  begrippen: 'begrippen',
  'formules-eenheden': 'formules',
}

const noteBlocks: Partial<Record<BlockId, NoteKind>> = {
  samenvattingen: 'samenvatting',
  'opgaven-logboek': 'uitwerking',
}

export function BlockCard({ block, ctx }: { block: BlockSetting; ctx: BlockContext }) {
  const def = blockDefs[block.id]
  const title = block.title || def.title
  const kind = listBlocks[block.id]
  const noteKind = noteBlocks[block.id]

  return (
    <Card className="rise-in flex h-full flex-col gap-3 border-t-4 border-t-accent">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {def.available === 'later' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
            <Clock className="size-3" aria-hidden="true" /> Binnenkort
          </span>
        )}
      </div>
      {def.available === 'later' ? (
        <p className="text-sm text-muted">{def.description}</p>
      ) : ctx.error ? (
        <p className="text-sm text-danger">Kon de gegevens niet laden.</p>
      ) : !ctx.lists || !ctx.notes || !ctx.grades ? (
        <Skeleton className="h-16" />
      ) : kind ? (
        <ListsBlock kind={kind} ctx={ctx} />
      ) : noteKind ? (
        <NotesBlock kind={noteKind} ctx={ctx} />
      ) : block.id === 'vandaag-herhalen' ? (
        <DueBlock ctx={ctx} />
      ) : block.id === 'cijfers' ? (
        <GradesBlock ctx={ctx} />
      ) : block.id === 'voortgang' ? (
        <ProgressBlock ctx={ctx} />
      ) : null}
    </Card>
  )
}

function ListsBlock({ kind, ctx }: { kind: ListKind; ctx: BlockContext }) {
  const lists = ctx.lists!.filter((l) => l.kind === kind)
  return (
    <>
      {lists.length === 0 ? (
        <p className="text-sm text-muted">Nog geen lijsten. Typ of plak er een, of maak een foto.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {lists.slice(0, 6).map((l) => (
            <li key={l.id}>
              <Link to={`/lijsten/${l.id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate">
                  {l.title}
                  {l.chapter && <span className="text-muted"> · {l.chapter}</span>}
                </span>
                {l.due_count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-on-accent" aria-label={`${l.due_count} te herhalen`}>
                    {l.due_count}
                  </span>
                )}
                <span className="text-xs tabular-nums text-muted">{l.item_count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Link to={`/lijsten/nieuw?vak=${ctx.slug}&soort=${kind}`} className={buttonClass('outline', 'sm')}>
          <Plus className="size-4" aria-hidden="true" /> Nieuwe lijst
        </Link>
        <Link to={`/lijsten/foto?vak=${ctx.slug}&soort=${kind}`} className={buttonClass('outline', 'sm')}>
          <Camera className="size-4" aria-hidden="true" /> Uit foto
        </Link>
      </div>
    </>
  )
}

function NotesBlock({ kind, ctx }: { kind: NoteKind; ctx: BlockContext }) {
  const notes = ctx.notes!.filter((n) => n.kind === kind)
  return (
    <>
      {notes.length === 0 ? (
        <p className="text-sm text-muted">
          {kind === 'samenvatting'
            ? 'Nog geen samenvattingen. Maak een foto van een paragraaf voor een samenvatting met oefenvragen.'
            : 'Nog geen uitwerkingen. Maak een foto van een opgave voor een uitleg stap voor stap.'}
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {notes.slice(0, 6).map((n) => (
            <li key={n.id}>
              <Link to={`/notities/${n.id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate">
                  {n.title}
                  {n.chapter && <span className="text-muted"> · {n.chapter}</span>}
                </span>
                <time dateTime={n.created_at} className="text-xs tabular-nums text-muted">
                  {new Date(n.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to={`/notities/foto?vak=${ctx.slug}&soort=${kind}`} className={buttonClass('outline', 'sm', 'mt-auto self-start')}>
        <Camera className="size-4" aria-hidden="true" /> {kind === 'samenvatting' ? 'Samenvatten uit foto' : 'Opgave uit foto'}
      </Link>
    </>
  )
}

function GradesBlock({ ctx }: { ctx: BlockContext }) {
  const year = schoolYear(new Date())
  const gs = ctx.grades!.filter((g) => inYear(g, year))
  const last = [...gs].sort((a, b) => (b.graded_on ?? '').localeCompare(a.graded_on ?? '')).slice(0, 3)
  return (
    <>
      {gs.length === 0 ? (
        <p className="text-sm text-muted">Nog geen cijfers dit schooljaar.</p>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div>
            <GradeValue value={weightedAverage(gs)} decimals={2} className="font-display text-3xl font-semibold" />
            <p className="text-sm text-muted">gemiddelde uit {gs.length} {gs.length === 1 ? 'cijfer' : 'cijfers'}</p>
          </div>
          <ul className="flex gap-2" aria-label="Laatste cijfers">
            {last.map((g) => (
              <li key={g.id} className="rounded-lg bg-surface-2 px-2 py-1 text-sm font-semibold" title={g.description}>
                <GradeValue value={g.grade} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link to={`/cijfers/${ctx.slug}`} className={buttonClass('outline', 'sm', 'mt-auto self-start')}>
        Alle cijfers
      </Link>
    </>
  )
}

function DueBlock({ ctx }: { ctx: BlockContext }) {
  const due = ctx.lists!.reduce((n, l) => n + l.due_count, 0)
  return due === 0 ? (
    <p className="flex items-center gap-2 text-sm text-muted">
      <CalendarClock className="size-4" aria-hidden="true" /> Niets te herhalen vandaag.
    </p>
  ) : (
    <>
      <p>
        <span className="font-display text-3xl font-semibold text-accent">{due}</span>
        <span className="text-muted"> {due === 1 ? 'item' : 'items'} klaar om te herhalen</span>
      </p>
      <Link to={`/herhalen?vak=${ctx.slug}`} className={buttonClass('accent', 'sm', 'mt-auto self-start')}>
        <RotateCcw className="size-4" aria-hidden="true" /> Herhalen
      </Link>
    </>
  )
}

function ProgressBlock({ ctx }: { ctx: BlockContext }) {
  const total = ctx.lists!.reduce((n, l) => n + l.item_count, 0)
  const fresh = ctx.lists!.reduce((n, l) => n + l.new_count, 0)
  if (!total) return <p className="text-sm text-muted">Je voortgang verschijnt zodra je lijsten hebt.</p>
  const started = total - fresh
  return (
    <>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Al geoefend" aria-valuemin={0} aria-valuemax={total} aria-valuenow={started}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${(started / total) * 100}%` }} />
      </div>
      <p className="text-sm text-muted">
        {started} van {total} items al geoefend in {ctx.lists!.length} {ctx.lists!.length === 1 ? 'lijst' : 'lijsten'}.
      </p>
    </>
  )
}
