# Release og publisering

Dette prosjektet publiseres som statiske filer. Det finnes ikke et byggsteg.

## Før publisering

Kjør lokale kontroller:

```powershell
node --check app.js
node --check service-worker.js
node tests/domain/meals.test.mjs
node tests/domain/shopping.test.mjs
node tests/domain/backup.test.mjs
node tests/app/workflows.test.mjs
node tests/app/startup.test.mjs
node tests/domain/suggestions.test.mjs
node tests/domain/weeks.test.mjs
node tests/render/calendar.test.mjs
node tests/render/meals.test.mjs
node tests/render/planner.test.mjs
node tests/render/setup.test.mjs
node tests/render/shopping.test.mjs
node tests/sync/firebase.test.mjs
node tests/sync/weeks.test.mjs
node tests/app/weeks-sync.test.mjs
node tests/sync/state.test.mjs
node tests/sync/writes.test.mjs
node tests/sync/shopping.test.mjs
node tests/sync/access.test.mjs
node tests/sync/restore.test.mjs
node tests/app/access-startup.test.mjs
node tests/render/account.test.mjs
node tests/domain/recipe-import.test.mjs
node tests/sync/recipe-import.test.mjs
node tests/app/recipe-import.test.mjs
node functions/tests/core.test.cjs
node functions/tests/extract.test.cjs
node functions/tests/addresses.test.cjs
node functions/tests/import.test.cjs
node functions/tests/index.test.cjs
```

Hvis bare dokumentasjon er endret, er disse ikke strengt nødvendige, men de er trygge å kjøre.

## Utrulling av v101

v100 er publisert og i bruk. v101 flytter ukesynken til endringer per dag og felt. Dokumentstier/form, backup/restore og funksjoner/regler beholdes. REQUIRED_MIN_APP_VERSION er 101, fordi v100 kan overskrive hele uker. Ingen nettverk eller publisering inngår i denne leveransen.

1. Før eiers publisering: la alle enheter vise Synket, last ned ny sikkerhetskopi på PC og lukk gamle klienter helt, også åpne PC-vinduer. Usynkede v100-ukeendringer overføres ikke automatisk fra cache.
2. Publiser v101-appfilene samlet gjennom GitHub Desktop. src/sync/weeks.js må følge med. Fjern src/sync/reads.js og tests/sync/reads.test.mjs som markert i leveranserapporten; reads-modulen er tatt ut av begge service worker-listene.
3. Åpne administratorens v101 på nett først. Kontroller at app/meta.minAppVersion faktisk er 101 før øvrige enheter tas i bruk. Heving er best effort med stille feil og nytt forsøk ved neste oppstart. v100 skal få oppdateringsskjerm; v101 skal slippe inn. Oppsett/restore skriver også 101.
4. Åpne øvrige enheter på nett og kontroller versjonen. Test valg av middag, lås, dagstype, porsjoner, dagsmodus/notat, Fyll uke, Bytt uke, Tøm uke, hurtigmiddag og sletting fra flere uker. Tøm uke skal ikke slette ukedokumentet.
5. På to enheter: endre tirsdag og fredag i samme uke. Begge endringer skal bevares. Endre også samme dag/felt; siste skyverdi skal vises når skriving er kvittert og et nyere serverbilde uten ventende skrivinger finnes. Status skal bli Synket. Kontroller åpent oppskriftsutkast/importvalg og valgt uke under synk.
6. Kontroller uke uten serverdokument: standardverdier og ingen cache-opplasting. Offline-oppstart viser lokale data uten lyttere/skriving og uten varig kø. Bevar viktige usynkede endringer i backup før omlasting.
7. Kontroller backup/restore med plan, låser, dagstype, porsjoner, modus og notat. Samme eksportformat og felt brukes; bare minimumet endres til 101. Ingen server-/regelpublisering eller migrering kreves.

