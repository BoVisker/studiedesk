import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, Field } from '@/components/ui'
import { authErrorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'

export function NewPasswordPage() {
  const { clearRecovering } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authErrorMessage(error))
    clearRecovering()
    navigate('/', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Nieuw wachtwoord" />
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Nieuw wachtwoord" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} hint="Minimaal 8 tekens." />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" loading={busy}>Opslaan</Button>
        </form>
      </Card>
    </div>
  )
}
