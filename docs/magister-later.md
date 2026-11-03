# Magister: later, en alleen officieel

StudieDesk heeft een plek voor een Magister-koppeling (`src/sources/magister.ts`), maar die staat uit en bevat geen code. Dit document legt uit waarom, en wat er nodig is om hem ooit aan te zetten.

## Wat nu werkt

- **Cijfers:** maak een screenshot van je cijferoverzicht in Magister en importeer die via **Cijfers → Importeren**. Je controleert elke regel voordat er iets wordt opgeslagen. Dubbele regels worden herkend.
- **Toetsen:** in fase 7 komt import via de agenda-link (ICS) van je school, als je school die aanbiedt.

## Harde regels

Deze regels gelden voor elke toekomstige koppeling:

1. **Nooit inloggegevens.** StudieDesk vraagt nooit om een Magister-gebruikersnaam of -wachtwoord en slaat die nooit op, ook niet versleuteld.
2. **Alleen officieel.**
   - Geen onofficiële of reverse-engineerde API.
   - Geen scraping van de Magister-website.
   - Niet het client-ID van de Magister-app of van een andere partij gebruiken.
3. **Geen schooltokens op de server.** Toegangs- en refresh-tokens van een schoolaccount worden nooit op de Supabase-server opgeslagen.

## Voorwaarden om de stub aan te zetten

1. **Een officiële koppeling:** een API die Magister (Iddink) en/of de school aanbiedt voor externe apps, met een eigen geregistreerde client en schriftelijke toestemming.
2. **Een gebruikersflow volgens die koppeling,** bijvoorbeeld OAuth met een eigen client. De leerling geeft zelf toestemming en kan die intrekken.
3. **Een privacytoets:** wat wordt opgehaald, waar staat het, hoe lang blijft het bewaard. Werk de privacyverklaring bij.
4. **Pas daarna de code:**
   - Implementeer `fetchGrades`/`fetchItems` in `src/sources/magister.ts`.
   - Zet `MAGISTER_IMPLEMENTED` op `true` en `VITE_FEATURE_MAGISTER` op `true`.
   - Geïmporteerde rijen krijgen `source = 'magister'` en de officiële id als `external_id`. De unieke index op `(user_id, source, external_id)` voorkomt dan dubbele cijfers.
   - Pas de test `tests/sources.test.ts` aan. Die bewaakt nu dat er geen Magister-netwerk- of inlogcode bestaat.

Zolang aan deze voorwaarden niet is voldaan, blijft de stub leeg. Ook met `VITE_FEATURE_MAGISTER=true` gebeurt er dan niets.