Alle 39 lokale testskript og node --check av alle 35 kildefiler bestod. Se LEVERANSE_V101.md for endrede/nye/slettede filer og kartlegging av mutasjoner/oppstart. PC-/iPhone- og to-enhetstest gjenstår etter eiers publisering.

## Utrulling av v100

v99 er publisert og i bruk. v100 flytter oppskrifter fra global scope-synk til operasjoner per dokument. Gamle klienter kan overskrive hele oppskriftslisten, så REQUIRED_MIN_APP_VERSION er 100 både ved administratorheving og restore. Functions, firestore.rules og oppskriftsstier beholdes; denne leveransen bruker ingen nettverk eller publisering.

1. Før eiers publisering: la alle enheter vise Synket, ta en ny sikkerhetskopi på PC og lukk appen helt på øvrige enheter (også åpne PC-vinduer). Usynkede oppskriftsendringer fra v99 overføres ikke automatisk fra cache.
2. Eier publiserer appfilene samlet via GitHub Desktop. De nye src/sync/meals.js og src/sync/version.js må følge med og er lagt i begge service worker-listene. Kontroller v100 på en administratorenhet på nett først.
3. Administratoroppstart hever app/meta.minAppVersion til 100 når det er lavere. Kontroller at minimumet faktisk er 100 før gamle klienter brukes igjen. Heving er som før best effort; feil er stille og neste administratoroppstart prøver igjen. v99 skal få oppdateringsskjerm, og v100 skal slippe inn. Appen bruker numerisk sammenligning (100 > 99). Nye restore-oppsett skriver også 100.
4. Oppdater/åpne de øvrige enhetene på nett. Kontroller lagring av én oppskrift, favoritt/merking, hurtigmiddag, sletting med ukeplan, og at andre oppskrifter er uendret. Prøv samtidig redigering av forskjellige oppskrifter på to enheter og et åpent editorutkast/ventende importvalg under fjernsynk.
5. Tom sky-liste skal gi tom lokal liste; det finnes ingen automatisk opplasting fra cache. En konkret lokal operasjon som allerede venter i den åpne økten, beholdes til skriving/serverbekreftelse. Offline-oppstart starter ingen synk, og har ingen varig oppskriftskø. Første serverbilde ved ny oppstart kan erstatte lokale usynkede endringer. Ta sikkerhetskopi før omlasting hvis slike data må bevares.
6. Kontroller R1 (ingen «Ingenting ble endret.» mens importvalg venter) og R2 (3,5 ved ny handlelistesummering; gamle 3.5 tolkes fortsatt). Backup/restore-format og flyt er uendret bortsett fra minimum 100. Ingen migrering eller server-/regelpublisering er nødvendig.

Alle 38 lokale testskript og node --check av alle 35 kildefiler bestod. Se docs/LEVERANSE_V100.md for filoversikt, kontrollresultater og kartlegging av gamle oppstartsavhengigheter. Test på ekte PC/iPhone og mellom enheter gjenstår etter eiers apppublisering.

Rettelse før publisering, fortsatt v100: ventende oppskriftsoperasjoner fjernes etter SDK-kvittering og et nyere serverbilde uten ventende skrivinger, ut fra bildets løpenummer. Innholdslikhet er ikke lenger påkrevd. Dette hindrer at en annen enhets nyere versjon skjules og status blir stående på Synker. Samme regel gjelder sletting/gjenoppretting av samme ID og begge hendelsesrekkefølger. Test også dette mellom to enheter etter publisering; lokal rettelse og kontrollresultater står i LEVERANSE_V100.md.

## Utrulling av v99

v98 er publisert og i bruk. v99 er en klientoppdatering med erstatningsvalg i importpanelet, støtte for blandede tall og tydeligere porsjonsfelt. Functions, regler, domenemodell, minAppVersion 98 og service worker-strategien er uendret. Ingen serverpublisering eller nettverkskontroll inngår i leveransen.

