# StudieDesk

Leerdashboard voor VWO-leerlingen: per vak leren, toetsen plannen en cijfers bijhouden.
Vite + React + TypeScript + Tailwind, gehost op GitHub Pages, met Supabase (Auth, Postgres, Storage, Edge Functions) als backend.

> **Status:** fase 1: project, deploy, Supabase-koppeling, inloggen, thema's en design-systeem.

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
3. Nodig gebruikers uit via de **SQL Editor**:
   ```sql
   insert into public.signup_allowlist (email) values ('jij@voorbeeld.nl');
   ```
   Open registratie voor iedereen? Voer dan `drop trigger enforce_signup_allowlist on auth.users;` uit.
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
   ```
7. Database-types opnieuw genereren na een migratie: `npm run db:types`.

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

## 4. Privacy en data

- Geen analytics, geen advertenties. De lettertypes worden mee-gebundeld, dus er gaan geen verzoeken naar Google Fonts.
- Gebruikers kunnen op de profielpagina hun data exporteren (JSON) en hun account verwijderen.
- Account verwijderen loopt via de Edge Function `delete-account`. Die wist eerst de Storage-bestanden onder `<user_id>/` en daarna de auth-gebruiker. Alle tabellen hangen met `on delete cascade` aan `auth.users`.
- Nieuwe tabellen met gebruikersdata:
  1. Geef ze RLS en een `user_id … on delete cascade`.
  2. Voeg ze toe aan `EXPORT_TABLES` in `src/lib/exportData.ts`.
  3. Voeg een pgTAP-test toe.

## 5. Design-systeem: "papier & inkt"

- Alle kleuren zijn CSS-variabelen in `src/styles/tokens.css`. Tailwind leest ze via `@theme` (`bg-surface`, `text-muted`, `bg-accent`, …).
- Het thema (licht, donker of systeem) staat in `localStorage` en in `profiles.theme`. Een inline script in `index.html` zet het thema vóór de eerste paint, zodat er geen flits is.
- Elk vak heeft een eigen accentkleur in `src/design/subjectPalette.ts`. Een test controleert dat elke kleur minstens 4,5:1 contrast haalt in beide thema's.
- Lettertypes: Fraunces voor koppen, Instrument Sans voor tekst, JetBrains Mono voor formules en code.
