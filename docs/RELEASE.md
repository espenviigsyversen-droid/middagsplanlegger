# Release og publisering

Dette prosjektet publiseres som statiske filer. Det finnes ikke et byggsteg.

## Før publisering

Kjør lokale kontroller:

```powershell
node --check app.js
node --check service-worker.js
node tests/domain/meals.test.mjs
node tests/domain/shopping.test.mjs
node tests/domain/suggestions.test.mjs
node tests/domain/weeks.test.mjs
node tests/sync/firebase.test.mjs
node tests/sync/state.test.mjs
node tests/sync/writes.test.mjs
```

Hvis bare dokumentasjon er endret, er disse ikke strengt nødvendige, men de er trygge å kjøre.

## Versjonsbump

Ved endringer i app, CSS, HTML eller service worker: bump versjon på alle steder.

Eksempel for versjon `v68`:

1. `app.js`

```js
const APP_VERSION = "v68";
```

2. `index.html`

```html
<link rel="manifest" href="manifest.json?v=68">
<link rel="stylesheet" href="styles.css?v=68">
<script type="module" src="app.js?v=68"></script>
```

3. `service-worker.js`

```js
const CACHE_NAME = "middagsplan-v68";
```

## Filer som ofte må lastes opp

Ved appendringer:

- `app.js`
- nye filer under `src/`
- `styles.css`
- `index.html`
- `service-worker.js`

Ved PWA-/ikonendringer:

- `manifest.json`
- `icons/*`

Ved dokumentasjon:

- `README.md`
- `AGENTS.md`
- `docs/*`

## Sjekk etter publisering

1. Åpne appen.
2. Trykk `Oppdater app`.
3. Sjekk at App-panelet viser ny versjon.
4. Test endret flyt på både PC og mobil hvis endringen gjelder UI.

## Hvis gammel versjon sitter fast

På PC i Chrome:

1. Åpne DevTools.
2. Gå til Application.
3. Under Service Workers: trykk `Unregister`.
4. Under Storage: trykk `Clear site data`.
5. Last siden inn på nytt.

På mobil:

1. Trykk `Oppdater app`.
2. Lukk appen helt.
3. Åpne appen igjen.
4. Sjekk versjonen i App-panelet.

## Service worker-strategi

Service workeren håndterer kun `GET`-forespørsler fra samme origin. Dette er viktig for å unngå at nettleserutvidelser eller eksterne requests havner i app-cachen.

Appens hovedfiler kjøres network-first:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

Andre appfiler kan serveres fra cache først.

Når nye lokale JavaScript-moduler legges til under `src/`, må de også legges inn i `ASSETS` i `service-worker.js` for offline/PWA-bruk.
