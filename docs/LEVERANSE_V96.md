# Leveranse v96 – oppskriftsimport

Implementert etter leveranse 4 og arkitektens godkjente presiseringer om detaljsnarveien og samlet AI-tidsgrense. Ingen installasjon, nettverkstilgang, Git-kommandoer eller publisering er utført. Eier publiserer funksjonen først og appen etterpå.

## Resultat

- Ny callable 2nd gen importRecipe i europe-west1, med Node 22, 60 sekunder, 256 MiB, maks tre instanser og App Check-valget fra beskjeden. Bare firebase-admin og firebase-functions er oppført som avhengigheter. Nøkkelflyten er senere erstattet av appadministrert kryptert lagring; se LEVERANSE_V96_AI_NOKKEL.md.
- Medlemskontroll krever autentisering, verifisert e-post og eksisterende medlemsdokument. Ukjente inndatafelt avvises. Felles grense er 10 kall per rullerende 10 minutter og 40 per UTC-døgn, telt i én transaksjon før henting og AI. Klientens Firestore-regler er uendret og avviser den nye private telleren.
- Sidehenting krever offentlig https, kontrollerer alle DNS-resultater og hver omdirigering, og binder socket til validert IP. Sosiale lenker gir NEEDS_TEXT. Maks tre omdirigeringer, 10 sekunder samlet og 1 500 000 byte; bare text/html.
- Uttrekk støtter Recipe i JSON-LD, @graph, lister, HowToStep/HowToSection, instruksjoner som streng og flere/ugyldige script-elementer. Uten Recipe brukes renset tekst på maks 12 000 tegn og tittelforslag.
- AI brukes alltid, med norsk instruksjon om ikke å følge kildeinstrukser, ikke dikte opp, bruke familiens kategorier/enheter, oversette til bokmål og konvertere til metriske mål. Responses bruker store:false og 3000 output-tokens. Ett nytt forsøk ved 429/5xx deler 45-sekundersbudsjettet. Overordnet abortvakt er 58 sekunder.
- Svar normaliseres på serveren med feltgrenser, kontroll av mengde/enhet/kategorier, porsjonsstandard og norske warnings. Etter siste v96-retting logger serveren funksjonsnavn, kode, varighet og eventuell providerStatus, samt strengt validerte errorName/errorCode bare ved INTERNAL. Aldri message eller stack. Se LEVERANSE_V96_AI_NOKKEL.md for oppdatert test- og publiseringsstatus.
- Ny importseksjon i editoren, for både nye og eksisterende oppskrifter. Under venting beholdes skjemainput. NEEDS_TEXT åpner tekstfeltet og beholder lenken; andre feil lar innholdet stå.
- Import fyller bare utkast. Eksisterende utfylte metadata beholdes; ingredienser/steg spør før erstatning, og porsjoner følger innholdet. Ingen importrespons skriver localStorage, meals eller Firestore. Vanlig Lagre og Avbryt beholdes. Sene svar etter avbrudd, kontobytte eller lukket editor ignoreres.
- mealCanImportFromLink er en egen ren funksjon for lenke uten ingredienser/steg. mealNeedsRecipe er uendret. Snarveien Hent fra lenke åpner editor og starter import; import krever godkjent økt og nett.
- App, HTML, cache og versjonsvakt bruker 96. Oppsett skriver fortsatt minimum 95. Nye klientmoduler er i begge assetlistene; functions-filer caches ikke. Domenemodell, Firestore-regler, innlogging, forslagmotor og handlelisteflyt er beholdt.

## Kontroller

