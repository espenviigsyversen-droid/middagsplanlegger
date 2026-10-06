# Leveranse v98 – ingrediensgrupper og robust import

Dato: 2026-10-06. v97 er publisert og i bruk. Appversjon, HTML-parametre, cache-navn og versjonsvakt er oppdatert til v98/98.

## Leveransen

- Ingredienser beholder valgfri group (trimmet, maks 60 tegn, utelatt når tom) gjennom normalisering, eksportformat 1, gjenoppretting og eksisterende meals-writes. Dokumentstruktur og regler er uendret.
- Sammenhengende grupper får én overskrift i oppskriftsvisningen. Navnet før første komma er fet skrift, kommentaren vanlig skrift.
- Editorens overskriftsrader har fullt tekstfelt og flytt-/fjernknapper. Legg til overskrift ligger sammen med Legg til ingrediens. Nærmeste overskrift bestemmer gruppen; en blank overskrift starter en ugruppert del og lagres ikke. Fjernes den, brukes gruppen over. Utkastet bevares ved render, stegimport og AI-innstillinger; ved ingredienserstatning følger overskriftene importens innhold. Knapper har 44 px trykkflate og raden tilpasser seg smal skjerm.
- Oppskriftsgenererte handlevarer, keyIngredients, oppslag og forslag/søk bruker ingredientBaseName. Lagret ingrediensnavn og manuelt skrevet varenavn beholdes. Like grunnnavn/enheter summeres på tvers av grupper.
- parseAmount er uendret. Intervallhjelperne godtar bindestrek/tankestrek, desimaler og brøker, skalerer begge ender og bruker maksimum i handlelisten/summeringen. Uten skalering vises teksten som lagret.
- Serverinstruks og normalisering støtter group og intervaller, bruker recipeYield/porsjonstekst, tømmer enhet ved tom/ugyldig mengde og rydder emojier/emneknagger/tittelgjentakelse i beskrivelse. En felles gruppe på alle ingredienser fjernes. Nye felt er tillegg og baseServings er fortsatt numerisk for v97.
- Uttrekk bevarer bokstavelig < når neste tegn ikke kan starte en tagg, bevarer header/footer inne i main/article, forsøker på nytt med navigasjon beholdt under 500 tegn og inkluderer inntil 500 tegn foran første oppskriftssignal. Grenser, SSRF-vern, kvoter, nøkkelhåndtering og logger beholdes.

## Minimumsversjon

En online administrator med v98 og initialisert database hever et lavere app/meta.minAppVersion til 98 med én best-effort updateDoc per oppstart. Ved feil fortsetter appen uten feilmelding og prøver igjen ved neste oppstart. Vanlige medlemmer og offline-økter gjør ingen slik skriving. Restore skriver minimum 98 til slutt.

Eldre klienter kan fjerne group ved lagring og får oppdateringsskjerm når de leser minimum 98. Offline-klienter kjenner bare sist bekreftede minimum og starter ingen synk. Åpne administratorens v98 på nett først, deretter oppdater de øvrige enhetene på nett. Ingen automatisk datamigrering eller sletting er innført.

## K6 – hva testene fant

Det ble ikke funnet noen feil i porsjonsoverføringen når importresponsen har baseServings 4 og servingsKnown true. En eksisterende oppskrift med baseServings 5 og tomme ingredienser viser 4 i editorens Porsjoner-felt og lagres med 4. Dette er også bekreftet via dagens Hent fra lenke-hendelse og ved bekreftet erstatning av eksisterende ingredienser. Testene følger rendererens feltverdi videre til FormData og den eksisterende saveMealFromForm-flyten.

Hent fra lenke-hendelsen venter nå også på startRecipeImport, slik at den asynkrone hendelsesflyten fullføres sammen med importen. Selve reglene for porsjoner er beholdt: ved servingsKnown false endres ikke feltet. Serverinstruksen er gjort tydeligere om recipeYield og tekst med porsjonsantall. Den rapporterte kilden er ikke hentet eller AI-testet i denne oppgaven, så det kan ikke fastslås hvilket serversvar som ga det tidligere 5-tallet.

## Endrede filer per mappe – tas med i GitHub Desktop

- Rot: AGENTS.md, app.js, index.html, service-worker.js, styles.css.
- src/domain: meals.js, shopping.js.
- src/render: meals.js.
- src/sync: access.js, restore.js.
- functions/lib: ai.js, core.js, extract.js.
- functions/tests: core.test.cjs, extract.test.cjs, import.test.cjs.
- tests/app: access-startup.test.mjs, ai-key.test.mjs, recipe-import.test.mjs, workflows.test.mjs.
- tests/domain: backup.test.mjs, meals.test.mjs, recipe-import.test.mjs, shopping.test.mjs.
- tests/render: meals.test.mjs.
- tests/sync: access.test.mjs, restore.test.mjs.
- docs: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md og LEVERANSE_V98.md (ny).

