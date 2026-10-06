# Middagsplanlegger

Lokal/statisk PWA for familiens middagsplanlegging, oppskrifter og handleliste.

Appen kan kjøres uten byggsteg og publiseres som vanlige statiske filer, for eksempel på GitHub Pages.

## Hovedfunksjoner

- Ukekalender og planlegger for middager.
- Oppskriftsdatabase med kategorier, ingredienser, porsjoner og steg.
- Import fra oppskriftslenke eller innlimt tekst til editorens utkast, med gjennomgang før lagring.
- Forslagmotor for å fylle åpne dager.
- Handleliste som startside, med butikkategorier og Firestore-dokument per vare.
- Gjennomgang av ingredienser før varer legges til i handlelisten.
- Familieinnstillinger, raske dager og preferanser.
- Lokal lagring i nettleseren.
- Firebase/Firestore-synk med Google-innlogging og medlemsstyrt tilgang.
- Eksplisitt førstegangsoppsett fra sikkerhetskopi, og administrasjon av medlemmer.
- PWA-støtte med manifest, ikoner, service worker og loading screen.

## Kjør lokalt

Start en enkel lokal webserver i prosjektmappen og åpne:

```text
http://127.0.0.1:8765/
```

Prosjektmappen:

```text
C:\Users\espen\Documents\GitHub\middagsplanlegger
```

## Viktige filer

- `index.html`: inngangspunkt, loading screen og versjonsmerkede appfiler.
- `app.js`: hovedlogikk, state, rendering, hendelser og Firebase-synk.
- `src/domain/meals.js`: rene oppskrifts- og måltidshjelpere.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner.
- `src/sync/shopping.js`: vareendringer, minnekø og handlelistelytter.
- `src/sync/access.js`: innloggingstilgang, prosjektmerket cache og versjonsvakt.
- `src/sync/restore.js`: validering og eksplisitt gjenoppretting ved oppsett.
- `firestore.rules`: tilgangsreglene som skal publiseres til det nye Firebase-prosjektet.
- `functions/`: serverfunksjon for oppskriftsimport med medlemskontroll og felles bruksgrense.
- `src/domain/weeks.js`: rene uke- og datofunksjoner.
- `styles.css`: all styling og responsiv layout.
- `service-worker.js`: PWA-cache og oppdateringsstrategi.
- `manifest.json`: PWA metadata.
- `icons/`: appikoner.
- `AGENTS.md`: arbeidsinstruks for Codex/AI-agent.
- `docs/`: teknisk dokumentasjon.

## Dokumentasjon

Les disse før større endringer:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/STATE_MODEL.md`
- `docs/RELEASE.md`
- `docs/FIREBASE_OPPSETT.md`

## Lokal kontroll

Kjør disse etter JavaScript-endringer:

```powershell
node --check app.js
node --check service-worker.js
node tests/domain/meals.test.mjs
node tests/domain/shopping.test.mjs
node tests/domain/weeks.test.mjs
```

## Publisering

Arbeidsmappen er Git-klonen. Eier håndterer commit og publisering med GitHub Desktop; Codex bruker ingen Git-kommandoer. Følg «Utrulling av v95» i `docs/RELEASE.md`, og sett opp det nye Firebase-prosjektet etter `docs/FIREBASE_OPPSETT.md`. Gamle klienter fortsetter å bruke det gamle prosjektet; deres senere endringer overføres ikke.

Appen har manuelt versjonsnummer. Når kode, CSS, HTML eller service worker endres, bump versjonen i:

- `APP_VERSION` i `app.js`
- query-parametre i `index.html`
- `CACHE_NAME` i `service-worker.js`

Se `docs/RELEASE.md` for full sjekkliste.

Fra v96 må importRecipe-funksjonen og API-secret publiseres før appen. Se `docs/FIREBASE_OPPSETT.md`. Agenten kjører bare lokale tester med stubber; installasjon og publisering utføres av eier.
