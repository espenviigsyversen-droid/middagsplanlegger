# Leveranse v100 – oppskrifter synkes per dokument

Dato: 2026-10-06. v99 er publisert og i bruk. v100 er ferdig lokalt; ingen publisering inngår i denne oppgaven.

## Resultat

- Ny src/sync/meals.js med diffMeals, mealsFromDocs og createMealsSync. Differ sammenligner normaliserte oppskrifter per ID og gir bare konkrete upserts/slettinger. Listens/objektfeltenes rekkefølge og transporttidsmarkører gir ingen operasjon. normalizeMeals er delt med dagens oppstartsnormalisering.
- En upsert skriver hele oppskriften med updatedAt til families/familien/meals/{id}, uten merge/getDoc/batch/transaksjon. Sletting bruker deleteDoc. Fjernede felt blir ikke liggende. Eldre clientUpdatedAt ignoreres og faller bort ved neste ordinære lagring, uten migrering.
- Operasjoner køes før start og sendes i rekkefølge. Lytteren bruker includeMetadataChanges, ignorerer cache før første serverbilde og leser stabil ID-rekkefølge. Det finnes ingen automatisk opplasting av cached oppskrifter; tom serverliste er tom liste når ingen konkrete lokale operasjoner venter.
- Siste ventende lokale operasjon per ID legges over hvert snapshot. Hvert bilde får løpenummer, og operasjonen husker siste nummer ved kølegging. Den fjernes når SDK har kvittert og siste bilde er fra serveren uten ventende skrivinger, med høyere nummer enn operasjonens. Innholdslikhet kreves ikke; en annen enhets nyere versjon eller oppskrift opprettet på nytt etter sletting blir synlig. Kontrollen kjøres ved både bilde og kvittering, med listepublisering også når kvitteringen kommer sist. Dermed beholdes lokal A mens den venter, samtidig som fjern B tas inn. Samtidige endringer på samme oppskrift bruker siste skriving av hele dokumentet, uten feltvis fletting.
- setState køer alle brukerendringer i meals ved godkjent online-tilgang. Oppskriftspatch alene endrer ikke clientUpdatedAt/pendingLocalSync og planlegger ingen øvrige scopes. onMeals oppdaterer bare faktisk endrede oppskriftsobjekter, uten å endre UI, åpent editorutkast eller ventende importvalg. Uendrede oppskriftsobjekter beholdes.
- mealsSync starter sammen med shoppingSync etter tilgangs-/versjonsvern og stoppes i stopAllSync. Status kombineres med dagens synk: feil først, deretter Synker, ellers dagens status. Kø, SDK-venting, ubekreftet lokal operasjon og manglende første serverbilde viser Synker. Feil viser Synk feilet. Stopp forkaster minnetilstand og gjør gamle callbacks ugyldige; allerede sendte SDK-operasjoner kan ikke trekkes tilbake.
- Gammel meals-scope, pendingMealDeleteIds, listen-som-scope-lytter og buildMealsRemotePatch er fjernet. Profile/preferences/metadata/weeks beholder gammel synk og skrivevern. Sletting og hurtigmiddag skriver også ukeplan via dagens separate uke-synk.
- Ny src/sync/version.js er eneste definisjon av REQUIRED_MIN_APP_VERSION = 100, brukt av administratorheving og restore. Vanlige medlemmer/offline skriver aldri meta. Appversjon/vakt er numerisk 100, APP_VERSION er v100, HTML-parametre/cache-navn er v100. Begge nye moduler ligger i ASSETS og NETWORK_FIRST_ASSETS.
- R1: «Ingenting ble endret.» vises ikke mens erstatningsvalg venter. R2: nye formaterte handlemengder bruker komma (3,5), mens både punktum og komma fortsatt tolkes. Eksisterende mengdetekster omskrives ikke.

## Kartlegging av endringsveier og oppstart