30 eksisterende filer er endret og én rapport er ny. Ingen filer er slettet. Ingen nye avhengigheter, installasjon eller klientmoduler. Eksisterende applyImportedRecipe kopierer allerede ingrediensfeltene, inkludert group; dette er nå testet, og normalisering/editor bevarer feltet. Ingen endring i service worker-strategi eller behov for nye asset-oppføringer.

## Lokale kontroller

Alle 36 testskript bestod, og node --check av alle 33 kildefiler bestod før publisering. Dekning: gruppenormalisering, overskriftsvisning/escaping, editorens legg til/flytt/fjern/tom overskrift, utkast gjennom stegimport/AI-innstillinger, importerte grupper, eksport/restore, administratorheving og v97-blokkering, grunnnavn/summering/vareoppslag, intervaller/skalering, serveropprydding, S3 og K6. Ingen test bruker nettverk eller kopiert nettsideinnhold.

Ytelsestesten på 1,5 MB med 20 000 uavsluttede starttagger brukte cirka 7 ms (krav under 2 sekunder). V97-fixturene er beholdt. Én tidligere forventning om fjernet navigasjon på en side under 500 tegn måtte endres til beholdt navigasjon, som følger den nye S3-regelen; script/style fjernes fortsatt. Øvrige uttrekksfixturer består.

## D – serverpublisering

Publisert 2026-10-06 med Firebase CLI 15.18.0 og eksisterende sikkerhetshjelper: `firebase deploy --only functions --project middagsplanlegger-6db4e`. Ingen installasjon eller endring av avhengigheter var nødvendig.

Første forsøk lastet opp kildepakken, men den lokale CLI-prosessen avsluttet uten «Deploy complete», med exit-kode -1073740791 (0xC0000409) og ingen Firebase-feiltekst. Lesekontroll av functions:list og CLI-ens kildehashalgoritme viste at importRecipe og aiKeyStatus hadde den nye pakken, mens de tre øvrige fortsatt hadde forrige pakke. Samme kommando ble derfor kjørt én gang til uten interaktiv terminal. Firebase hoppet over de to ferdige funksjonene, oppdaterte aiKeySave, aiKeyTest og aiKeyDelete og bekreftet «Deploy complete» med exit-kode 0.

Etterkontrollen med functions:list bekreftet følgende. Alle fem kildehashene samsvarte med den lokale v98-pakken; kontrollen brukte bare lokale filhash og metadata, uten å lese hemmelighetsverdier eller kalle funksjonene.

| Funksjon | Status | Generasjon | Region | Runtime | Lokal v98-kilde bekreftet |
| --- | --- | --- | --- | --- | --- |
| importRecipe | ACTIVE | 2 | europe-west1 | nodejs22 | Ja |
| aiKeyStatus | ACTIVE | 2 | europe-west1 | nodejs22 | Ja |
| aiKeySave | ACTIVE | 2 | europe-west1 | nodejs22 | Ja |
| aiKeyTest | ACTIVE | 2 | europe-west1 | nodejs22 | Ja |
| aiKeyDelete | ACTIVE | 2 | europe-west1 | nodejs22 | Ja |

Uinnlogget POST til aiKeyStatus med `{"data":{}}` ga HTTP 401 og `{"error":{"message":"Innlogging eller tilgang mangler.","status":"UNAUTHENTICATED"}}`.

Ingen Git-kommandoer, regelpublisering, --force, sletting i Firebase eller hemmelighetskommandoer ble brukt. KEY_ENCRYPTION_SECRET er urørt; ingen hemmelighetsverdi ble lest, vist eller lagret. aiKeySave/importRecipe ble ikke kalt i skyen. Ingen virkelig oppskriftsside eller AI-kall ble brukt, og intet sideinnhold ble lagret. Den midlertidige lokale hashkontrollfilen er slettet; eksisterende ignorerte sikkerhetshjelper beholdes. Ingen nye filer utenfor prosjektmappen inngår i arbeidet.

## Avvik og manuell kontroll

Ingen funksjonelle avvik. Den ene testforventningen er oppdatert i tråd med S3, med fixtureinnholdet uendret. Funksjonell import med virkelig AI, synk mellom enheter og visuell kontroll på ekte PC/iPhone gjenstår etter eiers apppublisering. Eier håndterer commit og apppublisering i GitHub Desktop.
