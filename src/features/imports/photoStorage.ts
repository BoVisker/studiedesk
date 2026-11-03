import { supabase } from '@/lib/supabase'

// Paden in de privé-bucket: <uid>/tmp/… (tijdelijk) of <uid>/lists/<listId>/… (bewaard).
const BUCKET = 'source-images'
const TMP_MAX_AGE_MS = 24 * 60 * 60 * 1000

const bucket = () => supabase.storage.from(BUCKET)

export async function uploadTmp(userId: string, blobs: Blob[]): Promise<string[]> {
  const stamp = Date.now()
  const paths: string[] = []
  for (const [i, blob] of blobs.entries()) {
    const path = `${userId}/tmp/${stamp}-${i}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error } = await bucket().upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw error
    paths.push(path)
  }
  return paths
}

export async function removePaths(paths: string[]) {
  if (!paths.length) return
  const { error } = await bucket().remove(paths)
  if (error) throw error
}

/** Bewaar tijdelijke foto's bij een lijst (verplaatsen, niet kopiëren). */
export async function keepForList(userId: string, paths: string[], listId: string) {
  for (const p of paths) {
    const name = p.split('/').pop()!
    const { error } = await bucket().move(p, `${userId}/lists/${listId}/${name}`)
    if (error) throw error
  }
}

export async function listPhotos(userId: string, listId: string): Promise<{ path: string; url: string }[]> {
  const dir = `${userId}/lists/${listId}`
  const { data, error } = await bucket().list(dir, { limit: 20 })
  if (error || !data.length) return []
  const paths = data.filter((f) => f.id).map((f) => `${dir}/${f.name}`)
  const { data: signed } = await bucket().createSignedUrls(paths, 60 * 10)
  return (signed ?? []).flatMap((s) => (s.signedUrl && s.path ? [{ path: s.path, url: s.signedUrl }] : []))
}

export async function removeListPhotos(userId: string, listId: string) {
  const dir = `${userId}/lists/${listId}`
  const { data } = await bucket().list(dir, { limit: 100 })
  if (data?.length) await removePaths(data.filter((f) => f.id).map((f) => `${dir}/${f.name}`))
}

/** Ruim tijdelijke foto's op die ouder zijn dan een dag (bijv. een afgebroken import). */
export async function cleanupTmp(userId: string, now = Date.now()) {
  const { data } = await bucket().list(`${userId}/tmp`, { limit: 100 })
  const old = (data ?? []).filter((f) => f.id && f.created_at && now - new Date(f.created_at).getTime() > TMP_MAX_AGE_MS)
  if (old.length) await removePaths(old.map((f) => `${userId}/tmp/${f.name}`)).catch(() => {})
}
