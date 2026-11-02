import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/app/ThemeProvider'
import { useAuth } from '@/app/AuthProvider'
import type { ThemePref } from '@/lib/theme'
import { cx } from '@/components/ui'

const options: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Licht', Icon: Sun },
  { value: 'dark', label: 'Donker', Icon: Moon },
  { value: 'system', label: 'Systeem', Icon: Monitor },
]

export function ThemeToggle({ showLabels = false }: { showLabels?: boolean }) {
  const { pref, setPref } = useTheme()
  const { profile, updateProfile } = useAuth()

  const choose = (value: ThemePref) => {
    setPref(value)
    if (profile && profile.theme !== value) void updateProfile({ theme: value })
  }

  return (
    <div role="radiogroup" aria-label="Thema" className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          aria-label={showLabels ? undefined : label}
          title={label}
          onClick={() => choose(value)}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm transition',
            pref === value ? 'bg-surface text-text shadow-paper' : 'text-muted hover:text-text',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {showLabels && label}
        </button>
      ))}
    </div>
  )
}
