// Screenshot(s) van een cijferoverzicht (bijv. uit Magister) → cijferregels.
// Alleen het beeld dat de leerling zelf uploadt; geen koppeling of inloggen.
// De gebruiker controleert alles in de app; daar worden ook dubbele regels herkend.
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.4.0/helpers/beta/zod'
import { z } from 'npm:zod@4.6.7'
import { aiClient, aiConfigured, aiErrorCode, baseRequest } from '../_shared/ai.ts'
import { consumeAiCredit } from '../_shared/aiUsage.ts'
import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json } from '../_shared/cors.ts'
import { loadImages, validPaths } from '../_shared/images.ts'

const Row = z.object({
  vak: z.string().describe('Vaknaam of -afkorting precies zoals op het screenshot (bijv. "entl", "Wiskunde B").'),
  omschrijving: z.string().describe('Omschrijving van de toets zoals op het screenshot (bijv. "SO H3", "PW grammatica"). Leeg als er geen staat.'),
  cijfer: z.string().describe('Het cijfer letterlijk, bijv. "7,4". Ook letters als "V" of "G" letterlijk overnemen.'),
  weging: z.string().nullable().describe('De weging letterlijk (bijv. "2", "2x", "20%"), of null als die niet zichtbaar is.'),
  datum: z.string().nullable().describe('Datum als JJJJ-MM-DD als die zichtbaar is (jaar afleiden uit de context), anders null.'),
  onzeker: z.boolean().describe('true als de regel slecht leesbaar was of je moest gokken welk vak/cijfer bij elkaar hoort.'),
})

const Result = z.object({
  regels: z.array(Row),
  waarschuwing: z.string().nullable().describe('Korte Nederlandse melding als het screenshot geen cijferoverzicht is of onleesbaar is. Anders null.'),
})

const SYSTEM = `Je leest screenshots van cijferoverzichten van Nederlandse VWO-leerlingen (meestal Magister, soms SOMtoday of een eigen lijst).

Regels:
- Neem alleen echte cijfers over: één regel per behaald cijfer. Sla gemiddelden, rapportcijfers, totaalkolommen, periode-kopjes en lege cellen over.
- Neem tekst en getallen letterlijk over; reken niets om en rond niets af.
- Staat het cijferoverzicht als raster (vakken als rijen, toetsen als kolommen), koppel elk cijfer aan de vaknaam van de rij en de kolomkop/omschrijving.
- Twijfel je welk cijfer bij welk vak of welke weging hoort: zet onzeker op true. Laat geen cijfer weg omdat je twijfelt.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const auth = await requireUser(req)
  if (!auth) return errorResponse(req, 'not_authenticated', 401)
  if (!aiConfigured()) return errorResponse(req, 'ai_not_configured', 500)

  const body = await req.json().catch(() => null)
  if (!validPaths(body?.paths, auth.user.id)) return errorResponse(req, 'invalid_paths', 400)
  const today = new Date().toISOString().slice(0, 10)

  let images
  try {
    images = await loadImages(auth.client, body.paths)
  } catch {
    return errorResponse(req, 'image_not_found', 404)
  }

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
            { type: 'text', text: `Vandaag is het ${today}. Zet alle cijfers op ${images.length === 1 ? 'dit screenshot' : `deze ${images.length} screenshots`} om in regels.` },
          ],
        },
      ],
    })

    if (res.stop_reason === 'refusal') return errorResponse(req, 'ai_refused', 422)
    if (res.stop_reason === 'max_tokens') return errorResponse(req, 'too_long', 422)
    const out = res.parsed_output
    if (!out) return errorResponse(req, 'ai_parse_failed', 502)

    return json(req, { rows: out.regels, warning: out.waarschuwing, remaining: credit.remaining })
  } catch (e) {
    console.error('extract-grades failed', e)
    const { code, status } = aiErrorCode(e)
    return errorResponse(req, code, status)
  }
})
