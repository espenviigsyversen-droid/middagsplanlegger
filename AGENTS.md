# Agentinstruks for Middagsapp

Dette prosjektet er en lokal, statisk PWA for middagsplanlegging. Appen er foreløpig bygget uten byggsystem og består hovedsakelig av `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.json` og `icons/`.

## Arbeidsregler

- Arbeidsmappen er Git-klonen `C:\Users\espen\Documents\GitHub\middagsplanlegger`. Eier håndterer commit og publisering med GitHub Desktop.
- Ikke bruk git-kommandoer i denne lokale prosjektkopien.
- Jobb kun innenfor prosjektmappen.
- Bruk trygge lokale kontroller, særlig `node --check app.js` og `node --check service-worker.js`.
- Etter endringer i oppskrifts-/måltidslogikk: kjør `node tests/domain/meals.test.mjs`.
- Etter endringer i handleliste-/mengdelogikk: kjør `node tests/domain/shopping.test.mjs`.
- Etter endringer i sikkerhetskopi: kjør `node tests/domain/backup.test.mjs`.
- Etter endringer i hurtigmiddag, butikkategorirekkefølge eller sikkerhetskopiflyt: kjør `node tests/app/workflows.test.mjs` (lokale DOM-stubber, ingen nettverkstilgang).
- Etter endringer i oppstartsvern/lasteskjerm: kjør `node tests/app/startup.test.mjs` (tester også syntaksen i det innebygde HTML-skriptet).
- Etter endringer i forslagmotor/poengregler: kjør `node tests/domain/suggestions.test.mjs`.
- Etter endringer i uke-/datologikk: kjør `node tests/domain/weeks.test.mjs`.
- Etter endringer i handlelistesynk: kjør `node tests/sync/shopping.test.mjs`.
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
- For profile, preferences, metadata, meals og weeks skal synk-writes beskytte mot stale lokale cacher: les remote `clientUpdatedAt` før skriving og ikke seed manglende remote dokumenter fra lokal cache uten migrering eller `pendingLocalSync`.
- Ved endringer i appkode eller CSS som skal publiseres: bump versjon på alle relevante steder.
- Appen skal starte nye økter på Handleliste, selv om siste lagrede view var noe annet.

## Viktige filer

- `index.html`: laster appen, stylesheet, manifest, loading screen og versjonsmerkede assets.
- `app.js`: hovedlogikk, state, rendering, hendelser, Firebase-synk og brukerflyter.
- `src/domain/meals.js`: rene oppskrifts- og måltidshjelpere uten UI- eller Firebase-avhengighet.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner uten UI- eller Firebase-avhengighet.
- `src/domain/backup.js`: bygging av versjonert sikkerhetskopi og filnavn uten UI- eller Firebase-avhengighet.
- `src/domain/suggestions.js`: rene poengregler for forslagmotoren uten UI- eller Firebase-avhengighet.
- `src/domain/weeks.js`: rene uke- og datofunksjoner uten UI- eller Firebase-avhengighet.
- `src/sync/firebase.js`: Firebase SDK-lasting, Google-innlogging og bygging av Firestore-referanser.
- `src/sync/reads.js`: bygging av lokale patches fra Firestore snapshots for meals og weeks.
- `src/sync/state.js`: rene synkbeslutninger for scopes, ukeendringer og remote-konfliktbeskyttelse.
- `src/sync/writes.js`: bygging av Firestore writes for profile, preferences, metadata, meals og weeks.
- `src/sync/shopping.js`: migrering, varebasert synk, minnekø og handlelistelytter.
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
- Fra v92 brukes fil-deling kun ved grov peker og støttet fil-deling. Andre delingsfeil enn avbrudd skal falle tilbake til lenkenedlasting; feil ved nedlasting logges.
- Oppstartsvernet må ligge som et vanlig innebygd skript før appmodulen, slik at det virker selv når moduler mangler. Det skal aldri slette lokal state eller cacher.

## Handlelistesynk fra v93

