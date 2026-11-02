import { useId, type SelectHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: { value: string; label: string }[] }

export function Select({ label, options, className, id, ...rest }: Props) {
  const autoId = useId()
  const selectId = id ?? autoId
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className="text-sm font-medium">
        {label}
      </label>
      <select id={selectId} className="h-11 rounded-xl border border-line bg-surface px-3 text-base text-text" {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
