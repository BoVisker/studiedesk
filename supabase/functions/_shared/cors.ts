// Alleen de eigen frontend mag de functies aanroepen. Zet ALLOWED_ORIGINS als
// komma-gescheiden secret, bijv. "https://<user>.github.io,http://localhost:5173".
const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/** Foutantwoord met een vaste code die de frontend vertaalt naar een Nederlandse melding. */
export function errorResponse(req: Request, code: string, status: number, detail?: string) {
  return json(req, { error: code, detail }, status)
}
