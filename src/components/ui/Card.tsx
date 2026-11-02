import type { HTMLAttributes } from 'react'
import { cx } from './cx'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-2xl border border-line bg-surface p-5 shadow-paper', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cx('font-display text-xl font-semibold', className)} {...rest} />
}
