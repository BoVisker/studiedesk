import { Clock } from 'lucide-react'
import { blockDefs } from '@/config/blocks'
import { Card } from '@/components/ui'
import type { BlockSetting } from './blockSettings'

// Placeholder-weergave. Echte blokken krijgen in latere fases hun eigen
// component; dan komt hier een switch op `block.id`.
export function BlockCard({ block }: { block: BlockSetting }) {
  const def = blockDefs[block.id]
  return (
    <Card className="rise-in flex h-full flex-col gap-2 border-t-4 border-t-accent">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">{block.title || def.title}</h2>
        {def.available === 'later' && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
            <Clock className="size-3" aria-hidden="true" /> Binnenkort
          </span>
        )}
      </div>
      <p className="text-sm text-muted">{def.description}</p>
    </Card>
  )
}
