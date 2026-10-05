# Agentinstruks for Middagsapp

Dette prosjektet er en lokal, statisk PWA for middagsplanlegging. Appen er foreløpig bygget uten byggsystem og består hovedsakelig av `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.json` og `icons/`.

## Arbeidsregler

- Ikke bruk git-kommandoer i denne lokale prosjektkopien.
- Jobb kun innenfor prosjektmappen.
- Bruk trygge lokale kontroller, særlig `node --check app.js` og `node --check service-worker.js`.
- Etter endringer i oppskrifts-/måltidslogikk: kjør `node tests/domain/meals.test.mjs`.
- Etter endringer i handleliste-/mengdelogikk: kjør `node tests/domain/shopping.test.mjs`.
- Etter endringer i sikkerhetskopi: kjør `node tests/domain/backup.test.mjs`.
- Etter endringer i hurtigmiddag, butikkategorirekkefølge eller sikkerhetskopiflyt: kjør `node tests/app/workflows.test.mjs` (lokale DOM-stubber, ingen nettverkstilgang).
- Etter endringer i forslagmotor/poengregler: kjør `node tests/domain/suggestions.test.mjs`.
- Etter endringer i uke-/datologikk: kjør `node tests/domain/weeks.test.mjs`.
- Etter endringer i synk-/konfliktlogikk: kjør `node tests/sync/state.test.mjs`.
- Etter endringer i Firebase-oppkobling/referanser: kjør `node tests/sync/firebase.test.mjs`.
- Etter endringer i remote snapshot-/patch-bygging: kjør `node tests/sync/reads.test.mjs`.
- Etter endringer i Firestore write-/payload-bygging: kjør `node tests/sync/writes.test.mjs`.
- Etter endringer i handleliste-rendering: kjør `node tests/render/shopping.test.mjs`.
- Etter endringer i oppskrifts-rendering: kjør `node tests/render/meals.test.mjs`.
- Etter endringer i kalender-rendering: kjør `node tests/render/calendar.test.mjs`.
- Etter endringer i planlegger-rendering: kjør `node tests/render/planner.test.mjs`.
- Etter endringer i setup-rendering: kjør `node tests/render/setup.test.mjs`.
- Ved kodeendringer: oppsummer nøyaktig hvilke filer som er endret og hvilke filer som må lastes opp til GitHub.
- Ikke endre appens dataformat, Firebase-struktur eller service worker-strategi uten å dokumentere konsekvensen.
- Synk-writes skal beskytte mot stale lokale cacher: les remote `clientUpdatedAt` før skriving og ikke seed manglende remote dokumenter fra lokal cache uten migrering eller `pendingLocalSync`.
- Ved endringer i appkode eller CSS som skal publiseres: bump versjon på alle relevante steder.
- Appen skal starte nye økter på kalender/forside, selv om siste lagrede view var noe annet.

## Viktige filer

- `index.html`: laster appen, stylesheet, manifest, loading screen og versjonsmerkede assets.
- `app.js`: hovedlogikk, state, rendering, hendelser, Firebase-synk og brukerflyter.
- `src/domain/meals.js`: rene oppskrifts- og måltidshjelpere uten UI- eller Firebase-avhengighet.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner uten UI- eller Firebase-avhengighet.
- `src/domain/backup.js`: bygging av versjonert sikkerhetskopi og filnavn uten UI- eller Firebase-avhengighet.
- `src/domain/suggestions.js`: rene poengregler for forslagmotoren uten UI- eller Firebase-avhengighet.
- `src/domain/weeks.js`: rene uke- og datofunksjoner uten UI- eller Firebase-avhengighet.
- `src/sync/firebase.js`: Firebase SDK-lasting, anonym innlogging og bygging av Firestore-referanser.
- `src/sync/reads.js`: bygging av lokale patches fra Firestore snapshots for meals og weeks.
- `src/sync/state.js`: rene synkbeslutninger for scopes, ukeendringer og remote-konfliktbeskyttelse.
- `src/sync/writes.js`: bygging av Firestore writes for profile, preferences, metadata, shopping, meals og weeks.
- `src/render/shopping.js`: HTML-rendering for handleliste, vareeditor, vareforslag og shopping review modal.
- `src/render/meals.js`: HTML-rendering for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/render/calendar.js`: HTML-rendering for kalender/forside.
- `src/render/planner.js`: HTML-rendering for ukeplanleggeren.
- `src/render/setup.js`: HTML-rendering for Innstillinger, familie-/app-undersider og enkle metadata-sider.
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

## Nye flyter fra v91

- Hurtigmiddag bruker eksisterende måltidsformat med tom kategori og tilberedningstid. `mealNeedsRecipe` er avledet; ikke lagre et eget mangler-oppskrift-felt.
- Oppretting fra middagsvelgeren legger til middag, ukeplan og lukker velgeren i én domenepatch. Søk skal fortsatt oppdatere listen uten full render per tastetrykk.
- `metadata.storeCategoryOrder` er valgfritt og synkes via eksisterende metadata-scope. Sortering skal ikke endre ingrediensenes kategorisering eller forslagmotoren.
- Sikkerhetskopi eksporterer kun `syncPayload()` fra denne enheten. Ikke bygg import eller lov gjenoppretting uten en egen plan for validering og synkkonflikter.
