# Leveranse v105 – appen tåler full lokal lagring

Dato: 2026-10-06. v104 er publisert ifølge eier. v105 er ferdig lokalt; eier håndterer commit og apppublisering i GitHub Desktop. Ingen nettverk eller publisering inngår i denne leveransen.

## Resultat

- Ny src/sync/local-store.js samler all appstyrt tilgang til middagsapp-state og middagsapp-membership. Lesing, skriving, JSON-tolking/serialisering og eksplisitt sletting fanger unntak, også dersom tilgang til selve localStorage er blokkert. Ugyldig JSON, ikke-objekter og normaliseringsfeil gir tom prosjektmerket lokal kopi.
- saveState skriver uten å avbryte setState, rendering eller synk ved QuotaExceededError. Det samme gjelder onMeals, onWeeks, onItems, applyRemoteStatePatch og skriving/sletting av medlemsflagget. Nettinnlogging fullføres selv om medlemsflagget ikke kan lagres. Inneværende økt fortsetter med state i minnet.
- Den lokale kopien inneholder bare domenedata og synkmarkører i PROJECT_DOMAIN_KEYS, projectId, weekOffset og filters. Editorutkast, åpne dialoger, valgt oppskrift, toast, skjermvåkeflagg og handlelistegjennomgang utelates. Gamle lokale kopier leses fortsatt; oppstart nullstiller også gamle draft-felter. Appen starter fortsatt på Handleliste med samme lagrede filtre og ukevalg. Domenedata, sikkerhetskopi og Firestore-formatet er uendret.
- localStoreFailed ligger bare i minnet. En feilet skriving setter det; en senere vellykket skriving nullstiller det. Den bestilte linjen vises bare under Innstillinger → Oppdatering og versjon, uten toast eller dialog. Synkstatusen i toppen gjelder fortsatt skyen og påvirkes ikke av lagringsfeilen.
- Oppskrifts-, uke- og handlelistelytteren fanger callback-feil. Status publiseres også ved feil og blir Synk feilet; neste vellykkede levering fjerner callback-feilen og tar imot nye data. Firestore-/skrivefeil beholdes separat. Vernet gjelder også levering etter SDK-kvittering i oppskrifts- og ukesynken. Kø, overlay, løpenummer, kvitteringsregler og stoppvern er uendret.
- Ingen nøkler slettes eller tømmes for å frigjøre plass. Tidligere lokal kopi beholdes ved skrivefeil; andre appers nøkler berøres aldri. Eksisterende eksplisitt fjerning av medlemsflagget ved utlogging/avvist medlemskap bruker trygg remove og kan ikke avbryte flyten ved slettefeil.
- APP_VERSION, numerisk versjonsvakt, index-parametre og CACHE_NAME er v105/105. REQUIRED_MIN_APP_VERSION forblir 101. local-store.js er lagt i begge service worker-listene; strategien er uendret.

## Filer per mappe – tas med i GitHub Desktop

- Rot, endret: AGENTS.md, app.js, index.html, service-worker.js.
- src/sync, endret: meals.js, weeks.js, shopping.js. Ny: local-store.js.
- src/render, endret: setup.js.
- tests/sync, endret: meals.test.mjs, weeks.test.mjs, shopping.test.mjs. Ny: local-store.test.mjs.
- tests/app, endret: access-startup.test.mjs, workflows.test.mjs. Ny: local-store.test.mjs.
- tests/render, endret: setup.test.mjs.
- docs, endret: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md. Ny: LEVERANSE_V105.md.

17 eksisterende filer endret og fire nye: 21 filstier. Ingen slettede filer. Filoversikten er kontrollert mot SHA-256-verdier fra oppstarten av oppgaven, uten Git-kommandoer. functions/ (inkludert eksisterende tester og avhengighetsfiler), firestore.rules og src/sync/version.js er uendret. Ingen endring i Firebase-konfigurasjon, styles.css eller domenemoduler.

## Kontroller

Alle 44 testskript under tests/ og functions/tests/ består lokalt uten nettverk. node --check av alle 38 kildefiler består; startup-testen kontrollerer også det innebygde HTML-skriptet. Lokal Node v24.15.0. Ingen installasjon eller nye avhengigheter. Skrivetilgang ble kontrollert med en midlertidig fil som ble slettet og bekreftet borte.

- Den nye apptesten kjører faktisk appkode, tilgangsflyt og alle tre synkmodulene med DOM-/Firestore-stubber. localStorage.setItem kaster QuotaExceededError for alle skrivinger, både appstate og medlemsflagg. Appen starter, Google-knappen fullfører nettinnlogging, og alle sju lyttere startes uten automatisk domeneseeding.
- Profil, preferanser, metadata, oppskrifter, uker og handleliste fra skyen oppdaterer minnet og skjermen til tross for lagringsfeil. Klikk på navigasjonen bytter synlig visning. Endret oppskrift, ukedag og handlevare gir de tre forventede dokumentkallene. Nye serverbilder oppdaterer skjermen og alle synkstatuser blir Synket.
- Varsellinjen vises bare i versjonspanelet, uten toast og uten endret toppstatus. Vellykket lagring etter feil nullstiller flagget og fjerner linjen ved neste render. Den gamle lokale kopien og en annen apps nøkkel beholdes ved feil.
- getItem-unntak, ugyldig JSON, lister/tall og domenenormaliseringsfeil gir tom prosjektmerket state og blokkerer ikke påfølgende nettinnlogging. Blokkert localStorage-getter og JSON-serialiseringsfeil er dekket i modultesten. Slettefeil ved medlemsflagget avbryter ikke utloggingen.
- Den lagrede kopien har akkurat de tillatte feltene, beholder alle domenedata, filtre og ukevalg, og inneholder ikke utkast, åpne dialoger eller toast. Live-utkast muteres ikke av lagring. Eldre lokale kopier med utkast/dialoger rekonstrueres med lukket UI og beholdte domenedata/innstillinger.
- onMeals/onWeeks/onItems som kaster, slipper ikke feilen ut av snapshot-callbacken, publiserer Synk feilet og behandler neste snapshot med Synket. Oppskrifts-/ukelevering som kaster etter SDK-kvittering er også testet. Eksisterende tester for avviste writes, samtidighet, cachevern, kvitteringsrekkefølge og kontobytte består.
- Alle øvrige tilgangs-, synk-, import-, bilde-, backup-/restore-, mengde-, render- og servertester består. Blokkeringsfixturene bruker 106, over aktuell klientversjon 105.

## Konsekvenser og videre kontroll

Ved lagringsfeil fungerer nettøkten og data i minnet fortsatt. En tidligere lagret kopi kan være utdatert, og en ny offline-økt kan mangle ferske data eller medlemsflagget. Appen frigjør ikke plass automatisk. Ingen varig offline-kø eller endring av synkformatet er innført.

Eier publiserer klientfilene samlet og tester deretter den berørte PC-en: navigasjon, data fra skyen, endringer på tvers av enheter, Synket-status og varsellinjen under Oppdatering og versjon. Kontroller også vanlig omstart/offline på en enhet hvor lokal lagring lykkes. Ingen nettleserdata er endret eller slettet av agenten under arbeidet.

Ingen funksjonelle avvik fra beskjeden. Bekreftet: ingen endring i functions eller firestore.rules, ingen publisering, ingen nettverk, ingen Git-kommandoer og minsteversjonen fortsatt 101.
