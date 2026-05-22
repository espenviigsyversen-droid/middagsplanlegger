# Middagsplanlegger

Lokal/statisk PWA for familiens middagsplanlegging, oppskrifter og handleliste.

Appen kan kjøres uten byggsteg og publiseres som vanlige statiske filer, for eksempel på GitHub Pages.

## Hovedfunksjoner

- Ukekalender og planlegger for middager.
- Oppskriftsdatabase med kategorier, ingredienser, porsjoner og steg.
- Forslagmotor for å fylle åpne dager.
- Handleliste med butikkategorier.
- Gjennomgang av ingredienser før varer legges til i handlelisten.
- Familieinnstillinger, raske dager og preferanser.
- Lokal lagring i nettleseren.
- Firebase/Firestore-synk med anonym innlogging.
- PWA-støtte med manifest, ikoner, service worker og loading screen.

## Kjør lokalt

Start en enkel lokal webserver i prosjektmappen og åpne:

```text
http://127.0.0.1:8765/
```

Prosjektmappen:

```text
C:\Users\espen\Downloads\00_Organisert\02_Prosjekter_og_apper\Middagsapp
```

## Viktige filer

- `index.html`: inngangspunkt, loading screen og versjonsmerkede appfiler.
- `app.js`: hovedlogikk, state, rendering, hendelser og Firebase-synk.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner.
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

## Lokal kontroll

Kjør disse etter JavaScript-endringer:

```powershell
node --check app.js
node --check service-worker.js
```

## Publisering

Appen har manuelt versjonsnummer. Når kode, CSS, HTML eller service worker endres, bump versjonen i:

- `APP_VERSION` i `app.js`
- query-parametre i `index.html`
- `CACHE_NAME` i `service-worker.js`

Se `docs/RELEASE.md` for full sjekkliste.
