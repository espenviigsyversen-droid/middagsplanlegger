# Agentinstruks for Middagsapp

Dette prosjektet er en lokal, statisk PWA for middagsplanlegging. Appen er foreløpig bygget uten byggsystem og består hovedsakelig av `index.html`, `app.js`, `styles.css`, `service-worker.js`, `manifest.json` og `icons/`.

## Arbeidsregler

- Arbeidsmappen er Git-klonen `C:\Users\espen\Documents\GitHub\middagsplanlegger`. Eier håndterer commit og publisering med GitHub Desktop.
- Ikke bruk git-kommandoer i denne lokale prosjektkopien.
- Jobb kun innenfor prosjektmappen.
- Eksempeltekster, plassholdere og testdata som vises i appen skal aldri inneholde ekte navn på familiemedlemmer.
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
- Etter endringer i Uke-visningen: kjør `node tests/domain/week-view.test.mjs`, `node tests/render/week.test.mjs` og `node tests/app/week.test.mjs`.
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
- `src/render/icons.js`: felles pencilIcon for redigeringsknapper i Uke og Oppskrifter.
- `src/render/meals.js`: HTML-rendering for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/domain/week-view.js`: rene visningshjelpere for Uke, ISO-ukenummer, datotekster, planhistorikk og sveip.
- `src/render/week.js`: HTML-rendering for Uke, dagsark, ukemeny og tømmingsbekreftelse.
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
- Functions-filer skal ikke inn i service worker. Nye klientmoduler må inn i begge asset-listene. Appens versjonsvakt følger aktuell versjon; oppsett bruker REQUIRED_MIN_APP_VERSION (106 fra v106) for å beskytte ingrediensgrupper, oppskriftssynk per dokument og ukesynk per dag/felt.

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

## Radvalg i oppskriftseditoren fra v107

- Ingrediens- og stegrader har én ⋯-knapp med radvalg i appen. Overskriftsrader beholder ↑/↓/×; begge flytteknapper skal være deaktivert ved sin listegrense. Ingrediensflytting forbi en overskrift endrer gruppen etter samme regel som før.
- ingredientEditorGroups og ingredientEditorGroupIndex identifiserer grupper etter radindeks, også ved like eller tomme overskrifter. moveIngredientToGroup legger raden nederst før neste overskrift; insertIngredientInGroup legger en tom ingrediens på samme sted. Uten overskrift tilbys bare når det finnes rader før første overskrift. Nåværende gruppe utelates fra Flytt til.
- Kjør syncMealEditorDraftFromDom før åpning/lukking av radmenyen og før hver flytting, fjerning og innsetting. Alle skjemaområder skal bevares, også tekst skrevet siden forrige render. Etter flytting fokuseres og rulles radens ⋯-knapp inn; gruppeinnsetting fokuserer mengdefeltet.
- editorRowMenu er separat runtime-tilstand og lagres aldri i lokal kopi, domenestate, synk eller backup. Bare én meny er åpen; valg, trykk på bakgrunnen og Escape lukker den. Lukket/byttet editor, visningsbytte og konto-/tilgangsbytte forkaster menyen. Ingen dra-og-slipp eller datamodellendring.
- På mobil er ⋯ minst 44×44 px. Mengde-/enhetskolonnene gir plass til knappen uten å redusere navnefeltet. Radmenyen vises som et rullbart ark nederst med én handling per linje. Stegnummerering avledes fortsatt fra rekkefølgen.
- Kjør node tests/app/editor-rows.test.mjs, node tests/domain/meals.test.mjs og node tests/render/meals.test.mjs, samt alle øvrige testskript og syntakskontroller. APP_VERSION/APP_VERSION_NUMBER/cache er v107/107, REQUIRED_MIN_APP_VERSION forblir 106. Ingen endring i functions eller firestore.rules; ingen nettverk, installasjon, publisering eller Git i leveransen.

## Rulleposisjon og fokus i vinduer fra v108

- Nye vinduer med egen rulleliste skal ha en unik, stabil data-scroll-key på elementet som faktisk ruller. Undersøk overflow, høydebegrensninger og foreldre/mobilregler før nøkkelen plasseres. Ikke sett nøkkel på en innholdsbeholder med overflow:visible. Gjennomgangen ruller på .shopping-review-backdrop; øvrige nøkler står på .gen-modal-list, .week-sheet-body, .meal-picker-list og .editor-row-menu-actions; se v112 for de nye ukemenynøklene.
- Fokusbare kontroller i disse vinduene får en stabil data-focus-key. Bruk vare-ID/datonøkkel/dag eller målgruppeindeks ved gjentatte kontroller, og ulike nøkler for ulike handlinger. Identiteten skal ikke avhenge av valgt-status, teller eller knappetekst. Dette gjelder også vinduets topp-/bunnknapper utenfor selve rullelisten.
- render() tar en lokal kopi av scrollTop og fokusnøkkel før innerHTML erstattes. Etter rendering og binding gjenopprettes fokus innenfor samme vindu med focus({preventScroll:true}), deretter scrollTop synkront i samme render. Match fokusnøklene som tekst, uten interpolering av vilkårlige ID-er i CSS-selektorer. Flere åpne vinduer bevarer hver sin posisjon.
- Kopien finnes bare i den aktuelle render-kallstakken, aldri i state, localStorage, synk eller backup. En lukket/fjernet nøkkel ignoreres; åpning etter lukking begynner øverst. Manglende/fjernet fokuskontroll ignoreres. syncMealPickerScrollLock og dagens tegneflyt beholdes.
- Kjør node tests/app/window-scroll.test.mjs og relevante render-/workflow-tester, alle øvrige testskript og node --check. APP_VERSION/APP_VERSION_NUMBER/cache er v108/108; REQUIRED_MIN_APP_VERSION er fortsatt 106. Ingen nettverk, installasjon, publisering, Git eller endring i functions/firestore.rules inngår.

## Undersider og tilbake fra v109

- Fra v111 bruker dagsark → middagsvelger openMealPicker/closeMealPicker. Bare ett av vinduene er åpent. mealPickerReturn er runtime-tilstand med returdag og v108-posisjon/fokus, aldri domenedata/lokal kopi/backup. navigationLevels beholder dagsarket som logisk forelder mens det er skjult. Valg, tømt valg, hurtigmiddag, ×, bakgrunn og tilbake gjenåpner samme dagsark; direkte radåpning gjør det ikke. Returen forkastes ved visnings-/tilgangsbytte eller synkstopp. Kjør tests/app/navigation.test.mjs og tests/app/window-scroll.test.mjs ved slike endringer.

- src/render/subpage.js er eneste toppstripe for oppskrift og alle Innstillinger-undersider. Den har sticky posisjon, safe-area-padding og ‹ Tilbake til venstre; oppskriften har ⋯ til høyre. Undersidene bruker stripen i stedet for globalt brand-toppfelt. Oppskriftseditoren beholder Avbryt/Lagre nederst og får ingen slik stripe.
- Oppskriften har tittel, eventuell beskrivelse, porsjonslinje, én hovedknapp og Hold skjermen på som role=switch/aria-checked. Uten ingredienser åpner hovedknappen redigeringen. Rediger/Åpne lenke/Hent fra lenke ligger i runtime-menyen recipeMenuOpen. Den har data-scroll-key=recipe-menu, fokusnøkler, Escape/fokuslås og samme mønster som radmenyen. Ingen lagret menytilstand.
- descriptionRepeatsTitle i domain/meals.js sammenligner små bokstaver, bindestreker som mellomrom og fjernet tegnsetting/emoji med sammenslåtte mellomrom. Skjul bare gjentatt beskrivelse ved rendering; lagrede data skal aldri ryddes av visningsfunksjonen.
- src/ui/navigation.js eier nettleserhistorikken. navigate() brukes bare fra brukerhandlinger og går videre til uendret setState. render(), setState alene, skydata og synkstatus skal aldri legge til historie. Oppstart merker eksisterende oppføring med replaceState og legger ikke til et mål for tilbake.
- navigationLevels registrerer oppskrift, undersider, editorvern og åpne vinduer. Nye vinduer må både få en historikkoppføring når de åpnes og lukkes av backInApp før foreldrevisningen. Bruk navigate ved åpning/lukking, eller uiHistory.sync etter UI-menyhandlinger. Oppdater nivålisten og tilbakefunksjonen samlet.
- Tilbakeknappen og popstate deler backInApp: vindu først, så oppskrift til previousView, underside til setup og AI-side til editor når aiKeyEditorReturn er satt. Tilbake i editoren leser dagens skjema og forkaster ingenting; historikkoppføringen gjeninnsettes. Andre eksplisitte Avbryt/Lagre-flyter er som før.
- Ved appens lukking/navigering konsumeres eksisterende oppføringer med history.go; nye nivåer legges først inn etter popstate. Raske nye brukerhandlinger under ventingen bruker det siste UI-målet. Ny åpning etter tilbake erstatter framoveroppføringer, slik at gjentatte runder ikke bygger opp historikk. Historikken inneholder bare øktmerke/UI-nivå-ID-er, aldri utkast eller domenekopier. Framover skal ikke gjenåpne forkastet UI. Tilgangs-/synkstopp nullstiller merket med replaceState, uten push.
- Kalender har bare ukelisten. Hver rad er én knapp: planlagt middag åpner oppskrift med riktig dag, ellers Planlegger/dagsark. Dagens rad markeres bare i inneværende uke. Notater vises på én linje med ellipsis; ikke gjeninnfør renderTodaySummary eller dagsblokkens CSS.
- Kjør node tests/app/navigation.test.mjs, meals/week/setup/account/ai-key-render-testene, node tests/app/window-scroll.test.mjs, alle øvrige testskript og syntakskontroller. Ny subpage.js/navigation.js skal stå i begge asset-listene. v109/109, REQUIRED_MIN_APP_VERSION fortsatt 106. Ingen functions/regler/datamodell/synkendring eller nettverk/publisering/Git i leveransen.

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

## Trygg lokal lagring fra v105

- All tilgang til middagsapp-state og middagsapp-membership går gjennom createLocalStore i src/sync/local-store.js. Lesing, JSON-tolking/-skriving og eksplisitt sletting skal aldri kaste, heller ikke når tilgang til selve localStorage er blokkert. Ingen automatisk tømming, fjerning av egne nøkler ved lagringsfeil eller berøring av andre appers nøkler. Utlogging/avvist medlemskap beholder eksisterende eksplisitte flaggfjerning.
- saveState skriver bare PROJECT_DOMAIN_KEYS, projectId og filters. Åpne dialoger, editorutkast, valgt oppskrift, toast og handlelistegjennomgang ligger bare i minnet. Gamle lokale kopier leses fortsatt; normalizeStateForStartup nullstiller også gamle draft-felter. Appen starter fortsatt på Handleliste, med beholdte oppskriftsfiltre; fra v114 starter ukevalget på 0.
- Feilet skriving setter separat localStoreFailed i minnet. En senere vellykket skriving nullstiller det. Feilen skal ikke stoppe render, tilgang, writes eller synkstatus. Vis bare varsellinjen under Oppdatering og versjon, uten toast/dialog. Flagget skal ikke synkes eller lagres.
- onMeals/onWeeks/onItems beskyttes ved levering av snapshots og eventuelle oppskrifts-/ukekvitteringer. publishStatus kjøres også ved callback-feil: Synk feilet til neste vellykkede levering. Hold denne feilen adskilt fra eksisterende Firestore-/skrivefeil; ikke skjul en skrivefeil ved neste vellykkede callback. Ikke endre overlay, kø, løpenummer eller stoppvern.
- Kjør node tests/sync/local-store.test.mjs og node tests/app/local-store.test.mjs, synk-testene for meals/weeks/shopping og tests/render/setup.test.mjs, i tillegg til alle testskript og node --check av kildefilene. Ny local-store-modul må stå i begge service worker-listene.
- APP_VERSION/versjonsvakt er v105/105; REQUIRED_MIN_APP_VERSION forblir 101. Ingen endring i functions, firestore.rules, domenemodell eller publisering inngår.

## Porsjoner og overgang fra v106

- family.familySize betyr standard antall porsjoner og beholder feltnavnet. weeks.servings.<dag> er et eget tall eller null/mangler for standard. servingsForDay i src/domain/weeks.js er eneste oppslag for en dags porsjoner; appens wrapper brukes i planlegger, oppskrift og handleliste. Ikke bak standarden inn i emptyWeekServings, normalizeState, diffWeeks, weeksFromDocs, currentWeeks eller restore.
- Nye uker/Tøm uke bruker null for alle dager. updateDayServings lagrer null når tallet tilsvarer standarden. Eldre eksplisitte tall leses som egne valg, frem til den godkjente adminovergangen for aktuelle/fremtidige uker. Standardendringer skal slå igjennom uten nytt ukebilde.
- Oppskriftsvisningen har −/+ (1–30). Fra en plandag oppdateres den dagen gjennom vanlig ukesynk; fra listen er recipeServingsView bare i minnet og forkastes ved lukking/bytte av oppskrift/tilgang. Legg i handleliste bruker tallet som vises. Ingen nytt oppskriftsfelt.
- scaleAmount bruker enhetens trinn bare ved skalering; uskalert oppskriftstekst beholdes. g/ml: 0,5 under 10, 1 fra 10 til under 20, 5 fra 20 til under 100, 10 fra 100 til under 250, og 25 fra 250. Minste g/ml-verdi er 0,5. kg/l: 0,1; dl: 0,5; ts/ss: 0,25 under 1, ellers 0,5; andre enheter: 0,5 under 3, ellers 1. Midtpunkt opp, aldri 0. Intervallender avrundes hver for seg.
- roundRecipeShoppingItems summerer rå bidrag før avrunding. Sammenslåtte ukebidrag med telte/egne/tomme enheter rundes opp til hele tall. Ikke omavrund allerede lagrede handlevarer eller endre lagret oppskrift. _rawAmount/_scaled er kun UI-bidrag og fjernes før lagring.
- src/sync/servings-defaults.js gjør ett forsøk per tilgangsøkt, bare for online admin med autoritativt ukebilde og familieprofil fra serveren. Serverlest meta må være initialisert, ha bekreftet minimum minst 106 og mangle servingsDefaultsV106:true. Minimum over aktuell appversjon blokkerer også overgangen.
- For ukenøkler fra inneværende uke settes 5 eller gjeldende standard til null. Andre tall og eldre uker beholdes. Patcher går gjennom setState og vanlig weeksSync. waitForWrites venter gjennom 500 ms-vinduet og alle SDK-kvitteringer; avvisning/stopp avbryter uten merke. Meta kontrolleres igjen før admin skriver merket. Feil prøves først ved neste oppstart. Vellykket overgang gir én ikke-blokkerende toast med antall dager.
- Backup v106 fyller manglende dagsverdier med null. Restore validerer null eller tall >=1; kopier før v106 konverterer tall lik kopiens familySize til null, nye kopier beholder egne tall. Meta skrives sist med minimum 106 og servingsDefaultsV106:true etter fullført restore.
- APP_VERSION/versjonsvakt/cache er v106/106, REQUIRED_MIN_APP_VERSION=106. Ny servings-defaults.js står i begge asset-listene. Ingen nettverk, installasjon, publisering, Git eller endring i functions/firestore.rules inngår.
- Kjør node tests/sync/servings-defaults.test.mjs, uke-/mengde-/backup-/restore-/access-/render-/workflow-testene, alle øvrige testskript og node --check av kildefilene. Test særlig standardendring uten nytt snapshot, minnejustering, markør etter kvittering, stopp/avvisning og avrunding etter sammenslåing.

## Uke-visningen fra v112

- Bunnmenyen har Handle, Uke og Oppskrifter. `activeView: "week"` erstatter calendar/planner; canonicalView oversetter gamle navn ved normalisering, navigasjon og retur. Nye økter starter fortsatt på Handleliste, med ukevalg 0 fra v114. Visningsnavn er UI, ikke et nytt domenefelt.
- src/domain/week-view.js beregner ISO-ukenummer, overskrifter/datointervaller, sveip og tidligere planbruk. Sveip må starte minst 24 px fra begge skjermkanter, være minst 60 px vannrett og mer enn 1,5 ganger loddrett avstand. Ikke bytt uke under åpne vinduer. Ekte tilbake-sveip må testes på telefon.
- Lås beskytter bare mot forslag. Manuelle middagsvalg, også på tomme låste dager, er tillatt. Telling og fillWeek/replaceOpenWeek hopper over låste dager og annen plan enn Middag hjemme. rankedSuggestions inneholder eksisterende rangering; pickSuggestion tar første element, og velgeren viser inntil tre kandidater uten allerede brukte middager. Historikkteksten beskriver plansByWeek, ikke faktisk spising.
- Dagsark, middagsvelger, ukemeny og bekreftelse vises ett om gangen. Plan/type og Ikke middag hjemme velges inne i eksisterende vindu. plannerDaySheet/plannerActionsOpen beholder interne UI-navn. mealPickerReturn og weekClearConfirmation bevarer skjult logisk forelder og rulleposisjon/fokus: velger → dagsark → Uke, bekreftelse → ukemeny → Uke. Tøm uka bruker aldri window.confirm og lukker begge nivåer etter bekreftelse.
- weekClearConfirmation og pickerOtherPlans er runtime-tilstand, aldri lokal kopi/synk/backup. Oppskrift åpnet fra Uke beholder ukedagkontekst og samme weekOffset; tilbake går til Uke. render/setState/skydata oppretter ikke historikk. Nye vinduer skal få tilbakehåndtering og data-scroll-key på faktisk rullende element, med stabile data-focus-key-kontroller. Fra v112: planner-day på .week-sheet-body, week-menu, week-clear og picker-plans på sine rullbare beholdere.
- Kjør de tre week-testene, tests/app/navigation.test.mjs, tests/app/window-scroll.test.mjs, tests/app/weeks-sync.test.mjs og alle øvrige tests/ og functions/tests/ samt node --check av kildefilene. De fjernede kalender-/planlegger-render-testene er erstattet av week.test.mjs. Nye domain/week-view.js og render/week.js står i begge service worker-listene; gamle render/calendar.js og render/planner.js fjernes. v112/112, REQUIRED_MIN_APP_VERSION 106; ingen endring i synk, datamodell, functions eller regler.

## Middagsvelger på telefon fra v113

- Ingen autofocus-attributt eller ubetinget søkefokus i bindEvents. openMealPicker fokuserer/selecter søket bare når matchMedia("(pointer: fine)") stemmer, med preventScroll. På berøringsskjerm åpnes velgeren uten automatisk fokus. Vanlig render beholder bare faktisk fokus fra v108, også når brukeren selv har åpnet tastaturet.
- Middagskort og forslagstitler bruker --text. Grønn valgt-ramme styres bare av .selected for dagens middag; hover endrer bare bakgrunn på enheter med hover og fin peker. Tastaturfokus tegnes med :focus-visible, og fokus fra berøring skal ikke se ut som et valgt kort.
- Knappen Ikke middag hjemme ligger fortsatt i fast footer. Notatfeltets plassholder er anonym. Kjør tests/app/window-scroll.test.mjs, tests/app/week.test.mjs og tests/render/week.test.mjs samt alle øvrige testskript og syntakskontroller. Klienten er v113/113; REQUIRED_MIN_APP_VERSION forblir 106.

## Ukevalg, forslag og velgerfiltre fra v114

- weekOffset lagres ikke. normalizeStateForStartup ignorerer også eldre kopiers ukevalg. Nye økter starter fortsatt på Handle, men med denne uka valgt. Ved synlig retur etter mer enn 30 minutter i bakgrunnen, eller ukeendring, settes offset 0 via vanlig render uten navigate/history.
- Åpne planvinduer må beholde planningWindowWeekKey i minnet; valg og skriving skal aldri skifte til feil uke ved bakgrunnsretur. Root-visningen bruker eksplisitt weekOffset, vindusfunksjonene den bundne uka. Retur mellom dagsark/velger og meny/bekreftelse beholder konteksten. Siste lukking og tilgangsstopp forkaster den.
- Nye poeng: dagstype +22/+10/−20 for samsvar/uten merker/annet merke; favoritt +10 og barnevennlig +6. Rask +25 på raske dager og rester +6 beholdes. Straff 0–28 dager beholdes; deretter +2 per hel uke siden, maks +30; aldri planlagt +25. Recency bruker nærmeste avstand i alle planer, også framtid, med kalenderdager normalisert til samme klokkeslett. Hash gir 0–15 per uke/dag/meal-id. Ingen Math.random.
- Kategorimål og plannedTooClose beholdes. rankedSuggestions/pickSuggestion er ren poengrangering for forslagkommandoene. Bare velgeren bruker selectPickerSuggestions: behold de to beste, og velg blant øvrige først beste aldri planlagte, ellers beste med minst 56 dagers nærmeste planavstand, ellers nummer tre etter poeng. De to første får også Aldri i planen/Ikke i planen på lenge når de kvalifiserer; de hindrer aldri utvelgelse av en egen kandidat blant øvrige. Filtrer før den faste plassen velges. Poengene og v114-versjonen er uendret i rettingen før publisering.
- suggestionScoreBreakdown i domain/suggestions.js er bare for tester/feilsøking. Delpoeng vises aldri i UI. 52-lørdagstesten skal oppfylle eiers presiserte grenser og rapportere faktisk resultat.
- pickerFilters og pickerOtherPlans er runtime. Filtre gjelder kun velgeren, nullstilles ved lukking/tilgang og lagres aldri. Filterraden ruller vannrett; capture/restoreWindowPositions bevarer scrollLeft sammen med scrollTop. Planpanelet erstatter footerknappen med overskrift, egne valg og Avbryt. Keyboard-click fokuserer første valg, aldri søket på touch.
- Kjør suggestions-, week-, window-scroll- og local-store-testene samt alle øvrige tester og syntakskontroller. v114/114, REQUIRED_MIN_APP_VERSION 106. Endringen i sync/local-store.js gjelder bare lokal cache, ingen skysynk eller datamodellendring.

## Passer til-filter fra v115

- Filterraden bruker suitabilityEntries() i samme rekkefølge og med samme navn som Innstillinger, etter Favoritter og før kategoriene. To aria-hidden skillelinjer er 1 px --line og 24 px høye; raden ruller fortsatt vannrett på én linje.
- pickerFilters.suitability er én nøkkel eller tom streng. Bytte erstatter forrige valg; trykk på aktivt valg slår det av. mealMatchesPickerFilters krever at meal.suitability inneholder nøkkelen; uten merker vises ikke middagen. Filtrene og søket gjelder både forslag og liste, før fast plass velges.
- Feltet er kun runtime som øvrige velgerfiltre. Lukking, Fjern filtre og tilgangsbytte nullstiller det. Ingen ny lagring, datamodell eller poengmodell. Kontroller suggestions-, window-scroll- og week-render-testene samt alle øvrige tester og syntakskontroller. v115/115, REQUIRED_MIN_APP_VERSION 106.

## Oppskriftskort fra v116

- Et oppskriftskort er en article uten data-view-meal, med to søskenknapper: hovedknappen dekker tittel/merker og har data-view-meal samt aria-label med tittel; blyanten har data-edit-meal og Rediger + tittel. Aldri legg knapper inni hverandre eller gjør article klikkbar igjen. Native button gir tastaturtilgang til begge handlinger.
- pencilIcon i src/render/icons.js er eneste SVG-kilde for blyanten i Uke/Oppskrifter. .pencil-button er eneste felles størrelses-/fargeregel: 44×44, SVG 18 px, --muted, gjennomsiktig og uten ramme. weekIcon delegerer pencil til samme funksjon; Uke beholder bare sin ytre marg. Ikke gjeninnfør tekstsymbolene for rediger/åpne.
- Nye icons.js må være i begge service worker-listene. Kjør render/meals-, render/week- og app/window-scroll-testene samt alle øvrige tester og syntakskontroller. v116/116, REQUIRED_MIN_APP_VERSION fortsatt 106; ingen datamodell- eller synkendring.
