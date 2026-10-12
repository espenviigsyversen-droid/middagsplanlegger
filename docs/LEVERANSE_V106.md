# Leveranse v106 – porsjoner, standarddager og avrunding

Dato: 2026-10-12. v105 er utgangspunktet for klientendringene. v106 er ferdig lokalt; eier håndterer commit og apppublisering i GitHub Desktop. Ingen skyovergang eller publisering er kjørt av agenten.

## Resultat

- family.familySize betyr standard antall porsjoner og beholder feltnavnet. En dags tall er eget valg; null/mangler følger standarden. Alle ukedefaults gir null. Standardendring virker straks i planlegger, oppskrift og handleberegning uten nytt ukesnapshot. En dag satt lik standarden lagres som null.
- Innstillinger og dagsark bruker de bestilte porsjonstekstene. Dagsark viser Følger standarden eller Endret for denne dagen med Bruk standard. Bare dager med eget tall får porsj.-merke i ukeoversikten. Oppskriftseditorens hjelpetekst viser til porsjonene for dagen.
- Oppskriftsvisningen har −/+ mellom 1 og 30. Fra kalender/plan lagres valget på den aktuelle dagen, med dato under teksten. Fra listen starter visningen på standarden og holder et avvik bare i minnet. Legg i handleliste bruker det viste tallet. Lukking/bytte/tilgang forkaster visningsjusteringen.
- Skalerte mengder avrundes etter enhet, med midtpunkt opp og minste positive trinn. Intervaller avrundes i begge ender. Uskalert oppskriftstekst og lagrede oppskrifter beholdes. Handleberegning bruker fortsatt høyeste intervallverdi. Rå bidrag summeres før sluttavrunding; sammenslåtte ukebidrag med telte/egne/tomme enheter rundes opp til hele tall. Eksisterende handlevarer omavrundes ikke.
- Administratorens overgang venter på serverbekreftet minimum 106, familieprofil og autoritativt ukebilde. Bare aktuelle/fremtidige uker: 5 eller gjeldende standard blir null; andre tall og historiske uker beholdes. Vanlig ukesynk skriver per felt/dag. Merket settes først etter SDK-kvitteringer og en ny metakontroll. Stopp/avvisning avbryter uten merke. Delvis skriving kan gjentas ved neste oppstart.
- Backup v106 fyller null for manglende standarddager. Restore godtar null/tall >=1; eldre kopiers tall lik kopiens familySize blir null. Egne tall i nye kopier beholdes. Meta skrives sist med minimum 106 og servingsDefaultsV106:true etter fullført restore.
- APP_VERSION, APP_VERSION_NUMBER, HTML-parametre, cache og REQUIRED_MIN_APP_VERSION er 106. Ny servings-defaults.js ligger i begge asset-listene. Ingen endring i functions, regler, Firestore-stier, oppskriftsfelter eller service worker-strategi. Ukefeltet servings får den dokumenterte nullable betydningen, og meta får overgangsmerket.

## Endrede filer – tas med i GitHub Desktop

### Rot

| Fil | Endring |
| --- | --- |
| AGENTS.md | Regler/testkommandoer for nullable dager, avrunding, minnejustering og overgang; gjeldende minimum 106. |
| app.js | Ett porsjonsoppslag, dagsvalg/reset, visningsjustering, tekster, rå handlebidrag, overgangskobling og serverprofilvern. |
| index.html | Alle versjonsparametre til 106. |
| service-worker.js | Cache v106 og overgangsmodul i begge asset-listene. |
| styles.css | Porsjonskontroller med 44 px trykkflate og mobilvennlig dagsarkhjelp. |

### src/domain

| Fil | Endring |
| --- | --- |
| weeks.js | emptyWeekServings gir null; ren servingsForDay. |
| shopping.js | Enhetstilpasset skalering og avrunding etter aggregering av rå oppskriftsbidrag. |
| backup.js | Eksport v106 fyller null for manglende dager i ukenøkkelunionen. |

### src/sync

| Fil | Endring |
| --- | --- |
| weeks.js | Nullable standardverdier uten familieavhengighet; informasjon om autoritativ levering og waitForWrites med stopp-/feilvern. |
| restore.js | Null-validering, konvertering av eldre backup og meta med minimum/overgangsmerke. |
| version.js | REQUIRED_MIN_APP_VERSION = 106. |
| servings-defaults.js (ny) | Ren overgangspatch og administratorens forsøksflyt med readiness, kvitteringer og serverlest meta. |

