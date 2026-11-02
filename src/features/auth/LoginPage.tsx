import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { Wordmark } from '@/components/layout/AppShell'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Alert, Button, Card, cx, Field } from '@/components/ui'
import { authErrorMessage } from '@/lib/errors'
import { FEATURE_GOOGLE_LOGIN } from '@/lib/featureFlags'
import { authRedirectUrl, supabase } from '@/lib/supabase'

type Mode = 'password' | 'magic' | 'signup' | 'forgot'

const tabs: { mode: Mode; label: string }[] = [
  { mode: 'password', label: 'Wachtwoord' },
  { mode: 'magic', label: 'Inloglink' },
  { mode: 'signup', label: 'Account maken' },
]

export function LoginPage() {
  const { session, authError } = useAuth()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  if (session) return <Navigate to="/" replace />

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
    setSent(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSent(null)
    const addr = email.trim().toLowerCase()
    try {
      if (mode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password })
        if (error) setError(authErrorMessage(error))
      } else if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: addr,
          options: { shouldCreateUser: false, emailRedirectTo: authRedirectUrl() },
        })
        if (error) setError(authErrorMessage(error))
        else setSent(`We hebben een inloglink gestuurd naar ${addr}. Open hem op dit apparaat.`)
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: addr,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: authRedirectUrl() },
        })
        if (error) setError(authErrorMessage(error))
        else if (!data.session) setSent(`Bijna klaar: bevestig je account via de link die we naar ${addr} stuurden.`)
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(addr, { redirectTo: authRedirectUrl({ flow: 'recovery' }) })
        if (error) setError(authErrorMessage(error))
        else setSent(`Als er een account bestaat voor ${addr}, staat er een herstellink in je mail.`)
      }
    } catch (err) {
      setError(authErrorMessage(err as Error))
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl() } })
    if (error) setError(authErrorMessage(error))
  }

  const submitLabel = { password: 'Inloggen', magic: 'Stuur inloglink', signup: 'Account maken', forgot: 'Stuur herstellink' }[mode]

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="rise-in flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <Wordmark />
          <ThemeToggle />
        </div>

        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Rustig leren,
            <br />
            <span className="italic text-muted">goed voorbereid.</span>
          </h1>
        </div>

        <Card className="flex flex-col gap-5">
          {authError && !error && !sent && <Alert tone="error">Deze inloglink werkt niet (meer). Hij is verlopen of al gebruikt; vraag een nieuwe aan.</Alert>}
          {mode !== 'forgot' ? (
            <div role="tablist" aria-label="Manier van inloggen" className="grid grid-cols-3 rounded-xl bg-surface-2 p-1 text-sm">
              {tabs.map((t) => (
                <button
                  key={t.mode}
                  role="tab"
                  type="button"
                  aria-selected={mode === t.mode}
                  onClick={() => switchMode(t.mode)}
                  className={cx('rounded-lg py-2 transition', mode === t.mode ? 'bg-surface font-semibold shadow-paper' : 'text-muted hover:text-text')}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <h2 className="font-display text-xl font-semibold">Wachtwoord vergeten</h2>
          )}

          <form onSubmit={submit} className="flex flex-col gap-4" noValidate={false}>
            {mode === 'signup' && (
              <Field label="Naam" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            )}
            <Field label="E-mailadres" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {(mode === 'password' || mode === 'signup') && (
              <Field
                label="Wachtwoord"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={mode === 'signup' ? 'Minimaal 8 tekens.' : undefined}
              />
            )}
            {mode === 'magic' && <p className="text-sm text-muted">Je krijgt een link per mail waarmee je zonder wachtwoord inlogt.</p>}
            {mode === 'signup' && <p className="text-sm text-muted">StudieDesk werkt op uitnodiging. Gebruik het e-mailadres waarop je bent uitgenodigd.</p>}

            {error && <Alert tone="error">{error}</Alert>}
            {sent && <Alert tone="success">{sent}</Alert>}

            <Button type="submit" loading={busy}>
              {submitLabel}
            </Button>
          </form>

          {mode === 'password' && (
            <button type="button" onClick={() => switchMode('forgot')} className="self-start text-sm text-muted underline underline-offset-4 hover:text-text">
              Wachtwoord vergeten?
            </button>
          )}
          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('password')} className="self-start text-sm text-muted underline underline-offset-4 hover:text-text">
              Terug naar inloggen
            </button>
          )}

          {FEATURE_GOOGLE_LOGIN && mode !== 'forgot' && (
            <Button type="button" variant="outline" onClick={google}>
              Doorgaan met Google
            </Button>
          )}
        </Card>

        <p className="text-center text-sm text-muted">
          Geen advertenties, geen tracking. <Link to="/privacy" className="underline underline-offset-4 hover:text-text">Privacyverklaring</Link>
        </p>
      </div>
    </div>
  )
}
