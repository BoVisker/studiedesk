import type { ReactNode } from 'react'
import { cx } from './cx'

const tones = {
  info: 'border-line bg-surface-2 text-text',
  success: 'border-success/40 bg-success/10 text-text',
  warning: 'border-warning/40 bg-warning/10 text-text',
  error: 'border-danger/40 bg-danger/10 text-text',
}

export function Alert({ tone = 'info', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-xl border px-4 py-3 text-sm', tones[tone], className)}>
      {children}
    </div>
  )
}
