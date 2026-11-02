import { Card } from '@/components/ui'

export function SetupPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <Card className="max-w-lg">
        <h1 className="mb-2 font-display text-2xl font-semibold">Supabase is nog niet gekoppeld</h1>
        <p className="text-muted">
          Kopieer <code className="font-mono">.env.example</code> naar <code className="font-mono">.env.local</code> en vul{' '}
          <code className="font-mono">VITE_SUPABASE_URL</code> en <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in. Zie de README.
        </p>
      </Card>
    </div>
  )
}
