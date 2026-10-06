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
node tests/sync/reads.test.mjs
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

## Utrulling av v96

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