- Handleliste er startside og første fane; begge oppstarts-view er shopping.
- Handlevarer synkes separat via src/sync/shopping.js til families/{familyId}/shoppingItems/{itemId}.
- Nye varer får createdAt lokalt; oppdateringer skriver bare endrede felt med updateDoc. Slettede varer skal ikke gjenopprettes av en sen oppdatering.
- Handlelistepatcher skal ikke endre global clientUpdatedAt/pendingLocalSync eller bruke det gamle shopping-scopet. Sikkerhetskopien beholder hele den lokale shoppingList.
- Migrering leser kun app/shopping i én transaksjon. shoppingList-feltet i arkivet skal aldri endres/slettes av v93; bare migratedToItemsAt legges til.
- Minnekø sendes etter migrering, før collection-lytteren startes. Cache-snapshots ignoreres fram til første serversnapshot. Migreringsfeil beholder lokal liste og blokkerer handlelistelytteren til neste oppstart.
- Ingen overføring av usynkede v92-endringer eller varig offline-kø. Følg utrullingsplanen i docs/RELEASE.md; v92 og v93 deler ikke løpende handleliste.

## Tilgang og oppsett fra v95

- Prosjektet er `middagsplanlegger-6db4e`, familie-ID er fortsatt `familien`. Det gamle prosjektet er arkiv og skal aldri kontaktes av v95.
- `firestore.rules` i repoet er fasit. Google-innlogging krever verifisert e-post og et medlemsdokument. Bare administratorer kan skrive `app/meta` eller administrere andre medlemmer; egen rad skal ikke endres.
- Medlemsreglene bruker dokumentoppslag. Hold skrivinger til enkeltstående dokumentkall; ikke innfør `writeBatch` eller transaksjoner med mange dokumenter (20-oppslagsgrensen for batch/transaksjon). Den historiske handlelistemigreringen kjøres ikke i v95.
- Prosjekt-ID lagres sammen med lokal state. Manglende/ulik ID nullstiller domenedata til tomme standardverdier før synk. Ingen eksempeloppskrifter eller eksempelplan.
- `src/sync/access.js` eier tilgangs- og versjonsvakten. Ingen domenelyttere eller vanlige writes før medlemskap og `app/meta.initializedAt` er kontrollert. Innlogging utløses bare av et knappetrykk.
- Offline-medlemsflagget bindes til prosjekt, familie og bruker, og fjernes ved eksplisitt utlogging/avvist medlemskap. Ved utlogging, kontobytte og versjonsblokkering stoppes lyttere og timere, usendte operasjoner forkastes, lokal state beholdes.
- `src/sync/restore.js` validerer sikkerhetskopi og eksisterende dokument-ID-er før første write. Ingen automatisk sletting og ingen legacy-opplasting fra `app/state`. Medlemslisten røres aldri av oppsett. `app/meta` skrives sist, kun av administrator etter vellykket oppsett.
- Gjenoppretting av sikkerhetskopi er nå eksplisitt godkjent i oppsettflyten for v95; dette erstatter begrensningen mot import under «Nye flyter fra v91».
- Etter slike endringer: kjør `tests/sync/access.test.mjs`, `tests/sync/restore.test.mjs`, `tests/app/access-startup.test.mjs` og `tests/render/account.test.mjs`, i tillegg til relevante eksisterende tester.

## Oppskriftsimport fra v96

