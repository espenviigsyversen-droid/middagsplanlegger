# Arkitektur

Middagsapp er en statisk nettapp/PWA uten byggsystem. Den kan kjøres direkte fra en enkel lokal webserver og publiseres som statiske filer, for eksempel på GitHub Pages.

## Overordnet struktur

- `index.html` er inngangspunktet. Den laster CSS, manifest, loading screen og `app.js`.
- `app.js` inneholder hoveddelen av appen: data, state, rendering, hendelser, forslagmotor, handlelisteflyt og Firebase-synk.
- `src/domain/meals.js` inneholder rene oppskrifts- og måltidshjelpere som kan testes og videreutvikles uten UI.
- `src/domain/shopping.js` inneholder rene mengde- og handlelistefunksjoner som kan testes og videreutvikles uten UI.
- `src/domain/backup.js` bygger en versjonert eksport av domenedata og et datert filnavn. Modulen kjenner ikke UI, nedlasting eller Firebase.
- `src/domain/suggestions.js` inneholder rene poengregler for forslagmotoren, mens historikk og state fortsatt eies av `app.js`.
- `src/domain/weeks.js` inneholder rene uke- og datofunksjoner som kan testes og videreutvikles uten UI.
- `src/sync/firebase.js` laster Firebase SDK, følger innloggingsstatus og tilbyr Google-innlogging fra knappetrykk.
- `src/sync/access.js` håndterer prosjektmerket cache, medlemskontroll, offline-tilgang og versjonsvakt.
- `src/sync/restore.js` validerer og oppsummerer sikkerhetskopier, bygger dokumentlisten og utfører eksplisitt oppsett med enkeltstående writes.
- `src/render/account.js` tegner tilgangsskjermene og Konto og medlemmer.
- `src/sync/reads.js` bygger lokale state-patches fra Firestore snapshots for oppskrifter og uker.
- `src/sync/state.js` inneholder rene synkbeslutninger: hvilke scopes som er endret, hvilke uker som må lagres, og når remote data er eldre enn lokale endringer.
- `src/sync/writes.js` bygger Firestore writes for de ulike sync-scopene uten å eie appens render- eller statusflyt.
- `src/sync/shopping.js` håndterer migrering og separat varebasert handlelistesynk fra v93.
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

Appen har ingen bundler og ingen installerte npm-avhengigheter. Lokale moduler importeres direkte som ES-moduler. Firebase SDK lastes dynamisk fra Google CDN i `src/sync/firebase.js`.

Oppstart:

1. `index.html` viser loading screen.
2. `app.js` leser prosjektmerket state fra `localStorage`. Manglende/ulik prosjekt-ID gir tomme domenedata. Nye økter starter på Handleliste.
3. Firebase melder innloggingsstatus. Lasteskjermen beholdes mens status og tilgang kontrolleres. Uten innlogging vises bare Google-knappen; popup åpnes kun fra knappetrykk, med kontovalg.
4. Innlogget bruker må ha verifisert e-post og gyldig rolle i eget medlemsdokument. Deretter leses `app/meta` fra serveren. Uten markør vises oppsettskjermen; for høy minimumsversjon viser oppdateringsskjermen.
5. Først etter godkjent medlemskap, oppsett og versjon vises appen og domenesynken startes. En tidligere godkjent enhet kan åpne lokale data uten nett med «Lokal lagring».
6. Remote data kan patche lokal state og trigge ny render. Meta-lytteren stopper all synk hvis oppsettet fjernes eller minimumsversjonen økes over 95.

Fra v92 kjører et vanlig innebygd skript i `index.html` før appmodulen. Det fanger feil før første render, inkludert lastingsfeil på appens script-element via en fangende `window.error`-lytter. Hvis appflaten fortsatt er tom etter 12 sekunder, vises samme feiltilstand: spinneren skjules, en forklaring vises og brukeren kan laste siden på nytt. En MutationObserver avslutter overvåkingen når appen har rendret. Eksisterende `hideLoadingScreen()` fjerner lasteskjermen også etter sen oppstart. Vernet er uavhengig av appens modulimporter og endrer ikke lagring, cacher eller navigasjon.

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

Primærnavigasjonen ligger i bunnbaren og viser de fire daglige arbeidsflatene: Handle, Kalender, Planlegger og Oppskrifter. Innstillinger er en sekundær flate som åpnes fra tannhjulknappen i toppbaren, slik at administrasjon og metadata ikke konkurrerer med de vanlige middagsflytene.

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

