// Foto('s) van een woorden- of begrippenlijst → gestructureerde rijen.
// De gebruiker controleert het resultaat altijd in de app vóór opslaan.
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.4.0/helpers/beta/zod'
import { z } from 'npm:zod@4.6.7'
import { aiClient, aiConfigured, aiErrorCode, baseRequest } from '../_shared/ai.ts'
import { consumeAiCredit } from '../_shared/aiUsage.ts'
import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json } from '../_shared/cors.ts'
import { loadImages, validPaths } from '../_shared/images.ts'

const Row = z.object({
  term: z.string().describe('Woord, begrip of grootheid precies zoals op de foto, inclusief lidwoord en accenten.'),
  betekenis: z.string().describe('Vertaling, definitie of formule. Meerdere vertalingen gescheiden door ", ".'),
  opmerking: z.string().nullable().describe('Extra info van de foto: meervoud, genitief, geslacht, stamtijden. Anders null.'),
  woordsoort: z.string().nullable().describe('Woordsoort als die er staat of overduidelijk is (zn, ww, bn, bw). Anders null.'),
  voorbeeldzin: z.string().nullable().describe('Voorbeeldzin als die op de foto staat. Nooit zelf verzinnen.'),
  onzeker: z.boolean().describe('true als (een deel van) de rij slecht leesbaar was of je moest gokken.'),
})

const Result = z.object({
  rijen: z.array(Row),
  taal_term: z.string().nullable().describe('ISO 639-1-code van de termkolom (bijv. "fr", "la"), of null.'),
  taal_betekenis: z.string().nullable().describe('ISO 639-1-code van de betekeniskolom, meestal "nl", of null.'),
  waarschuwing: z.string().nullable().describe('Korte Nederlandse melding als de foto onleesbaar is of geen lijst bevat. Anders null.'),
})

const KIND_HINT: Record<string, string> = {
  woorden: 'Dit is een woordenlijst: "term" is het woord in de vreemde taal (of de linkerkolom), "betekenis" de Nederlandse vertaling.',
  begrippen: 'Dit is een begrippenlijst: "term" is het begrip, "betekenis" de definitie of uitleg zoals in het boek.',
  formules: 'Dit is een lijst met formules: "term" is de grootheid of naam van de formule, "betekenis" de formule zelf in platte tekst (bijv. "F = m · a"), met eenheden in "opmerking".',
}

const SYSTEM = `Je leest foto's van schoolmateriaal van Nederlandse VWO-leerlingen en zet de lijst om in rijen.

Regels:
- Neem tekst letterlijk over: spelling, hoofdletters, accenten en diakrieten (é, ü, ß, ñ, macrons) precies zoals op de foto. Verbeter niets en vertaal niets zelf.
- Volg de volgorde van de foto. Bij meerdere foto's: foto 1 eerst.
- Sla koppen, paginanummers, oefeningen en instructies over; alleen de lijst zelf.
- Staan woord en vertaling in kolommen naast elkaar, houd die koppeling aan. Bij twijfel over welke regel bij welke hoort: zet onzeker op true.
- Lees je iets niet goed, schrijf je beste lezing en zet onzeker op true. Laat geen rij weg omdat je twijfelt.
- Optionele delen tussen haakjes blijven tussen haakjes staan.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const auth = await requireUser(req)
  if (!auth) return errorResponse(req, 'not_authenticated', 401)
  if (!aiConfigured()) return errorResponse(req, 'ai_not_configured', 500)

  const body = await req.json().catch(() => null)
  const kind = typeof body?.kind === 'string' && body.kind in KIND_HINT ? body.kind : 'woorden'
  const subject = typeof body?.subject === 'string' ? body.subject.slice(0, 40) : ''
  if (!validPaths(body?.paths, auth.user.id)) return errorResponse(req, 'invalid_paths', 400)

  let images
  try {
    images = await loadImages(auth.client, body.paths)
  } catch {
    return errorResponse(req, 'image_not_found', 404)
  }

  // Pas na alle controles een credit verbruiken.
  const credit = await consumeAiCredit(auth.client)
  if (!credit.ok) return errorResponse(req, credit.reason, credit.reason === 'ai_limit_reached' ? 429 : 500)

  try {
    const res = await aiClient().beta.messages.parse({
      ...baseRequest(),
      max_tokens: 16000,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Result) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            ...images,
            { type: 'text', text: `Vak: ${subject || 'onbekend'}. ${KIND_HINT[kind]} Zet de lijst op ${images.length === 1 ? 'deze foto' : `deze ${images.length} foto's`} om in rijen.` },
          ],
        },
      ],
    })

    if (res.stop_reason === 'refusal') return errorResponse(req, 'ai_refused', 422)
    if (res.stop_reason === 'max_tokens') return errorResponse(req, 'too_long', 422)
    const out = res.parsed_output
    if (!out) return errorResponse(req, 'ai_parse_failed', 502)

    return json(req, {
      rows: out.rijen.filter((r) => r.term.trim() || r.betekenis.trim()),
      termLang: out.taal_term,
      definitionLang: out.taal_betekenis,
      warning: out.waarschuwing,
      remaining: credit.remaining,
    })
  } catch (e) {
    console.error('extract-list failed', e)
    const { code, status } = aiErrorCode(e)
    return errorResponse(req, code, status)
  }
})