1. Eier publiserer appfilene samlet via GitHub Desktop, inkludert de endrede klientmodulene og v99-parametrene i index.html/service-worker.js.
2. Lukk/åpne appen på PC og iPhone og kontroller v99. Minimumet skal fortsatt være 98; eksisterende administratorheving og restore skriver fortsatt 98.
3. Importer i en oppskrift med ingredienser/steg, også etter at appen har vært i bakgrunnen. Valget skal bli synlig i panelet uten nettleserdialog. Erstatt bytter bare konfliktdeler og oppskriftsporsjoner når antallet er kjent; Behold bevarer dem. Tomme deler fylles straks. En ny import skal forkaste det gamle valget.
4. Kontroller lukking/bytte av editor, kontobytte, gruppeoverskrifter, advarsler, og at Lagre/Avbryt fortsatt bestemmer hva som lagres. Ingen melding skal si «0 ingredienser og 0 steg».
5. Prøv 2 1/2, 2½, 2 ½ og brøktegn i oppskriftsvisning og handleliste. Visningens avrunding er som før; handlelisten summerer tallverdiene. Kontroller den nye ledeteksten/hjelpeteksten ved Porsjoner i oppskriften.

Lokale resultater og filoversikt står i docs/LEVERANSE_V99.md. Ekte PC/iPhone og import mot publisert server kontrolleres av eier etter apppublisering; denne oppgaven bruker ingen nettverk eller publisering.

## Utrulling av v98

v97 er publisert og i bruk. v98 legger til valgfri ingrediensgruppe i eksisterende meals-format og lar handlevarer fra oppskrifter bruke grunnnavn og høyeste intervallmengde. Regler, dokumentstier, bruksgrenser, nøkkelhåndtering og service worker-strategi er uendret.

1. Publiser serveren først med `firebase deploy --only functions --project middagsplanlegger-6db4e`, med eksisterende sikkerhetshjelper. Behold KEY_ENCRYPTION_SECRET. Nye group-felter er tillegg og baseServings er fortsatt numerisk for v97-klienten.
2. Kontroller alle fem funksjoner og uinnlogget aiKeyStatus (HTTP 401 / UNAUTHENTICATED). Ingen sky-kall til aiKeySave/importRecipe, hemmelighetskommandoer eller regelpublisering inngår.
3. Eier publiserer v98-appfilene sammen gjennom GitHub Desktop. Åpne appen på nett som administrator først. Tilgangsflyten hever minAppVersion til 98 med én updateDoc når minimumet er lavere; eldre klienter må oppdateres for å hindre at de fjerner grupper ved lagring. Mislykket heving er stille og prøves igjen ved neste administratoroppstart. Vanlige medlemmer og offline-økter skriver ikke meta.
4. Lukk/åpne appen på de øvrige enhetene på nett, kontroller v98 og oppdater hvis versjonsvakten ber om det. Nye databaseoppsett/gjenopprettinger skriver minimum 98. Dette minimumet skal beholdes for data med ingrediensgrupper.
5. Kontroller import med Saus/Tilbehør, intervaller, korte mengdeord og tilberedningskommentar. Rediger overskrifter, flytt/fjern dem og kontroller gruppene etter Lagre og synk. Gå til AI-innstillinger og tilbake med ulagrede overskriftsrader.
6. Kontroller at grunnnavn summeres på navn/enhet i enkeltoppskrift og ukeplan, mens manuelt skrevet varenavn beholdes. Kontroller mengder, vareoppslag, gruppevisning og skalering. Sikkerhetskopi og gjenoppretting skal bevare group.
7. K6: prøv en oppskrift med 5 porsjoner og ingen ingredienser, import fra en kilde med kjent antall 4, og bekreftet erstatning. Feltet og lagret oppskrift skal ha 4. Ukjent antall skal fortsatt beholde utkastets verdi og vise advarselen. Før Lagre skal ingen importert oppskrift være synket.

