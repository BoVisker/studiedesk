// Verwijdert het account van de aanroeper: eerst alle bestanden in Storage,
// daarna de auth-gebruiker. Alle tabellen hangen met `on delete cascade` aan
// auth.users, dus de rest van de data (incl. ICS-links) verdwijnt mee.
import { adminClient, requireUser } from '../_shared/auth.ts'
import { PRIVATE_BUCKETS } from '../_shared/config.ts'
import { corsHeaders, errorResponse, json } from '../_shared/cors.ts'

async function removeUserFiles(admin: ReturnType<typeof adminClient>, bucket: string, prefix: string) {
  const storage = admin.storage.from(bucket)
  // Storage kent geen recursieve delete: loop mappen af.
  const stack = [prefix]
  const seen = new Set(stack)
  while (stack.length) {
    const dir = stack.pop()!
    for (;;) {
      const { data, error } = await storage.list(dir, { limit: 100 })
      if (error) {
        if (/not found/i.test(error.message)) return // bucket bestaat (nog) niet
        throw error
      }
      for (const e of data) {
        const path = `${dir}/${e.name}`
        if (!e.id && !seen.has(path)) {
          seen.add(path)
          stack.push(path)
        }
      }
      const files = data.filter((e) => e.id).map((e) => `${dir}/${e.name}`)
      if (!files.length) break
      const { error: rmError } = await storage.remove(files)
      if (rmError) throw rmError
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const auth = await requireUser(req)
  if (!auth) return errorResponse(req, 'not_authenticated', 401)

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'VERWIJDER') return errorResponse(req, 'confirmation_required', 400)

  const admin = adminClient()
  try {
    for (const bucket of PRIVATE_BUCKETS) await removeUserFiles(admin, bucket, auth.user.id)
    const { error } = await admin.auth.admin.deleteUser(auth.user.id)
    if (error) throw error
  } catch (e) {
    console.error('delete-account failed', e)
    return errorResponse(req, 'delete_failed', 500)
  }
  return json(req, { ok: true })
})
