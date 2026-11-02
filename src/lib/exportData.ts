import { supabase } from './supabase'

// Tabellen die in de JSON-export komen. Nieuwe tabellen met gebruikersdata
// hier toevoegen (RLS zorgt dat je alleen je eigen rijen krijgt).
export const EXPORT_TABLES = ['profiles', 'ai_usage', 'user_subjects'] as const

export async function exportMyData(): Promise<Blob> {
  const { data: user } = await supabase.auth.getUser()
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: { id: user.user?.id, email: user.user?.email, created_at: user.user?.created_at },
  }
  for (const table of EXPORT_TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw new Error(`Export van ${table} mislukt`)
    out[table] = data
  }
  return new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