Fra v91 kan middagsvelgeren opprette en hurtigmiddag direkte fra søket. Eksakt tittelmatch (uten hensyn til store/små bokstaver) skjuler opprettingsraden. Enter oppretter bare når søket har null treff. Middagen bruker eksisterende format, uten kategori eller tilberedningstid. Oppretting og plassering i valgt uke skjer i én domenepatch; eventuell toast er en separat UI-patch. Oppskriftslisten og detaljvisningen bruker den rene `mealNeedsRecipe`-funksjonen for å vise manglende oppskrift.

`getStoreCategories()` bruker `orderStoreCategories` fra handledomenet. Den lagrede nøkkelrekkefølgen brukes i handlelisten og kategorivelgere, mens automatisk ingredienskategorisering beholder sin tidligere prioritet. Flytting endrer bare metadata og gjenoppretter sidens scrollposisjon.

## Sikkerhetskopi

Innstillinger → Oppdatering og versjon tilbyr en lokal JSON-eksport. `app.js` sender en kopi av `syncPayload()` til `buildBackup` og håndterer filnedlasting eller deling. Eksporten inkluderer familie, preferanser, metadata, middager, alle lokale uke-maps, handleliste og `clientUpdatedAt`, men ikke UI-state eller Firebase-innlogging.

Filen har `app: "middagsapp"`, `exportVersion: 1`, `appVersion`, `familyId`, `exportedAt` og `data`. Filnavnet bruker enhetens lokale dato; `exportedAt` er et ISO-tidspunkt i UTC. Filen kan inneholde familienavn, notater og andre private opplysninger og bør oppbevares privat.

Eksporten er et øyeblikksbilde av denne enheten, ikke en bekreftet fersk kopi fra Firestore. Den venter ikke på synk og skriver ikke remote data. Fra v92 brukes Web Share API bare når fil-deling støttes og `matchMedia("(pointer: coarse)").matches` er sann. Ved fin peker brukes alltid en Blob-lenke med `download`, også når Windows rapporterer støtte for deling. `AbortError` avslutter uten nedlasting eller ny toast. Andre delingsfeil faller tilbake til lenkenedlasting. Hvis nedlastingen også feiler, logges feilen med `console.error` og en feil-toast vises. Toasten «Sikkerhetskopi lagret.» betyr at nettleseren har startet nedlasting eller fullført deling, ikke at appen kan kontrollere hvor filen ble lagret. Import/gjenoppretting er ikke bygget.

## Synk

Fra v95 brukes det egne Firebase-prosjektet `middagsplanlegger-6db4e` med Google-innlogging og familie-ID `familien`. Ingen kode kobler til det gamle prosjektet. `firestore.rules` i repoet er fasit: verifisert e-post og medlemsdokument kreves; medlemsadministrasjon og skriving til `app/meta` krever administrator. Vanlige medlemmer har samme tilgang til domenedata. Firebase standard innloggingspersistens brukes.

`src/sync/reads.js` bygger lokale patches fra remote snapshots, og `src/sync/writes.js` bygger writes for scopes som profile, preferences, metadata, meals og weeks. `app.js` eier fortsatt når snapshots skal aksepteres, når lagring planlegges og hvordan UI-status vises. Eksisterende dokumentformat og konfliktbeskyttelse beholdes. Alle writes er enkeltstående dokumentkall; ikke batch eller transaksjoner med mange dokumenter, siden medlemsreglene krever oppslag og slike operasjoner har en grense på 20 regeloppslag.

Data er splittet i flere dokumenter/collections:

- profile
- preferences
- metadata
- shoppingItems (ett dokument per vare; app/shopping er arkiv)
- meals
- weeks
- members (e-post i små bokstaver som dokument-ID; rolle og valgfri addedAt/addedBy)
- app/meta (schemaVersion, initializedAt, initializedBy, minAppVersion; administratorstyrt)

For profile, preferences, metadata, meals og weeks bruker synkstrategien `clientUpdatedAt`, `pendingRemoteScopes` og `pendingWeekKeys` for å unngå at eldre remote data overskriver lokale endringer. Før Firestore-writes utføres, leser write-laget remote `clientUpdatedAt` for samme dokument. Hvis remote er nyere enn lokal state, droppes lokal write slik at en gammel device ikke kan overskrive nyere planlegging. Manglende remote dokumenter seedes bare ved eksplisitt førstegangsoppsett/migrering eller når lokal state faktisk har `pendingLocalSync`.

## Handlelistesynk fra v93

