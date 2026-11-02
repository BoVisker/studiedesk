import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useTheme } from './ThemeProvider'

export type Profile = Database['public']['Tables']['profiles']['Row']

type AuthCtx = {
  session: Session | null
  profile: Profile | null
  /** Mag uitnodigingen beheren (tabel public.admins). */
  isAdmin: boolean
  loading: boolean
  /** True direct na het openen van een wachtwoord-herstellink. */
  recovering: boolean
  /** Fout uit een mislukte/verlopen inloglink, als die er was. */
  authError: string | null
  clearRecovering: () => void
  refreshProfile: () => Promise<void>
  updateProfile: (patch: Database['public']['Tables']['profiles']['Update']) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  // Het PASSWORD_RECOVERY-event kan al vóór onze subscribe vallen, daarom ook
  // de marker uit de redirect-URL (zie LoginPage).
  const [recovering, setRecovering] = useState(() => new URLSearchParams(window.location.search).get('flow') === 'recovery')
  const [authError] = useState(() => new URLSearchParams(window.location.search).get('error_description'))
  const { setPref } = useTheme()

  const loadProfile = useCallback(
    async (userId: string) => {
      const [{ data }, admin] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.rpc('is_admin'),
      ])
      setProfile(data)
      setIsAdmin(admin.data === true)
      // Thema uit het profiel wint van localStorage (synchroniseert tussen apparaten).
      if (data) setPref(data.theme)
    },
    [setPref],
  )

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadProfile(data.session.user.id).finally(() => setLoading(false))
      else setLoading(false)
      cleanAuthParams()
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setIsAdmin(false)
      }
      if (event === 'SIGNED_IN' && s) setTimeout(() => loadProfile(s.user.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const value: AuthCtx = {
    session,
    profile,
    isAdmin,
    loading,
    recovering,
    authError,
    clearRecovering: () => setRecovering(false),
    refreshProfile: async () => {
      if (session) await loadProfile(session.user.id)
    },
    updateProfile: async (patch) => {
      if (!session) return 'Niet ingelogd.'
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select().single()
      if (error) return 'Opslaan is niet gelukt. Probeer het opnieuw.'
      setProfile(data)
      return null
    },
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Haal `?code=` e.d. uit de adresbalk nadat Supabase de sessie heeft opgepakt. */
function cleanAuthParams() {
  const url = new URL(window.location.href)
  let changed = false
  for (const k of ['code', 'type', 'flow', 'error', 'error_code', 'error_description']) {
    if (url.searchParams.has(k)) {
      url.searchParams.delete(k)
      changed = true
    }
  }
  if (changed) window.history.replaceState(null, '', url.toString())
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth buiten AuthProvider')
  return ctx
}
