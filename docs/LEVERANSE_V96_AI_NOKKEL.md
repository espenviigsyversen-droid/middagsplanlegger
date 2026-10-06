# Utvidelse av v96: OpenAI-nøkkel administrert i appen

v96-appfilene er fortsatt upublisert. APP_VERSION, APP_VERSION_NUMBER, index.html-parametre og CACHE_NAME beholdes på v96/96. Den opprinnelige nøkkelutvidelsen ble gjort uten nettverk eller installasjon. Eier godkjente 2026-10-06 uttrykkelig nettverk, npm install i functions og serverpublisering med --only functions. Git og publisering av firestore.rules er fortsatt forbudt og er ikke brukt.

## Resultat

Administrator kan legge inn, validere, teste og slette familiens OpenAI-nøkkel under Innstillinger → AI og oppskriftsimport. Vanlige medlemmer ser bare status og maskert nøkkel. Kryptert lagring bruker AES-256-GCM, HKDF-SHA256, tilfeldig IV og dokumentstien som AAD. Serveren bruker KEY_ENCRYPTION_SECRET; den tidligere API-nøkkelhemmeligheten brukes ikke lenger.

Nøkkelen sendes fra passordfeltet direkte til den kallbare funksjonen. Feltet tømmes før venting på SDK eller server. Klartekst inngår aldri i appstate, localStorage, sikkerhetskopi, Firestore-felter, svar eller logger. Den finnes bare midlertidig i feltet, HTTPS-forespørselen og serverminnet. Serveren kontrollerer verifisert medlemskap og administratorrolle. Save/test deler en separat kvote. Import dekrypterer før importkvoten telles; manglende/uleselig nøkkel teller ikke, og 401/403 merker den brukte nøkkelen invalid.

Privat status kan oppdateres etter en dekrypteringsfeil, slik at klienten viser behov for nytt oppsett. Sene resultater sammenligner kryptert innhold før status skrives; en ny eller slettet nøkkel påvirkes ikke av resultatet fra en gammel kontroll. Domeneformat, synk, innlogging og Firestore-regler er beholdt. Service worker-strategien er beholdt, med nye klientmoduler i begge asset-listene.

## Filer for GitHub Desktop

Ta med alle følgende endrede og nye filer. Ingen filer er slettet i denne utvidelsen. Listen gjelder denne bestillingen; tidligere v96-endringer må også være med ved publisering.

| Mappe | Endrede filer | Nye filer |
| --- | --- | --- |
| Rot | .gitignore, AGENTS.md, app.js, service-worker.js | Ingen |
| src/render | meals.js, setup.js | ai-key.js |
| src/sync | recipe-import.js | ai-key.js |
| functions | index.js | package-lock.json |
| functions/lib | core.js, import.js | keys.js, key-service.js |
| functions/tests | diagnostics.test.cjs, import.test.cjs, index.test.cjs | keys.test.cjs, key-service.test.cjs, logging.test.cjs |
| tests/app | recipe-import.test.mjs | ai-key.test.mjs |
| tests/render | meals.test.mjs | ai-key.test.mjs |
| tests/sync | recipe-import.test.mjs | ai-key.test.mjs |
| docs | ARCHITECTURE.md, STATE_MODEL.md, FIREBASE_OPPSETT.md, RELEASE.md, LEVERANSE_V96.md | LEVERANSE_V96_AI_NOKKEL.md |

Functions-filer publiseres separat via Firebase etter FIREBASE_OPPSETT.md; de kjøres ikke av GitHub Pages. Appens publiserte rot-/src-filer inkluderer app.js, service-worker.js, src/render/meals.js, src/render/setup.js, src/render/ai-key.js og src/sync/ai-key.js. Dokumentasjon og tester tas med i repoet.

## Kontroller

- Alle 36 testskript under tests/ og functions/tests/ består med lokale DOM-, SDK-, database- og fetch-stubber. Etter npm install er alle ni functions-testskript kjørt på nytt og består.
- node --check består for alle 33 kildefiler: app.js, service-worker.js, functions/index.js og alle JavaScript-moduler under src/ og functions/lib/.
- Oppstartsverntesten kontrollerer også syntaksen i det innebygde HTML-skriptet.
- Nye tester dekker krypteringsrundtur, feil hemmelighet, endret tag/innhold, ukjent versjon, ulik IV, maskering og ugyldig nøkkelformat.
- Provider-kontroll dekker 200, 401, 403, 404, øvrige feil og tidsavbrudd. Feil lagrer ikke en ny nøkkel. Administrator-/medlemskontroll, samlet save/test-kvote, status og sletting er testet.
- Import bruker lagret nøkkel, teller ikke bruk ved manglende eller uleselig nøkkel og oppdaterer status ved ugyldig provider-auth. Adaptertesten kontrollerer at sen ugyldig-status verken endrer nylig erstattet nøkkel eller gjenoppretter slettet nøkkel.
- Klient-/app-testene kontrollerer øyeblikkelig tømming av input, ingen nøkkel i state/localStorage/sikkerhetskopi/logger/svar, avvisning av sene svar etter utlogging, deaktivert administrasjon uten nett/for vanlig medlem, slettingsbekreftelse og bevart utkast ved besøk i AI-innstillinger.
- Versjonsverdiene er fortsatt v96/96. Begge nye klientmoduler finnes i ASSETS og NETWORK_FIRST_ASSETS; functions/ finnes ikke der.

