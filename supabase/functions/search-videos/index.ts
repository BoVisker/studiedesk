// Uitlegvideo's zoeken via de officiële YouTube Data API. Met een gedeelde
// cache en een dagbudget, want search.list kost 100 quota-eenheden per aanroep
// (standaard 10.000/dag). De API-sleutel staat alleen als Supabase secret
// (YOUTUBE_API_KEY), nooit in de frontend.
//
// Antwoord bevat altijd een `fallback`: een YouTube-zoeklink, zodat de gebruiker
// verder kan als er geen resultaten of geen budget zijn.
import { adminClient, requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json } from '../_shared/cors.ts'

const CACHE_DAYS = 30
const MAX_RESULTS = 6

type Video = { id: string; title: string; channel: string; thumb: string; published: string }

const ENTITIES: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&#039;': "'" }
const decode = (s: string) => s.replace(/&amp;|&quot;|&#0?39;|&lt;|&gt;/g, (m) => ENTITIES[m] ?? m)

const normalize = (q: string) => q.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 300)
const searchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const auth = await requireUser(req)
  if (!auth) return errorResponse(req, 'not_authenticated', 401)

  const body = await req.json().catch(() => null)
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  if (!query || query.length > 200) return errorResponse(req, 'invalid_query', 400)

  const key = normalize(query)
  const fallback = searchUrl(query)
  const admin = adminClient()

  // 1. Cache.
  const cached = await admin.from('video_cache').select('data, fetched_at').eq('query', key).maybeSingle()
  const fresh = cached.data && Date.now() - new Date(cached.data.fetched_at).getTime() < CACHE_DAYS * 86_400_000
  if (fresh) return json(req, { videos: cached.data!.data as Video[], fallback, source: 'cache' })

  const stale = (cached.data?.data as Video[] | undefined) ?? null
  const apiKey = Deno.env.get('YOUTUBE_API_KEY')
  if (!apiKey) return json(req, { videos: stale ?? [], fallback, source: stale ? 'cache' : 'none' })

  // 2. Dagbudget: hoeveel echte zoekopdrachten zijn er vandaag al gedaan?
  const today = new Date().toISOString().slice(0, 10)
  const [budget, limitCfg] = await Promise.all([
    admin.from('video_budget').select('searches').eq('day', today).maybeSingle(),
    admin.from('app_config').select('value').eq('key', 'youtube_daily_searches').maybeSingle(),
  ])
  const used = budget.data?.searches ?? 0
  const limit = Number(limitCfg.data?.value ?? 80)
  if (used >= limit) {
    // Budget op: geef de (eventueel verouderde) cache of alleen de zoeklink.
    return json(req, { videos: stale ?? [], fallback, source: stale ? 'cache' : 'budget' })
  }

  // 3. YouTube bevragen.
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.search = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      type: 'video',
      q: query,
      maxResults: String(MAX_RESULTS),
      safeSearch: 'strict',
      relevanceLanguage: 'nl',
      videoEmbeddable: 'true',
    }).toString()

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!res.ok) return json(req, { videos: stale ?? [], fallback, source: stale ? 'cache' : 'error' })
    const payload = await res.json()

    const videos: Video[] = (payload.items ?? [])
      .filter((it: { id?: { videoId?: string } }) => it.id?.videoId)
      .map((it: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails?: { medium?: { url?: string }; default?: { url?: string } } } }) => ({
        id: it.id.videoId,
        title: decode(it.snippet.title),
        channel: decode(it.snippet.channelTitle),
        thumb: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? '',
        published: it.snippet.publishedAt,
      }))

    // Cache bijwerken en budget ophogen (gedeeld, dus service-role).
    await admin.from('video_cache').upsert({ query: key, data: videos, fetched_at: new Date().toISOString() })
    await admin.from('video_budget').upsert({ day: today, searches: used + 1 })

    return json(req, { videos, fallback, source: 'youtube' })
  } catch (e) {
    console.error('search-videos failed', e)
    return json(req, { videos: stale ?? [], fallback, source: stale ? 'cache' : 'error' })
  }
})