### src/render

| Fil | Endring |
| --- | --- |
| setup.js | Porsjoner til vanlig, familieingress, hjelpetekst og oversikt. |
| planner.js | Porsjonsfelt, egen/standard-hjelp, resetknapp og porsj.-merke bare ved eget tall. |
| meals.js | −/+ og virkeområde; enhet videre til skalering; ny editorhjelp. |

### tests/domain

| Fil | Endring |
| --- | --- |
| weeks.test.mjs | Null-defaults og eget/null/manglende porsjonsvalg med live standardendring. |
| shopping.test.mjs | Nye trinn, alle åtte eksempler, intervaller, positive minimum og summering før avrunding. |
| backup.test.mjs | Eksport av null og beholdt eget dagsvalg. |

### tests/sync

| Fil | Endring |
| --- | --- |
| weeks.test.mjs | Null/differ, gamle egne tall og waitForWrites før/etter kvittering, feil og stopp. |
| restore.test.mjs | Nye/eldre kopier, null, validering og minimum/markør. |
| access.test.mjs | Administratorheving til 106, medlem uten heving, v105 blokkert og stille feil/retry. |
| servings-defaults.test.mjs (ny) | Readiness/rolle, idempotens, historiske uker, manglende merke, kvittering og avbrudd. |

### tests/render

| Fil | Endring |
| --- | --- |
| setup.test.mjs | Familie- og oversiktstekster. |
| planner.test.mjs | Eget/standard-dagsark, resetknapp og porsj.-merke. |
| meals.test.mjs | Porsjonstekst, kontroller, scope og min/maks-grense. |

### tests/app

| Fil | Endring |
| --- | --- |
| workflows.test.mjs | Standard uten nytt snapshot, plan/listescope, faktiske knappehendelser, handleberegning og backup-null. |
| weeks-sync.test.mjs | Null ved manglende uke/Tøm uke og effektivt standardoppslag. |
| access-startup.test.mjs | Minimum 106/107-fixturer og virkelig appovergang med to ubekreftede ukeskrivinger før meta/ toast. |

### docs

| Fil | Endring |
| --- | --- |
| ARCHITECTURE.md | Oppslag, visningsminne, rå handlebidrag, overgang og restore. |
| STATE_MODEL.md | Ny feltbetydning, null, minnetilstand, markør og minimum. |
| RELEASE.md | Utrulling, administrator først, verifisering av overgang og enhetstester. |
| FIREBASE_OPPSETT.md | Gjeldende minimum/markør og at ingen server-/regelpublisering trengs. |
| LEVERANSE_V106.md (ny) | Denne rapporten, filoversikt, kontrollresultater og bruksstedskatalog. |

30 eksisterende filer endret og tre nye: 33 filstier. Ingen slettede filer. Filoversikten er kontrollert mot innledende SHA-256-verdier, uten Git. functions/ og firestore.rules er uendret. Den ekstra oppdateringen av FIREBASE_OPPSETT.md dokumenterer nytt oppsettsminimum og restore-markør.

## Kontroller og faktiske avrundinger

Alle 45 testskript under tests/ og functions/tests/ består uten nettverk. node --check av alle 39 kildefiler består; startup-testen kontrollerer også HTML-skriptet. Lokal Node v24.15.0. Ingen installasjon eller nye avhengigheter.

Faktisk resultat fra scaleAmount med oppskrift 4 og visning/dag 5:

| Lagret mengde | Resultat |
| --- | --- |
| 500 g | 625 g |
| 390 g | 500 g |
| 1 stk | 1,5 stk |
| 3 fedd | 4 fedd |
| 3 ss | 4 ss |
| 4 dl | 5 dl |
| 1 uten enhet | 1,5 uten enhet |
| 10 stk | 13 stk |

I tillegg: 390–500 g blir 500–625 g; ½–1 stk blir 0,5–1,5 stk. To rå dagsbidrag på 0,625 stk blir samlet 1,25 og deretter 2 stk. Uskalert 2 1/2 beholdes som 2 1/2. Små positive mengder gir alltid minste positive enhetstrinn. Egne enheter plate/terning/fedd og store/små enhetsbokstaver er testet.

