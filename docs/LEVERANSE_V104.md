# Leveranse v104 – modellvalg og høyere importkvote

Dato: 2026-10-06. Eier har bekreftet at v103 er publisert og virker. v104-appfilene er klare lokalt; eier håndterer commit og apppublisering i GitHub Desktop.

## Resultat

- Serverprivat private/aiConfig inneholder model, updatedAt og updatedBy. Gyldig lagret modell prioriteres foran OPENAI_RECIPE_MODEL og DEFAULT_MODEL, som fortsatt er gpt-5.6-luna. OPENAI_RECIPE_IMAGE_MODEL overstyrer fortsatt bare bildemodellen. importRecipe og aiKeyStatus/Save/Test bruker det samme modellvalget.
- Ny callable aiModelSave krever verifisert administrator og kun et gyldig modellnavn. Nøkkelen dekrypteres før telling i den eksisterende delte keyUsage-kvoten. Kandidaten kontrolleres med GET models/<model>, og testes deretter med ti linjer egen norsk prøveoppskrift gjennom interpretRecipe og normalizeRecipe. Minst fire ingredienser, tre med mengde og to steg kreves. Bare bestått prøve lagrer aiConfig. Prøven bruker ingen importkvote og lagrer ingen oppskrift.
- 401/403 merker den testede nøkkelen ugyldig; 404 gir MODEL_UNAVAILABLE. Manglende/uleselig nøkkel gir AI_NOT_CONFIGURED. Mislykket innholdsprøve gir MODEL_TEST_FAILED. Feil bevarer tidligere modell. Callable har 90 sekunder, maxInstances 3, eksisterende KEY_ENCRYPTION_SECRET og samlet abortvakt 88 sekunder. Modellkontroll har 15 sekunder og prøveimportens AI har 45 sekunder inkludert retry; klienten har 100 sekunder.
- Navngitte konstanter setter 20 importer per rullerende ti minutter og 150 per UTC-døgn. Kvotemeldinger og remainingToday bruker disse grensene. Eksisterende tellehistorikk beholdes. Nøkkel- og modellkontroll deler fortsatt 10 kontroller per ti minutter.
- AI-innstillinger viser alltid gjeldende modell. Administrator har forhåndsutfylt modellfelt, formatkontroll, Lagre og test modell, ventetekst og resultatmelding. Medlemmer ser bare modellnavnet. Modellbytte er deaktivert uten nett, ferdig innlogging, lagret nøkkel eller mens en handling pågår. Feil beholder kandidatfeltet og gjeldende modell; suksess viser det nye navnet. Sene svar ignoreres ved konto-/tilgangsbytte.
- Etter vellykket import vises gjenstående importer bare ved 30 eller færre. Tallet, modellstatus og kandidatfeltet ligger bare i minnet; ingenting legges i domenestate, localStorage, synk eller backup.
- importRecipe og aiModelSave logger modellnavn bare i gyldig format. ProviderStatus/providerCode/reason og INTERNAL-felter følger dagens strenge filtre. Ingen nøkkel, prøvetekst, e-post eller innhold logges. Loggfeil påvirker ikke resultatet.
- APP_VERSION, numerisk versjonsvakt, HTML-parametre og CACHE_NAME er v104/104. REQUIRED_MIN_APP_VERSION forblir 101. Ingen endring i domenemodell, Firestore-regler, synk, service worker-strategi eller avhengigheter. Ingen ny klientmodul; servermodulen skal ikke i asset-listene. Serveren støtter v103-klienten.

## Filer per mappe – tas med i GitHub Desktop

- Rot, endret: AGENTS.md, app.js, index.html, service-worker.js.
- src/render, endret: ai-key.js, meals.js.
- src/sync, endret: ai-key.js.
- functions, endret: index.js.
- functions/lib, endret: core.js, import.js, key-service.js. Ny: models.js.
- functions/tests, endret: core.test.cjs, image.test.cjs, import.test.cjs, index.test.cjs, logging.test.cjs. Ny: models.test.cjs.
- tests/app, endret: access-startup.test.mjs, workflows.test.mjs, ai-key.test.mjs, recipe-import.test.mjs.
- tests/render, endret: ai-key.test.mjs, meals.test.mjs.
- tests/sync, endret: ai-key.test.mjs.
- docs, endret: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md, FIREBASE_OPPSETT.md. Ny: LEVERANSE_V104.md.

27 eksisterende filer endret og tre nye: 30 filstier. Ingen slettede filer. STATE_MODEL.md er også oppdatert for å dokumentere private/aiConfig og de nye minnefeltene. functions/package.json, package-lock.json, firestore.rules, firebase.json, src/sync/version.js og styles.css er uendret. Den eksisterende ignorerte sikkerhetshjelperen er uendret og skal ikke lastes opp.

## Lokale kontroller

