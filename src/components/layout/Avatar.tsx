import { subjectPalette, type SubjectSlug } from '@/design/subjectPalette'
import { useTheme } from '@/app/ThemeProvider'

export function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const { resolved } = useTheme()
  const c = subjectPalette[color as SubjectSlug] ?? subjectPalette.engels
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
  return (
    <span
      aria-hidden="true"
      className="inline-grid shrink-0 place-items-center rounded-full font-display font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4, background: c[resolved], color: 'var(--on-accent)' }}
    >
      {initials}
    </span>
  )
}
