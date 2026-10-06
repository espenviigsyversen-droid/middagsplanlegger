# Agentinstruks for Middagsapp

Dette prosjektet er en lokal, statisk PWA for middagsplanlegging. Appen er foreløpig bygget uten byggsystem og består hovedsakelig av `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.json` og `icons/`.

## Arbeidsregler

- Arbeidsmappen er Git-klonen `C:\Users\espen\Documents\GitHub\middagsplanlegger`. Eier håndterer commit og publisering med GitHub Desktop.
- Ikke bruk git-kommandoer i denne lokale prosjektkopien.
- Jobb kun innenfor prosjektmappen.
- Bruk trygge lokale kontroller, særlig `node --check app.js` og `node --check service-worker.js`.
- Etter endringer i oppskrifts-/måltidslogikk: kjør `node tests/domain/meals.test.mjs`.
- Etter endringer i handleliste-/mengdelogikk: kjør `node tests/domain/shopping.test.mjs`.
- Etter endringer i sikkerhetskopi: kjør `node tests/domain/backup.test.mjs`.
- Etter endringer i hurtigmiddag, butikkategorirekkefølge eller sikkerhetskopiflyt: kjør `node tests/app/workflows.test.mjs` (lokale DOM-stubber, ingen nettverkstilgang).
- Etter endringer i oppstartsvern/lasteskjerm: kjør `node tests/app/startup.test.mjs` (tester også syntaksen i det innebygde HTML-skriptet).
- Etter endringer i forslagmotor/poengregler: kjør `node tests/domain/suggestions.test.mjs`.
- Etter endringer i uke-/datologikk: kjør `node tests/domain/weeks.test.mjs`.
- Etter endringer i handlelistesynk: kjør `node tests/sync/shopping.test.mjs`.
- Etter endringer i synk-/konfliktlogikk: kjør `node tests/sync/state.test.mjs`.
- Etter endringer i Firebase-oppkobling/referanser: kjør `node tests/sync/firebase.test.mjs`.
- Etter endringer i remote snapshot-/patch-bygging: kjør `node tests/sync/weeks.test.mjs` og `node tests/sync/meals.test.mjs`.
- Etter endringer i Firestore write-/payload-bygging: kjør `node tests/sync/writes.test.mjs`.
- Etter endringer i handleliste-rendering: kjør `node tests/render/shopping.test.mjs`.
- Etter endringer i oppskrifts-rendering: kjør `node tests/render/meals.test.mjs`.
- Etter endringer i kalender-rendering: kjør `node tests/render/calendar.test.mjs`.
- Etter endringer i planlegger-rendering: kjør `node tests/render/planner.test.mjs`.
- Etter endringer i setup-rendering: kjør `node tests/render/setup.test.mjs`.
- Ved kodeendringer: oppsummer nøyaktig hvilke filer som er endret og hvilke filer som må lastes opp til GitHub.
- Ikke endre appens dataformat, Firebase-struktur eller service worker-strategi uten å dokumentere konsekvensen.
- For profile, preferences og metadata skal synk-writes beskytte mot stale lokale cacher: les remote `clientUpdatedAt` før skriving og ikke seed manglende remote dokumenter fra lokal cache uten migrering eller `pendingLocalSync`. Fra v100 synkes meals per dokument og fra v101 weeks per dag/felt, uten getDoc eller global tidsmarkør; se reglene nedenfor.
- Ved endringer i appkode eller CSS som skal publiseres: bump versjon på alle relevante steder.
- Appen skal starte nye økter på Handleliste, selv om siste lagrede view var noe annet.

## Viktige filer

