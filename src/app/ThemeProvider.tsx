import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyTheme, readStoredTheme, resolveTheme, storeTheme, type ThemePref } from '@/lib/theme'

type ThemeCtx = { pref: ThemePref; resolved: 'light' | 'dark'; setPref: (p: ThemePref) => void }
const Ctx = createContext<ThemeCtx | null>(null)

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readStoredTheme)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)
  const resolved = resolveTheme(pref, systemDark)

  useEffect(() => {
    const q = darkQuery()
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    q.addEventListener('change', onChange)
    return () => q.removeEventListener('change', onChange)
  }, [])

  useEffect(() => applyTheme(resolved), [resolved])

  const setPref = useCallback((p: ThemePref) => {
    storeTheme(p)
    setPrefState(p)
  }, [])

  return <Ctx.Provider value={{ pref, resolved, setPref }}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme buiten ThemeProvider')
  return ctx
}
