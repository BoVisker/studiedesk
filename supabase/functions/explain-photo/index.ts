// Foto('s) van lesstof → samenvatting met begrippen, formules en oefenvragen,
// of foto van een wiskundeopgave → stap-voor-stap-uitwerking.
// Wiskunde in de tekst staat tussen \( … \) (inline) of \[ … \] (los), zodat
// een dollarteken (bedragen bij economie) nooit als formule wordt gelezen.
import { betaZodOutputFormat } from 'npm:@anthropic-ai/sdk@1.4.0/helpers/beta/zod'
import { z } from 'npm:zod@4.6.7'
import { aiClient, aiConfigured, aiErrorCode, baseRequest } from '../_shared/ai.ts'
import { consumeAiCredit } from '../_shared/aiUsage.ts'
import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, errorResponse, json } from '../_shared/cors.ts'
import { loadImages, validPaths } from '../_shared/images.ts'

const MATH = 'Wiskunde/formules altijd in LaTeX tussen \\( en \\) (in de zin) of \\[ en \\] (losse regel). Nooit $ als scheidingsteken gebruiken.'

const Summary = z.object({
  titel: z.string().describe('Korte titel van de stof, bijv. "§3.2 De celmembraan".'),
  secties: z.array(
    z.object({
      kop: z.string(),
      punten: z.array(z.string()).describe('Kernpunten als korte, volledige zinnen. ' + MATH),
    }),
  ),
  kernbegrippen: z.array(
    z.object({
      term: z.string().describe('Het begrip zoals in het boek.'),
      uitleg: z.string().describe('Definitie in één of twee zinnen, zonder LaTeX.'),
    }),
  ),
  formules: z.array(
    z.object({
      naam: z.string(),
      latex: z.string().describe('Alleen de formule in LaTeX, zonder \\( \\) of $.'),
      uitleg: z.string().describe('Betekenis van de symbolen en eenheden. ' + MATH),
    }),
  ),
  vragen: z.array(
    z.object({
      soort: z.enum(['meerkeuze', 'kort', 'open']).describe('meerkeuze: 4 opties. kort: antwoord is één woord, getal of korte term. open: uitlegvraag.'),
      vraag: z.string().describe(MATH),
      opties: z.array(z.string()).describe('Bij meerkeuze precies 4 opties, anders leeg.'),
      juist: z.number().int().nullable().describe('Bij meerkeuze de index (0-3) van het juiste antwoord, anders null.'),
      antwoord: z.string().describe('Het juiste antwoord. Bij "kort": alleen het antwoord zelf, zonder LaTeX (bijv. "3,5 m/s"); meerdere goede varianten scheiden met " / ".'),
      uitleg: z.string().describe('Waarom dit het antwoord is, met verwijzing naar de stof. ' + MATH),
    }),
  ),
  waarschuwing: z.string().nullable().describe('Korte Nederlandse melding als de foto onleesbaar is of geen lesstof bevat. Anders null.'),
})

const Worked = z.object({
  opgaven: z.array(
    z.object({
      nummer: z.string().nullable().describe('Opgavenummer zoals op de foto (bijv. "12b"), of null.'),
      opgave: z.string().describe('De opgave overgenomen van de foto. ' + MATH),
      stappen: z.array(
        z.object({
          titel: z.string().describe('Wat je in deze stap doet, bijv. "Afgeleide bepalen".'),
          uitleg: z.string().describe('Waarom en hoe, voor een VWO-leerling. ' + MATH),
          berekening: z.string().nullable().describe('De berekening van deze stap in LaTeX zonder \\[ \\], meerdere regels met \\\\. Null als er niets te rekenen is.'),
        }),
      ),
      antwoord: z.string().describe('Het eindantwoord, met eenheid of in de gevraagde vorm. ' + MATH),
      controle: z.string().describe('Hoe de leerling het antwoord zelf kan controleren (invullen, schatten, GR). ' + MATH),
      onzeker: z.boolean().describe('true als de opgave slecht leesbaar was of je niet zeker bent van de uitwerking.'),
    }),
  ),
  waarschuwing: z.string().nullable().describe('Korte Nederlandse melding als de foto onleesbaar is of geen opgave bevat. Anders null.'),
})

