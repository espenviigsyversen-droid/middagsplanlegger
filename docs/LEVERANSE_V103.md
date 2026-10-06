# Leveranse v103 – smårettinger etter bildeimport

Dato: 2026-10-06. v102 er bekreftet publisert og testet av eier. v103-appfilene er ferdige lokalt; eier håndterer commit og apppublisering via GitHub Desktop.

## Resultat

- normalizeAmount fjerner ett innledende ca/ca., cirka, omtrent, omlag, about, approx., approximately eller ~ før vanlig validering. ca. 300 blir 300, ca 2-3 blir 2-3 og omtrent 1/2 blir 1/2. Ord som cab 2 og prefikser uten tall er fortsatt ugyldige. AI instrueres til å gi bare tallet, uten ca.
- En fast enhetstabell normaliserer bokser, poser, pakker/pk, begre, stykk/stykker/stilk/stilker, spiseskje(er), teskje(er), gram, kilo, liter, desiliter og milliliter til de angitte målformene. Sammenligning ignorerer store/små bokstaver og avsluttende punktum; bare enheter i familiens units brukes. Finnes ikke målformen, beholdes ukjent enhet i navnet som før.
- Et innledende enhetsord i name hentes med samme tabell når amount er gyldig, unit er tom og resten av navnet ikke blir tomt. 2 bokser hakkede tomater blir mengde 2, enhet boks og navn hakkede tomater når boks finnes i units. Navnet bokser alene, manglende mengde, eksisterende enhet og manglende målform endres ikke av denne navneflyten.
- Resultat- og erstatningsmeldinger nevner bare fylte/byttede deler. Eksempel: Importert fra bilde: 5 steg. Se over før du lagrer. Ingen 0 ingredienser eller 0 steg. Ingen faktisk endring gir Ingenting ble endret; mens et erstatningsvalg venter vises ingen slik melding.
- Ventende valg har overskriften Ikke alt ble byttet, presis forklaring om hvilke eksisterende deler som står urørt og antall importerte ingredienser/steg i konfliktdelene. Knappene heter Bytt til de importerte og Behold mine. Boksen har tydelig ramme/bakgrunn og rulles inn etter render når et nytt valg dukker opp. Vanlige renders ruller ikke på nytt.
- Lagre mens valget venter lagrer dagens skjema uten dialog. Ingen automatisk erstatning ved lagring. Tomme deler fylles som før, konfliktdeler venter på valget, ingrediensgrupper og porsjoner følger faktisk ingrediensutfylling/erstatning. Ventende svar er fortsatt bare runtime-state og forkastes ved lukking/editor-/kontobytte/ny import. Ingen endring i øvrig v99-importflyt.
- Ukecelleoperasjoner merkes med siste snapshot-løpenummer i flush rett før setDoc, ikke ved kølegging. Et serverbilde som kom i 500 ms-køvinduet kan ikke alene fjerne operasjonen etter kvittering. Et nyere serverbilde uten ventende skrivinger kreves; kvitterings-/bilderekkefølge, overlay, siste operasjon, feil og stopp fungerer som før.
- APP_VERSION, HTML-parametre, CACHE_NAME og numerisk versjonsvakt er v103/103. REQUIRED_MIN_APP_VERSION forblir 101. Ingen datamodell-, Firestore-regel-, kvote-, nøkkel-, timeout-, bilde- eller service worker-strategiendring. Ingen nye moduler/avhengigheter. Serveren støtter fortsatt v102-klienten og publiseres før v103-appfilene.

## Filer per mappe – tas med i GitHub Desktop

- Rot, endret: AGENTS.md, app.js, index.html, service-worker.js, styles.css.
- src/render, endret: meals.js.
- src/sync, endret: weeks.js.
- functions/lib, endret: core.js, ai.js.
- functions/tests, endret: core.test.cjs.
- tests/app, endret: recipe-import.test.mjs, access-startup.test.mjs, workflows.test.mjs.
- tests/render, endret: meals.test.mjs.
- tests/sync, endret: weeks.test.mjs.
- docs, endret: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md. Ny: LEVERANSE_V103.md.

