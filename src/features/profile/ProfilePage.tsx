import { Download, LogOut, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { Avatar } from '@/components/layout/Avatar'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Alert, Button, Card, CardTitle, cx, Dialog, Field, Skeleton } from '@/components/ui'
import { avatarColors, subjectPalette } from '@/design/subjectPalette'
import { useTheme } from '@/app/ThemeProvider'
import { downloadBlob, exportMyData } from '@/lib/exportData'
import { supabase } from '@/lib/supabase'
import { useAiUsage } from '@/lib/useAiUsage'

export function ProfilePage() {
  const { profile, session, updateProfile, signOut } = useAuth()
  const { resolved } = useTheme()
  const { usage, error: usageError } = useAiUsage()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.display_name)
  }, [profile])

  if (!profile) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  async function saveName(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const err = await updateProfile({ display_name: name.trim() })
    setSaving(false)
    setMsg(err ? { tone: 'error', text: err } : { tone: 'success', text: 'Opgeslagen.' })
  }

  async function chooseColor(color: string) {
    const err = await updateProfile({ avatar_color: color })
    if (err) setMsg({ tone: 'error', text: err })
  }

  async function doExport() {
    setExporting(true)
    try {
      downloadBlob(await exportMyData(), `studiedesk-export-${new Date().toISOString().slice(0, 10)}.json`)
    } catch {
      setMsg({ tone: 'error', text: 'Exporteren is niet gelukt. Controleer je verbinding.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Profiel" title={profile.display_name || 'Jouw profiel'}>
        {session?.user.email}
      </PageHeader>

      <div className="flex flex-col gap-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        <Card className="flex flex-col gap-5">
          <CardTitle>Over jou</CardTitle>
          <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Weergavenaam" className="flex-1" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="outline" loading={saving} disabled={name.trim() === profile.display_name}>
              Opslaan
            </Button>
          </form>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Avatar-kleur</legend>
            <div className="flex items-center gap-4">
              <Avatar name={name || profile.display_name} color={profile.avatar_color} size={48} />
              <div className="flex flex-wrap gap-2">
                {avatarColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Kleur ${c}`}
                    aria-pressed={profile.avatar_color === c}
                    onClick={() => chooseColor(c)}
                    className={cx('size-8 rounded-full ring-offset-2 ring-offset-surface transition', profile.avatar_color === c && 'ring-2 ring-text')}
                    style={{ background: subjectPalette[c][resolved] }}
                  />
                ))}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Thema</span>
            <ThemeToggle showLabels />
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <CardTitle>AI-hulp vandaag</CardTitle>
          {usageError ? (
            <p className="text-sm text-muted">Kon je AI-tegoed niet ophalen.</p>
          ) : !usage ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <>
              <p>
                <span className="font-display text-2xl font-semibold">{usage.remaining}</span>
                <span className="text-muted"> van {usage.daily_limit} over</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={usage.daily_limit} aria-valuenow={usage.used} aria-label="AI-gebruik vandaag">
                <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${Math.min(100, (usage.used / usage.daily_limit) * 100)}%` }} />
              </div>
              <p className="text-sm text-muted">Het tegoed wordt elke nacht om 00:00 aangevuld.</p>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <CardTitle>Jouw gegevens</CardTitle>
          <p className="text-sm text-muted">
            Download alles wat StudieDesk over je bewaart, of verwijder je account. Lees ook de{' '}
            <Link to="/privacy" className="underline underline-offset-4">privacyverklaring</Link>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={doExport} loading={exporting}>
              <Download className="size-4" aria-hidden="true" /> Exporteer (JSON)
            </Button>
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="size-4" aria-hidden="true" /> Uitloggen
            </Button>
          </div>
          <DeleteAccount />
        </Card>
      </div>
    </>
  )
}

function DeleteAccount() {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'VERWIJDER' } })
    if (error) {
      setBusy(false)
      setError('Verwijderen is niet gelukt. Controleer je verbinding en probeer het opnieuw.')
      return
    }
    try {
      localStorage.clear()
    } catch {
      /* negeren */
    }
    await signOut()
  }

  return (
    <div className="border-t border-line pt-4">
      <Button variant="ghost" className="text-danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden="true" /> Account verwijderen
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Account verwijderen?">
        <p className="text-sm text-muted">
          Dit verwijdert je account en al je gegevens: lijsten, samenvattingen, cijfers, foto’s en agendalinks. Dit kan niet ongedaan worden gemaakt.
        </p>
        <Field label='Typ "VERWIJDER" om te bevestigen' value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuleren</Button>
          <Button variant="danger" disabled={confirm !== 'VERWIJDER'} loading={busy} onClick={remove}>
            Definitief verwijderen
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