Alle 36 testskript og syntakskontroll av alle 33 kildefiler bestod før serverpublisering. Testene bruker syntetiske data og lokale stubber, uten nettverk. S3-fixturene fra v97 er beholdt; forventningen for navigasjon på én kort side er justert fordi den nye fallback-regelen uttrykkelig beholder nav/header/footer under 500 tegn. Ingen kontroll mot en virkelig oppskriftsside eller AI-modell gjøres i denne oppgaven. Se LEVERANSE_V98.md for K6-funn, filoversikt og publiseringsresultat.

Serverpublisering fullført 2026-10-06 med Firebase CLI 15.18.0, --only functions og eksisterende sikkerhetshjelper. Første lokale CLI-prosess avsluttet uventet etter delvis oppdatering; samme kommando uten interaktiv terminal fullførte de tre gjenstående funksjonene med «Deploy complete» og exit-kode 0. functions:list og kildehashkontroll bekreftet alle fem funksjoner ACTIVE med lokal v98-kilde, 2. generasjon, europe-west1 og nodejs22. Uinnlogget aiKeyStatus ga HTTP 401 / UNAUTHENTICATED. Regler ble ikke publisert, KEY_ENCRYPTION_SECRET er urørt, og aiKeySave/importRecipe ble ikke kalt i skyen. Appfilene er klare for eiers publisering; åpne administratorens v98 på nett først som beskrevet over.

## Utrulling av v97 (historisk leveransestatus)

v96 er publisert og i bruk. v97 endrer bare uttrekk, AI-tolking og utfylling av oppskriftsutkast; datamodell, synk, kvoter, nøkkelhåndtering, SSRF-vern og Firestore-regler beholdes.

1. Publiser serveren først med `firebase deploy --only functions --project middagsplanlegger-6db4e`, med den lokale sikkerhetshjelperen fra forrige leveranse. Behold KEY_ENCRYPTION_SECRET; ingen secrets:set/access eller installasjon er nødvendig. Det nye servingsKnown-feltet er et tillegg; baseServings er alltid et tall slik v96 forventer. v96 har fortsatt sin gamle samlede erstatning av ingredienser/steg til klienten oppdateres.
2. Kontroller de fem funksjonene med functions:list og uinnlogget POST til aiKeyStatus (HTTP 401 / UNAUTHENTICATED). Ikke kall aiKeySave/importRecipe i skyen som del av publiseringskontrollen.
3. Eier publiserer v97-appfilene gjennom GitHub Desktop etter serverpublisering. Versjon, alle HTML-parametre, cache-navn og versjonsvakt er 97; nytt oppsett skriver fortsatt minimum 95. Ingen nye klientmoduler eller endring i service worker-strategi.
4. Lukk/åpne appen på PC og iPhone og kontroller v97. Importer en side med mangelfull JSON-LD, innlimt tekst med bare steg og tekst med bare ingredienser. Kontroller at hver import fyller bare delene den har, beholder resten og viser antall faktisk utfylte deler.
5. Test ja/nei på erstatning for ingredienser, steg og begge deler, også i en ny oppskrift med eget innhold. Kjente porsjoner vises når ingrediensene byttes; ukjente porsjoner beholder feltet og viser veiledningen. Før Lagre må andre enheter være uendret, og Avbryt må forkaste importen.
6. Kontroller vanlig oppskriftslagring, ukeplan og handleliste. Eventuell versjonsvakttest bruker minimum 98; sett tilbake etter kontroll. Ingen datamigrering er nødvendig.

Alle 36 lokale testskript og syntakskontroll av alle 33 kildefiler bestod før serverpublisering. Syntetiske sider dekker store select-blokker, main/form, støy før oppskriften, fullstendig/mangelfull JSON-LD, grenser og ytelse. Engangskontrollen S6 brukte bare lokal fetchPage/extractPage uten AI: source jsonld+page-text, inndatalengde 9184, alle tre ønskede søkebekreftelser sanne og akasiehonning fraværende. Intet sideinnhold er lagret.

