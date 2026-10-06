# Leveranse v102 – oppskriftsimport fra bilde og skjermbilde

Dato: 2026-10-06. Eier har bekreftet v101 publisert og testet. v102-appfilene er ferdige lokalt; eier håndterer commit og apppublisering i GitHub Desktop.

## Resultat

- Importer fra bilde åpner en filvelger for bilder/skjermbilder. Flere valg legges til i valgt rekkefølge, maks fire; listen viser Bilde 1–4 med Fjern, uten filnavn eller miniatyrer. Bildeinnliming på PC tas imot når importpanelet er åpent, mens tekstinnliming virker som før.
- EXIF-orientert dekoding/canvas gjør om til JPEG med lengste side maks 2000 px. Kvalitet 0,8 prøves først, så 0,7/0,6 og 1600 px ved behov for maks 1,4 MB. Fire store bilder kontrolleres også mot samlet base64-grense og komprimeres ytterligere i minnet ved behov. Uleselige/for store bilder og tom bildeliste sender ingen importforespørsel. Skjemaendringer under forminsking/serverventing bevares.
- Bildemodus på serveren validerer 1–4 image/jpeg, ren kanonisk base64 og FF D8 FF-signatur, maks 2 000 000 tegn per bilde og 7 000 000 samlet; ukjente felter avvises. sourceUrl følger tekstmodus. Ingen nye avhengigheter.
- Samme medlemskontroll, krypterte OpenAI-nøkkel og kvote brukes; nøkkelen hentes før kvoten telles. Responses får én brukermelding med tekst og bilder i rekkefølge, detail high, store:false og dagens øvrige innstillinger. OPENAI_RECIPE_IMAGE_MODEL kan overstyre bildemodellen, ellers brukes dagens modell. Bildetekst er data; uleselig innhold utelates.
- AI bruker samlet 90 sekunder i bildemodus inkludert ett nytt forsøk, mens lenke/tekst beholder 45. importRecipe har 120 sekunder/512 MiB og samlet signal 115 sekunder. Klienten bruker 130 sekunder for bilder, 70 for lenke/tekst. OpenAI 400 i bildemodus gir IMAGE_REJECTED; 401/403/404 håndteres som før.
- Vellykket bildeimport har alltid kontrolladvarselen. Resultatet fyller bare editorutkastet og bruker dagens ingrediensgrupper, porsjonsregler og Erstatt/Behold. Uten lenke står kilden som bilde. Lagre er eneste oppskriftslagring. NEEDS_TEXT og personvernforklaringen inkluderer nå bildealternativet.
- Bildene er bare i recipeImportState.images. Ingen bildedata i state, localStorage, Firestore eller sikkerhetskopi. De tømmes ved vellykket import, lukket/byttet editor og kontobytte/tilgangsendring. Sene server-/forminskingsresultater forkastes. Blob-URL-er tilbakekalles, bitmap/canvas frigjøres.
- Logger tillater source image og imageCount 1–4. providerCode fra OpenAI filtreres etter /^[a-z0-9_]{1,40}$/ uten ekstra blanke tegn. Ingen bildedata, bildestørrelse i byte, filnavn, sideinnhold, e-post, nøkkel, feiltekst eller stack logges. Tidligere tillatte reason/INTERNAL-felt beholdes.
- APP_VERSION/HTML/cache og numerisk versjonsvakt er v102/102. REQUIRED_MIN_APP_VERSION, administratorheving og restore forblir 101. Ny klientmodul står i begge asset-listene. Datamodell, Firestore-stier/regler, synk, kvoter, nøkkelhåndtering og service worker-strategi er uendret. normalizeRecipe er uendret. Serveren støtter fortsatt v101 url/text.

## Filer per mappe – tas med i GitHub Desktop

- Rot, endret: AGENTS.md, app.js, index.html, service-worker.js.
- src/domain, ny: image-prepare.js.
- src/sync, endret: recipe-import.js.
- src/render, endret: meals.js, ai-key.js.
- functions, endret: index.js.
- functions/lib, endret: core.js, ai.js, import.js.
- functions/tests, endret: diagnostics.test.cjs, index.test.cjs. Ny: image.test.cjs.
- tests/domain, ny: image-prepare.test.mjs.
- tests/app, endret: recipe-import.test.mjs, access-startup.test.mjs, workflows.test.mjs.
- tests/render, endret: meals.test.mjs, ai-key.test.mjs.
- tests/sync, endret: recipe-import.test.mjs.
- docs, endret: ARCHITECTURE.md, STATE_MODEL.md, FIREBASE_OPPSETT.md, RELEASE.md. Ny: LEVERANSE_V102.md.

23 eksisterende filer endret, fire nye, ingen slettet: 27 filstier. package.json/package-lock.json, CSS, manifest, firestore.rules og Firebase-konfigurasjonen er uendret. Den eksisterende ignorerte .local-tools/firebase-safety.cjs brukes ved CLI-kjøring og skal ikke tas med i repoet.

