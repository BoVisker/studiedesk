import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="rise-in mb-8 flex flex-col gap-2">
      {eyebrow && <p className="text-sm uppercase tracking-[0.14em] text-muted">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold md:text-4xl">{title}</h1>
      {children && <div className="text-muted">{children}</div>}
    </header>
  )
}
