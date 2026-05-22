# Arkitektur

Middagsapp er en statisk nettapp/PWA uten byggsystem. Den kan kjøres direkte fra en enkel lokal webserver og publiseres som statiske filer, for eksempel på GitHub Pages.

## Overordnet struktur

- `index.html` er inngangspunktet. Den laster CSS, manifest, loading screen og `app.js`.
- `app.js` inneholder hoveddelen av appen: data, state, rendering, hendelser, forslagmotor, handlelisteflyt og Firebase-synk.
- `styles.css` inneholder alle visuelle regler.
- `service-worker.js` håndterer cache, offline-støtte og oppdateringsflyt.
- `manifest.json` definerer PWA-navn, farger og ikoner.
- `icons/` inneholder appikonene.

## Runtime-modell

Appen har ingen bundler og ingen installerte npm-avhengigheter. Firebase SDK lastes dynamisk fra Google CDN i `app.js`.

Oppstart:

1. `index.html` viser loading screen.
2. `app.js` leser state fra `localStorage`.
3. `render()` tegner aktiv visning.
4. Loading screen fjernes.
5. Firebase anonym innlogging og Firestore-synk startes.
6. Remote data kan patche lokal state og trigge ny render.

## Hovedområder i `app.js`

`app.js` er foreløpig en stor fil. Den kan leses som disse logiske områdene:

- Konstanter og standarddata.
- `defaultState` og state-normalisering.
- State/persistens: `loadState`, `saveState`, `setState`.
- Synk-hjelpere og Firestore payloads.
- Rendering av modal- og komponentdeler.
- Kalender, planlegger, oppskrifter, handleliste og oppsett.
- Mutasjoner: oppdatere plan, oppskrifter, handleliste, metadata.
- Event-binding i `bindEvents`.
- App-rendering og service worker-registrering.
- Firebase-init, listeners og remote save.

## State og rendering

Appen bruker en enkel global `state`. Endringer skjer hovedsakelig via `setState(patch)`.

`setState` gjør flere ting samtidig:

- merger patch inn i global state
- markerer synced data som endret
- lagrer til `localStorage`
- renderer hele appen
- håndterer wake lock
- planlegger remote save

Dette er praktisk, men gjør funksjonen kritisk. Endringer her bør gjøres forsiktig.

## Synk

Firebase Firestore brukes med anonym innlogging og en fast familie-ID. Data er splittet i flere dokumenter/collections:

- profile
- preferences
- metadata
- shopping
- meals
- weeks

Synkstrategien bruker `clientUpdatedAt`, `pendingRemoteScopes` og `pendingWeekKeys` for å unngå at eldre remote data overskriver lokale endringer.

## PWA og oppdatering

`service-worker.js` cacher appens statiske filer. Appfiler som `index.html`, `app.js`, `styles.css`, `manifest.json` og `service-worker.js` hentes med network-first-strategi.

Versjon bumpes manuelt på tre steder:

- `APP_VERSION` i `app.js`
- `?v=...` i `index.html`
- `CACHE_NAME` i `service-worker.js`

Se `docs/RELEASE.md`.

## Kjente tekniske forbedringsområder

Prioritert rekkefølge:

1. Dokumentasjon og utviklingsrutiner.
2. Trekke ut rene domene-funksjoner fra `app.js`.
3. Flytte Firebase-synk til egen modul.
4. Dele rendering per visning.
5. Dele CSS i logiske områder.
6. Legge til enkle tester for handleliste, mengder, ukeplan og synkbeskyttelse.

## Foreslått fremtidig mappestruktur

Dette krever en planlagt refaktor, ikke en liten hurtigendring.

```text
src/
  state.js
  sync.js
  render/
    calendar.js
    planner.js
    meals.js
    shopping.js
    setup.js
  domain/
    meals.js
    shopping.js
    weeks.js
  ui/
    modals.js
    icons.js
styles/
  base.css
  layout.css
  components.css
  views.css
  mobile.css
```

Inntil et slikt steg tas, bør eksisterende filstruktur bevares og endringer holdes små.