## Presiseringer og gjenstående akseptanse

Siste rettingsbeskjed tillater strengt validerte errorName/errorCode bare ved INTERNAL. errorName har 1–40 bokstaver; errorCode er heltall eller 1–40 tillatte tegn uten sk--prefiks. Logger inneholder ellers bare functionName, code, durationMs og eventuell providerStatus. Aldri message, stack, providerCode eller andre feilfelter.

HKDF-info er valgt som tom streng, siden beskjeden angir salt og lengde, men ingen info-verdi. Status er begrenset informasjon fra lagret dokument; aiKeyStatus dekrypterer ikke og har ingen secret-binding. En byttet krypteringshemmelighet oppdages ved test/import, feiler lukket og krever ny innlegging av OpenAI-nøkkelen. Status ved provider-feil forklares med norsk servermelding.

Ved bytte av krypteringshemmeligheten må OpenAI-nøkkelen legges inn på nytt. OpenAI-kall, modelltilgang og faktisk PC-/iPhone-visning er ikke testet; følg akseptansekontrollene i RELEASE.md etter apppublisering. Ingen OpenAI-nøkkel er lagt inn og aiKeySave/importRecipe er ikke kalt mot serveren under leveransen.

## Del A – siste rettinger 2026-10-06

- Nøkkelfeltet tømmes straks, verdien trimmes, og tom eller feilformatert nøkkel gir norsk melding uten serverkall. SDK-feil skiller mellom format, innlogging/tilgang og nettverk; feilobjektet logges eller lagres ikke.
- Tom URL og tekst med under 20 tegn etter trim gir melding uten serverkall og uten busy. Importklienten håndterer invalid-argument med egen veiledning.
- connected → Tilkoblet, invalid → Nøkkelen virker ikke, unavailable → Kunne ikke kontrolleres. Import blokkeres bare ved manglende nøkkel eller invalid.
- Begge serverflyter bruker samme rene allowlist for INTERNAL-felter. Innpakningens invalid-argument-tekst er nøytral: «Ugyldig forespørsel.»
- Alle 36 testskript og node --check for 33 kildefiler består. Loggtestene omfatter gyldige grenser, heltall, rare tegn, for lange felter og sk--prefiks. Versjon er fortsatt v96/96.

Filer endret i denne rettings-/publiseringsbestillingen, gruppert per mappe:

| Mappe | Endrede filer | Nye filer for GitHub Desktop |
| --- | --- | --- |
| Rot | .gitignore, AGENTS.md, app.js | Ingen |
| src/sync | ai-key.js, recipe-import.js | Ingen |
| src/render | ai-key.js | Ingen |
| functions | index.js | package-lock.json |
| functions/lib | core.js, import.js, key-service.js | Ingen |
| functions/tests | diagnostics.test.cjs, index.test.cjs | logging.test.cjs |
| tests/app | recipe-import.test.mjs | Ingen |
| tests/sync | ai-key.test.mjs, recipe-import.test.mjs | Ingen |
| tests/render | ai-key.test.mjs | Ingen |
| docs | ARCHITECTURE.md, FIREBASE_OPPSETT.md, RELEASE.md, LEVERANSE_V96.md, LEVERANSE_V96_AI_NOKKEL.md | Ingen |

.local-tools/, .npm-cache/, .firebase/ og eventuelle firebase-debuglogger er ignorert og skal ikke tas med i GitHub Desktop. Den lokale CLI-hjelperen hindrer skriving av CLI-profil/innlogging og debuglogger; credentials holdes bare i prosessminnet. Cache og midlertidige CLI-arbeidsfiler holdes i prosjektmappen. Ingen midlertidig hemmelighetsfil er brukt.

## Del B – serverpublisering 2026-10-06

