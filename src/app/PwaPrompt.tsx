import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui'

// Melding bij een nieuwe versie ("Vernieuwen") en een korte bevestiging dat de
// app offline klaarstaat. De service worker draait alleen in de productie-build.
export function PwaPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-paper">
      {needRefresh ? (
        <>
          <Download className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">Er is een nieuwe versie van StudieDesk.</p>
          <Button size="sm" variant="accent" onClick={() => updateServiceWorker(true)}>Vernieuwen</Button>
        </>
      ) : (
        <>
          <WifiOff className="size-5 shrink-0 text-accent" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm">StudieDesk staat klaar om offline te werken.</p>
        </>
      )}
      <button type="button" onClick={close} className="rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Melding sluiten">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
