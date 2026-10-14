# Leveranse v118 – kildelenke, Rediger og jevne skjemarader

Dato: 14. oktober 2026. Utgangspunkt: publisert v117.

## Resultat

Oppskriften viser nå en kildelenke under eventuell beskrivelse og over porsjonene, bare for adresser som kan tolkes med new URL og har protokoll http: eller https:. Vertsnavnet vises uten www.; Instagram, Facebook/fb.watch og TikTok, inkludert underdomener, vises med plattformnavn. Ugyldig, annen protokoll eller manglende recipeUrl gir ingen lenke. Lagret adresse og kildefeltet i editoren endres ikke.

Lenken er en native a med den tolkede url.href, target="_blank", rel="noopener" og aria-label om ny fane. Den har 14 px tekst, vekt 600 og brand-farge, et 16 px lenkeikon og en 12 px SVG-pil. Understrek vises bare ved hover/fokus. Trykkflaten er 44 px høy; tekstlinjen er fortsatt 20 px.

Toppstripen har Rediger direkte, med 16 px fet grønn tekst og minst 44 px høy trykkflate. Den gamle oppskriftsmenyen er fjernet, inkludert rendering, runtime-flagg, hendelser, historikknivå, fokusvern og rullenøkkel. Hent fra lenke-snarveien er fjernet. Rediger åpner v117-editoren med åpent, utfylt importkort når oppskriften har kilde uten ingredienser/steg; ingen henting starter automatisk. Uten ingredienser er hovedknappen fortsatt Legg inn oppskrift.

PC-forskyvningen skyldtes standard stretching i det ytre form-row-rutenettet og fordelingen av ledig høyde i setting-kolonnene. Bare editorens PC-regler ved min-width:861px er endret: align-items:start på raden og align-content:start på direkte kolonner. Etiketter og felt starter på linje, og hjelpetekst strekker ikke nabofelt. Mobilens én kolonne er uendret.

Bilderutenes fjern-knapp har en transparent 44×44 px trykkflate og en sentrert 26 px mørk sirkel med hvit 14 px ×. Den synlige sirkelen ligger 4 px fra rutens øvre/høyre kant. Ingen endring i bildevalg, fjerning eller importdata.

## Endrede filer per mappe

### Roten

| Fil | Endring |
|---|---|
| app.js | v118/118. Fjerner oppskriftsmenyens runtime-/historikk-/tilbake-/fokus-/hendelseskode og ubrukt automatisk Hent fra lenke-snarvei. Eksisterende Rediger-handler brukes videre. |
| styles.css | Kildelenke og Rediger-tekstknapp, PC-avgrenset radjustering og liten synlig bildesirkel med beholdt trykkflate. |
| index.html | Alle tre versjonsparametre til 118. |
| service-worker.js | Cache-navn middagsplan-v118; fillister og strategi er ellers uendret. |
| AGENTS.md | Oppdaterte regler for toppstripe, fjernet oppskriftsmeny, kildelenke, PC-rader og bilderutenes trykkflate. |

### src/render

| Fil | Endring |
|---|---|
| meals.js | Kildelenke med verts-/plattformnavn og SVG-ikoner. Direkte Rediger i toppstripen. Menyrendering fjernet. |
| recipe-import.js | × ligger i egen aria-hidden span, slik at den synlige sirkelen kan være mindre enn knappen. |

### src/domain

| Fil | Endring |
|---|---|
| meals.js | Felles recipeSourceUrl kontrollerer lenkeprotokoll ved visning uten å endre lagrede kilder. Tilføyd i rettingen før publisering. |

### tests/domain

| Fil | Endring |
|---|---|
| meals.test.mjs | http/https, kanonisk href og avvisning av javascript/data/andre protokoller, tomme og ugyldige kilder. Tilføyd i rettingen før publisering. |

### tests/render

| Fil | Endring |
|---|---|
| meals.test.mjs | Kildens navn, sosiale underdomener og falske vertstreff, ugyldig/ingen kilde, href/target/rel/aria-label og plassering før porsjoner. Direkte Rediger uten meny. CSS-kontroller for kilde, PC-rader og bildesirkel/trykkflate. |

### tests/app

| Fil | Endring |
|---|---|
| navigation.test.mjs | Direkte Rediger erstatter oppskriftsnivået med editorvern uten menynivå. Menytestene er fjernet; andre vinduer, tilbake, forkastingsvern og historikkgjenbruk testes fortsatt. |
| recipe-import.test.mjs | Den gamle Hent fra lenke-inngangen erstattes av Rediger → åpent kort med kilde → eksplisitt Hent. Ingen automatisk forespørsel ved åpning. Porsjons-/lagringstesten og øvrige importtester beholdes. |
| access-startup.test.mjs | Blokkeringsfixture 119, over aktuell versjon. Minsteversjonen er uendret. |
| workflows.test.mjs | Forventet sikkerhetskopi-appversjon v118; formatet er uendret. |

