# Firebase-oppsett fra v95

Appen bruker det egne prosjektet `middagsplanlegger-6db4e`, med familie-ID `familien`. Konfigurasjonen i app.js er offentlig Firebase-klientkonfigurasjon. Tilgang beskyttes av Authentication og `firestore.rules`. Det gamle prosjektet er arkiv; v95 kontakter det ikke, og ingen data overføres automatisk derfra.

## Prosjekt og innlogging

1. Åpne prosjektet `middagsplanlegger-6db4e` i Firebase-konsollen og opprett Cloud Firestore om den ikke finnes. Velg region før data legges inn.
2. Aktiver Google under Authentication → Sign-in method, med korrekt support-e-post.
3. Legg det faktiske domenet til den publiserte appen under Authentication → Settings → Authorized domains. For GitHub Pages er dette vertsnavnet, ikke prosjektets URL-sti. Kontroller også autorisert localhost hvis innlogging skal testes på lokal webserver.
4. Appen åpner Google-popup fra brukerens knappetrykk, med `prompt: select_account`, og bruker Firebase standard innloggingspersistens. Test dette på ekte PC og iPhone-hjemskjermapp før utrullingen regnes som godkjent.

## Publiser regler

`firestore.rules` i repoet er fasit. Åpne Firestore → Rules, erstatt innholdet med hele filen og publiser reglene i det nye prosjektet. `firebase.json` peker bare på denne regelfilen og `.firebaserc` velger riktig prosjekt for eventuell senere bruk av Firebase-verktøy. Ingen slike verktøy eller publisering er kjørt av agenten. GitHub Pages publiserer appfiler, ikke Firestore-regler.

Reglene krever verifisert e-post og medlemsdokument. Alle medlemmer kan lese og skrive domenedata. Bare administratorer kan skrive app/meta og legge til, endre eller fjerne andre medlemmer; egen medlemsrad kan ikke oppdateres eller fjernes fra appen. Den første administratoren opprettes derfor manuelt. Medlemsreglene bruker dokumentoppslag; appen bruker enkeltstående writes, og ingen batch/transaksjon med mange dokumenter. Historisk handlelistemigrering kjøres ikke i v95.

## Første administrator

Opprett manuelt dokumentet:

```text
families/familien/members/din-google-epost@example.com
```

Dokument-ID må være hele Google-kontoens e-postadresse i små bokstaver. Legg til feltet `role` som string med verdien `admin`. Første dokument trenger ikke addedAt/addedBy. Konsollen brukes av prosjektets eier og trenger ikke appens medlemsrettigheter for å opprette dette.

Ikke opprett app/meta ennå. Åpne v95 på PC, logg inn med den samme Google-kontoen og bruk oppsettflyten. Uten medlemskap får kontoen «Du har ikke tilgang ennå» og ser ikke appinnhold. Et vanlig medlem kan bare vente til administrator har satt opp databasen.

## Sett opp databasen

Før overgangen må alle v94-enheter vise «Synket», og en ny JSON-sikkerhetskopi må lastes ned på PC. I v95 velges «Les inn sikkerhetskopi», oppsummeringen kontrolleres og innlesingen bekreftes. Alternativet «Start med tom database» krever egen bekreftelse og tomme meals, weeks og shoppingItems.

Appen kontrollerer format og alle eksisterende dokument-ID-er før den skriver. Fremmede ID-er avbryter forsøket uten writes og ber om manuell tømming i konsollen. ID-er som finnes i filen overskrives, slik at en delvis innlesing av samme fil kan kjøres på nytt. Medlemslisten beholdes alltid. Dokumentene skrives enkeltvis; `app/shopping.migratedToItemsAt` settes, og `app/meta` kommer helt til slutt med:

```text
schemaVersion: 1
initializedAt: serverTimestamp
initializedBy: administratorens e-post
minAppVersion: 95
```

Bare initializedAt gjør databasen klar for vanlig synk. Oppsett gjennomføres fra én administratorenhet om gangen. Etterpå kan den andre voksne legges til som administrator under Konto og medlemmer. Nye medlemmer trenger ikke logge inn før de legges til.

## Gjenoppretting på nytt