- Alle 29 testskript bestod: 24 under tests/ og fem under functions/tests/.
- node --check bestod for alle 29 kildefiler: app/service worker, 20 src-moduler og sju serverfiler.
- Konfigurasjonsfilene firebase.json og functions/package.json er gyldig JSON. Functions har bare de to foreskrevne avhengighetene; node_modules og package-lock er ikke opprettet.
- Serveradapteren testes med lokale Functions/Admin-stubber. Tests dekker autentisering, medlemskap, transaksjonsstien, 11./41. kall, ingen AI etter grense og at loggene ikke inneholder tekst, e-post eller nøkkel.
- DNS, HTTP-socket og AI-fetch er stubbet. Tests dekker private adresser og varianter av IP-vertsnavn, privat omdirigering, omdirigeringsgrense, innholdstype, streamingstørrelse og avbrutt DNS. AI-forsøkene bruker samme AbortSignal/budsjett.
- Rene tester dekker JSON-LD, tekstuttrekk, normalisering, feltgrenser og found:false. Klienttester dekker success, NEEDS_TEXT, feil og offline uten SDK-lasting.
- Appens faktiske importfunksjon kjøres i lokal VM: ny/eksisterende, ja/nei på erstatning, urørt lagring/synk, input under venting og sene svar etter avbrudd. Render-testene dekker importseksjon, tekstfelt, deaktiverte knapper og detaljsnarvei.
- Eksisterende testpakke for vanlig lagring, innlogging, gjenoppretting, synk, ukeplan og handleliste består. Versjonsvakten tillater 96 og blokkerer 97; oppsettsmarkøren er fortsatt 95.
- Kontroller kjørt med lokal Node v24.15.0. Distribusjonen er deklarert for Node 22, men er ikke kjørt med installerte Firebase-avhengigheter eller faktisk Node 22-runtime her.

## Implementeringsvalg og gjenstående akseptanse

De godkjente presiseringene er fulgt. Ingen endring i måltidsformat eller vanlig Lagre-flyt. Endringen i restore-modulen gjelder bare versjonsvakten: aktuell appversjon gis som parameter, mens minimumet som skrives er uendret.

Adressevernet avviser også innebygde URL-brukernavn/passord, andre porter enn standard https-port og flere reserverte nett enn minimumslisten. Kategorienøkler begrenses til 80 tegn, labels til 120 og enhetsnavn til 40 for å begrense inndata til AI. JSON-LD-felt begrenses til relevant oppskriftsinnhold før AI. Dette er ekstra validering; eksisterende vanlige kategorier og enheter passer innenfor grensene. SourceUrl i tekstmodus kan være en offentlig http/https-lenke, også en sosial lenke; den hentes ikke.

Modellnavnet gpt-5.6-luna er implementert som bestilt standard, men tilgjengeligheten i OpenAI API er ikke verifisert uten nettverk. Eier må kontrollere dette ved publisering og kan velge modell med OPENAI_RECIPE_MODEL. Reell secret, Firebase-deploy, URL-henting, språk/konverteringskvalitet og Google/Firebase-kall er ikke testet mot tjenestene.

Følg FIREBASE_OPPSETT.md for installasjon/secret/deploy før appen publiseres. Etter publisering må alle åtte akseptansepunktene testes, særlig godt.no/tine.no, Instagram-bildetekst, engelsk cups-oppskrift, side uten oppskrift, erstatningsspørsmål, Avbryt, detaljsnarvei og vanlig synk etter Lagre.

## Filer som skal med i GitHub Desktop

Totalt 40 filer: 21 endrede og 19 nye. Ingen filer er slettet.

| Mappe | Endrede filer | Nye filer |
| --- | --- | --- |
| Rot | .gitignore, AGENTS.md, app.js, firebase.json, index.html, README.md, service-worker.js, styles.css | — |
| src/domain | meals.js | recipe-import.js |
| src/render | meals.js | — |
| src/sync | firebase.js, restore.js | recipe-import.js |
| tests/app | access-startup.test.mjs, workflows.test.mjs | recipe-import.test.mjs |
| tests/domain | — | recipe-import.test.mjs |
| tests/render | meals.test.mjs | — |
| tests/sync | firebase.test.mjs, restore.test.mjs | recipe-import.test.mjs |
| functions | — | index.js, package.json |
| functions/lib | — | addresses.js, ai.js, core.js, extract.js, import.js, transport.js |
| functions/tests | — | addresses.test.cjs, core.test.cjs, extract.test.cjs, import.test.cjs, index.test.cjs |
| docs | ARCHITECTURE.md, STATE_MODEL.md, FIREBASE_OPPSETT.md, RELEASE.md | LEVERANSE_V96.md |

Commit kildekode, tester og dokumentasjon samlet i GitHub Desktop. Eier installerer/publiserer functions separat med Firebase CLI; GitHub Pages publiserer bare klientfilene. node_modules, lokale miljøfiler og API-secret skal ikke med i repoet.