## Lokale kontroller

Alle 41 testskript under tests/ og functions/tests/ bestod, uten nettverk: 39 eksisterende og to nye. node --check av alle 36 kildefiler bestod. Oppstartstesten kontrollerer også det innebygde HTML-skriptet. Lokal Node v24.15.0; deklarert funksjonsruntime er fortsatt Node 22. Ingen installasjon ble kjørt.

- Server: bildeskjema/signatur/base64, enkelt-/sumgrenser, ukjente felter, bilderekkefølge i Responses, modellvalg/fallback, felles 90-sekunders retrybudsjett og 115-sekunders signal, 400/401/403/404, nøkkel før kvote, manglende nøkkel uten telling, kontrolladvarsel og sanitert diagnostikk. Svar/logger inneholder ikke bildedata, filnavn, e-post, nøkkel eller provider-feiltekst.
- Forminsking: sideforhold uten oppskalering, EXIF-dekoding og Safari-fallback, kvalitetsrekkefølge, 1600-px-trinn, fortsatt for stort/uleselig bilde, cleanup og samlet base64-grense for fire store bilder.
- App: valg/tillegg/fjerning/rekkefølge/maks fire, tom bildeliste uten forespørsel, umiddelbar tømming av filfelt, bilde-/tekstinnliming, utkast og baseServings, erstatningsvalg uten confirm, serverfeil, sourceUrl og bilde uten lenke, ventetekst, lukking/editor-/kontobytte og sene resultater. Bilder mangler i domenestate, synkepayload, lokal lagring og sikkerhetskopi.
- Rendering: filvelger, nummererte bilder og fjernknapper, deaktivering/ventetekster, ingen rådata/filnavn/miniatyrer, samt oppdatert personverntekst. Lenke-/tekstimport og alle øvrige synk-, domene-, backup-/restore- og servertester består.

## Serverpublisering – del D

Publisert 2026-10-06 med installert Firebase CLI 15.18.0 og lokal Node v24.15.0. projects:list bekreftet eksisterende innlogging og middagsplanlegger-6db4e. Ingen ny innlogging eller installasjon. Første CLI-kontroll i sandbox kunne ikke lese den eksisterende CLI-profilen (EPERM); kontrollen lyktes med godkjent kjøring og den eksisterende sikkerhetshjelperen. Hjelperen holder profilendringer bare i minnet og hindrer debuglogger; ingen firebase-debug.log ble opprettet.

Kommandoen var bare:

```text
firebase deploy --only functions --project middagsplanlegger-6db4e
```

Den ble kjørt gjennom eksisterende .local-tools/firebase-safety.cjs. Første og eneste deployforsøk oppdaterte alle fem funksjoner og avsluttet med «Deploy complete!» og exitkode 0. Ingen retry, slettingsspørsmål eller endring av artifact-policy var nødvendig. Kun serverfunksjonene er publisert; appfiler publiseres av eier.

functions:list --project middagsplanlegger-6db4e ga:

| Funksjon | Generasjon | Trigger | Region | Runtime | Minne |
| --- | --- | --- | --- | --- | --- |
| importRecipe | v2 | callable | europe-west1 | nodejs22 | 512 MiB |
| aiKeyStatus | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeySave | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyTest | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyDelete | v2 | callable | europe-west1 | nodejs22 | 256 MiB |

Uinnlogget POST til https://europe-west1-middagsplanlegger-6db4e.cloudfunctions.net/aiKeyStatus med Content-Type application/json og {"data":{}} ga HTTP 401 og:

```json
{"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}
```

Dette bekrefter callable-transport og avvisning av manglende innlogging, ikke innlogget bildeimport. Ingen aiKeySave/importRecipe-kall eller OpenAI-kall er gjort i skyen.

Ingen Git-kommandoer, regelpublisering, --force, slettingskommandoer eller secrets:set/access er brukt. firestore.rules og KEY_ENCRYPTION_SECRET er urørt. Ingen ekte bildedata eller sideinnhold er lagret/logget, og ingen nøkkel er vist. Ingen midlertidig hemmelighetsfil ble opprettet.

## Avvik og gjenstående akseptanse

Ingen funksjonelle avvik fra beskjeden. Den ekstra samlede størrelseskontrollen er nødvendig fordi fire JPEG-bilder på 1,4 MB kan overstige serverens grense på 7 000 000 base64-tegn. Den skjer kun i minnet, før forespørselen.

Ekte PC/iPhone, HEIC/EXIF og innlogget AI-bildeimport må kontrolleres av eier etter apppublisering; lokale stubbtester bekrefter ikke faktisk nettleserdekoding eller modellens bildestøtte. Ingen kall til aiKeySave eller importRecipe i skyen er utført. Se RELEASE.md for akseptansen. Appfilene publiseres av eier.
