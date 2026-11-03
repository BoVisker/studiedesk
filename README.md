# StudieDesk

Leerdashboard voor VWO-leerlingen: per vak leren, toetsen plannen en cijfers bijhouden.
Vite + React + TypeScript + Tailwind, gehost op GitHub Pages, met Supabase (Auth, Postgres, Storage, Edge Functions) als backend.

> **Status:** fase 1 t/m 8 zijn klaar: project, auth, thema's, vakkeuze, template-systeem, lijsten, leervormen met spaced repetition, foto naar woordenlijst, foto naar samenvatting of uitwerking, cijfers met screenshot-import, de toetsplanner, en offline leren (PWA). ICS-agenda-import volgt zodra er een voorbeeldfeed is.

## Architectuur in het kort

- **Frontend** (`src/`): een statische site met `HashRouter`, zodat GitHub Pages bij een refresh geen 404 geeft.
- **Beveiliging** zit in de database: elke tabel heeft Row Level Security (`user_id = auth.uid()`). De Supabase-URL en de anon key zijn publiek; dat mag.
- **Geheime keys** (Anthropic, YouTube) staan alleen als Supabase secrets en worden alleen in Edge Functions (`supabase/functions/`) gebruikt. Ze staan nooit in de frontend of in de repo.
- **Inloggen** gebruikt de PKCE-flow. Een magic link komt terug als `https://…/studiedesk/?code=…`, dus in de query string en niet in de `#`. Zo botst het niet met HashRouter.
- **Registratie werkt alleen op uitnodiging.** Alleen e-mailadressen in `public.signup_allowlist` kunnen een account maken.
- **AI-limiet:** maximaal `ai_daily_limit` (standaard 30) AI-calls per gebruiker per dag. Edge Functions roepen eerst `consume_ai_credit()` aan.

```
src/
  app/            providers (thema, auth) en router
  components/     ui/ (design-systeem) en layout/
  design/         vak-accentkleuren (WCAG AA, getest)
  features/       per functie: auth, profile, home, legal, …
  lib/            supabase-client, env, feature flags, thema, export
  styles/         tokens.css (CSS-variabelen) en index.css
supabase/
  migrations/     SQL-migraties (schema + RLS)
  functions/      Edge Functions (_shared/ + delete-account/)
  tests/database/ pgTAP RLS-tests
tests/            Vitest-unit-tests
docs/             o.a. magister-later.md (fase 6)
```

## 1. Lokaal draaien