### docs

| Fil | Status og endring |
|---|---|
| ARCHITECTURE.md | Kildelenke, direkte Rediger, fjernet menynivå og årsak/løsning for PC-strekk. |
| RELEASE.md | Kontrollpunkter etter eiers publisering. |
| LEVERANSE_V118.md | Ny: denne rapporten. |

Eier tar med **16 endrede filer og denne ene nye rapporten** i GitHub Desktop for hele v118. Ingen slettede prosjektfiler eller nye klientmoduler.

### Retting av kildelenker før publisering

Denne avgrensede rettingen endrer åtte filer: src/domain/meals.js, src/render/meals.js, tests/domain/meals.test.mjs, tests/render/meals.test.mjs, AGENTS.md, docs/ARCHITECTURE.md, docs/RELEASE.md og denne rapporten. Versjon, CSS, app.js og øvrig v118-flyt er urørt i rettingen.

Gjennomgang av app.js, src/ og index.html fant **ett aktivt sted der recipeUrl brukes som href**: renderRecipeSourceLink i src/render/meals.js. Det bruker nå felles recipeSourceUrl og url.href. Ingen andre oppskriftskilder brukes som href; den tidligere oppskriftsmenyen er allerede fjernet. app.js sin link.href gjelder nedlasting av sikkerhetskopi fra en lokal Blob-URL og bruker ikke recipeUrl. index.html sine href gjelder statiske assets.

Tester bekrefter at javascript:alert(1), data:text/html, andre protokoller, tom tekst og ugyldige adresser ikke gir lenke, mens http/https gir tolket href, inkludert normalisert vert, port og mellomrom. Kilde (lenke) viser fortsatt nøyaktig lagret tekst; rendering endrer ikke data. Alle 52 testskript og 44 syntakskontroller består etter rettingen.

## Kontrollresultater

- Alle **52 testskript** under tests/ og functions/tests/ består uten nettverk.
- **44 kildefiler** består node --check: app.js, service-worker.js, alle src-moduler, functions/index.js og functions/lib. Functions er kontrollert, ikke endret.
- Oppstartstesten kontrollerer også det innebygde HTML-skriptets syntaks. CSS har balanserte klammer.
- App/cache/HTML er v118/118. REQUIRED_MIN_APP_VERSION er fortsatt 106.
- Ingen oppskriftsmeny, menynivå eller rullenøkkel finnes lenger i app.js eller src/. Editorens radmeny og øvrige vinduer fungerer fortsatt i testene.

### Lokal nettleserkontroll

Skjema og oppskrift ble tegnet i lokal headless Chrome ved **1280 px** og **375 px**, med syntetisk oppskrift og CSS lest direkte fra prosjektet. Nettverk var blokkert; kontrollen registrerte **0 forespørsler**. Det ble ikke lastet noen app fra nettet, startet Firebase eller åpnet en ekstern kildelenke. Skjermbilder ble inspisert lokalt, og midlertidig kontrollskript/nettleserprofil/skjermbilder er slettet.

Alle fire form-row-rader på PC er kontrollert:

| Rad | Resultat ved 1280 px |
|---|---|
| Navn / Porsjoner i oppskriften | Etikettstart og feltstart identiske, forskjell 0 px. Begge inputfelt er 42 px høye, selv med hjelpetekst bare under porsjoner. |
| Tilberedningstid | Enkeltkolonne i to-kolonne-raden, feltet har naturlig høyde 43 px uten strekk. |
| Kategorier / Merking | Etikettstart og første boks i begge kolonner identiske, forskjell 0 px. Testet med ulike antall bokser og tekst som går over flere linjer. |
| Rester / Minimum dager mellom | Etikettstart og feltstart identiske, forskjell 0 px. Select/input beholder naturlig høyde 43/42 px. |

Ved 375 px var form-row én kolonne. Kildelenken målte 44 px høyde med 14 px tekst og ikoner på 16/12 px. Begge bildeknappene målte 44×44 px trykkflate, 26×26 px synlig sirkel og nøyaktig 4 px avstand fra topp/høyre. Visuelt er den lille sirkelen ryddig på begge bredder, og Rediger/kildelenke står som planlagt i oppskriftsvisningen.

Ekte iPhone/Safari, touch, safe-area og åpning av ekstern kildelenke er ikke prøvd. Dette gjenstår etter eiers publisering. Ingen avvik fra beskjeden.

## Rammer

Ingen nettverk, installasjon, publisering eller Git-kommandoer er brukt. Ingen endring i functions/, firestore.rules, datamodell, Firestore-struktur, src/sync/ eller skysynk. Hash-kontroll mot filene ved oppstart bekrefter at functions/, firestore.rules og synkmodulene er uendret. Bare middagsplanlegger er endret; den eksisterende lokale nettleseren og runtime-avhengighetene er brukt uten installasjon.