Modulen src/sync/shopping.js eier separat varebasert synk. Brukerflytene sender fortsatt ny items-liste til setState; appen normaliserer varene, tildeler nye varer createdAt = nå + indeks og sender en diff umiddelbart. Eksisterende createdAt beholdes. Bare endrede felt sendes med updateDoc; nye varer bruker setDoc og slettinger deleteDoc. Ingen debounce, forhåndslesing eller writeBatch brukes for disse operasjonene. Handlelisteendringer påvirker ikke global clientUpdatedAt/pendingLocalSync, og generatedForWeek er bare lokal.

I v93/v94 gjennomførte oppstarten migrering fra skyens app/shopping i én transaksjon. I v95 kjøres denne historiske migreringen ikke: eksplisitt oppsett skriver vare-dokumentene og `app/shopping.migratedToItemsAt` før meta-markøren. Den gamle hjelpefunksjonen beholdes og testes for tidligere migreringsformat, men brukes ikke i v95-oppstart.

Deretter sendes minnekøen i registrert rekkefølge og collection-lytteren startes uten å vente på write-bekreftelser. Lytteren ber om metadataendringer og ignorerer cache-snapshots fram til første serversnapshot; senere brukes alle snapshots. Varer sorteres på createdAt og deretter ID. Remote-patcher erstatter bare items, beholder generatedForWeek og skriver ikke tilbake. Identisk innhold utløser ingen ny innholdsrender. Rendering fra synk/status bevarer tekst, markering og fokus i manuelt varefelt.

Synker vises mens operasjoner venter eller før første serversnapshot. Bare bekreftede operasjoner tas ut av pending-tellingen; updateDoc/not-found er et stille avsluttet forsøk mot en slettet vare. Andre feil gir Synk feilet, som ikke skjules av senere snapshots eller andre scopelyttere. Migreringsfeil beholder lokal liste, sender ikke minnekøen og starter ikke handlelistelytteren; neste oppstart forsøker migreringen igjen. Andre scopelyttere beholder sin eksisterende logikk.

Kjent begrensning: køen er bare i minnet. Offline-endringer sendes når nettet kommer tilbake så lenge appen forblir åpen og synken allerede er startet. Ved mislykket migrering kreves ny oppstart. Usynkede v92-endringer overføres ikke, og første serversnapshot kan erstatte dem. Gamle v92-klienter bruker arkivet og deler ikke videre handleliste med v93. Utrulling og tilbakerulling er beskrevet i docs/RELEASE.md.

## PWA og oppdatering

### Tilgang, oppsett og gjenoppretting fra v95

Tilgangsstate og medlemsrollen ligger utenfor synket domenestate. Konto og medlemmer viser egen e-post og medlemslisten; administratorer kan endre andre medlemmer. Selvredigering stoppes både i UI, skrivehjelper og regler. Utlogging bevarer lokal state, men fjerner offline-medlemsflagget. Ved kontobytte, utlogging og versjonsblokkering avsluttes lyttere og timere, og minnekøen forkastes. Generasjonstoken gjør at svar fra eldre async-operasjoner ikke starter synk eller sender nye writes. Allerede sendte SDK-operasjoner kan ikke trekkes tilbake.

Oppsett er bare tilgjengelig når `app/meta.initializedAt` mangler. Administratoren velger og validerer sikkerhetskopi, ser oppsummeringen og bekrefter. Før første write leses ID-ene i meals, weeks og shoppingItems fra serveren. Fremmede dokumenter avviser hele forsøket; dokumenter med de samme ID-ene kan overskrives ved retry. Deretter skrives profile, preferences, metadata, middager, unionen av seks ukekart, handlevarer med `createdAt = 0 + indeks`, handlemarkør og til slutt meta. Ingen medlemsdokumenter endres. Ingen opplasting fra lokal cache eller bruk av legacy `app/state` finnes. «Start med tom database» krever tomme samlinger og skriver de tre standarddokumentene, handlemarkør og meta til slutt.

Feil før meta gir uferdig oppsett og tillater nytt forsøk med samme fil. Gjennomfør oppsett fra én administratorenhet om gangen. For ny innlesing må eier slette meta og tømme de tre samlingene manuelt, med members beholdt; ingen automatisk sletting. Se `FIREBASE_OPPSETT.md` og `RELEASE.md`.

Offline-tilgang krever et lokalt flagg for riktig prosjekt, familie og UID/e-post, fra en tidligere godkjent og initialisert økt. Flagget er lokal bekvemmelighet, ikke en erstatning for Firestore-reglene. Offline-oppstart starter ikke Firebase-lyttere eller writes. Last appen inn igjen når nettet er tilbake for å kontrollere medlemskap og starte synk. Handlelisteendringer fra en slik lokal økt har fortsatt ingen varig operasjonskø og kan erstattes av skylisten. Ved avvist medlemskap slettes flagget og appinnhold skjules.

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
    backup.js
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
