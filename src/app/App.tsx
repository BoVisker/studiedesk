import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { NewPasswordPage } from '@/features/auth/NewPasswordPage'
import { HomePage } from '@/features/home/HomePage'
import { PlaceholderPage } from '@/features/home/PlaceholderPage'
import { SetupPage } from '@/features/home/SetupPage'
import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { env } from '@/lib/env'
import { AuthProvider, useAuth } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'

function RequireAuth() {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Laden…" />
      </div>
    )
  }
  if (!session) return <Navigate to="/inloggen" replace state={{ from: location }} />
  if (recovering && location.pathname !== '/nieuw-wachtwoord') return <Navigate to="/nieuw-wachtwoord" replace />
  return <Outlet />
}

export function App() {
  if (env.missingSupabase) return <SetupPage />
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/inloggen" element={<LoginPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="vakken" element={<PlaceholderPage title="Vakken" text="Hier kies je straks je vakken en open je per vak een eigen voorpagina." />} />
                <Route path="planner" element={<PlaceholderPage title="Planner" text="De toetsplanner komt in een volgende versie." />} />
                <Route path="cijfers" element={<PlaceholderPage title="Cijfers" text="De cijfermodule komt in een volgende versie." />} />
                <Route path="profiel" element={<ProfilePage />} />
                <Route path="nieuw-wachtwoord" element={<NewPasswordPage />} />
                <Route path="*" element={<PlaceholderPage title="Pagina niet gevonden" text="Deze pagina bestaat niet (meer)." />} />
              </Route>
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