### Retting før publisering – små mengder i g/ml

Fortsatt v106. g/ml bruker nå trinn 0,5 under 10, 1 fra 10 til under 20, 5 fra 20 til under 100, 10 fra 100 til under 250 og 25 fra 250. Minste verdi er 0,5; midtpunkt rundes fortsatt opp. Andre enheter, porsjonsflyt, overgang og lagrede data er uendret. Ingen synlig hjelpetekst i appen beskrev de gamle trinnene; de tre berørte dokumentene er oppdatert.

| Mengde, oppskrift 4 porsjoner | Justert til | Resultat |
| --- | --- | --- |
| 2 g | 5 | 2,5 g |
| 12 g | 6 | 18 g |
| 7 g | 5 | 9 g |
| 18 g | 5 | 25 g (22,5 rundet opp) |

Samme resultater er testet for ml og store enhetsbokstaver. Terskler, midtpunkter, minste positive verdi, intervaller og små summerte ukebidrag er kontrollert. Alle åtte opprinnelige avrundingseksempler gir fortsatt resultatene i tabellen over.

Bare fem filer er endret i denne rettingen: src/domain/shopping.js, tests/domain/shopping.test.mjs, AGENTS.md, docs/ARCHITECTURE.md og docs/LEVERANSE_V106.md. Alle 45 testskript og syntakskontroll av alle 39 kildefiler består uten nettverk. Filene utenfor denne listen er kontrollert uendret mot innledende SHA-256-verdier for rettingen. Ingen versjonsbump, nettverk, installasjon, publisering, Git, functions-/regelendring eller endring av andre mapper.

Apptestene kontrollerer standardendring uten nytt snapshot i oppskrift, dagsark, enkeltoppskrift til handleliste, ukegjennomgang og generering. Porsjonsvalg lik standarden/reset skriver null, ulikt skriver tall. Planjustering lagres per dag, listejustering lagres ikke. Min/maks og dato/visningsscope er kontrollert. Backup og restore bevarer grupper, andre ukeverdier og egne tall. Eksisterende testsamling for full lokal lagring, synk, import/bilde, backup, oppstart og server består uendret eller med forventninger til den nye nullable semantikken.

Overgangstestene bekrefter at eldre uker røres ikke, 5/4 blir null og 7 beholdes. Ingen overgang for medlem, offline, cacheuker, manglende serverprofil, eksisterende merke, manglende/for lavt minimum eller blokkert appversjon. Første appforsøk venter på to ukeskrivinger; meta merkes først etter begge SDK-kvitteringer. Stopp eller avvisning gir ingen merke. Gjentatt overgangspatch endrer ingen flere dager, og et eksisterende merke hindrer nytt forsøk.

## Hvor overgangen ligger og hvordan eier ser den

- src/sync/servings-defaults.js: servingsDefaultsPatch og createServingsDefaultsTransition.
- app.js: oppretter forsøket i makeAccessSession/onReady, og starter det via maybeTransitionServings etter serverprofil og autoritativ onWeeks-levering. Minimumsheving skjer i eksisterende access.js før onReady. Profillytteren ber om metadataendringer for å få serverbekreftelse også når hurtigbufferen er identisk.
- src/sync/weeks.js: waitForWrites dekker 500 ms-samling, sendte writes, kvitteringer og stopp/avvisning. Selve overgangsskrivingene går via setState/diffWeeks, uten getDoc/batch/transaksjon for ukene.
- Etter suksess vises «Porsjonene for N dager følger nå standarden (familySize).» som vanlig ikke-blokkerende toast. families/familien/app/meta.servingsDefaultsV106:true er den varige bekreftelsen. Ved delvis feil mangler merket, og neste oppstart kan prøve igjen. Restore skriver merket sist når data allerede er konvertert.

Agenten har ikke kjørt overgangen mot skyen. Eier åpner først v106 som administrator på nett etter apppublisering, og kontrollerer toast/merke, standard 4, egne dagsvalg og visningsjustering på PC/iPhone.

## Kartlegging av alle porsjonsbrukssteder

