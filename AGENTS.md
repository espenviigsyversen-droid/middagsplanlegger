# Agentinstruks for Middagsapp

Dette prosjektet er en lokal, statisk PWA for middagsplanlegging. Appen er foreløpig bygget uten byggsystem og består hovedsakelig av `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.json` og `icons/`.

## Arbeidsregler

- Ikke bruk git-kommandoer i denne lokale prosjektkopien.
- Jobb kun innenfor prosjektmappen.
- Bruk trygge lokale kontroller, særlig `node --check app.js` og `node --check service-worker.js`.
- Ved kodeendringer: oppsummer nøyaktig hvilke filer som er endret og hvilke filer som må lastes opp til GitHub.
- Ikke endre appens dataformat, Firebase-struktur eller service worker-strategi uten å dokumentere konsekvensen.
- Ved endringer i appkode eller CSS som skal publiseres: bump versjon på alle relevante steder.

## Viktige filer

- `index.html`: laster appen, stylesheet, manifest, loading screen og versjonsmerkede assets.
- `app.js`: hovedlogikk, state, rendering, hendelser, Firebase-synk og brukerflyter.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner uten UI- eller Firebase-avhengighet.
- `styles.css`: all visuell styling, responsive regler og komponentstiler.
- `service-worker.js`: PWA-cache og offline/oppdateringsstrategi.
- `manifest.json`: PWA metadata.
- `docs/`: prosjektets tekniske dokumentasjon.

## Versjonsbump

Når appen endres og skal publiseres, hold disse i sync:

- `APP_VERSION` i `app.js`
- query-parametre i `index.html`, for eksempel `app.js?v=68`
- `CACHE_NAME` i `service-worker.js`, for eksempel `middagsplan-v68`
- nye JavaScript-moduler i `service-worker.js` sin `ASSETS`-liste hvis de skal fungere offline

Appen viser versjonen i App-panelet ved `Oppdater app`. Dette brukes for å kontrollere at ny versjon faktisk er lastet på PC og mobil.

## Arkitekturhensyn

`app.js` er stor og inneholder flere ansvarsområder. Nye endringer bør holdes små og plasseres nær eksisterende relevant kode. Ved større arbeid bør målet være gradvis modularisering:

1. Rene hjelpefunksjoner og domene-logikk.
2. State/persistens.
3. Firebase-synk.
4. Rendering per view.
5. Event-binding per view eller delegert eventhåndtering.

Se `docs/ARCHITECTURE.md`, `docs/STATE_MODEL.md` og `docs/RELEASE.md` før større endringer.