Status 2026-10-06: Firebase CLI 15.18.0 publiserte alle fem funksjoner med --only functions på første forsøk. functions:list bekrefter callable v2 / europe-west1 / nodejs22, og uinnlogget aiKeyStatus ga HTTP 401 / UNAUTHENTICATED. Hemmeligheten er urørt, regler er ikke publisert, ingen Git-/slettingskommandoer eller sky-kall til aiKeySave/importRecipe er utført. Serveren er klar; eier publiserer appfilene gjennom GitHub Desktop og gjennomfører funksjonell AI-/PC-/iPhone-akseptanse. Se LEVERANSE_V97.md for filoversikt og kontrollresultater.

## Utrulling av v96 (historisk leveransestatus)

1. Ved første publisering: sett en tilfeldig KEY_ENCRYPTION_SECRET og publiser importRecipe og de fire aiKey-funksjonene etter FIREBASE_OPPSETT.md før appfilene publiseres. Behold krypteringshemmeligheten ved senere publiseringer. Ingen endring i Firestore-reglene.
2. Publiser appfiler og alle nye src-moduler sammen, inkludert src/sync/ai-key.js og src/render/ai-key.js. Functions-kode publiseres via Firebase, ikke GitHub Pages eller service worker.
3. Lukk og åpne appen på enhetene og kontroller v96. Eksisterende innlogging, databaseoppsett og domenedata beholdes.
4. Administrator: åpne Innstillinger → AI og oppskriftsimport, lim inn OpenAI-nøkkelen og velg Lagre og valider. Kontroller Tilkoblet, maskert nøkkel og at feltet er tomt. Test tilkobling. Kontroller ugyldig nøkkel og manglende modelltilgang; eksisterende nøkkel skal beholdes ved mislykket lagring. Vanlig medlem skal bare se status, uten administratorknapper. Uten nett skal knapper være deaktivert.
5. Test godt.no/tine.no, Instagram med innlimt tekst, engelsk tekst med cups, side uten oppskrift, eksisterende innhold med ja/nei på erstatning, snarveien Hent fra lenke og Avbryt. Før Lagre skal oppskriften være uendret på en annen enhet; etter Lagre skal vanlig synk fungere. Slett nøkkelen med bekreftelse, kontroller veiledning i editoren og legg nøkkelen inn på nytt.
6. Kontroller vanlig lagring, ukeplan og handleliste. Versjonsblokkering testes med minAppVersion 97; sett tilbake etter kontroll. Nytt oppsett skriver fortsatt minimum 95.

KEY_ENCRYPTION_SECRET kontrolleres med secrets:get og settes bare hvis den ikke finnes, med tilfeldig verdi sendt uten utskrift eller debuglogging. Byttes den, må en administrator legge inn OpenAI-nøkkelen på nytt. Ingen versjonsbump er gjort fordi v96-appfilene fortsatt ikke er publisert. Nøkkelen inngår aldri i lokal state eller sikkerhetskopi; importstatus lagres bare i minnet. Bare ved INTERNAL tillates strengt validerte errorName/errorCode, uten message eller stack.

Før serverpublisering er klienten rettet: trimming og lokal nøkkelvalidering, egne SDK-feilmeldinger, tom lenke/kort tekst uten importkall eller busy, statusen «Kunne ikke kontrolleres» og nøytral invalid-argument-tekst fra serveren. Alle 36 lokale testskript og node --check av 33 kildefiler består. Detaljert resultat per publiseringssteg dokumenteres i LEVERANSE_V96_AI_NOKKEL.md.

Reelle oppskriftssider og AI-modell er ikke funksjonelt testet. Serverpublisering og uinnlogget tilgangskontroll er gjennomført som dokumentert nedenfor. V95-klienter kan fortsatt brukes parallelt med v96; importen bruker eksisterende oppskriftsformat og påvirker først andre enheter etter dagens Lagre-flyt.

