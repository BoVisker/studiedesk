import { BookOpen, CalendarDays, GraduationCap, Home, ShieldCheck, UserRound } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { cx, Spinner } from '@/components/ui'
import { Avatar } from './Avatar'

// Planner en cijfers zijn nog placeholders (fase 6, 7).
const nav = [
  { to: '/', label: 'Vandaag', Icon: Home, end: true },
  { to: '/vakken', label: 'Vakken', Icon: BookOpen },
  { to: '/planner', label: 'Planner', Icon: CalendarDays },
  { to: '/cijfers', label: 'Cijfers', Icon: GraduationCap },
]

export function AppShell() {
  const { profile, session, isAdmin } = useAuth()
  const name = profile?.display_name || session?.user.email || ''

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a href="#main" className="sr-only z-50 rounded-lg bg-ink px-3 py-2 text-on-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Naar inhoud
      </a>

      <aside className="hidden border-r border-line bg-surface/60 px-4 py-6 md:flex md:flex-col md:gap-8">
        <Wordmark />
        <nav aria-label="Hoofdmenu" className="flex flex-col gap-1">
          {nav.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-xl px-3 py-2 transition', isActive ? 'bg-surface-2 font-semibold' : 'text-muted hover:bg-surface-2 hover:text-text')
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        {isAdmin && (
          <NavLink
            to="/beheer"
            className={({ isActive }) =>
              cx('mt-auto flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition', isActive ? 'bg-surface-2 font-semibold' : 'text-muted hover:bg-surface-2 hover:text-text')
            }
          >
            <ShieldCheck className="size-5" aria-hidden="true" />
            Uitnodigingen
          </NavLink>
        )}
        <NavLink to="/profiel" className={cx(!isAdmin && 'mt-auto', 'flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2')}>
          <Avatar name={name} color={profile?.avatar_color ?? 'engels'} />
          <span className="min-w-0 truncate text-sm">{name}</span>
        </NavLink>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/85 px-4 py-3 backdrop-blur md:hidden">
        <Wordmark />
        <NavLink to="/profiel" aria-label="Profiel">
          <Avatar name={name} color={profile?.avatar_color ?? 'engels'} size={32} />
        </NavLink>
      </header>

      <main id="main" className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
        {/* Binnen de shell, zodat de navigatie blijft staan terwijl een pagina laadt. */}
        <Suspense fallback={<div className="grid place-items-center py-20"><Spinner label="Laden…" /></div>}>
          <Outlet />
        </Suspense>
      </main>

      <nav
        aria-label="Hoofdmenu"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {[...nav, { to: '/profiel', label: 'Profiel', Icon: UserRound, end: false }].map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-xs', isActive ? 'font-semibold text-text' : 'text-muted')}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Wordmark() {
  return (
    <span className="font-display text-xl font-semibold tracking-tight">
      Studie<span className="italic text-muted">desk</span>
    </span>
  )
}
