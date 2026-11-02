import type { ReactNode } from 'react'

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rise-in flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-muted" aria-hidden="true">{icon}</div>}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
      {action}
    </div>
  )
}
