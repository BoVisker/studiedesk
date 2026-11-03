import { CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnline } from '@/lib/useOnline'
import { onSyncChange, pendingCount } from '@/lib/offline/sync'

/** Dunne balk: offline-melding, en hoeveel wijzigingen nog gesynchroniseerd worden. */
export function OfflineBar() {
  const online = useOnline()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let active = true
    const refresh = () => pendingCount().then((n) => active && setPending(n)).catch(() => {})
    refresh()
    const off = onSyncChange(refresh)
    return () => {
      active = false
      off()
    }
  }, [])

  // Weer online met een lege wachtrij: niets tonen.
  if (online && pending === 0) return null

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-surface-2 px-4 py-1.5 text-center text-xs text-muted">
      {!online ? (
        <>
          <CloudOff className="size-3.5" aria-hidden="true" />
          <span>Offline. Je kunt gewoon leren; wijzigingen worden later gesynchroniseerd.</span>
        </>
      ) : (
        <>
          <RefreshCw className="size-3.5 animate-spin" aria-hidden="true" />
          <span>{pending} {pending === 1 ? 'wijziging wordt' : 'wijzigingen worden'} gesynchroniseerd…</span>
        </>
      )}
    </div>
  )
}