- B1: Node v24.15.0 og installert Firebase CLI 15.18.0. Ingen global installasjon eller npx nødvendig. Første versjonsforsøk ble blokkert av sandkassen ved lesing av eksisterende CLI-profil (EPERM); isolert kjøring med godkjent lesetilgang lykkes og endrer ikke profilen.
- B2: Eksisterende CLI-innlogging viste middagsplanlegger-6db4e i projects:list. Ingen ny login, login:ci, tjenestekontonøkkel eller token fra eier brukt.
- B3: npm install i functions fullført, 242 pakker installert, package-lock.json opprettet. Kravene ^13.0.0 og ^7.3.0 er uendret; låsefilen løste firebase-admin 13.10.0 og firebase-functions 7.4.0. Alle ni functions-testskript består etter installasjonen. npm advarte om lokal Node 24 mot deklarert Node 22 og åtte moderate sårbarhetsfunn. Ingen audit fix, versjonsendring eller --force brukt. Publisert runtime skal være nodejs22.
- B4: secrets:get returnerte 404 og bekreftet at KEY_ENCRYPTION_SECRET ikke fantes. 32 kryptografisk tilfeldige byte ble base64-kodet og sendt direkte gjennom røret til secrets:set --data-file -. Versjon 1 ble opprettet. Verdien ble aldri vist eller skrevet lokalt. Ingen secrets:access eller midlertidig hemmelighetsfil brukt.
- B5: Første forsøk opprettet aiKeyStatus, aiKeySave, aiKeyTest og aiKeyDelete. importRecipe feilet med HTTP 500 ved oppretting av Cloud Run umiddelbart etter aktivering av run.googleapis.com. CLI rapporterte «Deploys failed. Skipping deletes.» Spørsmål om containerbilder ble besvart med 1 dag; cleanup-policy i europe-west1 ble konfigurert. Deploy avsluttet med kode 2. Etter mer enn tre minutter ble samme kommando kjørt på nytt: de fire uendrede funksjonene ble hoppet over, importRecipe ble opprettet, og CLI avsluttet med «Deploy complete!» og kode 0. Totalt to forsøk, ingen --force eller sletting av Firebase-ressurser. Ingen separat artifacts:setpolicy-kommando var nødvendig.

Feiltekst fra første forsøk (ingen hemmeligheter):

```text
Request to https://cloudfunctions.googleapis.com/v2/projects/middagsplanlegger-6db4e/locations/europe-west1/functions?functionId=importRecipe had HTTP Error: 500, Could not create Cloud Run service importrecipe.
Failed to create function projects/middagsplanlegger-6db4e/locations/europe-west1/functions/importRecipe
Error: There was an error deploying functions
```

- B6: functions:list --project middagsplanlegger-6db4e bekreftet alle fem funksjoner:

| Funksjon | Generasjon | Trigger | Region | Runtime | Minne |
| --- | --- | --- | --- | --- | --- |
| importRecipe | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyStatus | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeySave | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyTest | v2 | callable | europe-west1 | nodejs22 | 256 MiB |
| aiKeyDelete | v2 | callable | europe-west1 | nodejs22 | 256 MiB |

Uinnlogget POST til https://europe-west1-middagsplanlegger-6db4e.cloudfunctions.net/aiKeyStatus med Content-Type application/json og body {"data":{}} ga HTTP 401:

```json
{"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}
```

Ingen 403/HTML-respons. Ingen autentiserte funksjonskall, aiKeySave-kall eller importRecipe-kall ble gjort i skyen. Ingen OpenAI-nøkkel ble lagt inn.

- B7: FIREBASE_OPPSETT.md, RELEASE.md, AGENTS.md, ARCHITECTURE.md og denne rapporten er oppdatert med rettinger, installasjon, CLI-versjon, dato, hemmelighetsflyt og ferdig publiseringskontroll.

Bekreftet: hemmelighetsverdien ble aldri vist, logget eller lagret lokalt; den ble kun sendt til Secret Manager. Ingen midlertidig hemmelighetsfil ble brukt, så ingen slik fil gjenstår å slette. Ingen Firebase-debuglogg er opprettet. firestore.rules ble ikke publisert, appfilene ble ikke publisert, ingen Git-kommandoer ble brukt og ingen --force, secrets:access, login:ci eller slettingskommando ble kjørt.

Ta med functions/package-lock.json og functions/tests/logging.test.cjs som nye filer i GitHub Desktop, sammen med endrede filer i tabellen for del A og de tidligere v96-filene. Funksjonene er publisert; eier gjenstår å publisere appfilene og deretter legge inn OpenAI-nøkkelen i appen og gjennomføre PC-/iPhone-/importakseptansen.
