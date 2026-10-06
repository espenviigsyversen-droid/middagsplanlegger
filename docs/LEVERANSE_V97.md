# Leveranse v97 – delvis oppskriftsimport

Dato: 2026-10-06. v96 er publisert og i bruk. Appen er oppdatert til v97/97; minimum ved databaseoppsett er fortsatt 95.

## Endringer

Mangelfull JSON-LD kombineres med renset sidetekst. Store select/datalist-blokker og øvrige støyblokker fjernes, form beholdes og main prioriteres når den gir minst 500 tegn. Lengre tekst får et sammenhengende vindu med flest oppskriftssignaler, med sidetittel først. Sidetekst er maks 16 000 tegn og samlet AI-inndata maks 20 000. Én ingrediensstreng beholdes inntil 2000 tegn. Fullstendig JSON-LD bruker fortsatt jsonld.

AI-instruksen støtter structured/pageText, tom tittel og delvis innhold. Output-grensen er 8000 tokens med samme samlede 45 sekunders tidsbudsjett. Serveren godtar innhold med bare ingredienser eller bare steg og avviser tomt oppskriftsinnhold. servingsKnown er et tillegg i importresponsen; baseServings er alltid numerisk, også for v96. Logger har en fast kildeverdi og begrenset reason ved AI_INVALID_RESPONSE, uten innhold eller hemmeligheter.

Klienten fyller ingredienser og steg hver for seg og spør bare om overlappende deler, også i nye oppskrifter. Manglende deler og et nei beholder eksisterende innhold; tomme deler fylles likevel. Porsjoner byttes bare sammen med ingredienser når antallet er kjent. Utfylt metadata tømmes aldri av en tom importverdi. Meldingen viser faktisk antall fylte ingredienser/steg og foreslår tekstimport for det som mangler. Lagring skjer bare med dagens Lagre-knapp.

Datamodell, Firestore-regler, synk, innlogging, kvoter, nøkkelhåndtering, SSRF-vern, avhengigheter og service worker-strategi er uendret. servingsKnown lagres ikke i meals eller sikkerhetskopien.

## Endrede filer per mappe (tas med i GitHub Desktop)

- Rot: AGENTS.md, app.js, index.html, service-worker.js.
- src/domain: recipe-import.js.
- functions/lib: extract.js, ai.js, core.js, import.js.
- functions/tests: core.test.cjs, diagnostics.test.cjs, extract.test.cjs, import.test.cjs, index.test.cjs, logging.test.cjs.
- tests/app: access-startup.test.mjs, recipe-import.test.mjs, workflows.test.mjs.
- tests/domain: recipe-import.test.mjs.
- docs: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md, LEVERANSE_V97.md (ny).

Ingen filer er slettet. Ingen ny modul eller avhengighet; functions/package-lock.json er uendret fra forrige leveranse. Den eksisterende ignorerte sikkerhetshjelperen brukes lokalt og skal ikke lastes opp. Eier håndterer commit og publisering av appfilene.

## Lokale kontroller

Alle 36 testskript under tests/ og functions/tests/ bestod, og node --check av alle 33 kildefiler bestod før serverpublisering. Testene bruker lokale stubber og syntetiske sider, uten nettverk. De dekker JSON-LD-varianter, støy med tusenvis av option-elementer, main/form, oppskrift etter 80 000 tegn, grenser, delvise svar og alle kombinasjoner av tomme/utfylte deler med/uten erstatning. Appkontrollene bekrefter ingen bekreftelse for stegimport inn i utkast med bare ingredienser, utfylling ved nei, antall faktisk fylte deler, porsjonsfeltet og ingen lokal/remote lagring under import.

Ytelse for 1,5 MB med 20 000 uavsluttede starttagger var cirka 4 ms, godt under kravet på 2 sekunder. En ekstra test beskytter mot gjentatt signalmatching i lange tallrekker.

## S6 – godkjent engangskontroll uten AI

Bare følgende måleresultater fra lokal fetchPage/extractPage er beholdt:

| Kontroll | Resultat |
| --- | --- |
| source | jsonld+page-text |
| Inndatalengde | 9184 tegn |
| Inneholder «300 g» | Ja |
| Inneholder «Fres alle» | Ja |
| Inneholder «Skrell mandelpotetene» | Ja |
| Inneholder ikke «akasiehonning» | Ja |

Siden ble bare behandlet i minnet. Ingen AI-kall eller lagring av sideinnhold i repo, tester eller rapport.

## D – serverpublisering

Firebase CLI 15.18.0 publiserte serveren 2026-10-06 med den eksisterende ignorerte sikkerhetshjelperen:

```powershell
firebase deploy --only functions --project middagsplanlegger-6db4e
```

Første forsøk lyktes, med exit code 0 og «Deploy complete!». Alle fem funksjoner ble oppdatert. Ingen installasjon, ny avhengighet eller hemmelighetskommando ble kjørt.

Etterkontroll med `firebase functions:list --project middagsplanlegger-6db4e` bekreftet:

| Funksjon | Generasjon | Type | Region | Runtime |
| --- | --- | --- | --- | --- |
| importRecipe | v2 | callable | europe-west1 | nodejs22 |
| aiKeyStatus | v2 | callable | europe-west1 | nodejs22 |
| aiKeySave | v2 | callable | europe-west1 | nodejs22 |
| aiKeyTest | v2 | callable | europe-west1 | nodejs22 |
| aiKeyDelete | v2 | callable | europe-west1 | nodejs22 |

Uinnlogget POST til aiKeyStatus med JSON `{ "data": {} }` ga HTTP 401:

```json
{"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}
```

Ingen Git-kommandoer, regelpublisering, --force eller sletting i Firebase er utført. KEY_ENCRYPTION_SECRET er urørt; secrets:set og secrets:access er ikke kjørt. aiKeySave og importRecipe er ikke kalt i skyen. Ingen OpenAI-kall er utført. Sideinnholdet fra S6 er ikke lagret, og ingen midlertidig innholds-/hemmelighetsfil er opprettet. Sikkerhetshjelperen hindrer varig lagring av CLI-profilendringer og debug-request-bodies; ingen firebase-debug-logg ble opprettet.

## Avvik og etterkontroll

Ingen avvik fra beskjeden. STATE_MODEL.md er også presisert for aktuell versjonsvakt og det midlertidige servingsKnown-feltet. 22 eksisterende filer er endret og én rapportfil er ny; ingen filer er slettet. Reell AI-tolking og funksjonell PC/iPhone-akseptanse krever eiers kontroll etter apppublisering. Serveren er publisert; appfilene gjenstår å publisere med GitHub Desktop.