Vereisten: Node 22 of hoger. Voor de databasetests ook Docker (Docker Desktop of [OrbStack](https://orbstack.dev)).

```bash
npm install
cp .env.example .env.local   # vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
npm run dev                  # http://localhost:5173
```

Tests:

```bash
npm test          # unit-tests (contrast, thema, foutmeldingen, geen secrets in src/)
supabase start    # lokale Supabase-stack (Docker)
npm run test:db   # pgTAP: RLS, uitnodigingslijst, AI-limiet
```

## 2. Supabase-project

1. Maak een project aan op [supabase.com](https://supabase.com). Kies regio **EU (Frankfurt)** vanwege de AVG.
2. Koppel de repo en zet de migraties op het project:
   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```
3. Nodig jezelf uit en maak jezelf beheerder via de **SQL Editor**. Zet e-mailadressen nooit in een migratie, want de repo is openbaar.
   ```sql
   insert into public.signup_allowlist (email) values ('jij@voorbeeld.nl');
   -- na registratie:
   insert into public.admins (user_id) select id from auth.users where email = 'jij@voorbeeld.nl';
   ```
   Beheerders nodigen daarna anderen uit via **Uitnodigingen** in de app. Open registratie voor iedereen? Voer dan `drop trigger enforce_signup_allowlist on auth.users;` uit.
4. Zet onder **Authentication → URL Configuration**:
   - Site URL: `https://<github-user>.github.io/<repo>/`
   - Redirect URLs: `https://<github-user>.github.io/<repo>/` en `http://localhost:5173/`
5. Zet onder **Authentication → Providers → Email** "Confirm email" aan. Voor meer dan een handvol gebruikers stel je onder **Authentication → SMTP** een eigen mailserver in, want de ingebouwde mail is beperkt tot een paar berichten per uur.
6. Zet de secrets en deploy de Edge Functions:
   ```bash
   supabase secrets set ALLOWED_ORIGINS="https://<github-user>.github.io,http://localhost:5173"
   # vanaf fase 4:
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...      # nooit in .env of de repo
   supabase secrets set AI_MODEL=claude-sonnet-5-5         # optioneel, dit is de standaard
   # vanaf fase 9:
   supabase secrets set YOUTUBE_API_KEY=...
   supabase functions deploy delete-account
   supabase functions deploy extract-list
   supabase functions deploy explain-photo
   supabase functions deploy extract-grades
   ```
7. Database-types opnieuw genereren na een migratie: `npm run db:types`.
8. Zijn migraties via het dashboard of de MCP-koppeling toegepast in plaats van met `supabase db push`? Dan verschillen de versienummers. Kijk met `supabase migration list` en lijn ze eenmalig uit met `supabase migration repair --status applied <versie>`.

### AI-limiet aanpassen

```sql
update public.app_config set value = '50' where key = 'ai_daily_limit';
```

### Google-login (optioneel)

1. Maak in Google Cloud een OAuth-client ("Web application") aan. Gebruik als redirect-URI `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Vul client-ID en secret in onder Supabase: **Authentication → Providers → Google**.
3. Zet de GitHub-variabele `VITE_FEATURE_GOOGLE_LOGIN` op `true`. Lokaal doe je dat in `.env.local`.

Let op: de uitnodigingslijst geldt ook voor Google-accounts.

## 3. GitHub Pages en Actions

1. Push naar een GitHub-repo. De `base`-URL wordt automatisch `/<reponaam>/`.
2. Kies onder **Settings → Pages → Source** de optie **GitHub Actions**.
3. Voeg onder **Settings → Secrets and variables → Actions → Variables** deze repository-variabelen toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (de publishable/anon key)

   Dit zijn variabelen en geen secrets: ze belanden toch in de publieke bundle.
4. Elke push naar `main` draait de tests, bouwt de site en deployt naar `https://<github-user>.github.io/<repo>/`.

## 4. Vakken en blokken (template-systeem)

- `src/config/subjects.ts` legt per vak het archetype, het icoon, de accentkleur en de standaardblokken vast.
- `src/config/blocks.ts` is het register van alle blokken: titel, omschrijving en of het blok al werkt.
- Per gebruiker staat in `user_subjects.blocks` een lijst `{id, enabled, title?}`. `resolveBlocks()` combineert die met de config: de eigen volgorde, aan/uit en titels blijven behouden, nieuwe blokken komen achteraan en verouderde verdwijnen.
- Een nieuw blok toevoegen gaat zo:
  1. Registreer het in `blocks.ts`.
  2. Zet het bij de juiste vakken in `subjects.ts`.
  3. Geef het een eigen component in `BlockCard.tsx`.
- Een nieuw vak toevoegen gaat zo:
  1. Zet het in `subjects.ts` en `subjectPalette.ts`.
  2. Maak een migratie die de check-constraint op `user_subjects.subject` uitbreidt.
  3. Een test controleert dat config en migratie overeenkomen.

## 5. Lijsten en leren

- **Lijsten** (`lists` en `list_items`) hebben een soort: woorden, begrippen of formules. Die soort bepaalt de kolomnamen. Je maakt een lijst handmatig of via **Plakken**: per regel een tab, `=`, ` - `, `;` of `,`, die automatisch wordt herkend (`importParser.ts`).
- **Leervormen:** flashcards (omdraaien en swipen), typen, meerkeuze en toets (met cijfer `1 + 9 × score`).
- **Antwoordcontrole** (`answerCheck.ts`):
  - hoofdletters en accenten zijn aparte instellingen;
  - meerdere antwoorden scheid je met `,` `;` of `/`;
  - `(haakjes)` zijn optioneel;
  - "bijna goed" bij een kleine typefout of alleen een accentverschil, met de keuze om het toch goed te rekenen.
- **Spaced repetition: Leitner met 6 bakjes** (`srs.ts`):
  - goed: een bakje verder, en het item komt over 1, 2, 4, 8, 16 of 32 dagen terug;
  - fout: terug naar bakje 1, morgen opnieuw;
  - binnen een sessie komen foute items terug tot ze goed zijn, maar alleen de eerste poging telt voor het bakje;
  - een item telt per bezoek aan een leerpagina maar één keer mee. "Opnieuw" en "alleen de foute" zijn extra oefening.
- De herhaalstatus geldt per item, niet per richting.
- **Sneltoetsen:** spatie draait om, 1/2 of ←/→ is fout/goed, 1–4 kiest bij meerkeuze, Enter gaat verder.
- **Tekst-naar-spraak** gebruikt de Web Speech API van de browser, met de taal die per lijst is ingesteld.

## 6. Foto naar lijst (AI)

1. De browser verkleint foto's tot maximaal 2000 px (JPEG) en uploadt ze naar de privé-bucket `source-images` onder `<user_id>/tmp/`. Opslag-RLS staat alleen je eigen map toe.
2. De Edge Function `extract-list`:
   - controleert de login en de paden;
   - verbruikt één AI-credit;
   - stuurt de foto's naar Claude via de officiële SDK met **gestructureerde output** (`betaZodOutputFormat`). De JSON is dus schema-gevalideerd: per rij `term`, `betekenis`, `opmerking`, `woordsoort`, `voorbeeldzin` en `onzeker`.
3. **Het controlescherm is verplicht.** Je ziet de foto naast een bewerkbare tabel, onzekere regels zijn oranje en je kunt kolommen omwisselen.
4. Na het opslaan worden de foto's standaard verwijderd. Wie dat uitzet, bewaart ze bij de lijst onder `<user_id>/lists/<id>/`. Afgebroken imports in `tmp/` worden na 24 uur opgeruimd.

**Model:** `AI_MODEL` (standaard `claude-sonnet-5-5`) staat in `supabase/functions/_shared/config.ts`. De server-side fallback (`fallbacks: "default"`) staat aan: als de veiligheidsfilters een verzoek onterecht weigeren, probeert de API het automatisch op een ander model.

**Benodigde secrets** (via Dashboard → Edge Functions → Secrets of `supabase secrets set`):
- `ANTHROPIC_API_KEY`
- `ALLOWED_ORIGINS`, bijv. `https://bovisker.github.io,http://localhost:5173`

## 7. Foto naar samenvatting of uitwerking (AI)

- **Route:** `/notities/foto`. Op de vakpagina staan de blokken **Samenvattingen** (natuur- en maatschappijvakken) en **Opgaven-logboek** (wiskunde).
- **Edge Function `explain-photo`:** hetzelfde patroon als `extract-list` (login, padcontrole, één AI-credit, gestructureerde output), met twee modi:
  - `samenvatting`: lengte kort, normaal of uitgebreid. Levert secties met kernpunten, kernbegrippen, formules en oefenvragen.
  - `uitwerking`: per opgave de stappen met uitleg en berekening, het antwoord en een manier om het zelf te controleren.
- **Wiskunde** staat in de tekst tussen `\( … \)` of `\[ … \]` en wordt met KaTeX gezet (`MathText.tsx`). Dollartekens tellen bewust niet als scheidingsteken, zodat bedragen bij economie gewoon tekst blijven. KaTeX escapet alle invoer en wordt alleen geladen op de pagina's die het nodig hebben.
- **Uitwerkingen** tonen altijd een waarschuwing dat de leerling ze zelf moet controleren. Onzekere opgaven krijgen een extra melding.
- **Oefenvragen** worden direct gecontroleerd en kosten geen extra AI-call:
  - meerkeuze: meteen goed of fout;
  - kort: met de regels van `answerCheck.ts`, varianten gescheiden door ` / ` (niet op komma's, vanwege decimalen);
  - open: eerst het modelantwoord tonen, dan zelf beoordelen.
- **Kernbegrippen** worden met één knop een begrippenlijst, die je met alle leervormen kunt leren.
- **Opslag:** tabel `notes`, met de inhoud als JSON en RLS per gebruiker. De foto's worden na het bewaren verwijderd; bij weggooien direct.

## 8. Cijfers en bronnen

- **Tabel `grades`:** cijfer (1–10), weging, datum, `counts` (telt mee ja/nee), `source` en `external_id`.
  - De unieke index op `(user_id, source, external_id)` voorkomt dat dezelfde import twee keer wordt opgeslagen.
  - Handmatige cijfers hebben geen `external_id`; je mag dus wel twee keer hetzelfde cijfer invoeren.
- **Rekenen** (`src/features/grades/calc.ts`), bewust zonder overgangs- of slaag/zakregels:
  - **Gemiddelde:** Σ(cijfer × weging) / Σ weging.
  - **Lopend gemiddelde:** in een Recharts-grafiek.
  - **Wat moet ik halen:** `(doel × (W + w) − Σ cijfer × weging) / w`, naar boven afgerond op één decimaal.
  - **Wat als:** met fictieve cijfers.
  - **Schooljaren** lopen van 1 augustus tot en met 31 juli.
- **Screenshot-import:** foto of screenshot → Edge Function `extract-grades` → verplicht controlescherm.
  - **Vakken herkennen:** vaknamen en Magister-afkortingen (`entl`, `wisB`, `biol` …) worden herkend in `subjectMatch.ts`; onbekende vakken kies je zelf.
  - **Dubbele regels** gaan standaard uit: regels die je al hebt, en overlap tussen twee screenshots.
  - **Na het uitlezen** wordt het screenshot meteen verwijderd.
- **Bron-adapters** (`src/sources/`): `GradeSource` en `CalendarSource` met de modus `invoer` (`manual`), `import` (`screenshot`, `ics`) of `sync`.
  - `ics` komt in fase 7.
  - `magister` is een lege stub die ook met `VITE_FEATURE_MAGISTER=true` uit blijft. Zie [docs/magister-later.md](docs/magister-later.md).
  - `tests/sources.test.ts` bewaakt dat er geen Magister-netwerk-, inlog- of tokencode bestaat.

## 9. Toetsplanner

- **Route:** `/planner`. Je voert toetsen in (vak, omschrijving, datum, hoeveel leermomenten). Het leerplan wordt in de app berekend, zonder AI.
- **Algoritme** (`src/features/planner/planner.ts`), uitlegbaar in drie regels:
  1. Per toets plannen we `effort` leermomenten in de dagen vóór de toets.
  2. Die verdelen we gelijkmatig, met altijd één moment op de dag vóór de toets.
  3. Is een dag te vol (meer dan het ingestelde maximum), dan schuift een moment naar een rustigere dag binnen hetzelfde venster; lukt dat niet, dan heet het een "drukke dag".
- **Vandaag:** de leermomenten van vandaag plus je te herhalen woorden/begrippen (spaced repetition), elk af te vinken.
- **Herplannen gebeurt vanzelf:** het plan wordt elke keer opnieuw berekend uit je huidige toetsen en de datum van vandaag. Afgevinkte momenten blijven staan (bewaard op toets + datum in `plan_checkoffs`).
- **Opslag:** tabel `tests` (met `source`/`external_id` voor latere ICS-import) en `plan_checkoffs`, beide met RLS per gebruiker. Het maximum leermomenten per dag is een persoonlijke voorkeur in `localStorage`.
- **ICS-agenda-import** (toetsen uit de agendalink van je school) staat klaar in de bron-architectuur (`icsCalendarSource`) maar is nog uit; die bouwen we zodra er een voorbeeld-`.ics` is om de herkenning op af te stemmen.

## 10. Offline en installeren (PWA)

StudieDesk is een installeerbare PWA: je kunt woordenlijsten ook zonder internet leren.

- **Service worker** (via `vite-plugin-pwa`) cachet de app-shell, zodat de app offline opent. Bij een nieuwe versie zie je een melding "Vernieuwen" (`src/app/PwaPrompt.tsx`).
- **Gegevens offline** (`src/lib/offline/`): lijsten en items worden in IndexedDB gecachet (`idb`). Online wordt alles opgehaald en bijgewerkt; offline lees je uit de cache, zodat leren en herhalen gewoon werkt.
- **Sync-wachtrij (outbox):** herhalingen en leersessies worden eerst lokaal opgeslagen (optimistisch) en in een wachtrij gezet. Zodra er verbinding is, worden ze naar Supabase gestuurd (oudste eerst). Lukt een regel na `MAX_ATTEMPTS` pogingen niet, dan laten we hem vallen.
- **Conflictstrategie: de laatste herhaling wint.** Elke herhaling draagt het tijdstip `last_reviewed_at` mee. Bij het synchroniseren past de server de herhaling alleen toe als het opgeslagen `last_reviewed_at` leeg is of niet nieuwer dan onze herhaling (PostgREST-filter `conflictFilter`). Leer je hetzelfde woord op twee apparaten, dan wint dus de meest recente herhaling. Leersessies zijn alleen-toevoegen en kennen geen conflict.
- **Geen IndexedDB?** In de privémodus of een oudere browser valt alles netjes terug op direct online werken; de app breekt nooit.

### iOS-beperkingen

Op iPhone/iPad gelden extra beperkingen van Safari/iOS:

- Offline werkt het betrouwbaarst als je de app **aan je beginscherm toevoegt** (Deel → Zet op beginscherm). In een gewone Safari-tab kan iOS de opslag eerder wissen.
- iOS kan de offline-opslag (IndexedDB en caches) wissen na ongeveer **7 dagen** zonder gebruik van de geïnstalleerde app.
- Er is **geen achtergrond-sync**: synchroniseren gebeurt wanneer je de app opent, niet vanzelf op de achtergrond.

## 11. Privacy en data

- Geen analytics, geen advertenties. De lettertypes worden mee-gebundeld, dus er gaan geen verzoeken naar Google Fonts.
- Gebruikers kunnen op de profielpagina hun data exporteren (JSON) en hun account verwijderen.
- Account verwijderen loopt via de Edge Function `delete-account`. Die wist eerst de Storage-bestanden onder `<user_id>/` en daarna de auth-gebruiker. Alle tabellen hangen met `on delete cascade` aan `auth.users`.
- Nieuwe tabellen met gebruikersdata:
  1. Geef ze RLS en een `user_id … on delete cascade`.
  2. Voeg ze toe aan `EXPORT_TABLES` in `src/lib/exportData.ts`.
  3. Voeg een pgTAP-test toe.

## 12. Design-systeem: "papier & inkt"

- Alle kleuren zijn CSS-variabelen in `src/styles/tokens.css`. Tailwind leest ze via `@theme` (`bg-surface`, `text-muted`, `bg-accent`, …).
- Het thema (licht, donker of systeem) staat in `localStorage` en in `profiles.theme`. Een inline script in `index.html` zet het thema vóór de eerste paint, zodat er geen flits is.
- Elk vak heeft een eigen accentkleur in `src/design/subjectPalette.ts`. Een test controleert dat elke kleur minstens 4,5:1 contrast haalt in beide thema's.
- Lettertypes: Fraunces voor koppen, Instrument Sans voor tekst, JetBrains Mono voor formules en code.