Alle brukerhandlinger som endrer lagrede oppskrifter går gjennom setState: saveMealFromForm (inkludert favoritt, barnevennlig og forslagmerking), deleteCurrentMeal, addQuickMealForPicker og removeCategory/removeUnit/removePrepTime/removeSuitability. Metadataopprydding kan endre mange oppskrifter, men bare de som faktisk endres gir operasjoner. Disse patchene kan også skrive metadata/preferanser som før. Sletting/hurtigmiddag endrer ukeplan uttrykkelig, og derfor fortsatt global tidsmarkør for den separate planendringen.

Direkte endring utenom setState finnes ved loadState/normalizeState (innlasting/normalisering), applyRemoteStatePatch (mottak av øvrige sky-scopes normaliserer også beholdte oppskrifter), den nye onMeals (oppdatering fra oppskriftslytteren) og restoreDatabase (lokal state etter at eksplisitt gjenoppretting allerede har skrevet dokumentene). Dette er innlasting/sky/oppsett, og skal ikke køe nye oppskriftswrites. Import endrer bare editor-drafts; lagrede meals endres først ved Lagre. Det ble ikke funnet andre direkte brukerendringer av state.meals eller mutasjoner med push/splice.

Den gamle oppstarten var avhengig av meals-lytteren i startSplitSyncListeners, maks clientUpdatedAt i hele samlingen, global pendingLocalSync/pendingRemoteScopes og automatisk opplasting ved tomt snapshot. Alle disse meals-avhengighetene er erstattet av den nye start/lytter-veien. Oppstart har fortsatt sju lyttere totalt: meta, shoppingItems, meals og de fire gjenværende scopes. refs.meals og Firestore-stien er uendret. Fjerning av den gamle slettesamlingen endrer ikke oppryddingen av oppskrifts-ID-er i ukeplanen.

## Endrede filer per mappe – tas med i GitHub Desktop

- Rot: AGENTS.md, app.js, index.html, service-worker.js.
- src/domain: meals.js, shopping.js.
- src/render: meals.js.
- src/sync: access.js, reads.js, restore.js, state.js, writes.js, meals.js (ny), version.js (ny).
- tests/app: access-startup.test.mjs, recipe-import.test.mjs, workflows.test.mjs, meals-sync.test.mjs (ny).
- tests/domain: shopping.test.mjs.
- tests/render: meals.test.mjs.
- tests/sync: access.test.mjs, reads.test.mjs, restore.test.mjs, state.test.mjs, writes.test.mjs, meals.test.mjs (ny).
- docs: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md, LEVERANSE_V100.md (ny).

25 eksisterende filer er endret og fem filer er nye (30 totalt). Ingen filer er slettet; utdaterte funksjoner er fjernet inne i eksisterende moduler. Ingen nye avhengigheter eller installasjon. Service worker-strategien er uendret.

## Kontroller

Alle 38 lokale testskript under tests/ og functions/tests/ bestod. node --check av alle 35 kildefiler bestod; oppstartstesten kontrollerer også det innebygde HTML-skriptet. Ingen kontroller bruker nettverk.

- diffMeals: ny/endret/slettet/uendret, liste-/feltrekkefølge, normalisering, gamle tidsmarkører og fjerning av et felt. mealsFromDocs: tidsmarkører fjernes, ID-fallback og stabil sortering, grupper bevares.
- Faktisk saveMealFromForm blant 50 oppskrifter gir nøyaktig én setDoc og ingen getDoc, uten merge/global tidsmarkør. Favorittmerking gir én setDoc. Hurtigmiddag gir én setDoc og planlegger bare sin uttrykkelige ukeplanendring. Sletting gir én deleteDoc og én separat ukeplan-write; bare uke-dokumentet leses av det gamle skrivevernet.
- Lokal A venter mens fjern B kommer: begge finnes etterpå. B byttes mens uendrede oppskriftsobjekter beholdes. Åpent draft, gruppeoverskrift og pending-import bevares, også gjennom dagens faktiske render; importknappen/ulagret tittel er fortsatt synlig.
- Cache før første serverbilde ignoreres. Tomt serverbilde tømmer listen uten opplasting selv med global pendingLocalSync. Kørekkefølge, SDK/snapshot i begge bekreftelsesrekkefølger, senere fjernendring etter lokal bekreftelse, feil og gammel callback etter stopp testes. Stopp/ny start sender ingen gamle køoperasjoner. Offline-patch gir ingen skriving eller global pending-markering.
- Rene oppskriftsendringer utløser ingen profil/preferanse/metadata/uke-skriving. Den gamle meals-scopen i buildRemoteWrites gir ingen lesing/skriving. Dagens øvrige scope-vern, backup, restore, import og handlelistetester består.
- Administrator hever minimum til 100, et eksisterende minimum 100 skrives ikke på nytt, vanlig medlem skriver ikke meta, v99 blokkeres og restore skriver 100. Numerisk v100 får tilgang til minimum 100, mens minimum 101 stopper app/lyttere. R1/R2 har render-/mengdetester.