Lukk andre appøkter. Slett `families/familien/app/meta` og tøm de tre samlingene meals, weeks og shoppingItems manuelt i konsollen. Behold members. Åpne administratorens app på nytt og les inn sikkerhetskopien. Profile, preferences og metadata overskrives av oppsettet; ingen automatisk sletting utføres av appen.

Sletting av bare meta åpner oppsettflyten, men fremmede dokument-ID-er vil fortsatt blokkere innlesing. Ved retry av en avbrutt innlesing med samme fil trenger de delvis innleste dokumentene ikke fjernes.

## Versjon og offline

Meta kan bare endres av administratorer. minAppVersion over 95 blokkerer v95 og stopper lyttere, timere og usendte operasjoner. Knappen «Oppdater app» bruker eksisterende oppdateringsflyt. V95-oppsett skriver aldri et minimum høyere enn 95.

Offline-medlemsflagget gjelder riktig prosjekt, familie og bruker, etter tidligere godkjent oppsett. Det gir lokal tilgang uten nett, med «Lokal lagring». Utlogging eller avvist medlemskap fjerner flagget og skjuler appinnhold, men sletter ikke lokal state. Last appen inn igjen når nettet er tilbake for ny tilgangskontroll og synk. Det er fortsatt ingen varig handlelistekø; offline-endringer kan erstattes av skylisten.

Se «Utrulling av v95» i RELEASE.md for enhetsrekkefølge og kontrollpunkter.

## Publiser oppskriftsimport før v96-appen

Functions kan installeres og publiseres av agenten etter uttrykkelig utviklerbeskjed fra eier. Bruk alltid --only functions og riktig --project; appfilene publiseres av eier med GitHub Desktop. Cloud Functions krever et Firebase-prosjekt med egnet faktureringsoppsett. Utført kontroll og publiseringsstatus står nederst i dette dokumentet.

Fra prosjektmappen:

```powershell
Push-Location functions
npm install
Pop-Location
firebase functions:secrets:get KEY_ENCRYPTION_SECRET --project middagsplanlegger-6db4e
firebase deploy --only functions --project middagsplanlegger-6db4e
```

Bruk Firebase CLI med tilgang til prosjektet. `firebase.json` angir functions-kilde og nodejs22. Installasjonen oppretter functions/package-lock.json som tas med i GitHub Desktop; node_modules ignoreres. Kontroller først hemmelighetens metadata med functions:secrets:get. Finnes en aktiv versjon, beholdes den. Bare når hemmeligheten ikke finnes, genereres 32 kryptografisk tilfeldige byte som base64 og sendes rett til CLI uten utskrift:

```powershell
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" | firebase functions:secrets:set KEY_ENCRYPTION_SECRET --data-file - --project middagsplanlegger-6db4e
```

Dette er krypteringshemmeligheten, ikke OpenAI-nøkkelen. Den skal aldri vises eller skrives til repo, logger, dokumentasjon eller chat. Ikke bruk functions:secrets:access. Firebase CLI-debuglogging må være deaktivert under hemmelighetskallet, siden debuglogger kan inneholde forespørselskroppen. Hvis rørføring ikke virker, tillates en kortvarig fil i %TEMP% etter eiers beskjed; den slettes straks, og sletting kontrolleres. Behold hemmeligheten ved senere publiseringer.

**Byttes KEY_ENCRYPTION_SECRET, kan den eksisterende OpenAI-nøkkelen ikke dekrypteres. En administrator må legge inn OpenAI-nøkkelen på nytt i appen.** Ikke roter hemmeligheten som del av en vanlig appoppdatering.

Fra v104 omfatter publiseringen importRecipe, aiKeyStatus, aiKeySave, aiKeyTest, aiKeyDelete og aiModelSave, alle callable 2nd gen i europe-west1. De krever verifisert Google-medlemskap; save/test/delete krever administratorrolle. Bare importRecipe/aiKeySave/aiKeyTest/aiModelSave bindes til den eksisterende krypteringshemmeligheten. Ingen endring i klientens Firestore-regler er nødvendig: Admin SDK leser/skriver private/openaiKey, private/keyUsage, private/importUsage og private/aiConfig; eksisterende catch-all-regel avviser klienttilgang.

