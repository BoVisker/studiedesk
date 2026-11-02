import { MailPlus, Trash2, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Alert, Button, Card, CardTitle, EmptyState, Field, Skeleton } from '@/components/ui'
import { supabase } from '@/lib/supabase'

type Invite = { email: string; note: string | null; created_at: string; registered: boolean }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InvitesPage() {
  const { isAdmin, session } = useAuth()
  const [invites, setInvites] = useState<Invite[] | null>(null)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_invites')
    if (error) setMsg({ tone: 'error', text: 'Kon de uitnodigingen niet laden.' })
    setInvites(data ?? [])
  }, [])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (!isAdmin) return <Navigate to="/" replace />

  async function invite(e: FormEvent) {
    e.preventDefault()
    const addr = email.trim().toLowerCase()
    if (!EMAIL_RE.test(addr)) return setMsg({ tone: 'error', text: 'Dat lijkt geen geldig e-mailadres.' })
    setBusy(true)
    setMsg(null)
    const { error } = await supabase
      .from('signup_allowlist')
      .insert({ email: addr, note: note.trim() || null, invited_by: session!.user.id })
    setBusy(false)
    if (error) {
      setMsg({ tone: 'error', text: error.code === '23505' ? `${addr} is al uitgenodigd.` : 'Uitnodigen is niet gelukt. Probeer het opnieuw.' })
      return
    }
    setEmail('')
    setNote('')
    setMsg({ tone: 'success', text: `${addr} kan nu een account maken via “Account maken”.` })
    void load()
  }

  async function revoke(addr: string) {
    if (!confirm(`Uitnodiging voor ${addr} intrekken?`)) return
    const { error } = await supabase.from('signup_allowlist').delete().eq('email', addr)
    if (error) return setMsg({ tone: 'error', text: 'Intrekken is niet gelukt.' })
    setMsg({ tone: 'success', text: `Uitnodiging voor ${addr} ingetrokken.` })
    void load()
  }

  return (
    <>
      <PageHeader eyebrow="Beheer" title="Uitnodigingen">
        Alleen mensen op deze lijst kunnen een account maken.
      </PageHeader>

      <div className="flex flex-col gap-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

        <Card>
          <CardTitle className="mb-4">Iemand uitnodigen</CardTitle>
          <form onSubmit={invite} className="flex flex-col gap-3">
            <Field label="E-mailadres" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Notitie (optioneel)" hint="Alleen voor jezelf, bijv. “klasgenoot 5V”." maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" loading={busy} className="self-start">
              <MailPlus className="size-4" aria-hidden="true" /> Uitnodigen
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted">
            Er wordt geen mail verstuurd: laat de persoon zelf naar StudieDesk gaan en kiezen voor “Account maken”.
          </p>
        </Card>

        <Card>
          <CardTitle className="mb-4">Uitgenodigd</CardTitle>
          {!invites ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : invites.length === 0 ? (
            <EmptyState title="Nog niemand uitgenodigd" />
          ) : (
            <ul className="divide-y divide-line">
              {invites.map((i) => (
                <li key={i.email} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.email}</p>
                    <p className="text-sm text-muted">
                      {i.registered ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <UserCheck className="size-4" aria-hidden="true" /> Heeft een account
                        </span>
                      ) : (
                        'Nog geen account'
                      )}
                      {i.note && ` · ${i.note}`}
                    </p>
                  </div>
                  {i.email !== session?.user.email && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(i.email)} aria-label={`Uitnodiging voor ${i.email} intrekken`}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm text-muted">Intrekken verwijdert geen bestaand account; het voorkomt alleen dat iemand (opnieuw) registreert.</p>
        </Card>
      </div>
    </>
  )
}