Status 2026-10-06: Etter eiers uttrykkelige godkjenning er npm install utført i functions og functions/package-lock.json opprettet. KEY_ENCRYPTION_SECRET manglet og versjon 1 ble opprettet direkte fra tilfeldig generator via rør, uten lokal lagring, utskrift eller debuglogging. Firebase CLI 15.18.0 publiserte alle fem funksjoner med --only functions --project middagsplanlegger-6db4e. Første forsøk feilet for importRecipe ved det nettopp aktiverte Cloud Run-API-et; samme kommando lyktes etter mer enn tre minutter. Containerpolicy er én dag i europe-west1.

functions:list bekrefter alle fem som callable v2 / europe-west1 / nodejs22. Uinnlogget POST til aiKeyStatus ga HTTP 401 og UNAUTHENTICATED. Ingen OpenAI-nøkkel er lagt inn, og aiKeySave/importRecipe er ikke kalt i skyen. Appfilene gjenstår å publisere med GitHub Desktop, og funksjonell import-/PC-/iPhone-akseptanse gjenstår. Firestore-regler er ikke publisert og ingen Git- eller slettingskommandoer er brukt. Se leveranserapporten for filoversikt og første forsøkets feiltekst.

## Utrulling av v95

Sett først opp `middagsplanlegger-6db4e` etter `FIREBASE_OPPSETT.md`: Google-innlogging, autorisert appdomene, Firestore-regler fra repoet og det første administrator-medlemsdokumentet. Repo-filene publiserer ikke reglene automatisk via GitHub Pages.

1. Før publisering: alle enheter på v94 er på nett og viser «Synket». Last ned en ny sikkerhetskopi på PC og behold JSON-filen. v95 nullstiller lokale domenedata som mangler riktig prosjekt-ID.
2. Publiser v95, med alle nye moduler og oppdaterte assets.
3. PC: åpne appen, logg inn med Google, velg «Les inn sikkerhetskopi», kontroller oppsummeringen og bekreft. Kontroller oppskrifter, ukeplaner, kategorier/rekkefølge og handleliste etterpå. Bruk én administratorenhet til oppsettet.
4. Under Innstillinger → Konto og medlemmer: legg til det andre voksne medlemmet som administrator. Adressen må være en Google-konto, i små bokstaver.
5. Øvrige enheter: lukk appen helt, også åpne PC-vinduer, åpne den igjen, kontroller v95, logg inn og kontroller at innholdet stemmer.
6. En enhet som fortsatt kjører v94 skriver til det gamle prosjektet. Slike endringer følger ikke med til v95. Det gamle prosjektet skal beholdes som arkiv under utrullingen.

Test Google-innlogging og at innloggingen huskes etter lukking i iPhone-hjemskjermappen. Test to enheter med handlevarer, ukeplan og oppskrifter, vanlig medlems manglende administratortilgang, en avvist Google-konto, og flymodus ved oppstart på en tidligere godkjent enhet. Offline-oppstart gir «Lokal lagring»; last inn på nytt når nettet er tilbake. Handlelisteendringer har ingen varig offline-kø.

Versjonsvakten testes ved å sette `app/meta.minAppVersion` til 96 i konsollen: åpen v95 skal stoppe synk og vise «Appen må oppdateres». Sett tilbake til 95 og last appen inn igjen. Bare administratorer kan skrive meta, og v95-oppsett setter minimum 95.

### Ny innlesing eller avbrutt oppsett

En avbrutt innlesing kan kjøres på nytt med samme fil: ID-er som finnes i filen overskrives. Fremmede dokumenter avviser forsøket før noe skrives. Ingen automatisk sletting foretas, og members røres aldri. Meta skrives bare etter at alle andre skriver har lyktes.

For en full ny innlesing må eier manuelt slette `families/familien/app/meta` og tømme samlingene meals, weeks og shoppingItems i Firebase-konsollen. Behold members. Lukk andre appøkter før dette og åpne administratorenheten igjen. Tomt oppsett krever også tomme samlinger. Oppsettflyten overskriver profile, preferences og metadata og skriver handlemarkøren.