18 eksisterende filer endret og én ny: 19 filstier. Ingen slettede filer. STATE_MODEL.md er også oppdatert slik at beskrivelsen av ukesynkens løpenummer stemmer med rettelsen. functions/index.js, firestore.rules, Firebase-konfigurasjon, avhengigheter/package-lock og src/sync/version.js er uendret.

## Kontroller

Alle 41 testskript under tests/ og functions/tests/ bestod lokalt uten nettverk. node --check av alle 36 kildefiler bestod; oppstartstesten kontrollerer også det innebygde HTML-skriptet. Lokal Node v24.15.0. Ingen installasjon eller nye avhengigheter.

- Mengder: alle godkjente prefikser, store bokstaver, desimal, brøk/intervall, ca alene, cab 2, nullnevner og omvendt intervall.
- Enheter: hele tabellen, store bokstaver/punktum, manglende målform og direkte konfigurert enhet. Navnprefiks bokser/poser/stilker, navn uten rest, uten gyldig mengde eller med enhet fra før. AI-instruksene har de nye føringene.
- Meldinger: bare ingredienser, bare steg, begge og ingen endring. Alle tre konflikttekster, overskrift, antall, knappenavn, kontrolladvarsler, og ingen null-telling.
- App: valgboksen rulles inn én gang når konflikt oppstår, ikke ved vanlige renders eller uten konflikt. Lagring mens valget venter beholder eksisterende konfliktdeler, beholder tomme deler som allerede ble fylt og viser ingen confirm. Dagens utkast-/gruppe-/porsjons-/bilde- og minnelagringstester består.
- Uker: autoritativt bilde under køvinduet fjerner ikke lokal verdi etter kvittering; nyere bilde gjør det. Begge kvitterings-/bilderekkefølger, andre fjernendrede dager og nyere lokal operasjon kontrolleres. Alle øvrige synk-, tilgangs-, backup-/restore- og servertester består.

## Serverpublisering – del D

Firebase CLI 15.18.0 og eksisterende innlogging er kontrollert; projects:list viser middagsplanlegger-6db4e. Lokal Node v24.15.0; funksjonsruntime forblir Node 22. Eksisterende ignorert .local-tools/firebase-safety.cjs brukes til å holde profilendringer i minnet og unngå debuglogger. Ingen installasjon eller ny innlogging.

Publisert 2026-10-06 gjennom sikkerhetshjelperen med bare:

```text
firebase deploy --only functions --project middagsplanlegger-6db4e
```

Første og eneste deployforsøk oppdaterte alle fem funksjonene og ga «Deploy complete!» med exitkode 0. Ingen retry, slettingsspørsmål eller endring av artifact-policy var nødvendig. Ingen appfiler eller regler ble publisert.

functions:list --project middagsplanlegger-6db4e bekreftet:

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

Kontrollen bekrefter callable-transport og avvisning uten innlogging, ikke innlogget import. Ingen aiKeySave/importRecipe-kall eller OpenAI-kall er utført i skyen.

Ingen Git-kommandoer, regelpublisering, --force, slettingskommandoer eller secrets:set/access er brukt. firestore.rules og KEY_ENCRYPTION_SECRET er urørt. Ingen nøkkel, ekte bilder eller sideinnhold er vist/lagret/logget. Ingen midlertidig hemmelighetsfil eller firebase-debug.log ble opprettet.

## Avvik og gjenstående kontroll

Ingen funksjonelle avvik fra utviklerbeskjeden. STATE_MODEL.md ble i tillegg rettet for å dokumentere den endrede flush-referansen. Ingen bilde-/sideinnhold fra ekte kilder er brukt i tester; alle data er syntetiske.

Eier publiserer v103-appfilene samlet og kontrollerer tydelighet/automatisk rulling på ekte PC/iPhone, import med omtrentlige mengder/bøyde enheter og ukesynk på to enheter. Agenten gjør ikke innlogget import- eller nøkkelkall i skyen. Se RELEASE.md for akseptansen.
