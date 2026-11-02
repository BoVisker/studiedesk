import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string | null }

export const Field = forwardRef<HTMLInputElement, Props>(function Field({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const errId = `${inputId}-err`
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={cx(!!hint && hintId, !!error && errId) || undefined}
        className={cx(
          'h-11 rounded-xl border bg-surface px-3 text-base text-text placeholder:text-muted/70',
          'transition focus:border-transparent',
          error ? 'border-danger' : 'border-line',
        )}
        {...rest}
      />
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})