- `index.html`: laster appen, stylesheet, manifest, loading screen og versjonsmerkede assets.
- `app.js`: hovedlogikk, state, rendering, hendelser, Firebase-synk og brukerflyter.
- `src/domain/meals.js`: rene oppskrifts- og måltidshjelpere uten UI- eller Firebase-avhengighet.
- `src/domain/shopping.js`: rene mengde- og handlelistefunksjoner uten UI- eller Firebase-avhengighet.
- `src/domain/backup.js`: bygging av versjonert sikkerhetskopi og filnavn uten UI- eller Firebase-avhengighet.
- `src/domain/suggestions.js`: rene poengregler for forslagmotoren uten UI- eller Firebase-avhengighet.
- `src/domain/weeks.js`: rene uke- og datofunksjoner uten UI- eller Firebase-avhengighet.
- `src/sync/firebase.js`: Firebase SDK-lasting, Google-innlogging og bygging av Firestore-referanser.
- `src/sync/weeks.js`: ukediffer per dag/felt, standardverdier ved lesing, 500 ms samling av writes og vern for ventende lokale endringer. Erstatter den fjernede reads.js-modulen.
- `src/sync/state.js`: rene synkbeslutninger for scopes og remote-konfliktbeskyttelse, samt listen over de seks ukefeltene.
- `src/sync/writes.js`: bygging av Firestore writes for profile, preferences og metadata.
- `src/sync/meals.js`: normaliserte oppskriftsdiffer, operasjoner per dokument, minnekø og lytter med vern for ventende lokale endringer.
- `src/sync/version.js`: én REQUIRED_MIN_APP_VERSION, brukt ved administratorheving og gjenoppretting.
- `src/sync/shopping.js`: migrering, varebasert synk, minnekø og handlelistelytter.
- `src/render/shopping.js`: HTML-rendering for handleliste, vareeditor, vareforslag og shopping review modal.
- `src/render/meals.js`: HTML-rendering for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/render/calendar.js`: HTML-rendering for kalender/forside.
- `src/render/planner.js`: HTML-rendering for ukeplanleggeren.
- `src/render/setup.js`: HTML-rendering for Innstillinger, familie-/app-undersider og enkle metadata-sider.
- `styles.css`: all visuell styling, responsive regler og komponentstiler.
- `service-worker.js`: PWA-cache og offline/oppdateringsstrategi.
- `manifest.json`: PWA metadata.
- `docs/`: prosjektets tekniske dokumentasjon.

## Versjonsbump

Når appen endres og skal publiseres, hold disse i sync:

- `APP_VERSION` i `app.js`
- query-parametre i `index.html`, for eksempel `app.js?v=68`
- `CACHE_NAME` i `service-worker.js`, for eksempel `middagsplan-v68`
- nye JavaScript-moduler i `service-worker.js` sin `ASSETS`-liste hvis de skal fungere offline

Appen viser versjonen i App-panelet ved `Oppdater app`. Dette brukes for å kontrollere at ny versjon faktisk er lastet på PC og mobil.

## Arkitekturhensyn

`app.js` er stor og inneholder flere ansvarsområder. Nye endringer bør holdes små og plasseres nær eksisterende relevant kode. Ved større arbeid bør målet være gradvis modularisering:

1. Rene hjelpefunksjoner og domene-logikk.
2. State/persistens.
3. Firebase-synk.
4. Rendering per view.
5. Event-binding per view eller delegert eventhåndtering.

Se `docs/ARCHITECTURE.md`, `docs/STATE_MODEL.md` og `docs/RELEASE.md` før større endringer.

## Nye flyter fra v91

- Hurtigmiddag bruker eksisterende måltidsformat med tom kategori og tilberedningstid. `mealNeedsRecipe` er avledet; ikke lagre et eget mangler-oppskrift-felt.
- Oppretting fra middagsvelgeren legger til middag, ukeplan og lukker velgeren i én domenepatch. Søk skal fortsatt oppdatere listen uten full render per tastetrykk.
- `metadata.storeCategoryOrder` er valgfritt og synkes via eksisterende metadata-scope. Sortering skal ikke endre ingrediensenes kategorisering eller forslagmotoren.
- Sikkerhetskopi eksporterer kun `syncPayload()` fra denne enheten. Ikke bygg import eller lov gjenoppretting uten en egen plan for validering og synkkonflikter.
- Fra v92 brukes fil-deling kun ved grov peker og støttet fil-deling. Andre delingsfeil enn avbrudd skal falle tilbake til lenkenedlasting; feil ved nedlasting logges.
- Oppstartsvernet må ligge som et vanlig innebygd skript før appmodulen, slik at det virker selv når moduler mangler. Det skal aldri slette lokal state eller cacher.

## Handlelistesynk fra v93

- Handleliste er startside og første fane; begge oppstarts-view er shopping.
- Handlevarer synkes separat via src/sync/shopping.js til families/{familyId}/shoppingItems/{itemId}.
- Nye varer får createdAt lokalt; oppdateringer skriver bare endrede felt med updateDoc. Slettede varer skal ikke gjenopprettes av en sen oppdatering.
- Handlelistepatcher skal ikke endre global clientUpdatedAt/pendingLocalSync eller bruke det gamle shopping-scopet. Sikkerhetskopien beholder hele den lokale shoppingList.
- Migrering leser kun app/shopping i én transaksjon. shoppingList-feltet i arkivet skal aldri endres/slettes av v93; bare migratedToItemsAt legges til.
- Minnekø sendes etter migrering, før collection-lytteren startes. Cache-snapshots ignoreres fram til første serversnapshot. Migreringsfeil beholder lokal liste og blokkerer handlelistelytteren til neste oppstart.
- Ingen overføring av usynkede v92-endringer eller varig offline-kø. Følg utrullingsplanen i docs/RELEASE.md; v92 og v93 deler ikke løpende handleliste.

## Tilgang og oppsett fra v95

- Prosjektet er `middagsplanlegger-6db4e`, familie-ID er fortsatt `familien`. Det gamle prosjektet er arkiv og skal aldri kontaktes av v95.
- `firestore.rules` i repoet er fasit. Google-innlogging krever verifisert e-post og et medlemsdokument. Bare administratorer kan skrive `app/meta` eller administrere andre medlemmer; egen rad skal ikke endres.
- Medlemsreglene bruker dokumentoppslag. Hold skrivinger til enkeltstående dokumentkall; ikke innfør `writeBatch` eller transaksjoner med mange dokumenter (20-oppslagsgrensen for batch/transaksjon). Den historiske handlelistemigreringen kjøres ikke i v95.
- Prosjekt-ID lagres sammen med lokal state. Manglende/ulik ID nullstiller domenedata til tomme standardverdier før synk. Ingen eksempeloppskrifter eller eksempelplan.
- `src/sync/access.js` eier tilgangs- og versjonsvakten. Ingen domenelyttere eller vanlige writes før medlemskap og `app/meta.initializedAt` er kontrollert. Innlogging utløses bare av et knappetrykk.
- Offline-medlemsflagget bindes til prosjekt, familie og bruker, og fjernes ved eksplisitt utlogging/avvist medlemskap. Ved utlogging, kontobytte og versjonsblokkering stoppes lyttere og timere, usendte operasjoner forkastes, lokal state beholdes.
- `src/sync/restore.js` validerer sikkerhetskopi og eksisterende dokument-ID-er før første write. Ingen automatisk sletting og ingen legacy-opplasting fra `app/state`. Medlemslisten røres aldri av oppsett. `app/meta` skrives sist, kun av administrator etter vellykket oppsett.
- Gjenoppretting av sikkerhetskopi er nå eksplisitt godkjent i oppsettflyten for v95; dette erstatter begrensningen mot import under «Nye flyter fra v91».
- Etter slike endringer: kjør `tests/sync/access.test.mjs`, `tests/sync/restore.test.mjs`, `tests/app/access-startup.test.mjs` og `tests/render/account.test.mjs`, i tillegg til relevante eksisterende tester.

## Oppskriftsimport fra v96

- Import fyller kun editorens utkast. Ingen endring i lagrede meals, synkstatus eller Firestore fra klientimporten; dagens Lagre-knapp er fortsatt eneste oppskriftslagring. Sene svar etter avbrudd, kontobytte eller lukket editor skal ignoreres.
- `mealCanImportFromLink` er en egen ren betingelse: lenke finnes, ingredienser og steg mangler. `mealNeedsRecipe` beholdes uendret.
- Serveren ligger i functions/ med bare firebase-admin og firebase-functions som avhengigheter. Rene moduler under functions/lib testes uten SDK, installasjon eller nettverk. Installasjon og publisering av functions utføres av agenten bare etter uttrykkelig utviklerbeskjed fra eier; publisering skal alltid bruke --only functions og riktig --project. Ingen publisering av regler eller andre ressurser uten egen uttrykkelig godkjenning.
- Medlemskontroll via Admin SDK og bruksgrense i én transaksjon mot `families/familien/private/importUsage`. Dette er én privat dokumenttransaksjon, ikke en transaksjon med mange dokumenter. Klientreglene beholdes uendret og avviser private-stien.
- URL-henting validerer hver omdirigering og alle DNS-resultater, og binder socket til validert IP. Ikke erstatt dette med en ukontrollert fetch som gjør nytt DNS-oppslag.
- Henting har samlet maks 10 sekunder; AI har samlet maks 45 sekunder for lenke/tekst og 90 sekunder for bilder, inkludert ett nytt forsøk. importRecipe har 120 sekunder/512 MiB og en samlet abortvakt på 115 sekunder. Logger får bare inneholde funksjonsnavn, kode, varighet, eventuell providerStatus og importens source fra jsonld, jsonld+page-text, page-text, pasted-text eller image. Ved bilder tillates imageCount (1–4). providerCode fra OpenAI tillates bare når den passer /^[a-z0-9_]{1,40}$/ uten ekstra blanke tegn. Ved AI_INVALID_RESPONSE og prøveimport i aiModelSave tillates reason bare fra incomplete, no_text, no_json eller shape. model tillates bare i importRecipe/aiModelSave når verdien passer /^[a-z0-9][a-z0-9._-]{2,60}$/ uten ekstra blanke tegn. Bare ved INTERNAL tillates errorName når det passer /^[A-Za-z]{1,40}$/, og errorCode når det er heltall eller passer /^[A-Za-z0-9_\/-]{1,40}$/ uten å starte med sk-. Aldri message, stack, andre feilfelter, tekst, sideinnhold, bildedata, bildestørrelse i byte, filnavn, e-post, nøkkel, vertsnavn eller tokenbruk.
- OpenAI-nøkkelen administreres i appen, valideres på serveren og lagres kun kryptert i private/openaiKey. KEY_ENCRYPTION_SECRET fra defineSecret bindes bare til aiKeySave, aiKeyTest, aiModelSave og importRecipe. Klartekst må aldri inn i state, localStorage, sikkerhetskopi, svar eller logger. Passordfeltet tømmes før klienten venter på lagringskallet. Status ligger bare i minnet og nullstilles ved tilgangs-/brukerbytte.
- Nøkkelkontroll bruker en separat én-dokumenttransaksjon mot private/keyUsage (10 kontroller per 10 minutter). Import henter/dekrypterer nøkkelen før importkvoten telles. Private-dokumentene er utilgjengelige fra klient-SDK; firestore.rules beholdes uendret.
- Etter importendringer: kjør `node tests/domain/recipe-import.test.mjs`, `node tests/sync/recipe-import.test.mjs`, `node tests/app/recipe-import.test.mjs`, `node tests/render/meals.test.mjs`.
- Serverkontroller: `node functions/tests/core.test.cjs`, `node functions/tests/extract.test.cjs`, `node functions/tests/addresses.test.cjs`, `node functions/tests/import.test.cjs`, `node functions/tests/index.test.cjs`. Kjør også node --check for index.js og alle functions/lib-filer.
- Etter nøkkelendringer: kjør `node functions/tests/keys.test.cjs`, `node functions/tests/key-service.test.cjs`, `node functions/tests/diagnostics.test.cjs`, `node tests/sync/ai-key.test.mjs`, `node tests/render/ai-key.test.mjs` og `node tests/app/ai-key.test.mjs`, i tillegg til importtestene.
- Functions-filer skal ikke inn i service worker. Nye klientmoduler må inn i begge asset-listene. Appens versjonsvakt følger aktuell versjon; oppsett bruker REQUIRED_MIN_APP_VERSION (101 fra v101) for å beskytte ingrediensgrupper, oppskriftssynk per dokument og ukesynk per dag/felt.

## Delvis oppskriftsimport fra v97

- Uttrekk må kombinere mangelfull JSON-LD med renset sidetekst. Behold form, fjern hele select/datalist-blokker og bruk main når den rensede teksten har minst 500 tegn. Tekstvinduet er maks 16 000 tegn med tittelen først; samlet AI-inndata maks 20 000. HTML-skanning og valg av tekstvindu skal være lineære, også ved uavsluttede tagger.
- Ingredienser og steg fylles/erstattes uavhengig. Spør bare om deler som finnes både i utkastet og importen, også for nye oppskrifter. Tom import skal aldri tømme en utfylt del eller utfylt metadata. Porsjoner følger bare importerte ingredienser når servingsKnown ikke er false.
- servingsKnown er et midlertidig importfelt, ikke et nytt felt i meals, synk eller sikkerhetskopi. Serveren beholder numerisk baseServings (4 når ukjent) for v96-kompatibilitet. Ny server publiseres før v97-klienten.
- Kjør alle testskript under tests/ og functions/tests/, inkludert syntetiske støy-/ytelsessider i extract.test.cjs. Nettkontroll av en virkelig side krever egen godkjenning; sideinnhold skal ikke lagres i repo eller tester.

## Ingrediensgrupper fra v98

- Ingrediensformatet utvides additivt med valgfri group: trimmet tekst, maks 60 tegn, utelatt når tom. normalizeIngredients, synk, eksport og gjenoppretting må bevare feltet og rekkefølgen. Firestore-stier og regler er uendret.
- Overskrifter er UI-rader av typen `{ type: "heading", title }` i draftIngredients, ikke egne lagrede ingredienser. ingredientsToEditorRows/editorRowsToIngredients oversetter mellom formatene. Nærmeste overskrift bestemmer gruppen; en tom overskrift starter en ugruppert del, og fjerning gir gruppen over. Overskriftsrader beholdes ved render, venting, import av bare steg og besøk i AI-innstillinger; ved erstatning av ingredienser følger gruppene det importerte innholdet.
- ingredientBaseName brukes for oppskriftsgenererte varenavn, vareoppslag, keyIngredients og forslag/søk. Opprinnelige ingrediensnavn og manuelt innskrevne handlevarenavn beholdes. parseAmount er uendret; parseAmountRange/scaleAmount håndterer intervaller, og handlelisten bruker høyeste verdi.
- Online administrator med v98 hever app/meta.minAppVersion til 98 ved én best-effort updateDoc per oppstart når minimumet er lavere. Feil er stille og prøves igjen ved neste oppstart. Vanlige medlemmer/offline-økter skal ikke skrive meta. Gjenoppretting oppretter minimum 98. Dette er den uttrykkelig godkjente unntaksflyten fra regelen om at vanlig domenesynk ikke skriver meta.
- Serveren publiseres før klienten, med numerisk baseServings og additive group-felter for v97-kompatibilitet. Funksjonell kontroll krever at administrator først åpner v98 på nett, slik at eldre klienter stoppes før de kan fjerne grupper ved lagring.
- Etter endringer: kjør alle eksisterende tester under tests/ og functions/tests/. Gruppene dekkes i meals/render/app/backup/restore-testene; versjonshevingen i access/access-startup; navn/intervaller i shopping/workflows; import og S3-uttrekk i functions-testene.

## Importvalg og blandede tall fra v99

- Ikke bruk window.confirm etter asynkron oppskriftsimport. Vis Erstatt/Behold i importpanelet; fyll tomme deler straks og behold konfliktdeler til valget. Les dagens skjema før erstatning og erstatt bare konfliktområdene. Andre confirm-kall, utløst direkte av klikk, beholdes.
- recipeImportState.pending er separat minnetilstand. Aldri legg ventende respons i state, localStorage, syncPayload eller sikkerhetskopi. Forkast ved ny import, lukket/byttet editor og konto-/tilgangs-/synkøktendring. Bare Lagre lagrer oppskriften. Hent/Tolk tekst skal fortsatt virke mens valget venter.
- parseAmount håndterer blandede tall og ½/¼/¾; parseAmountRange bruker samme tolking per ende. Nullnevner/ugyldig tekst avvises. Lagret mengdetekst og dagens avrunding beholdes.
- Porsjonsfeltets tekst er «Porsjoner i oppskriften» med forklaring av mengdegrunnlaget. Feltet baseServings og minAppVersion 98 er uendret; aktuell appversjon/versjonsvakt er 99.
- Kontroller tests/app/recipe-import.test.mjs (valg, livsløp, skjema og minnelagring), tests/domain/shopping.test.mjs, tests/app/workflows.test.mjs og tests/render/meals.test.mjs. Ved versjonsbump må blokkeringsfixturene i tests/app/access-startup.test.mjs ligge over aktuell appversjon. Kjør også alle øvrige testskript og node --check av kildefilene.

## Oppskriftssynk fra v100

- Alle brukerendringer i lagrede oppskrifter skal gå gjennom setState med meals-patch. diffMeals normaliserer per ID og køer bare nye/endret innhold og slettede ID-er. Endret rekkefølge er ingen skriveoperasjon. Ikke gjeninnfør meals i global scope-synk, pendingMealDeleteIds eller automatisk cache-opplasting.
- Upsert er setDoc av hele oppskriften med updatedAt, uten merge/getDoc/batch/transaksjon. Sletting er deleteDoc. normalizeMeals deles mellom oppstart, differ og skydata; updatedAt/clientUpdatedAt ignoreres. Tomt serverbilde er tom liste med unntak for konkrete ventende lokale operasjoner.
- Minnekø og siste lokale operasjon per ID er runtime-state. Hvert snapshot får et løpenummer, og operasjonen husker siste nummer ved kølegging. Fjern siste lokale operasjon når SDK har kvittert og siste bilde er fra serveren uten ventende skrivinger, med høyere nummer enn operasjonens. Ikke sammenlign innhold: en annen enhets nyere versjon eller gjenopprettede oppskrift skal bli synlig. Kjør kontrollen både ved bilde og kvittering, og publiser oppdatert liste også ved kvittering. Ta samtidig inn andre oppskrifters fjernendringer. Cache ignoreres til første serverbilde. Avviste operasjoner beholdes med Synk feilet. Stopp forkaster kø/ventende tilstand/løpenummer og gjør gamle callbacks ugyldige. Ingen varig kø eller automatisk retry bygges.
- onMeals skal ikke endre clientUpdatedAt/pendingLocalSync, utkast, UI eller ventende importvalg. Rene oppskriftsendringer skal ikke planlegge andre scopes. Sletting og hurtigmiddag endrer også ukeplan med dagens separate uke-synk; metadataopprydding skriver metadata/preferanser bare når disse faktisk er i patchen.
- REQUIRED_MIN_APP_VERSION var 100 i v100, og er hevet til 101 fra v101 for ukesynken. Konstanten brukes av access/restore. Oppsett skriver meta sist som før. Administrator på nett hever minimumet én gang per oppstart; vanlige medlemmer/offline gjør ingen slik skriving. Eldre klienter må oppdateres før de kan skrive igjen. Appversjonen sammenlignes numerisk.
- Importpanelet skal skjule «Ingenting ble endret.» mens et valg venter. formatShoppingAmount bruker komma; tolking skal fortsatt godta punktum.
- Kjør node tests/sync/meals.test.mjs og node tests/app/meals-sync.test.mjs, i tillegg til relevante eksisterende state/weeks/writes/access/restore/import/shopping-tester og alle testskript. Nye meals/version-moduler skal stå i begge service worker-listene. Functions og firestore.rules inngår ikke i v100-endringen.

## Ukesynk fra v101

- Alle brukerendringer av de seks *ByWeek-kartene skal gå gjennom setState. diffWeeks sammenligner standardutfylte verdier per uke, felt og dag (0–6), og køer bare faktiske endringer. Ikke gjeninnfør weeks som global scope, pendingWeekKeys, changedWeekKeys, weekPayload eller automatisk cache-opplasting.
- Hver berørt uke får én setDoc med nested maps for bare endrede dager/felt, updatedAt og merge:true. Ingen getDoc/batch/transaksjon. Dokumentet opprettes ved behov; Tøm uke skriver bare endrede standardverdier og sletter ikke dokumentet.
- Første endring starter et fast vindu på 500 ms per uke. Flere endringer i vinduet samles, siste verdi per felt/dag gjelder. Usendte endringer venter på start. Stopp fjerner timere og køer, med generasjonsvern for sene callbacks/kvitteringer.
- Ventende lokale verdier legges over serverbilder per uke/felt/dag. Fra v103 merkes ukecelleoperasjonen med siste snapshot-løpenummer ved sending (flush), ikke ved kølegging. SDK-kvittering og et nyere serverbilde uten ventende skrivinger avgjør fjerning uten innholdssammenligning. Bilder mens endringen ligger i kø kan ikke bekrefte den senere skrivingen. Meals beholder løpenummer ved kølegging. Kontrollen og eventuell listepublisering kjøres både ved bilde og kvittering. Bare nyeste operasjon per celle gjelder. Avviste skrivinger beholdes med Synk feilet.
- weeksFromDocs fyller standardverdier og ignorerer clientUpdatedAt/updatedAt. Cache ignoreres til første serverbilde. Uker uten serverdokument eller lokal ventende endring vises med standardverdier; det er ingen automatisk opplasting.
- onWeeks erstatter bare de seks domenekartene ved endring, og bevarer valgt uke, editorutkast, UI og ventende importvalg. Rene ukeendringer endrer ikke clientUpdatedAt/pendingLocalSync og skriver ikke andre scopes. Profil/preferanser/metadata beholder dagens vern.
- REQUIRED_MIN_APP_VERSION er 101, brukt både ved administratorheving og restore; v100 og eldre må stenges ute. Backup/restore-formatet og ukedokumentformen er uendret. Den historiske clientUpdatedAt i ukedokumenter ignoreres; merge-writes trenger ikke fjerne den. Offline-oppstart starter ingen synk/kø, og ingen varig kø bygges.
- Kjør node tests/sync/weeks.test.mjs og node tests/app/weeks-sync.test.mjs, i tillegg til alle øvrige testskript og node --check av kildefilene. weeks.js må ligge i begge service worker-listene; den fjernede reads.js skal ikke ligge der. Functions og firestore.rules inngår ikke i v101.

## Bildeimport fra v102

- Bildene ligger bare i recipeImportState.images i minnet. Aldri legg bilder/filnavn i domenestate, localStorage, Firestore, sikkerhetskopi eller logger. Vis bare Bilde 1–4 uten miniatyrer. Tøm ved vellykket import, lukket/byttet editor og kontobytte; ignorer sene svar og ferdig forminsking fra tidligere editor/tilgangsøkt.
- src/domain/image-prepare.js bruker EXIF-orientert nettleserdekoding og canvas, maks 2000 px, JPEG-kvalitet 0,8/0,7/0,6, deretter 1600 px ved behov. Maks 1,4 MB per bilde. Før sending kontrolleres også samlet base64-grense; fire store bilder kan kreve ytterligere komprimering i minnet. Ingen nye avhengigheter.
- Serveren krever 1–4 JPEG-bilder, gyldig ren base64 og FF D8 FF-signatur, maks 2 000 000 tegn per bilde/7 000 000 samlet. Modellen kan styres med OPENAI_RECIPE_IMAGE_MODEL; ellers brukes tekstmodellen. Bildemodus bruker samme medlemskontroll, krypterte nøkkel og kvote som annen import. Nøkkelen hentes før telling.
- Bildeimport fyller bare utkastet og bruker dagens grupper/porsjonsregler og erstatningsvalg. Importklienten bruker 130 sekunder for bilde, 70 for lenke/tekst. Inndata fra utklippstavlen med bilder tas bare imot når importpanelet er åpent; innlimt tekst beholder normal oppførsel.
- REQUIRED_MIN_APP_VERSION forblir 101. Serveren publiseres før appen, med bakoverkompatible url/text-svar. Ikke endre secret, regler eller kvoter. Publisering krever eiers uttrykkelige beskjed, alltid --only functions og riktig --project.
- Kjør node functions/tests/image.test.cjs, node tests/domain/image-prepare.test.mjs og eksisterende app-/sync-/render-importtester, samt alle testskript og node --check av alle kildefiler. Ekte bilde-/HEIC-/EXIF-kontroll på iPhone og innliming på PC gjenstår etter apppublisering.

## Smårettinger fra v103

- Serverimport fjerner bare godkjente omtrentlighetsprefikser før mengdevalidering. Normaliser bøyde enheter med fast tabell og bare til en verdi som finnes i units. Enhetsord foran name flyttes til unit bare når amount er gyldig, unit er tom og resten av navnet ikke blir tomt. Uten mengde eller tillatt målenhet beholdes navnet. Ingen datamodellendring.
- Resultatmeldinger nevner bare utfylte/byttede deler, aldri 0 ingredienser eller 0 steg. Ventende valg vises med Ikke alt ble byttet, forklaring om urørt innhold og knappene Bytt til de importerte / Behold mine. Rull inn boksen én gang når valget dukker opp, ikke ved øvrige renders. Lagre mens valget venter lagrer dagens skjema uten dialog; ikke bruk pending som lagringsgrunnlag.
- Ukesynkens løpenummer settes per operasjon i flush rett før setDoc. Ingen andre endringer i kø-/kvitteringsreglene. REQUIRED_MIN_APP_VERSION forblir 101.
- Kjør functions/tests/core.test.cjs, tests/render/meals.test.mjs, tests/app/recipe-import.test.mjs og tests/sync/weeks.test.mjs, i tillegg til alle øvrige testskript og node --check av alle kildefiler. Server publiseres før klient, bare etter eiers uttrykkelige beskjed og med --only functions --project middagsplanlegger-6db4e. Hemmelighet/regler/kvoter er uendret.

## Modellvalg og importkvoter fra v104

- private/aiConfig er serverprivat og inneholder model, updatedAt og updatedBy. Bare aiModelSave skriver det etter verifisert administrator, gyldig format, lesbar nøkkel, delt keyUsage-kvote, modellkontroll og bestått prøveimport. Ingen klient-SDK-tilgang eller endring i firestore.rules.
- Modellrekkefølgen er gyldig aiConfig.model, OPENAI_RECIPE_MODEL, DEFAULT_MODEL (gpt-5.6-luna). OPENAI_RECIPE_IMAGE_MODEL overstyrer bare bilder. aiKeyStatus/Save/Test bruker samme grunnmodell som importRecipe. Ugyldig lagret modell ignoreres.
- aiModelSave bruker 90 sekunder, samlet abortvakt 88 sekunder, modellkontroll 15 sekunder og teksttolking 45 sekunder med ett nytt forsøk. Klienten har 100 sekunder. Prøven er fast egen tekst, normaliseres som vanlig og krever minst fire ingredienser, tre med mengde og to steg. Ikke logg prøveteksten. Bare bestått prøve skriver modellvalget.
- keyUsage deles av aiKeySave, aiKeyTest og aiModelSave: 10 kontroller per rullerende 10 minutter. Prøveimport teller aldri i importUsage. Importkvotene er IMPORT_WINDOW_LIMIT = 20 per ti minutter og IMPORT_DAILY_LIMIT = 150 per UTC-døgn. Nøkkelen leses før telling, og eksisterende telling beholdes ved oppgraderingen.
- Modellfeltets utkast/status og recipeImportState.remainingToday ligger bare i minnet og nullstilles ved konto-/tilgangsbytte. Vis gjenstående importer etter vellykket import bare ved 30 eller færre. Ingen modell-/kvotefelt i domenestate, localStorage eller backup.
- APP_VERSION/versjonsvakt er v104/104; REQUIRED_MIN_APP_VERSION forblir 101. Serveren publiseres før klienten og er kompatibel med v103. Ingen ny avhengighet eller klientmodul; functions/lib/models.js skal ikke inn i service worker.
- Kjør node functions/tests/models.test.cjs, core/index/import/image/logging/key-service-testene og klientens sync/render/app ai-key-/recipe-import-tester, samt alle øvrige testskript og node --check av kildefilene. Functions publiseres bare etter uttrykkelig eiers godkjenning, med --only functions --project middagsplanlegger-6db4e.