Fra v104 velges modellen først fra gyldig private/aiConfig.model, deretter `OPENAI_RECIPE_MODEL`, ellers standard `gpt-5.6-luna`. Administrator kan bytte under AI og oppskriftsimport med «Lagre og test modell», uten ny publisering. Kandidaten lagres bare etter modellkontroll og bestått prøveimport. Modellnavnets tilgjengelighet kontrolleres av serveren ved eierens modelltest; agenten gjør ingen OpenAI-kall. Miljøvariabel i functions/.env fungerer fortsatt som reservevalg ved manglende/ugyldig lagret modell. Eventuelle lokale miljøfiler skal holdes utenfor repoet. Etter publisering åpner en administrator Innstillinger → AI og oppskriftsimport, limer inn familiens OpenAI-nøkkel og trykker «Lagre og valider». Serveren kontrollerer tilgang til modellen før lagring. 401/403 eller 404 lagrer ingenting; 404-meldingen oppgir modellnavnet. Tidligere lagret nøkkel beholdes ved mislykket lagring. «Test tilkobling» oppdaterer status; «Slett nøkkel» krever bekreftelse. Bare maskert nøkkel og status returneres. OpenAI-nøkkelen lagres kryptert i Firestore, aldri i Secret Manager, klientlagring eller sikkerhetskopien. Den gamle CLI-nøkkelflyten brukes ikke lenger.

Publiser funksjonen og kontroller den før v96-appfilene publiseres via GitHub Desktop. Test godt.no/tine.no, Instagram med innlimt tekst, engelsk oppskrift med cups, en side uten oppskrift og erstatningsspørsmålet. Kontroller at Avbryt forkaster utkastet og at Lagre bruker vanlig lagring og synk.

Fra v104 deler familien maks 20 importer per rullerende 10 minutter og 150 per UTC-døgn. Kall telles etter medlems- og inndatakontroll og vellykket dekryptering av nøkkelen, før henting og AI, også hvis importen senere feiler eller ber om innlimt tekst. Manglende/uleselig nøkkel bruker ingen importkvote. Telling lagres i `families/familien/private/importUsage`; ingen importer lagres på serveren av denne funksjonen. Lagre/test nøkkel og modelltest har en separat felles grense på 10 kontroller per 10 minutter i private/keyUsage; status og sletting bruker ikke denne kvoten.

Funksjonslogger inneholder funksjonsnavn, kode, varighet og eventuell providerStatus. Bare ved INTERNAL tillates validerte errorName/errorCode etter AGENTS.md; aldri message, stack eller andre feilfelter. Ingen provider-meldinger, vertsnavn, tokenbruk, sideinnhold, e-postadresse eller nøkkel logges. Innlimt tekst/uttrukket oppskriftstekst sendes til OpenAI for tolking med `store: false`, bare når brukeren trykker Hent eller Tolk tekst. Bruksgrensen og maxInstances begrenser bruk, men er ikke en total kostnadsgrense for prosjektet.

V96-versjonsvakten sammenligner med 96; nytt databaseoppsett skriver fortsatt minAppVersion 95. Test blokkering av v96 med 97. Et eksisterende oppsett og alle domenedata beholdes under oppgraderingen.

## Utført serverpublisering 2026-10-06

Eier ga uttrykkelig godkjenning til denne oppgaven. Agenten brukte installert Firebase CLI 15.18.0 og lokal Node v24.15.0. projects:list bekreftet eksisterende innlogging og tilgang til middagsplanlegger-6db4e. Ingen ny innlogging, tjenestekontonøkkel eller login:ci ble brukt.

npm install ble kjørt i functions med cache/arbeidsfiler inne i prosjektmappen. functions/package-lock.json ble opprettet, med firebase-admin 13.10.0 og firebase-functions 7.4.0 innenfor uendrede versjonskrav. Alle ni functions-testskript bestod etter installasjonen. npm rapporterte Node-engine-advarsel for lokal Node 24 mot deklarert Node 22, og åtte moderate sårbarhetsfunn; ingen automatisk retting eller versjonsendring ble gjort.

Metadataoppslaget for KEY_ENCRYPTION_SECRET ga 404/not found. En ny hemmelighet med versjon 1 ble opprettet ved å sende 32 tilfeldige byte kodet som base64 rett gjennom røret til secrets:set --data-file -. Ingen verdi ble vist, skrevet til lokal fil eller logget. Ingen secrets:access ble kjørt. Det var ikke behov for midlertidig hemmelighetsfil.