### Tilbakerulling

Tilbakerulling til v94 kobler til det gamle prosjektet og viser innholdet der. Endringer gjort i det nye v95-prosjektet følger ikke med tilbake. Ta sikkerhetskopi og koordiner alle enheter før et slikt valg.

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

## Leveranse v91

`src/domain/backup.js` er lagt til både `ASSETS` og `NETWORK_FIRST_ASSETS`. Cache-navn, appversjon og alle tre versjonsparametre i `index.html` er v91. Service worker-strategi, synklogikk, startvisning og bunnmeny er uendret.

De 15 lokale testskriptene dekker domene, rendering, synk og de nye brukerflytene. `tests/app/workflows.test.mjs` kjører ekte appfunksjoner med lokale DOM-stubber uten Firebase-oppstart eller nettverk. Dette erstatter ikke test i ekte nettleser eller på iPhone.

Manuell kontroll etter publisering:

1. Opprett en ny middag fra søk i valgt uke/dag. Kontroller navn, toast og at velgeren lukkes. Test også Enter med null treff og at en eksisterende tittel ikke kan opprettes på nytt via hurtigflyten.
2. Finn middagen under Annet og med filteret Mangler oppskrift. Rediger og lagre uten kategori/tilberedningstid; kontroller at disse fortsatt er tomme.
3. Generer handleliste med både komplette og ingrediensløse middager. Kontroller advarselen og at ingen varer legges til fra ingrediensløse middager. Velg bare ingrediensløse middager og kontroller toasten.
4. Flytt butikkategorier, også Annet, uten at siden hopper. Legg til en ny kategori og kontroller at den ligger sist. Kontroller handlelisten etter omstart og synk til en annen enhet.
5. Last ned sikkerhetskopi på PC og les JSON-filen. På iPhone: åpne delingsarket, velg lagringssted og kontroller filen. Avbryt også delingen og kontroller at det ikke kommer en feil.
6. Kontroller at eksisterende oppskrifter, planer og handleliste er beholdt. Bekreft v91 ved Oppdater app på begge enheter.

Nedlasting/deling bekrefter ikke faktisk lagring på disk. Kontroller selv at eksportfilen finnes. Den inneholder data fra denne enheten og kan inneholde personopplysninger. Det finnes foreløpig ingen import/gjenoppretting.

## Retting v92

- Alle HTML-versjonsparametre, appversjon og cache-navn er v92. Synklogikk, dataformat, navigasjon og service worker-strategi er uendret.
- PC med fin peker bruker lenkenedlasting for sikkerhetskopi. Grov peker bruker fil-deling hvis støttet, men går videre med lenkenedlasting dersom deling feiler med annet enn `AbortError`.
- Det innebygde oppstartsvernet viser en forklaring og «Last inn på nytt» ved feil før første render eller tom appflate etter 12 sekunder. Lokal state og cacher beholdes.
- Alle 16 testskript kjøres før publisering. Oppstartstesten kompilerer også det innebygde skriptet i `index.html` og tester feil, tidsavbrudd, reload og sen render med lokale DOM-stubber.

Manuell kontroll etter publisering:

1. Kontroller v92 på PC og iPhone. Last ned sikkerhetskopi på Windows og sjekk at JSON-filen finnes.
2. På iPhone: test både lagring via delingsarket og avbrutt deling. Avbrudd skal ikke gi ny toast eller starte nedlasting.
3. I en separat testkopi: blokker appmodulen eller en modulimport. Kontroller feiltekst og reload-knapp. Test også forsinket oppstart over 12 sekunder og at feilskjermen forsvinner når appen rendrer. Ikke slett data eller cacher for å simulere dette.

## Utrulling av v93

