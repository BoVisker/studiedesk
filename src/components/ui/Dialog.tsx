import { useEffect, useRef, type ReactNode } from 'react'

// Native <dialog>: focus-trap, Escape en achtergrond komen gratis mee.
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-surface p-0 text-text shadow-paper backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="dialog-title" className="font-display text-xl font-semibold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
