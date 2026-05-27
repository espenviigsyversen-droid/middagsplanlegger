# Arkitektur

Middagsapp er en statisk nettapp/PWA uten byggsystem. Den kan kjøres direkte fra en enkel lokal webserver og publiseres som statiske filer, for eksempel på GitHub Pages.

## Overordnet struktur

- `index.html` er inngangspunktet. Den laster CSS, manifest, loading screen og `app.js`.
- `app.js` inneholder hoveddelen av appen: data, state, rendering, hendelser, forslagmotor, handlelisteflyt og Firebase-synk.
- `src/domain/meals.js` inneholder rene oppskrifts- og måltidshjelpere som kan testes og videreutvikles uten UI.
- `src/domain/shopping.js` inneholder rene mengde- og handlelistefunksjoner som kan testes og videreutvikles uten UI.
- `src/domain/suggestions.js` inneholder rene poengregler for forslagmotoren, mens historikk og state fortsatt eies av `app.js`.
- `src/domain/weeks.js` inneholder rene uke- og datofunksjoner som kan testes og videreutvikles uten UI.
- `src/sync/firebase.js` laster Firebase SDK, logger inn anonymt og bygger Firestore-referanser.
- `src/sync/reads.js` bygger lokale state-patches fra Firestore snapshots for oppskrifter og uker.
- `src/sync/state.js` inneholder rene synkbeslutninger: hvilke scopes som er endret, hvilke uker som må lagres, og når remote data er eldre enn lokale endringer.
- `src/sync/writes.js` bygger Firestore writes for de ulike sync-scopene uten å eie appens render- eller statusflyt.
- `src/render/shopping.js` inneholder HTML-malene for handlelistevisningen, vareeditor, vareforslag og shopping review modal.
- `src/render/meals.js` inneholder HTML-malene for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/render/calendar.js` inneholder HTML-malene for kalender/forside.
- `src/render/planner.js` inneholder HTML-malene for ukeplanleggeren, dagkort og planleggerens bottom sheets.
- `src/render/setup.js` inneholder HTML-malene for Innstillinger, familie-/app-undersider og enkle metadata-sider.
- `styles.css` inneholder alle visuelle regler.
- `service-worker.js` håndterer cache, offline-støtte og oppdateringsflyt.
- `manifest.json` definerer PWA-navn, farger og ikoner.
- `icons/` inneholder appikonene.
- `tests/` inneholder enkle Node-baserte tester for rene domene-funksjoner.

## Runtime-modell

Appen har ingen bundler og ingen installerte npm-avhengigheter. Lokale moduler importeres direkte som ES-moduler. Firebase SDK lastes dynamisk fra Google CDN i `app.js`.

Oppstart:

1. `index.html` viser loading screen.
2. `app.js` leser state fra `localStorage` og starter nye økter på kalender/forside.
3. `render()` tegner aktiv visning.
4. Loading screen fjernes.
5. Firebase anonym innlogging og Firestore-synk startes.
6. Remote data kan patche lokal state og trigge ny render.

## Hovedområder i `app.js`

`app.js` er foreløpig en stor fil. Den kan leses som disse logiske områdene:

- Konstanter og standarddata.
- `defaultState` og state-normalisering.
- State/persistens: `loadState`, `saveState`, `setState`.
- Importert domenelogikk: oppskrift/måltid fra `src/domain/meals.js`, mengder/handleliste fra `src/domain/shopping.js`, forslagpoeng fra `src/domain/suggestions.js` og uke/dato fra `src/domain/weeks.js`.
- Importert synklogikk: Firebase-oppkobling fra `src/sync/firebase.js`, snapshot-lesing fra `src/sync/reads.js`, konflikt-/scopebeslutninger fra `src/sync/state.js` og write-bygging fra `src/sync/writes.js`.
- Importert renderlogikk: kalender-HTML fra `src/render/calendar.js`, oppskrifts-HTML fra `src/render/meals.js`, planlegger-HTML fra `src/render/planner.js`, innstillings-HTML fra `src/render/setup.js` og handleliste-HTML fra `src/render/shopping.js`.
- Synk-hjelpere og Firestore payloads.
- Rendering av modal- og komponentdeler.
- Kalender, planlegger, oppskrifter, handleliste og oppsett.
- Mutasjoner: oppdatere plan, oppskrifter, handleliste, metadata.
- Event-binding i `bindEvents`.
- App-rendering og service worker-registrering.
- Firebase-init, listeners og remote save.

Primærnavigasjonen ligger i bunnbaren og viser de fire daglige arbeidsflatene: Kalender, Planlegger, Oppskrifter og Handle. Innstillinger er en sekundær flate som åpnes fra tannhjulknappen i toppbaren, slik at administrasjon og metadata ikke konkurrerer med de vanlige middagsflytene.

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

Oppskriftssøk oppdaterer trefflisten direkte mens brukeren skriver, uten full `setState` for hvert tastetrykk. På mobil vises de første treffene som kompakte, trykkbare forslag rett under søkefeltet, slik at de fortsatt er synlige når tastaturet dekker nedre del av skjermen. Full oppskriftsliste og filtre beholdes under forslagene.

Planleggerfanen bruker en oversikt-først-modell: hovedflaten viser kompakte dagkort for uken, mens redigering av planstatus, middag, type, porsjoner og notat skjer i et bottom sheet for valgt dag. Ukeforslag åpnes fra en fast handlingsknapp og viser valg for å fylle ledige dager, bytte åpne forslag eller senere koble på nye middager fra eksterne kilder. Denne flyten bruker eksisterende uke- og planstate og endrer ikke Firestore-dataformatet.

## Synk

Firebase Firestore brukes med anonym innlogging og en fast familie-ID. Firebase SDK-lasting, anonym innlogging og Firestore-referanser ligger i `src/sync/firebase.js`. `src/sync/reads.js` bygger lokale patches fra remote snapshots, og `src/sync/writes.js` bygger writes for scopes som profile, shopping, meals og weeks. `app.js` eier fortsatt når snapshots skal aksepteres, når lagring planlegges og hvordan UI-status vises.

Data er splittet i flere dokumenter/collections:

- profile
- preferences
- metadata
- shopping
- meals
- weeks

Synkstrategien bruker `clientUpdatedAt`, `pendingRemoteScopes` og `pendingWeekKeys` for å unngå at eldre remote data overskriver lokale endringer. Før Firestore-writes utføres, leser write-laget remote `clientUpdatedAt` for samme dokument. Hvis remote er nyere enn lokal state, droppes lokal write slik at en gammel device ikke kan overskrive nyere planlegging. Manglende remote dokumenter seedes bare ved eksplisitt førstegangsoppsett/migrering eller når lokal state faktisk har `pendingLocalSync`.

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

Første testområder er etablert i `tests/domain/meals.test.mjs`, `tests/domain/shopping.test.mjs`, `tests/domain/suggestions.test.mjs`, `tests/domain/weeks.test.mjs`, `tests/render/calendar.test.mjs`, `tests/render/meals.test.mjs`, `tests/render/planner.test.mjs`, `tests/render/setup.test.mjs`, `tests/render/shopping.test.mjs`, `tests/sync/firebase.test.mjs`, `tests/sync/reads.test.mjs`, `tests/sync/state.test.mjs` og `tests/sync/writes.test.mjs`.

## Foreslått fremtidig mappestruktur

Dette krever en planlagt refaktor, ikke en liten hurtigendring.

```text
src/
  domain/
    shopping.js
    meals.js
    suggestions.js
    weeks.js
  sync/
    firebase.js
    reads.js
    state.js
    writes.js
  render/
    calendar.js
    meals.js
    planner.js
    setup.js
    shopping.js
  state.js
  sync.js
  render/
    calendar.js
    planner.js
    meals.js
    shopping.js
    setup.js
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
