import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { useId } from 'react'
import { blockDefs } from '@/config/blocks'
import { cx } from '@/components/ui'
import { moveBlock, type BlockSetting } from './blockSettings'

type Props = { blocks: BlockSetting[]; onChange: (b: BlockSetting[]) => void }

// Herordenen kan met slepen (muis/touch), met de grip + pijltjestoetsen
// (dnd-kit toetsenbordmodus) én met de omhoog/omlaag-knoppen.
export function BlockEditor({ blocks, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = blocks.findIndex((b) => b.id === active.id)
    const to = blocks.findIndex((b) => b.id === over.id)
    onChange(moveBlock(blocks, from, to))
  }

  const update = (i: number, patch: Partial<BlockSetting>) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: { draggable: 'Druk op spatie om een blok op te pakken, gebruik de pijltjes om te verplaatsen en spatie om los te laten.' },
        announcements: {
          onDragStart: ({ active }) => `${title(blocks, active.id)} opgepakt.`,
          onDragOver: ({ active, over }) => (over ? `${title(blocks, active.id)} boven ${title(blocks, over.id)}.` : undefined),
          onDragEnd: ({ active }) => `${title(blocks, active.id)} neergezet.`,
          onDragCancel: ({ active }) => `Verplaatsen van ${title(blocks, active.id)} geannuleerd.`,
        },
      }}
    >
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-2">
          {blocks.map((b, i) => (
            <SortableRow
              key={b.id}
              block={b}
              first={i === 0}
              last={i === blocks.length - 1}
              onToggle={() => update(i, { enabled: !b.enabled })}
              onRename={(t) => update(i, { title: t || undefined })}
              onMove={(dir) => onChange(moveBlock(blocks, i, i + dir))}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function title(blocks: BlockSetting[], id: string | number) {
  const b = blocks.find((x) => x.id === id)
  return b ? b.title || blockDefs[b.id].title : 'Blok'
}

function SortableRow({
  block,
  first,
  last,
  onToggle,
  onRename,
  onMove,
}: {
  block: BlockSetting
  first: boolean
  last: boolean
  onToggle: () => void
  onRename: (t: string) => void
  onMove: (dir: -1 | 1) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const inputId = useId()
  const def = blockDefs[block.id]

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'flex items-center gap-2 rounded-xl border bg-surface p-2 sm:gap-3',
        isDragging ? 'z-10 border-accent shadow-paper' : 'border-line',
        !block.enabled && 'opacity-60',
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted hover:bg-surface-2 active:cursor-grabbing"
        aria-label={`Verplaats ${block.title || def.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">
          Titel van blok {def.title}
        </label>
        <input
          id={inputId}
          value={block.title ?? ''}
          placeholder={def.title}
          maxLength={60}
          onChange={(e) => onRename(e.target.value)}
          className="h-9 w-full rounded-lg border border-transparent bg-transparent px-2 font-medium placeholder:text-text hover:border-line focus:border-line"
        />
      </div>

      <div className="hidden shrink-0 sm:flex">
        <button type="button" disabled={first} onClick={() => onMove(-1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Omhoog">
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
        <button type="button" disabled={last} onClick={() => onMove(1)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-30" aria-label="Omlaag">
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={block.enabled}
        aria-label={`${block.title || def.title} tonen`}
        onClick={onToggle}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition', block.enabled ? 'bg-accent' : 'bg-line')}
      >
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-surface shadow transition-all', block.enabled ? 'left-[1.375rem]' : 'left-0.5')} />
      </button>
    </li>
  )
}
