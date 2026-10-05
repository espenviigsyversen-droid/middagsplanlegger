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