Eier håndterer commit og publisering fra Git-klonen med GitHub Desktop. Codex bruker fortsatt ingen Git-kommandoer.

- Før publisering: alle enheter er på nett, viser «Synket» og har lik handleliste. Sikre eventuelle lokale endringer i v92 før oppdatering; migreringen bruker kun skydokumentet.
- Etter publisering: lukk appen helt og åpne den igjen på alle enheter, og kontroller at de viser v93. Dette gjelder også et åpent PC-vindu. Bruk Oppdater app om gammel versjon fortsatt vises.
- En enhet som fortsatt kjører v92 skriver til arkivdokumentet app/shopping og ser ikke varer lagt til i v93. Slike endringer overføres ikke.
- Tilbakerulling til v92 gir listen slik den var ved migreringen, forutsatt at alle gamle klienter ble stoppet. Varer lagt til, endret eller slettet i v93 etter migreringen følger ikke med tilbake. Migreringsmarkøren gjør at ny oppstart i v93 ikke migrerer arkivet på nytt.
- Arkitekten oppgir at gjeldende rekursive Firestore-regler tillater shoppingItems og transaksjonen for innloggede klienter. Dette er ikke kontrollert mot produksjon her. permission-denied under migrering gir Synk feilet, bevarer lokal liste og blokkerer handlelistelytteren til neste oppstart.

### Akseptanse etter publisering

1. Første enhet etter oppdatering: listen har samme varer, rekkefølge og avhuking som før.
2. To enheter legger til hver sin vare samtidig: begge varene vises på begge.
3. Én enhet huker av en vare mens den andre endrer mengden: begge endringer beholdes.
4. Én enhet sletter en vare, den andre huker den av rett etterpå: varen forblir slettet uten feil.
5. Generer fra plan og Fjern avhukede virker og synkes.
6. Tekst, markering og fokus i Legg til vare bevares når den andre enheten legger til noe.
7. Appen starter på Handleliste; menyen viser Handle, Kalender, Planlegger, Oppskrifter.
8. Etter vellykket oppstart med synk: slå på flymodus og legg til en vare. Status skal ikke vise Synket. Slå på nett uten å lukke appen: varen vises på den andre enheten.
9. Ukeplan, oppskrifter og innstillinger synkes som før. Kontroller også sikkerhetskopi på PC/iPhone og oppstartsvernet fra v92.

17 lokale testskript og syntakskontroller kjøres før levering. Lokale SDK-/DOM-stubber erstatter ikke denne manuelle akseptansen. Service worker har bare fått versjonsbump og shopping-modulen i begge asset-listene; strategien er uendret.

## Visningsendring v94

Handlelisten har ikke lenger tellelinje. Ved bredde opptil 640 px er toppfeltet kompakt på tvers av visninger, og Synket vises som bare prikk med statustekst bevart for skjermlesere. Andre statuser har fortsatt synlig tekst. Overskrift og Generer fra plan står på samme rad; avstandene over listen er redusert. Data, synk og navigasjon er uendret fra v93.

Etter publisering:

1. Kontroller v94 på PC og iPhone-hjemskjermappen.
2. På iPhone med cirka 390 px bredde: kontroller at første kategori starter minst 110 px høyere enn før. Lokal nettleserkontroll viste cirka 146 px forbedring; faktisk iPhone må kontrolleres separat.
3. Kontroller at tellelinjen er borte på både PC og mobil, og at PC ellers ser uendret ut.
4. På mobil: Synket skal bare vise prikk. Slå på flymodus og endre noe; ventende/feilet synk skal ha synlig tekst. Ikke slett state eller cacher.
5. Kontroller langt familienavn med ellipsis, minst 44 px innstillingsknapp og kompakt toppfelt i Kalender, Planlegger, Oppskrifter og Innstillinger.

Se docs/LEVERANSE_V94.md for filoversikt og kontrollresultater. Utrullingsbegrensningene for v93 gjelder fortsatt ved oppdatering av enheter som kjører v92.
