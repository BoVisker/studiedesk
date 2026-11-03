import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Spinner } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { NewPasswordPage } from '@/features/auth/NewPasswordPage'
import { HomePage } from '@/features/home/HomePage'
import { PlaceholderPage } from '@/features/home/PlaceholderPage'
import { SetupPage } from '@/features/home/SetupPage'
import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { SubjectPickerPage } from '@/features/subjects/SubjectPickerPage'
import { SubjectsPage } from '@/features/subjects/SubjectsPage'
import { SubjectsProvider } from '@/features/subjects/SubjectsProvider'
import { env } from '@/lib/env'

// Zwaardere pagina's pas laden als ze geopend worden.
const SubjectPage = lazy(() => import('@/features/subjects/SubjectPage').then((m) => ({ default: m.SubjectPage })))
const InvitesPage = lazy(() => import('@/features/admin/InvitesPage').then((m) => ({ default: m.InvitesPage })))
const ListEditorPage = lazy(() => import('@/features/lists/ListEditorPage').then((m) => ({ default: m.ListEditorPage })))
const PhotoImportPage = lazy(() => import('@/features/imports/PhotoImportPage').then((m) => ({ default: m.PhotoImportPage })))
const ListPage = lazy(() => import('@/features/lists/ListPage').then((m) => ({ default: m.ListPage })))
const StudyPage = lazy(() => import('@/features/study/StudyPage').then((m) => ({ default: m.StudyPage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
import { AuthProvider, useAuth } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'

function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner label="Laden…" />
    </div>
  )
}

function RequireAuth() {
  const { session, loading, recovering } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/inloggen" replace state={{ from: location }} />
  if (recovering && location.pathname !== '/nieuw-wachtwoord') return <Navigate to="/nieuw-wachtwoord" replace />
  return (
    <SubjectsProvider>
      <Suspense fallback={<FullPageSpinner />}>
        <Outlet />
      </Suspense>
    </SubjectsProvider>
  )
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
                <Route path="vakken" element={<SubjectsPage />} />
                <Route path="vakken/kiezen" element={<SubjectPickerPage />} />
                <Route path="vakken/:slug" element={<SubjectPage />} />
                <Route path="lijsten/nieuw" element={<ListEditorPage />} />
                <Route path="lijsten/foto" element={<PhotoImportPage />} />
                <Route path="lijsten/:id" element={<ListPage />} />
                <Route path="lijsten/:id/bewerken" element={<ListEditorPage />} />
                <Route path="lijsten/:id/leren" element={<StudyPage />} />
                <Route path="herhalen" element={<StudyPage />} />
                <Route path="beheer" element={<InvitesPage />} />
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