CLI-kjøringen bruker en lokal ignorert hjelper som hindrer profilskriving og debuglogger. Dette beholder eksisterende innlogging uten endringer utenfor prosjektmappen og forhindrer at secret-forespørselskroppen havner i en Firebase-debuglogg. .local-tools/, .npm-cache/ og node_modules skal ikke tas med i repoet.

Kun firebase deploy --only functions --project middagsplanlegger-6db4e ble kjørt. Første forsøk aktiverte nødvendige API-er, opprettet fire aiKey-funksjoner og feilet med HTTP 500 ved oppretting av importRecipe sin Cloud Run-tjeneste. Containerpolicy ble satt til én dag i europe-west1 i CLI-dialogen. Ingen sletting ble utført. Etter mer enn tre minutters venting ble samme kommando kjørt på nytt.

Andre deployforsøk lyktes med «Deploy complete!» og exitkode 0. De fire uendrede funksjonene ble hoppet over og importRecipe opprettet. Totalt to forsøk, ingen --force eller slettingskommando. functions:list bekreftet importRecipe, aiKeyStatus, aiKeySave, aiKeyTest og aiKeyDelete som callable v2, europe-west1, nodejs22, alle med 256 MiB minne.

Uinnlogget POST til aiKeyStatus med application/json og {"data":{}} ga HTTP 401 og {"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}. Funksjonen er dermed åpen for callable-transport, men avviser manglende Firebase-innlogging. Dette verifiserer ikke innlogget medlemskap, nøkkellagring eller OpenAI-tilgang; slike akseptansetester gjenstår etter apppublisering.

Firestore-reglene og appfilene er ikke publisert av agenten. Ingen Git-kommandoer, secrets:access, login:ci, tjenestekontonøkler, slettingskommandoer eller OpenAI-nøkkel er brukt. aiKeySave/importRecipe er ikke kalt i skyen. functions/package-lock.json og functions/tests/logging.test.cjs må tas med i GitHub Desktop, i tillegg til endrede app-/test-/dokumentasjonsfiler i LEVERANSE_V96_AI_NOKKEL.md.

## Bildeimport v102

v101 er bekreftet publisert og testet av eier. Publiser functions før v102-appfilene med firebase deploy --only functions --project middagsplanlegger-6db4e. Ingen installasjon eller nye avhengigheter kreves i denne leveransen. KEY_ENCRYPTION_SECRET og krypterte OpenAI-nøkler skal beholdes. Ingen secrets:set/access, nøkkelkall eller regelpublisering inngår.

Ny valgfri miljøvariabel OPENAI_RECIPE_IMAGE_MODEL velger bildemodellen. Uten den brukes grunnmodellen: fra v104 gyldig private/aiConfig.model, ellers OPENAI_RECIPE_MODEL eller den eksisterende standardmodellen. Eventuell lokal functions/.env skal fortsatt holdes utenfor repoet. Serverens nøkkelvalidering tester fortsatt tekstmodellen; tilgangen til en separat bildemodell avdekkes ved en bildeimport. Modellen må støtte bildeinndata. Agenten endrer ingen miljøvariabler og gjør ingen OpenAI-kall i denne oppgaven.

importRecipe bruker nå 120 sekunder og 512 MiB, samlet abortsignal 115 sekunder, AI 90 sekunder for bilder/45 for lenke og tekst. aiKeyStatus/Save/Test/Delete beholder sine innstillinger. Samme kvoter og nøkkel brukes. Logger kan inneholde source image, imageCount 1–4 og providerCode etter /^[a-z0-9_]{1,40}$/ uten ekstra blanke tegn, i tillegg til allerede tillatte felt. Aldri bilder, byteantall, filnavn, sideinnhold, e-post eller nøkkel. Oppskriftstekst, nettsideinnhold og bilder sendes med store:false ved brukerens Hent/Tolk tekst/Tolk bilder.

### Utført serverpublisering v102, 2026-10-06

Firebase CLI 15.18.0 (lokal Node v24.15.0) og eksisterende innlogging ble brukt med den eksisterende ignorerte sikkerhetshjelperen. projects:list bekreftet middagsplanlegger-6db4e. Ingen installasjon eller ny innlogging. Ett deployforsøk med --only functions --project middagsplanlegger-6db4e oppdaterte alle fem funksjoner og ga Deploy complete!/exitkode 0. Ingen retry eller endring av artifact-policy var nødvendig.

functions:list viste importRecipe, aiKeyStatus, aiKeySave, aiKeyTest og aiKeyDelete som callable v2 i europe-west1/nodejs22. importRecipe har 512 MiB; de andre har 256 MiB. Uinnlogget JSON-POST til aiKeyStatus med {"data":{}} ga HTTP 401 og {"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}.

KEY_ENCRYPTION_SECRET er urørt, ingen secrets:set/access eller aiKeySave/importRecipe-kall er kjørt. Ingen regelpublisering, Git-kommandoer, --force, sletting eller OpenAI-kall. Ingen bilder/sideinnhold eller nøkkel er lagret/logget lokalt. Ingen debuglogg eller midlertidig hemmelighetsfil ble opprettet. Se LEVERANSE_V102.md for full filoversikt og kontrollresultat. Appfilene publiseres separat av eier i GitHub Desktop; minimumsversjonen forblir 101. Ekte bildeimport og nettleser-/iPhone-dekoding kontrolleres etter apppublisering.

## Modellvalg og publisering v104

Publiser functions før v104-appen, med eksisterende avhengigheter og uendret KEY_ENCRYPTION_SECRET. aiModelSave er ny, v2/europe-west1/nodejs22, timeout 90 sekunder, maxInstances 3 og bundet til eksisterende hemmelighet. Ingen secrets:set/access eller regelpublisering inngår. Kontroller seks funksjoner og uinnlogget JSON-POST til både aiKeyStatus og aiModelSave: HTTP 401/UNAUTHENTICATED. Fullt resultat står i LEVERANSE_V104.md.

Etter eiers apppublisering: åpne AI og oppskriftsimport som administrator, fyll kandidatmodellen og trykk «Lagre og test modell». En fast prøveoppskrift testes uten å telle importkvote eller lagre oppskrift. Bare en bestått modelltest endrer private/aiConfig. Vanlige medlemmer kan bare se gjeldende modell. Modellen må støtte dagens Responses-parametre; modelltest verifiserer tekstimport. Test selv bildeimport etter bytte, også dersom OPENAI_RECIPE_IMAGE_MODEL er satt (den overstyrer fortsatt bilder). Status/nøkkelkontroll bruker grunnmodellen. Ingen miljøvariabler eller standardmodell endres av agenten.

ImportRecipe og aiModelSave kan logge gyldig modellnavn etter AGENTS.md. Prøvetekst/nøkkel og andre innholdsfelter logges aldri. Private dokumenter inngår ikke i appens backup. Minimumsversjonen forblir 101.

### Utført serverpublisering v104, 2026-10-06

Firebase CLI 15.18.0 og lokal Node v24.15.0 ble brukt med eksisterende innlogging og uendret ignorert sikkerhetshjelper. projects:list viste middagsplanlegger-6db4e. Ingen installasjon eller ny innlogging. Ett deployforsøk med --only functions --project middagsplanlegger-6db4e opprettet aiModelSave og oppdaterte de fem eksisterende funksjonene, med Deploy complete!/exitkode 0. Ingen retry eller endret containerpolicy.

functions:list bekreftet seks callable v2-funksjoner i europe-west1/nodejs22: importRecipe (512 MiB), aiKeyStatus, aiKeySave, aiKeyTest, aiKeyDelete og aiModelSave (256 MiB hver). Uinnlogget JSON-POST med {"data":{}} til aiKeyStatus og aiModelSave ga begge HTTP 401/UNAUTHENTICATED. Ingen innlogget aiModelSave, aiKeySave eller importRecipe-kall; ingen OpenAI-kall.

KEY_ENCRYPTION_SECRET, regler og miljøvariabler er urørt. Ingen Git, secrets:set/access, --force, sletting, debuglogg eller midlertidig hemmelighetsfil. Appfilene publiseres av eier via GitHub Desktop; modellprøve og ekte import kontrolleres etterpå. Full filoversikt og alle lokale testresultater står i LEVERANSE_V104.md.
