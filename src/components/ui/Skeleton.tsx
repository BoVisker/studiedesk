import { cx } from './cx'

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('animate-pulse rounded-lg bg-surface-2', className)} />
}