Alle 42 testskript under tests/ og functions/tests/ består uten nettverk. node --check av alle 37 kildefiler består; startup-testen kontrollerer også det innebygde HTML-skriptet. firebase.json, functions/package.json og package-lock.json er gyldig JSON. Lokal Node v24.15.0. Ingen installasjon eller nye avhengigheter.

- Modellrekkefølge, ugyldig lagret verdi, standardmodellen og bildemodell med/uten overstyring.
- Auth, verifisert e-post, medlemskap, administratorrolle, strengt modellformat og ukjente felter. Manglende/uleselig nøkkel bruker ingen kontrollkvote.
- Modellkontroll 401/403/404/503, invalid-status, bestått prøve, alle terskler, mangelfull/ugyldig prøve og feil i nøkkelhenting, kvote, modellkontroll, AI og lagring. Feil lagrer ikke modellen; den ellevte delte nøkkel-/modellkontrollen avvises.
- aiKeyStatus/Save/Test og importRecipe bruker valgt modell; adapteren har seks funksjoner, riktig region, tidsgrense og eksisterende secret-binding. Prøveimporten er adskilt fra importkvoten.
- Den 20. og 150. importen tillates; den 21. i vinduet og 151. i døgnet avvises. Nytt UTC-døgn nullstiller dagens telling, og gjenstående antall regnes fra 150.
- Logger har bare gyldig model/providerCode/reason og inneholder ingen nøkkel, prøvetekst eller e-post. Ugyldig modell logges ikke.
- Klientens felt, rolle-/nett-/nøkkelvern, formatkontroll uten kall, trimming, 100-sekunders callable-grense, ventetekst, suksess-/feilmelding, bevart kandidat og vern mot sene kontosvar.
- Gjenstående antall 0, 1 og 30 vises; 31/150 og ugyldige tall skjules. Tallet/modellutkastet finnes ikke i state, localStorage eller backup, og nullstilles ved ny import/editor-/tilgangsbytte. Alle eksisterende import-, bilde-, synk-, backup- og restore-tester består.

## Serverpublisering – del D

Firebase CLI 15.18.0, lokal Node v24.15.0 og eksisterende innlogging ble brukt gjennom den uendrede, ignorerte .local-tools/firebase-safety.cjs. CLI-versjon og projects:list ble kontrollert; middagsplanlegger-6db4e er tilgjengelig. Ingen installasjon eller ny innlogging. Hjelperen hindrer profilskriving utenfor prosjektet og debuglogging.

Publisert 2026-10-06 med:

```text
firebase deploy --only functions --project middagsplanlegger-6db4e
```

Første og eneste forsøk opprettet aiModelSave og oppdaterte de fem eksisterende funksjonene. CLI ga «Deploy complete!» og exitkode 0. Ingen retry, slettingsspørsmål eller endring av containerpolicy var nødvendig. Bare functions ble publisert; appfiler og regler er ikke publisert av agenten.

functions:list bekreftet:

| Funksjon | Generasjon | Trigger | Region | Runtime | Minne |
| --- | --- | --- | --- | --- | --- |
| aiKeyStatus | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeySave | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyTest | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyDelete | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiModelSave | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| importRecipe | v2 | callable | europe-west1 | nodejs22 | 512 MiB |

Uinnlogget POST med Content-Type application/json og {"data":{}} til både:

- https://europe-west1-middagsplanlegger-6db4e.cloudfunctions.net/aiKeyStatus
- https://europe-west1-middagsplanlegger-6db4e.cloudfunctions.net/aiModelSave

ga HTTP 401 og samme JSON-svar:

```json
{"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}
```

Begge funksjoner er tilgjengelige for callable-transport og avviser manglende Firebase-innlogging før medlemssjekk, nøkkelhenting og kvote. Ingen innlogget modelltest eller OpenAI-kall er utført.

Bekreftet: ingen Git-kommandoer, regelpublisering, --force, Firebase-sletting, secrets:set/access eller endring av KEY_ENCRYPTION_SECRET. Ingen aiKeySave/importRecipe-kall i skyen; aiModelSave ble bare kalt i den uttrykkelig godkjente uinnloggede avvisningskontrollen. Ingen nøkkelverdi, prøve-/side-/bildeinnhold eller e-post er lagret i logger eller rapport. Ingen debuglogg eller midlertidig hemmelighetsfil ble opprettet. firestore.rules og REQUIRED_MIN_APP_VERSION-filen er uendret.

## Avvik og videre kontroll

Ingen funksjonelle avvik fra beskjeden. STATE_MODEL.md er oppdatert i tillegg til de bestilte dokumentene fordi det nye private dokumentet og minnefeltene hører hjemme der. Ekte modelltest mot OpenAI, innlogget import og PC/iPhone-akseptanse utføres av eier etter apppublisering. Agenten verifiserer bare serverlisten og uinnlogget avvisning, uten å kalle aiKeySave, innlogget aiModelSave eller importRecipe i skyen. Ingen påstand om at en bestemt ny modell er tilgjengelig eller består testen før eier prøver den i appen.
