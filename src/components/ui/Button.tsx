import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'accent' | 'ghost' | 'outline' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-ink text-on-ink hover:opacity-90',
  accent: 'bg-accent text-on-accent hover:opacity-90',
  outline: 'border border-line bg-surface text-text hover:bg-surface-2',
  ghost: 'text-text hover:bg-surface-2',
  danger: 'bg-danger text-on-ink hover:opacity-90',
}

/** Knopstijl, ook bruikbaar voor links (`<Link className={buttonClass('outline')}>`). */
export function buttonClass(variant: Variant = 'primary', size: 'sm' | 'md' = 'md', className?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition',
    'disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px',
    size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4',
    styles[variant],
    className,
  )
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' }

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', loading, size = 'md', className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
})