- Import fyller kun editorens utkast. Ingen endring i lagrede meals, synkstatus eller Firestore fra klientimporten; dagens Lagre-knapp er fortsatt eneste oppskriftslagring. Sene svar etter avbrudd, kontobytte eller lukket editor skal ignoreres.
- `mealCanImportFromLink` er en egen ren betingelse: lenke finnes, ingredienser og steg mangler. `mealNeedsRecipe` beholdes uendret.
- Serveren ligger i functions/ med bare firebase-admin og firebase-functions som avhengigheter. Rene moduler under functions/lib testes uten SDK, installasjon eller nettverk. Installasjon og publisering av functions utføres av agenten bare etter uttrykkelig utviklerbeskjed fra eier; publisering skal alltid bruke --only functions og riktig --project. Ingen publisering av regler eller andre ressurser uten egen uttrykkelig godkjenning.
- Medlemskontroll via Admin SDK og bruksgrense i én transaksjon mot `families/familien/private/importUsage`. Dette er én privat dokumenttransaksjon, ikke en transaksjon med mange dokumenter. Klientreglene beholdes uendret og avviser private-stien.
- URL-henting validerer hver omdirigering og alle DNS-resultater, og binder socket til validert IP. Ikke erstatt dette med en ukontrollert fetch som gjør nytt DNS-oppslag.
- Henting har samlet maks 10 sekunder; AI har samlet maks 45 sekunder inkludert ett nytt forsøk. Logger får bare inneholde funksjonsnavn, kode, varighet, eventuell providerStatus og importens source fra jsonld, jsonld+page-text, page-text eller pasted-text. Ved AI_INVALID_RESPONSE tillates reason bare fra incomplete, no_text, no_json eller shape. Bare ved INTERNAL tillates errorName når det passer /^[A-Za-z]{1,40}$/, og errorCode når det er heltall eller passer /^[A-Za-z0-9_\/-]{1,40}$/ uten å starte med sk-. Aldri message, stack, andre feilfelter, tekst, sideinnhold, e-post, nøkkel, vertsnavn eller tokenbruk.
- OpenAI-nøkkelen administreres i appen, valideres på serveren og lagres kun kryptert i private/openaiKey. KEY_ENCRYPTION_SECRET fra defineSecret bindes bare til aiKeySave, aiKeyTest og importRecipe. Klartekst må aldri inn i state, localStorage, sikkerhetskopi, svar eller logger. Passordfeltet tømmes før klienten venter på lagringskallet. Status ligger bare i minnet og nullstilles ved tilgangs-/brukerbytte.
- Nøkkelkontroll bruker en separat én-dokumenttransaksjon mot private/keyUsage (10 kontroller per 10 minutter). Import henter/dekrypterer nøkkelen før importkvoten telles. Private-dokumentene er utilgjengelige fra klient-SDK; firestore.rules beholdes uendret.
- Etter importendringer: kjør `node tests/domain/recipe-import.test.mjs`, `node tests/sync/recipe-import.test.mjs`, `node tests/app/recipe-import.test.mjs`, `node tests/render/meals.test.mjs`.
- Serverkontroller: `node functions/tests/core.test.cjs`, `node functions/tests/extract.test.cjs`, `node functions/tests/addresses.test.cjs`, `node functions/tests/import.test.cjs`, `node functions/tests/index.test.cjs`. Kjør også node --check for index.js og alle functions/lib-filer.
- Etter nøkkelendringer: kjør `node functions/tests/keys.test.cjs`, `node functions/tests/key-service.test.cjs`, `node functions/tests/diagnostics.test.cjs`, `node tests/sync/ai-key.test.mjs`, `node tests/render/ai-key.test.mjs` og `node tests/app/ai-key.test.mjs`, i tillegg til importtestene.
- Functions-filer skal ikke inn i service worker. Nye klientmoduler må inn i begge asset-listene. Appens versjonsvakt følger aktuell versjon; minAppVersion ved oppsett beholdes på 95.

## Delvis oppskriftsimport fra v97

- Uttrekk må kombinere mangelfull JSON-LD med renset sidetekst. Behold form, fjern hele select/datalist-blokker og bruk main når den rensede teksten har minst 500 tegn. Tekstvinduet er maks 16 000 tegn med tittelen først; samlet AI-inndata maks 20 000. HTML-skanning og valg av tekstvindu skal være lineære, også ved uavsluttede tagger.
- Ingredienser og steg fylles/erstattes uavhengig. Spør bare om deler som finnes både i utkastet og importen, også for nye oppskrifter. Tom import skal aldri tømme en utfylt del eller utfylt metadata. Porsjoner følger bare importerte ingredienser når servingsKnown ikke er false.
- servingsKnown er et midlertidig importfelt, ikke et nytt felt i meals, synk eller sikkerhetskopi. Serveren beholder numerisk baseServings (4 når ukjent) for v96-kompatibilitet. Ny server publiseres før v97-klienten.
- Kjør alle testskript under tests/ og functions/tests/, inkludert syntetiske støy-/ytelsessider i extract.test.cjs. Nettkontroll av en virkelig side krever egen godkjenning; sideinnhold skal ikke lagres i repo eller tester.