const LENGTH: Record<string, string> = {
  kort: 'Kort: 2 tot 3 secties met elk 2 tot 4 punten, en 4 oefenvragen.',
  normaal: 'Normaal: 3 tot 5 secties met elk 3 tot 6 punten, en 6 oefenvragen.',
  uitgebreid: 'Uitgebreid: alle onderwerpen van de foto in eigen secties met alle details en voorbeelden, en 10 oefenvragen.',
}

const SYSTEM_SUMMARY = `Je maakt studiemateriaal voor Nederlandse VWO-leerlingen op basis van foto's uit hun lesboek of aantekeningen.

Regels:
- Gebruik alleen wat op de foto's staat. Voeg geen feiten toe die er niet staan; is iets onduidelijk, laat het weg of noem het in de waarschuwing.
- Schrijf in helder Nederlands op VWO-niveau, ook als de foto in een andere taal is (begrippen mogen in de oorspronkelijke taal blijven).
- Kernbegrippen: de belangrijkste begrippen met de definitie zoals in de stof.
- Formules: alleen formules die echt op de foto staan. Geen formules? Dan een lege lijst.
- Oefenvragen: toetsvragen over deze stof, een mix van meerkeuze, kort en open. Meerkeuze-afleiders zijn aannemelijk maar duidelijk fout.
- ${MATH}`

const SYSTEM_WORKED = `Je bent een geduldige wiskundedocent voor Nederlandse VWO-leerlingen (wiskunde A/B/C/D, of rekenen bij natuurkunde, scheikunde en economie).

Regels:
- Werk elke opgave op de foto('s) stap voor stap uit, in de notatie en aanpak die op Nederlandse middelbare scholen gebruikelijk is.
- Leg in elke stap uit waarom je hem zet, niet alleen wat. Sla geen rekenstappen over.
- Reken zorgvuldig en controleer je eindantwoord zelf voordat je het geeft.
- Staat er een grafische rekenmachine-opdracht, beschrijf dan ook de GR-aanpak.
- Is de opgave onleesbaar of niet eenduidig, zet onzeker op true en zeg in de uitleg welke aanname je doet.
- ${MATH}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return errorResponse(req, 'method_not_allowed', 405)

  const auth = await requireUser(req)
  if (!auth) return errorResponse(req, 'not_authenticated', 401)
  if (!aiConfigured()) return errorResponse(req, 'ai_not_configured', 500)

  const body = await req.json().catch(() => null)
  const mode = body?.mode === 'uitwerking' ? 'uitwerking' : 'samenvatting'
  const length = typeof body?.length === 'string' && body.length in LENGTH ? body.length : 'normaal'
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

  const photos = images.length === 1 ? 'deze foto' : `deze ${images.length} foto's (in volgorde)`
  const text =
    mode === 'samenvatting'
      ? `Vak: ${subject || 'onbekend'}. Maak een samenvatting van ${photos}. ${LENGTH[length]}`
      : `Vak: ${subject || 'onbekend'}. Werk de opgave(n) op ${photos} stap voor stap uit.`

  try {
    const res = await aiClient().beta.messages.parse({
      ...baseRequest(),
      max_tokens: 20000,
      output_config: { effort: 'medium', format: betaZodOutputFormat(mode === 'samenvatting' ? Summary : Worked) },
      system: mode === 'samenvatting' ? SYSTEM_SUMMARY : SYSTEM_WORKED,
      messages: [{ role: 'user', content: [...images, { type: 'text', text }] }],
    })

    if (res.stop_reason === 'refusal') return errorResponse(req, 'ai_refused', 422)
    if (res.stop_reason === 'max_tokens') return errorResponse(req, 'too_long', 422)
    const out = res.parsed_output
    if (!out) return errorResponse(req, 'ai_parse_failed', 502)

    return json(req, { mode, content: out, remaining: credit.remaining })
  } catch (e) {
    console.error('explain-photo failed', e)
    const { code, status } = aiErrorCode(e)
    return errorResponse(req, code, status)
  }
})
