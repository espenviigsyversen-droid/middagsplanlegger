# Leveranse v99 – importvalg, blandede tall og porsjonsfelt

Dato: 2026-10-06. v98 er publisert og i bruk. v99 er ferdig lokalt, men er ikke publisert av agenten.

## Resultat

- Importflyten bruker synlige knapper i importpanelet i stedet for window.confirm etter et asynkront svar. Tomme ingrediens-/stegdeler fylles straks. Konfliktdeler venter på «Erstatt med det importerte» eller «Behold det jeg har», og teksten nevner bare de delene som er i konflikt. Hent/Tolk tekst er fortsatt tilgjengelige mens valget venter.
- Erstatt leser skjemaet på nytt og bytter bare konfliktdelene. Andre redigeringer, inkludert utfylte metadata i nye utkast og endringer i den andre delen, beholdes. Importerte ingredienser beholder gruppeoverskrifter. Kjente oppskriftsporsjoner følger ingrediensene. Meldingen teller bare det som ble erstattet. Behold forkaster resultatet og viser «Ingenting ble erstattet.»; allerede utfylte tomme deler blir stående.
- recipeImportState.pending er bare i minnet. Lukking, annen oppskrift, ny import, konto-/tilgangsendring og stopp av synk forkaster det ventende resultatet. Vanlig rendering beholder valget. Sene serversvar er fortsatt bundet til importnummer, bruker, synkøkt og editor.
- Ingen melding sier «0 ingredienser og 0 steg». Når ingenting endres, vises «Ingenting ble endret.» Hvis bare metadata fylles, vises en melding uten nulltelling. Serveradvarsler og veiledning for manglende del beholdes.
- parseAmount godtar 2 1/2, 2½, 2 ½ og ½/¼/¾, i tillegg til tidligere desimaler og enkle brøker. parseAmountRange bruker samme tolking i hver ende. Skalering og handleliste fra enkeltoppskrift/ukeplan bruker tallverdiene; 2 1/2 + 1 blir 3.5 i handlelisten. Ugyldig tekst og nullnevner gir fortsatt null.
- Editorens ledetekst er «Porsjoner i oppskriften», med hjelpeteksten «Antallet mengdene er beregnet for. Ukeplan og handleliste regner om til familiens størrelse.» Hjelpen er knyttet til input med aria-describedby. baseServings og teksten i oppskriftsvisningen er uendret.
- APP_VERSION er v99, appens numeriske versjonsvakt er 99, index.html bruker v99-parametre og CACHE_NAME er middagsplan-v99. minAppVersion, administratorheving og gjenoppretting beholder minimum 98.

## Endrede filer per mappe – tas med i GitHub Desktop

- Rot: AGENTS.md, app.js, index.html, service-worker.js, styles.css.
- src/domain: shopping.js.
- src/render: meals.js.
- tests/app: access-startup.test.mjs, recipe-import.test.mjs, workflows.test.mjs.
- tests/domain: shopping.test.mjs.
- tests/render: meals.test.mjs.
- docs: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md og LEVERANSE_V99.md (ny).

15 eksisterende filer er endret, én rapport er ny, ingen filer er slettet. Ingen nye avhengigheter eller klientmoduler; eksisterende asset-lister og service worker-strategi beholdes.

## Kontroller

Alle 36 testskript under tests/ og functions/tests/ bestod. node --check av alle 33 kildefiler bestod, inkludert app.js, service-worker.js og functions. Oppstartstesten kontrollerer også syntaksen i det innebygde HTML-skriptet. Alle kontroller bruker lokale stubber/syntetiske data uten nettverk.

Dekningen omfatter:

- Konflikt i begge deler: ingen native confirm, eksisterende ingredienser/steg/porsjoner beholdes til valget. Erstatt-knappen bytter begge deler og porsjoner; Behold-knappen bevarer dem. Knapper testes gjennom dagens hendelsesbinding.
- Konflikt bare i ingredienser eller steg: den tomme delen fylles straks, valget og tellingen gjelder bare konfliktdelen. Dette testes også på nye oppskrifter. Skjemaendringer mens valget venter leses og bevares, også når brukeren har fjernet en ikke-konfliktdel.
- Vanlig rendering beholder valget; lukking, oppskriftsbytte, kontobytte, avvist tilgang, synkøktendring/stopp og ny import forkaster det. Et mislykket nytt kall gjenoppretter ikke det gamle resultatet.
- Unike ingrediens-/stegmarkører i den ventende responsen finnes ikke i state, syncPayload, localStorage eller sikkerhetskopi, heller ikke etter ordinær saveState. Importen og valget lager ingen ventende domenesynk.
- Blandede tall, brøktegn, desimaler, intervallender, ugyldig tekst/nullnevner, skalering, summering og faktisk varegenerering fra enkeltoppskrift/ukeplan.
- Ny porsjonsledetekst/hjelpetekst, tilgjengelighet, synlige valg og advarsler. Eksisterende gruppe-, porsjonsimport-, synk-, backup- og restore-tester består.
- Blokkeringsfixturene er hevet til minAppVersion 100, siden 99 nå er gjeldende appversjon. Minimumet som appen skriver, er fortsatt 98.

Skalering av 2 1/2 fra 4 til 5 gir tallverdien 3,125. Oppskriftsvisningen viser 3,25 med den eksisterende avrundingen til kvarte enheter. Avrunding og handlelistens tallformatering er bevisst beholdt; dette er ikke en endring i datamodellen.

## Omfang og publisering

Ingen endring i functions, Firestore-regler, dokumentstruktur, synkbeskyttelse eller minimum 98. En lokal hashkontroll av alle 20 filer i functions-kildepakken ga samme hash som ved v98-publiseringen: 8cdd89dbba0d45752258fb4dc9ef8ddaf327441f. Ingen Git-kommandoer, nettverk, installasjon eller publisering ble brukt. Skrivtestfilen er slettet.

Ingen funksjonelle avvik fra beskjeden. Eier håndterer commit/app-publisering i GitHub Desktop. Kontroll på ekte PC/iPhone, særlig import etter bakgrunnsventing, gjenstår etter app-publisering. Se «Utrulling av v99» i RELEASE.md.