## Rettelse før publisering – fortsatt v100

Den første implementeringen krevde at serverinnholdet var likt den lokale operasjonen. Hvis en annen enhet allerede hadde skrevet en nyere versjon, ble overlegget liggende og status stod på Synker. Dette er rettet med løpenummer for hvert bilde og nummeret ved kølegging på hver operasjon. SDK-kvittering og et nyere serverbilde uten ventende skrivinger er tilstrekkelig; innholdet sammenlignes ikke. Ved kvittering etter serverbildet publiseres listen på nytt, slik at den andre enhetens versjon vises med en gang. Bare den nyeste operasjonen per ID gjelder. Avvist skriving beholder operasjonen og Synk feilet som før.

Filer endret i denne rettelsen, som tas med i GitHub Desktop sammen med resten av v100:

- Rot: AGENTS.md.
- src/sync: meals.js.
- tests/sync: meals.test.mjs.
- tests/app: meals-sync.test.mjs.
- docs: ARCHITECTURE.md, STATE_MODEL.md, RELEASE.md, LEVERANSE_V100.md.

Åtte eksisterende filer endret; ingen nye eller slettede filer. Ingen versjonsendring eller endring utenfor synkmodulen, tester og dokumentasjon.

Alle 38 testskript under tests/ og functions/tests/ og node --check av alle 35 kildefiler bestod etter rettelsen. Nye regresjonstester dekker en annen enhets nyere versjon med serverbilde før/etter kvittering, vanlig lagring, ventende lokal A sammen med fjern B underveis og etterpå, sletting og gjenopprettet oppskrift i begge rekkefølger, serverbilde fra før kølegging, cache/hasPendingWrites, nyere operasjon for samme ID og avvist skriving. App-testen bekrefter også at kvittering etter serverbildet faktisk oppdaterer state.meals/status, og at A/B, editorutkast og importvalg bevares under og etter synk.

Ingen nettverk, publisering eller Git-kommandoer. Functions, firestore.rules og hemmeligheter er urørt. Test på ekte enheter gjenstår etter eiers publisering.

## Begrensninger og utrulling

Ingen funksjonelle avvik fra beskjeden. Minnekø/ventende overlegg er ikke varig. Offline-oppstart starter ingen synk og køer ikke lokale oppskriftsendringer; første serverbilde etter ny oppstart kan erstatte dem. Feil prøves ikke automatisk på nytt. Backup/restore beholder format og flyt, bortsett fra påkrevd minimum 100; den historiske clientUpdatedAt i restore-payload ignoreres ved lesing og fjernes ved neste ordinære oppskriftslagring.

Eier håndterer commit/app-publisering i GitHub Desktop. La enhetene vise Synket og ta ny backup først, lukk gamle klienter, publiser filene samlet og åpne administratorens v100 på nett først. Kontroller at minAppVersion er 100 før øvrige enheter brukes igjen. Administratorheving er som før best effort med stille feil og nytt forsøk neste oppstart. Kontroll på ekte PC/iPhone og to enheter gjenstår etter publisering; se RELEASE.md.

Ingen endring i functions eller firestore.rules. Ingen nettverk, publisering eller Git-kommandoer. KEY_ENCRYPTION_SECRET er urørt. Lokal skrivtestfil er slettet.