Kartleggingen ble gjort før endring med søk etter familySize, servingsByWeek, emptyWeekServings og recipeTargetServings i app.js og src. Alle direkte brukssteder er katalogisert nedenfor med opprinnelige v105-linjenumre. Dagens linjenumre kan være flyttet.

| Sted/funksjon | Håndtering i v106 |
| --- | --- |
| app: imports/defaultState | familySize beholder feltnavn og oppsettsstandard 5, nå porsjoner; servingsByWeek er fortsatt et seksfelts ukekart. |
| app: makeWeeksSync | getFamilySize fjernet; snapshots/defaults er familie-uavhengige. Autoritativ informasjon styrer overgangsberedskap. |
| app: normalizeState | familySize normaliseres som profilstandard; nye servings-kart fylles med null uten familieargument. |
| app: syncPayload | Samme felt og kart eksporteres/synkes; null beholdes. Backup fyller manglende standarddager. |
| app: currentServings | Gir null-standarder, ikke kopiert familieverdi. Brukes bare til eget/standard-markering og redigering. |
| app: setCurrentServings | Fjernet; updateDayServings håndterer angitt uke og sammenligning mot standarden. |
| app: recipeTargetServings | Bruker servingsForDay fra planen; fra listen standard eller egen minneverdi. Ingen reserve til oppskriftens base. |
| app: createMealShoppingReview | Bruker viste porsjoner og rå bidrag til sluttavrunding. |
| app: createWeekShoppingReview | Lokal servings-reserve fjernet; servingsForDay og rå bidrag per valgt dag. |
| app: generateShoppingListItems | Lokal servings-reserve fjernet; samme oppslag og aggregering som gjennomgangen. |
| app: renderPlanner | Ingen ||4; felles oppslag, eget tall bare som badge, standard/reset i dagsark. |
| app: renderMealDetail | Alltid effektivt porsjonstall, ny forklaring, scope og −/+. |
| app: updateDayServings/inputbinding | Null ved standard, tall ellers; 1–30 og riktig uke også fra oppskrift. |
| app: Tøm uke | Null-servings skrives bare for endrede dager som del av vanlig differ. |
| app: emptySetupBackup | Samme tomme kart; restore og eksport fyller null ved behov. |
| domain/weeks: emptyWeekServings | Ingen familieargument/verdi; syv nuller. servingsForDay er den ene dagsoppslagsfunksjonen. |
| render/setup: familie/oversikt | FamilySize vises som porsjoner til vanlig, med bestilte tekster. Ingen lokale porsjonsreserver. |
| sync/weeks: defaults/diffWeeks/weeksFromDocs/currentWeeks | Familieargument fjernet. Null er standard, gamle eksplisitte tall beholdes som eget valg. lastSnapshot er ikke familieavhengig. |
| sync/state: WEEK_SYNC_FIELDS | servingsByWeek beholdes i samme feltliste og per-dag-synk. |
| sync/restore: familie-/dagsvalidering | Familie fortsatt tall >=1; dagsverdi null eller tall >=1. Ingen familieverdi bakt inn i dokumentdefault. |
| sync/restore: dokumentliste | Null-defaults og konvertering fra eldre kopiers egen standard; meta minimum/markør sist. |
| domain/backup (ny bruk) | Ukenøkkelunionen fylles med null i v106-eksport; ellers uendret domenedata. |
| sync/servings-defaults (ny bruk) | FamilySize velger overgangsmål; kun aktuelle/fremtidige 5/standardverdier konverteres. |

Ingen synlige personer-tekster om antall som spiser gjenstår i app.js/src. Oppskriftens baseServings-standard 4 er fortsatt oppskriftsdata og er ikke en reserve for dagsporsjoner.

Komplett innledende søk (v105), håndtert av tabellen over:

```text
app.js:43:  emptyWeekServings,
app.js:186:    familySize: 5,
app.js:206:  servingsByWeek: {},
app.js:255:  getFamilySize: () => state.family.familySize,
app.js:342:  nextState.family.familySize = Math.max(1, Number(nextState.family.familySize) || 5);
app.js:376:  nextState.servingsByWeek = nextState.servingsByWeek || {};
app.js:388:  if (!nextState.servingsByWeek[currentWeekKey]) {
app.js:389:    nextState.servingsByWeek[currentWeekKey] = emptyWeekServings(nextState.family.familySize);
app.js:548:    servingsByWeek: state.servingsByWeek,
app.js:849:  return { ...emptyWeekServings(state.family.familySize), ...(state.servingsByWeek?.[getWeekKey()] || {}) };
app.js:884:  setState({ servingsByWeek: { ...(state.servingsByWeek || {}), [weekKey]: servings } });
app.js:921:function recipeTargetServings() {
app.js:924:  const value = Number(state.servingsByWeek?.[context.weekKey]?.[context.dayIndex]);
app.js:1003:  const targetServings = recipeTargetServings() || mealBaseServings(meal);
app.js:1032:      const servings = state.servingsByWeek?.[weekKey] || {};
app.js:1042:      const target = Math.max(1, Number(servings[dayIndex]) || state.family.familySize);
app.js:1157:    const servings = state.servingsByWeek?.[weekKey] || {};
app.js:1162:    const target = Math.max(1, Number(servings[dayIndex]) || state.family.familySize);
app.js:1593:  const targetServings = recipeTargetServings();
app.js:3010:      servingsByWeek: { ...(state.servingsByWeek || {}), [weekKey]: emptyWeekServings(state.family.familySize) },
app.js:3816:      plansByWeek: {}, lockedPlansByWeek: {}, dayTypesByWeek: {}, servingsByWeek: {}, dayModesByWeek: {}, dayNotesByWeek: {},
src/domain/weeks.js:59:export function emptyWeekServings(familySize = 5) {
src/domain/weeks.js:60:  const servings = Math.max(1, Number(familySize) || 5);
src/render/setup.js:13:    `${Math.max(1, Number(family.familySize) || 5)} personer`,
src/render/setup.js:93:          <label for="familySize">Personer i familien</label>
src/render/setup.js:94:          <input id="familySize" class="input" type="number" min="1" max="30" data-family="familySize" value="${Math.max(1, Number(family.familySize) || 5)}">
src/sync/weeks.js:2:  emptyWeekPlan, emptyWeekLocks, emptyWeekDayTypes, emptyWeekServings,
src/sync/weeks.js:8:  servingsByWeek: "servings", dayModesByWeek: "dayModes", dayNotesByWeek: "dayNotes",
src/sync/weeks.js:10:const defaults = familySize => ({
src/sync/weeks.js:12:  servings: emptyWeekServings(familySize), dayModes: emptyWeekDayModes(), dayNotes: emptyWeekDayNotes(),
src/sync/weeks.js:16:export function diffWeeks(prev = {}, next = {}, familySize = next.family?.familySize ?? prev.family?.familySize ?? 5) {
src/sync/weeks.js:17:  const changes = {}, standard = defaults(familySize);
src/sync/weeks.js:30:export function weeksFromDocs(docs = [], familySize = 5) {
src/sync/weeks.js:32:  const standard = defaults(familySize);
src/sync/restore.js:3:import { emptyWeekPlan, emptyWeekLocks, emptyWeekDayTypes, emptyWeekServings,
src/sync/restore.js:18:  if (!object(d.family) || typeof d.family.name !== "string" || !Number.isFinite(d.family.familySize)
src/sync/restore.js:19:    || d.family.familySize < 1 || !object(d.mealPreferences) || !object(d.mealPreferences.categoryGoals)
src/sync/restore.js:69:          : field === "servingsByWeek" ? !Number.isFinite(value) || value < 1
src/sync/restore.js:107:      servings: { ...emptyWeekServings(d.family.familySize), ...d.servingsByWeek[key] },
src/sync/state.js:11:  "servingsByWeek",
```

## Rammer og avvik

Ingen funksjonelle avvik fra beskjeden. Overgangen venter i tillegg på serverprofilen, slik at en gammel familiekopi ikke styrer konverteringen; profilens metadataendringer er derfor aktivert. Restore skriver overgangsmerket true etter fullført konvertering, slik at nye egne tall ikke konverteres på nytt. FIREBASE_OPPSETT.md er oppdatert fordi oppsettsminimum/markør beskrives der.

Bekreftet: ingen nettverk, installasjon, publisering, Git-kommandoer eller endring i functions/ eller firestore.rules. Ingen andre mapper er endret. Ekte skyovergang og PC/iPhone-akseptanse gjenstår etter eiers apppublisering.
