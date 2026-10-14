# Arkitektur

Middagsapp er en statisk nettapp/PWA uten byggsystem. Den kan kjøres direkte fra en enkel lokal webserver og publiseres som statiske filer, for eksempel på GitHub Pages.

## Overordnet struktur

- `index.html` er inngangspunktet. Den laster CSS, manifest, loading screen og `app.js`.
- `app.js` inneholder hoveddelen av appen: data, state, rendering, hendelser, forslagmotor, handlelisteflyt og Firebase-synk.
- `src/domain/meals.js` inneholder rene oppskrifts- og måltidshjelpere som kan testes og videreutvikles uten UI.
- `src/domain/shopping.js` inneholder rene mengde- og handlelistefunksjoner som kan testes og videreutvikles uten UI.
- `src/domain/backup.js` bygger en versjonert eksport av domenedata og et datert filnavn. Modulen kjenner ikke UI, nedlasting eller Firebase.
- `src/domain/suggestions.js` inneholder rene poengregler for forslagmotoren, mens historikk og state fortsatt eies av `app.js`.
- `src/domain/weeks.js` inneholder rene uke- og datofunksjoner som kan testes og videreutvikles uten UI.
- `src/sync/firebase.js` laster Firebase SDK, følger innloggingsstatus og tilbyr Google-innlogging fra knappetrykk.
- `src/sync/access.js` håndterer prosjektmerket cache, medlemskontroll, offline-tilgang og versjonsvakt.
- `src/sync/restore.js` validerer og oppsummerer sikkerhetskopier, bygger dokumentlisten og utfører eksplisitt oppsett med enkeltstående writes.
- `src/render/account.js` tegner tilgangsskjermene og Konto og medlemmer.
- `src/sync/weeks.js` bygger ukediffer per dag/felt og standardutfylte snapshots, samler writes i 500 ms og beskytter ventende lokale endringer.
- `src/sync/state.js` inneholder rene synkbeslutninger: hvilke scopes som er endret og når remote data er eldre enn lokale endringer, samt listen over seks ukefelter.
- `src/sync/writes.js` bygger Firestore writes for de ulike sync-scopene uten å eie appens render- eller statusflyt.
- `src/sync/shopping.js` håndterer migrering og separat varebasert handlelistesynk fra v93.
- `src/sync/meals.js` håndterer oppskriftsdiffer og synk per dokument fra v100, med minnekø og vern for ventende lokale oppskriftsendringer.
- `src/sync/version.js` definerer felles REQUIRED_MIN_APP_VERSION for administratorheving og gjenoppretting.
- `src/render/shopping.js` inneholder HTML-malene for handlelistevisningen, vareeditor, vareforslag og shopping review modal.
- `src/render/icons.js` inneholder felles pencilIcon for redigeringsknappene i Uke og Oppskrifter.
- `src/render/meals.js` inneholder HTML-malene for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/domain/week-view.js` beregner ISO-ukenummer, datointervaller, visningsnavn, sveipeterskler og tidligere planbruk.
- `src/render/week.js` tegner Uke-visningen, dagsark, ukemeny og bekreftelse.
- `src/render/setup.js` inneholder HTML-malene for Innstillinger, familie-/app-undersider og enkle metadata-sider.
- `styles.css` inneholder alle visuelle regler.
- `service-worker.js` håndterer cache, offline-støtte og oppdateringsflyt.
- `manifest.json` definerer PWA-navn, farger og ikoner.
- `icons/` inneholder appikonene.
- `tests/` inneholder enkle Node-baserte tester for rene domene-funksjoner.

## Runtime-modell

### Undersidetopp og navigasjon fra v109

Fra v111 erstatter middagsvelgeren dagsarket når den åpnes fra arkets Velg middag-knapp. openMealPicker lukker dagsarket og åpner velgeren i én UI-patch. mealPickerReturn holder returdag og den eksisterende data-scroll-key=planner-day-posisjonen i minnet. navigationLevels beholder den skjulte dagen som logisk forelder, slik at popstate går velger → dagsark → plan uten to samtidige vinduer. closeMealPicker brukes ved vanlig valg, tømt valg, hurtigmiddag, ×, bakgrunnstrykk og tilbake. Returpatchen gjenåpner samme dag med oppdatert plan, og restoreWindowPositions gir tilbake rulleposisjon og fokus på Velg middag-knappen. Direkte åpning fra ⇄/+ har ingen slik retur og virker som før. Returtilstanden fjernes ved visnings-/tilgangsbytte og synkstopp, og lagres ikke lokalt/synkes/eksporteres. Ingen z-index-, CSS- eller History-controller-endring er nødvendig.

src/render/subpage.js gir én felles sticky toppstripe med ‹ Tilbake, safe-area-padding og valgfri handling til høyre. Oppskrift og alle Innstillinger-undersider bruker den; globalt brand-toppfelt skjules der, slik at tilbake ligger øverst til venstre. Editorens egen stripe er beskrevet under v117. Oppskriften viser tittel, eventuell beskrivelse, fra v118 kildelenke, porsjoner, hovedknapp og wake-lock-bryter før innholdet. Manglende ingredienser gir Legg inn oppskrift. Fra v118 er menyen fjernet og Rediger står direkte i toppstripen. descriptionRepeatsTitle i domain/meals.js skjuler beskrivelser som gjentar tittelen etter normalisering, uten å endre lagrede oppskrifter.

src/ui/navigation.js håndterer history.pushState, replaceState, go og popstate uten avhengighet til synk eller domenemodell. Eksisterende oppstartsoppføring merkes med replaceState; oppstart legger ikke til noen ny oppføring. app.js sin navigate() er inngangen fra brukerhandlinger og kaller dagens setState før historikkens sync. Vanlig setState, render og sky-/statuscallbacks lager ingen oppføringer.

navigationLevels avleder aktive UI-nivåer: oppskrift/underside, editorvern og åpne vinduer. Historikken lagrer øktmerke og nivå-ID-er, aldri domenedata/utkast. Nye nivåer legges med pushState. Når et nivå lukkes av appen, konsumeres eksisterende oppføringer med go; controlleren venter på popstate før et eventuelt nytt nivå legges inn. Under ventingen beholdes brukerens siste UI-mål. Tilbake + ny åpning erstatter framoverdelen, slik at antall oppføringer ikke øker for hver runde. Framover gjenåpner ikke forkastet redigering eller gamle vinduer. Ved tilgangs-/synkstopp byttes øktmerket med replaceState; ingen push skjer.

backInApp deles av ‹ Tilbake og popstate. Prioriteten er oppskriftsmeny/radmeny, handlelistegjennomgang, handledager, middagsvelger, dagsark/forslagsark, deretter foreldrevisning. Oppskrift går til previousView, Innstillinger-underside til setup, og AI åpnet fra editor tilbake til den editoren. Er editoren selv åpen, leses ulagret skjema og tilbake avvises; browserens editoroppføring gjeninnsettes. Tilbake lukker derfor radmenyen først, og neste tilbake bevarer utkastet. Nye vinduer skal registreres både i navigationLevels og backInApp, og UI-handlingene skal bruke navigate/sync.

Kalender har kun ukeliste etter v109. renderTodaySummary/renderTodaySummaryView og tilhørende CSS er fjernet. Hele dagsraden er en knapp med beskrivende aria-label og ›. Planlagt middag bruker eksisterende oppskriftsåpning med dag-/ukekontekst; ellers åpnes Planlegger med dagsarket. Dagens merke gjelder bare faktisk dato i den valgte uken. dayNotes vises på én linje med ellipsis. Ingen ukedata eller synk endres.

Lokale tester bruker DOM- og asynkrone History-stubber. iPhone-hjemskjermappens systemgester, Safari/Android tilbake, safe-area ved rotering og fysisk wake lock må prøves på ekte enhet etter eiers publisering. Ny subpage.js/navigation.js står i begge service worker-listene, uten strategiendring. Klienten er v109/109 og minsteversjonen forblir 106.

### Vinduenes rulleposisjon fra v108

render() bruker captureWindowPositions før innerHTML erstattes og restoreWindowPositions etter rendering og hendelsesbinding. Hvert faktisk rullende vinduselement har en stabil data-scroll-key. Kopien av scrollTop ligger bare i dette render-kallet; det finnes ingen varig posisjonshistorikk eller nye state-/lagringsfelt. Når vinduet forsvinner, har neste render ingen gammel nøkkel å hente. En ny åpning starter derfor øverst.

| Nøkkel | Element | Grunnlag i CSS |
|---|---|---|
| shopping-review | .shopping-review-backdrop | Fast bakgrunn med overflow-y:auto både på PC og mobil. Modal og body har overflow:visible og ingen maks-høyde som gir egen rulling. |
| generate-days | .gen-modal-list | overflow-y:auto og flex:1 innenfor høydebegrenset .modal. |
| planner-day | .week-sheet-body i dagsarket | overflow-y:auto og min-height:0 innenfor høydebegrenset .week-sheet. |
| week-menu / week-clear | .week-sheet-body i ukemenyen/bekreftelsen | Samme høydebegrensning og egen overflow-y:auto; vinduene erstatter hverandre. |
| picker-plans | .picker-plan-choices | max-height:30vh og overflow-y:auto for mange alternative planvalg inne i velgerens footer. |
| meal-picker | .meal-picker-list | overflow-y:auto/flex:1 med max-height:60vh på PC; på mobil min-height:0 inne i et 100dvh-vindu med overflow:hidden utenfor listen. |
| editor-row-menu | .editor-row-menu-actions | overflow-y:auto inni .editor-row-menu med max-height:75vh og overflow:hidden på modalen. |

Fokusbare kontroller har data-focus-key, med identitet fra vare-ID, handledato, plandag eller gruppeindeks ved gjentatte rader. Alle/Ingen, lukkeknapp og bekreftelsesknapp har forskjellige handlingsnøkler. Fokus registreres bare dersom det aktive elementet tilhører samme .modal-backdrop som rullelisten, slik at også topp-/bunnkontroller bevares. Etter utskifting finnes riktig kontroll innenfor samme vindu ved tekstsammenligning av nøklene, og får focus({preventScroll:true}). Deretter settes scrollTop; begge deler skjer synkront før neste tegning. En kontroll som ikke lenger finnes, ignoreres. Tellere og valgt-status kommer fortsatt fra dagens renderer/state, og middagsvelgerens sidelås er uendret.

Nye vinduer med egen rulleliste skal merkes på det faktisk rullende elementet etter gjennomgang av CSS og mobilregler, og kontrollene skal få stabile fokusnøkler. Testene i tests/app/window-scroll.test.mjs kjører ekte render/setState og hendelsesbinding med lokale DOM-stubber som erstatter alle elementer ved innerHTML. Ingen nettverk eller nettleseroppstart er nødvendig. v108 endrer ingen synk, datamodell, regler eller minsteversjon (106).

Appen har ingen bundler og ingen installerte npm-avhengigheter. Lokale moduler importeres direkte som ES-moduler. Firebase SDK lastes dynamisk fra Google CDN i `src/sync/firebase.js`.

Oppstart:

1. `index.html` viser loading screen.
2. `app.js` leser prosjektmerket state fra `localStorage`. Manglende/ulik prosjekt-ID gir tomme domenedata. Nye økter starter på Handleliste.
3. Firebase melder innloggingsstatus. Lasteskjermen beholdes mens status og tilgang kontrolleres. Uten innlogging vises bare Google-knappen; popup åpnes kun fra knappetrykk, med kontovalg.
4. Innlogget bruker må ha verifisert e-post og gyldig rolle i eget medlemsdokument. Deretter leses `app/meta` fra serveren. Uten markør vises oppsettskjermen; for høy minimumsversjon viser oppdateringsskjermen.
5. Først etter godkjent medlemskap, oppsett og versjon vises appen og domenesynken startes. En tidligere godkjent enhet kan åpne lokale data uten nett med «Lokal lagring».
6. Remote data kan patche lokal state og trigge ny render. Meta-lytteren stopper all synk hvis oppsettet fjernes eller minimumsversjonen økes over appens numeriske versjonsnummer (103 fra v103). Online administratoroppstart hever minimumet til REQUIRED_MIN_APP_VERSION (101) med én best-effort updateDoc når det er lavere; ved feil fortsetter appen og neste oppstart prøver igjen. Vanlige medlemmer og offline-oppstart skriver ikke meta. Etter tilgangsvern startes mealsSync, shoppingSync og weeksSync sammen, deretter tre scope-lyttere for profil/preferanser/metadata.

Fra v92 kjører et vanlig innebygd skript i `index.html` før appmodulen. Det fanger feil før første render, inkludert lastingsfeil på appens script-element via en fangende `window.error`-lytter. Hvis appflaten fortsatt er tom etter 12 sekunder, vises samme feiltilstand: spinneren skjules, en forklaring vises og brukeren kan laste siden på nytt. En MutationObserver avslutter overvåkingen når appen har rendret. Eksisterende `hideLoadingScreen()` fjerner lasteskjermen også etter sen oppstart. Vernet er uavhengig av appens modulimporter og endrer ikke lagring, cacher eller navigasjon.

## Hovedområder i `app.js`

`app.js` er foreløpig en stor fil. Den kan leses som disse logiske områdene:

- Konstanter og standarddata.
- `defaultState` og state-normalisering.
- State/persistens: `loadState`, `saveState`, `setState`.
- Importert domenelogikk: oppskrift/måltid fra `src/domain/meals.js`, mengder/handleliste fra `src/domain/shopping.js`, forslagpoeng fra `src/domain/suggestions.js` og uke/dato fra `src/domain/weeks.js`.
- Importert synklogikk: Firebase-oppkobling fra `src/sync/firebase.js`, egen operasjons-/snapshotflyt i shopping/meals/weeks-modulene, konflikt-/scopebeslutninger fra `src/sync/state.js` og write-bygging fra `src/sync/writes.js`.
- Importert renderlogikk: uke-HTML fra `src/render/week.js` og oppskrifts-HTML fra `src/render/meals.js`, innstillings-HTML fra `src/render/setup.js` og handleliste-HTML fra `src/render/shopping.js`.
- Synk-hjelpere og Firestore payloads.
- Rendering av modal- og komponentdeler.
- Kalender, planlegger, oppskrifter, handleliste og oppsett.
- Mutasjoner: oppdatere plan, oppskrifter, handleliste, metadata.
- Event-binding i `bindEvents`.
- App-rendering og service worker-registrering.
- Firebase-init, listeners og remote save.

Primærnavigasjonen ligger i bunnbaren og viser de fire daglige arbeidsflatene: Handle, Kalender, Planlegger og Oppskrifter. Innstillinger er en sekundær flate som åpnes fra tannhjulknappen i toppbaren, slik at administrasjon og metadata ikke konkurrerer med de vanlige middagsflytene.

## State og rendering

Appen bruker en enkel global `state`. Endringer skjer hovedsakelig via `setState(patch)`.

`setState` gjør flere ting samtidig:

- merger patch inn i global state
- markerer synced data som endret
- lagrer til `localStorage`
- renderer hele appen
- håndterer wake lock
- planlegger remote save

Dette er praktisk, men gjør funksjonen kritisk. Endringer her bør gjøres forsiktig.

Oppskriftssøk oppdaterer trefflisten direkte mens brukeren skriver, uten full `setState` for hvert tastetrykk. På mobil vises de første treffene som kompakte, trykkbare forslag rett under søkefeltet, slik at de fortsatt er synlige når tastaturet dekker nedre del av skjermen. Full oppskriftsliste og filtre beholdes under forslagene.

Planleggerfanen bruker en oversikt-først-modell: hovedflaten viser kompakte dagkort for uken, mens redigering av planstatus, middag, type, porsjoner og notat skjer i et bottom sheet for valgt dag. Ukeforslag åpnes fra en fast handlingsknapp og viser valg for å fylle ledige dager, bytte åpne forslag eller senere koble på nye middager fra eksterne kilder. Denne flyten bruker eksisterende uke- og planstate og endrer ikke Firestore-dataformatet.

Fra v91 kan middagsvelgeren opprette en hurtigmiddag direkte fra søket. Eksakt tittelmatch (uten hensyn til store/små bokstaver) skjuler opprettingsraden. Enter oppretter bare når søket har null treff. Middagen bruker eksisterende format, uten kategori eller tilberedningstid. Oppretting og plassering i valgt uke skjer i én domenepatch; eventuell toast er en separat UI-patch. Oppskriftslisten og detaljvisningen bruker den rene `mealNeedsRecipe`-funksjonen for å vise manglende oppskrift.

`getStoreCategories()` bruker `orderStoreCategories` fra handledomenet. Den lagrede nøkkelrekkefølgen brukes i handlelisten og kategorivelgere, mens automatisk ingredienskategorisering beholder sin tidligere prioritet. Flytting endrer bare metadata og gjenoppretter sidens scrollposisjon.

## Sikkerhetskopi

Innstillinger → Oppdatering og versjon tilbyr en lokal JSON-eksport. `app.js` sender en kopi av `syncPayload()` til `buildBackup` og håndterer filnedlasting eller deling. Eksporten inkluderer familie, preferanser, metadata, middager, alle lokale uke-maps, handleliste og `clientUpdatedAt`, men ikke UI-state eller Firebase-innlogging.

Filen har `app: "middagsapp"`, `exportVersion: 1`, `appVersion`, `familyId`, `exportedAt` og `data`. Filnavnet bruker enhetens lokale dato; `exportedAt` er et ISO-tidspunkt i UTC. Filen kan inneholde familienavn, notater og andre private opplysninger og bør oppbevares privat.

Eksporten er et øyeblikksbilde av denne enheten, ikke en bekreftet fersk kopi fra Firestore. Den venter ikke på synk og skriver ikke remote data. Fra v92 brukes Web Share API bare når fil-deling støttes og `matchMedia("(pointer: coarse)").matches` er sann. Ved fin peker brukes alltid en Blob-lenke med `download`, også når Windows rapporterer støtte for deling. `AbortError` avslutter uten nedlasting eller ny toast. Andre delingsfeil faller tilbake til lenkenedlasting. Hvis nedlastingen også feiler, logges feilen med `console.error` og en feil-toast vises. Toasten «Sikkerhetskopi lagret.» betyr at nettleseren har startet nedlasting eller fullført deling, ikke at appen kan kontrollere hvor filen ble lagret. Eksplisitt gjenoppretting ved databaseoppsett finnes fra v95, som beskrevet nedenfor.

## Oppskriftsimport fra v96

Editoren tilbyr import fra lenke eller innlimt tekst for nye og eksisterende oppskrifter, når innlogget medlem er på nett. `src/sync/recipe-import.js` laster Functions SDK ved første bruk og kaller importRecipe i europe-west1 med 70 sekunders klienttimeout. Firebase-klienten eksponerer firebaseApp til denne adapteren. Dette endrer ikke innlogging eller domenesynk.

Resultatet går gjennom `src/domain/recipe-import.js` og fyller bare draftMeal/draftIngredients/draftSteps. Fra v97 behandles ingredienser og steg uavhengig: importen fyller tomme deler, og spør før den erstatter deler som finnes både i import og utkast, også for nye oppskrifter. Et nei bevarer disse delene, mens tomme deler fortsatt fylles. Importerte porsjoner følger ingrediensene bare når servingsKnown ikke er false. Tom tittel er gyldig på serveren ved delvis innhold; tomme importfelter tømmer aldri utfylt metadata. Eksisterende oppskrifter beholder utfylt metadata som før. Meldingen teller bare ingredienser/steg som faktisk ble fylt inn og veileder til tekstimport for manglende deler. Importen skriver ikke localStorage, meals eller Firestore. Fra v105 mellomlagres ingen editorutkast eller midlertidig UI i localStorage; utkastene lever bare i minnet, og gamle utkast nullstilles ved oppstart. Oppskriften lagres bare fra dagens Lagre-knapp. Avbryt eller kontobytte gjør sene importsvar ugyldige.

`mealCanImportFromLink` styrer detaljsnarveien for en oppskrift med lenke, men uten ingredienser og steg. `mealNeedsRecipe` er uendret. Importfelt, meldinger, warnings og bruksstatus er midlertidig runtime-state utenfor domenepayload. Skjemainput fanges lokalt under venting, slik at render/statusendringer ikke mister det brukeren skriver.

Serveren består av en tynn functions/index.js-adapter med Admin SDK/Functions SDK og rene CommonJS-moduler i functions/lib. Kun firebase-admin og firebase-functions installeres ved publisering; tester kjører uten disse. Medlemssjekk krever verifisert e-post og medlemsdokument. En enkelt dokumenttransaksjon teller felles bruk i families/familien/private/importUsage: fra v104 maks 20 kall per rullerende 10 minutter og 150 per UTC-døgn, før sidehenting og AI. Klientreglene avviser private-stien; regler og domenemodell er uendret.

Sidehenting bruker https, maks tre manuelt validerte omdirigeringer, alle DNS-svar kontrollert og socket bundet til validert IP for å unngå nytt ukontrollert oppslag. Lokale/private adresser og IP som vertsnavn avvises. Bare text/html aksepteres, maks 1 500 000 byte og samlet 10 sekunder inkludert DNS og omdirigeringer. Sosiale lenker ber om innlimt tekst. Sosial sourceUrl i tekstmodus beholdes som referanse og hentes ikke.

Uttrekk finner første Recipe i JSON-LD, inkludert lister, @graph og HowToSection. Fra v97 regnes det som fullstendig bare med minst to ingredienser, mengdetegn i minst halvparten og minst én instruksjon (source jsonld). Mangelfulle data kombineres som structured og pageText (jsonld+page-text); uten Recipe brukes page-text, og innlimt tekst gir pasted-text. Én ingrediensstreng beholdes inntil 2000 tegn. Samlet AI-inndata er maks 20 000 tegn; strukturert JSON avgrenses med hele poster, med første instruksjon bevart, og sidetekst forkortes også med hensyn til JSON-escaping.

HTML skannes i lineær tid. script/style/nav/header/footer/select/datalist/noscript/svg/template/iframe fjernes, mens form beholdes. Første main til siste main-slutt brukes når renset tekst har minst 500 tegn. Tittelen fra og:title eller title står først innenfor sidetekstens 16 000 tegn. Lengre tekst får et sammenhengende vindu med flest mengde/enhet- og oppskriftsord-signaler, valgt med to monotone pekere; uten signaler brukes starten. AI instrueres til å hente manglende mengder og steg fra pageText og godta delvis innhold uten å dikte. Responses-kallet bruker store:false og maks 8000 output-tokens. Ett nytt forsøk ved 429/5xx deler samme 45 sekunders budsjett. Fra v102 har bildemodus 90 sekunders samlet AI-budsjett med ett nytt forsøk; lenke/tekst beholder 45 sekunder. En overordnet 115 sekunders abortvakt inkluderer medlemskontroll og telling, innenfor funksjonens 120 sekunder/512 MiB. AI-svaret valideres og begrenses før det sendes tilbake. Tomt oppskriftsinnhold avvises; servingsKnown beskriver kjent antall, mens baseServings alltid er et tall (4 når ukjent) for v96-kompatibilitet. servingsKnown lagres ikke på oppskriften.

Funksjonene logger funksjonsnavn, kode, varighet og eventuell providerStatus. Import logger også source når kilden er kjent, bare fra jsonld, jsonld+page-text, page-text, pasted-text eller image. Ved bildeimport tillates imageCount (1–4). providerCode fra OpenAI tillates bare etter /^[a-z0-9_]{1,40}$/ uten ekstra blanke tegn. AI_INVALID_RESPONSE og aiModelSave sin prøveimport kan ha reason fra den faste listen incomplete, no_text, no_json, shape. importRecipe og aiModelSave kan logge model bare i gyldig modellformat uten ekstra blanke tegn. Bare ved INTERNAL tillates errorName med 1–40 bokstaver og errorCode som heltall eller 1–40 tegn fra bokstaver, sifre, understrek, skråstrek og bindestrek, uten prefiks sk-. Ingen råtekst, sideinnhold, e-post, nøkkel, vertsnavn, tokenbruk, bildedata, bildestørrelser i byte, filnavn, error.message, stack eller øvrige feilfelter. Logging er best effort og kan ikke velte et kall. Fra v104 velges gyldig private/aiConfig.model før OPENAI_RECIPE_MODEL og DEFAULT_MODEL. Tekst sendes til OpenAI med store: false, men importen oppretter ingen oppskriftsdokumenter på serveren. Functions-publisering kan utføres av agenten etter uttrykkelig utviklerbeskjed fra eier, alltid med --only functions og riktig --project. Functions skal ikke caches av service worker.

De siste v96-rettingene avviser tom lenke og tekst med under 20 tegn etter trimming i både app og importklient, før busy eller serverkall. Nøkkelklienten tømmer feltet straks, trimmer rundt verdien og avviser tom/ugyldig verdi lokalt. SDK-feil skiller mellom ugyldig inndata, manglende tilgang og nettverksfeil. Status unavailable vises som «Kunne ikke kontrolleres» og blokkerer ikke import når nøkkel finnes; bare manglende nøkkel eller invalid blokkerer.

### OpenAI-nøkkel i appen (utvidelse av upublisert v96)

Innstillingssiden «AI og oppskriftsimport» bruker src/sync/ai-key.js og src/render/ai-key.js. Functions-SDK lastes ved første bruk. aiKeyStatus er tilgjengelig for alle verifiserte medlemmer; aiKeySave, aiKeyTest og aiKeyDelete krever administratorrolle kontrollert av serveren. Samtlige kjører i europe-west1, med maks tre instanser og 30 sekunders tidsgrense. Bare aiKeySave, aiKeyTest og importRecipe bindes til KEY_ENCRYPTION_SECRET.

functions/lib/keys.js bruker Node crypto: AES-256-GCM, HKDF-SHA256 med salt middagsapp-openai-key-v1, tom info og 32-byte avledet nøkkel, tilfeldig 12-byte IV og dokumentstien som AAD. Feil hemmelighet, endret innhold eller ukjent krypteringsversjon gir ingen klartekst. Dokumentet families/familien/private/openaiKey inneholder kryptert innhold og begrenset statusinformasjon; Admin SDK er eneste leser/skriver. Eksisterende Firestore-regler avviser private-stien for klienter.

functions/lib/key-service.js eier tilgang, validering og nøkkelflyter uten Firebase-avhengigheter. Før lagring kontrolleres nøkkelen med GET /v1/models/{modell}, maksimalt 15 sekunder. 401/403, 404 og øvrige feil gir norske meldinger og beholder forrige lagrede nøkkel. Save, test og aiModelSave deler 10 kontroller per rullerende 10 minutter i private/keyUsage. Test oppdaterer status/checkedAt; delete sletter bare nøkkeldokumentet. Transaksjoner berører ett privat dokument om gangen. Sene statusoppdateringer sammenligner kryptert innhold og kan verken merke en ny nøkkel ugyldig eller gjenopprette en slettet nøkkel.

importRecipe henter og dekrypterer nøkkelen etter medlems- og inndatakontroll, før importUsage telles. Manglende eller uleselig nøkkel gir AI_NOT_CONFIGURED uten å bruke importkvote. Uleselig innhold markeres invalid slik at klienten viser behov for nytt oppsett; 401/403 under import markerer også den brukte nøkkelen invalid. Administrator må legge inn nøkkelen på nytt etter bytte av krypteringshemmeligheten.

Klartekst finnes bare midlertidig i passordfeltet, den utgående HTTPS-forespørselen og serverminnet. Den inngår aldri i appens state, localStorage eller sikkerhetskopi. Feltet tømmes synkront når Lagre og valider trykkes, også før SDK-lasting er ferdig. Ufarlig status og en maske med maksimalt åtte nøkkeltegn holdes bare i minnet. Status hentes når editoren eller innstillingene åpnes; sene svar etter tilgangs-/brukerbytte ignoreres. Manglende/invalid oppsett erstatter importknappene med veiledning. Administrator kan gå til AI-innstillinger og tilbake med utkastet beholdt.

## Ingrediensgrupper og import fra v98

Fra v107 kan ingredienser og steg flyttes via ⋯-menyer i oppskriftseditoren. Menyen rendres utenfor skjemaet som en dialog i appen, med tastaturfokus innenfor dialogen, Escape og lukking ved trykk på bakgrunnen. editorRowMenu i app.js holder bare editor-ID, radtype og indeks i minnet; kontobytte/stopp av synk og lukket/byttet editor eller visning forkaster den. Menyen lagres ikke i domenestate, lokal kopi, sikkerhetskopi eller Firestore.

ingredientEditorGroups/ingredientEditorGroupIndex i domain/meals.js bygger gruppemål fra overskriftenes radindekser. Flytt opp/ned bytter naborader; kryssing av en overskrift endrer dermed gruppen. moveIngredientToGroup setter en ingrediens nederst før målgruppens neste overskrift. Like/tomme overskriftstekster identifiserer fortsatt forskjellige editorgrupper, og tom tekst vises som Overskrift uten navn. Rader før første overskrift utgjør Uten overskrift; dagens gruppe utelates fra menyen. + Ingrediens under hver overskriftsgruppe bruker insertIngredientInGroup og fokuserer den nye radens mengdefelt.

Hver handling leser først hele skjemaet med syncMealEditorDraftFromDom. Ulagrede mengder, navn, enheter, overskrifter, oppskriftsfelter og steg bevares gjennom render. Flytting fokuserer radens ⋯-knapp og ruller den inn i synsfeltet. Stegnummereringen følger den nye rekkefølgen, og siste fjernede ingrediens/steg erstattes av en tom rad. Lagring bruker fortsatt editorRowsToIngredients og dagens Lagre-flyt, uten nytt dataformat eller endret synk. Mobilraden har samme samlede kolonnebredde som før, med plass omfordelt til 44 px radknapp; radvalgene åpnes som et rullbart ark nederst. Klientversjon/cache er v107/107 og minsteversjonen er fortsatt 106.

group er et valgfritt tekstfelt på ingrediensen, trimmet til maks 60 tegn og utelatt når tom. Det bevares av normalizeIngredients, eksisterende meals-writes, sikkerhetskopi og restore uten endring i dokumentstruktur eller regler. Tilgangsmodulen hever minimum til 98 bare for online administrator; restore skriver også 98. Den separate meta-oppdateringen beskytter mot eldre klienter som fjerner grupper ved lagring, og er ikke del av vanlig domenesynk.

Rene hjelpere i src/domain/meals.js oversetter mellom lagrede ingredienser og editorrader. Overskriftsrader ligger i draftIngredients og har fullbreddefelt med flytt-/fjernknapper. Lagring avleder gruppen fra nærmeste overskrift. Fjerning flytter til gruppen over, mens en blank overskrift starter en ugruppert del og ikke lagres. Render og AI-innstillinger beholder utkastet; stegimport bevarer ingrediens-/overskriftsrader. Ved ingrediensimport følger overskriftene den importerte listen. Visningen viser én overskrift per sammenhengende gruppe og fremhever navnet før første komma, med kommentarer i vanlig skrift.

ingredientBaseName brukes når oppskrifter lager handlevarer, når keyIngredients bygges og i vareoppslag/forslag/søk. Dermed kan for eksempel hvitløk med og uten tilberedningskommentar summeres på samme navn/enhet. Lagrede navn og manuelt innskrevne handlevarer omskrives ikke. parseAmount er uendret; egne intervallhjelpere skalerer begge ender og bruker maksimum ved varegenerering og sammenslåing.

AI-instruksen ber om kildebaserte ingrediensgrupper, kommentar etter komma, numeriske intervaller, tydelig recipeYield/porsjonstekst og kort beskrivelse uten emojier/emneknagger/tittelgjentakelse. Servernormalisering tillater intervaller og fjerner enheten ved tom/ugyldig mengde, avgrenser grupper og fjerner gruppen hvis alle ingredienser har samme gruppe. Beskrivelse renses og tømmes hvis den bare gjentar tittelen. group er et tillegg i svaret og baseServings er fortsatt numerisk for v97-kompatibilitet.

Uttrekk fra v98 behandler < som tekst når neste tegn ikke kan starte en tagg. header/footer inne i main/article beholdes. Under 500 tegn etter navigasjonsfjerning gir en ny lineær skanning med nav/header/footer beholdt, også ved uavsluttet nav. Det valgte lange tekstvinduet tar med inntil 500 tegn foran første signal, innenfor grensen og med alle valgte signaler bevart. Tidsbudsjett, inndatagrense, SSRF-vern, kvoter, nøkkelhåndtering og logger er uendret.

## Erstatningsvalg og mengder fra v99

Importkonflikter håndteres med to knapper i importpanelet, uten window.confirm etter det asynkrone kallet. Tomme ingrediens-/stegdeler fylles straks. De delene som allerede har innhold, beholdes til brukeren velger «Erstatt med det importerte» eller «Behold det jeg har». recipeImportState.pending holder respons, konfliktflagg og en gyldighetskontroll bare i minnet. Ny import, lukket/byttet editor og endret konto/tilgang/synkøkt forkaster resultatet; sene svar forblir beskyttet av serial, bruker og økt.

Ved Erstatt leses skjemaet på nytt. applyImportedRecipe brukes bare med importerte ingredienser/steg for konfliktområdene, og utfylte metadata beholdes også for nye utkast. Gruppene oversettes til dagens overskriftsrader. Porsjoner følger ingrediensene når antallet er kjent. Behold forkaster responsen uten å erstatte noe; deler som allerede ble fylt, blir stående. Meldinger teller bare utfylte/erstattede deler, eller sier «Ingenting ble endret.» / «Ingenting ble erstattet.»; serveradvarsler beholdes. Hent/Tolk tekst kan starte en ny import mens valget venter. Ingen import eller valg lagrer oppskriften før Lagre.

parseAmount støtter blandede tall og brøktegn: 2 1/2, 2½, 2 ½ og ½/¼/¾. parseAmountRange bruker samme tolking for begge ender. Skalering, oppskriftsgenererte handlevarer og summering bruker dermed samme tallverdi. Ugyldige former og nullnevner avvises; eksisterende avrunding i visningen beholdes. Mengdeteksten omskrives ikke i lagrede oppskrifter. Editorens «Porsjoner i oppskriften» forklarer at baseServings gjelder kildens mengder, og at ukeplan/handleliste regner om til familien.

v99 endrer bare klienten. Functions, Firestore-regler, dokumentformat, minimum 98 og service worker-strategien er uendret.

## Synk

Fra v95 brukes det egne Firebase-prosjektet `middagsplanlegger-6db4e` med Google-innlogging og familie-ID `familien`. Ingen kode kobler til det gamle prosjektet. `firestore.rules` i repoet er fasit: verifisert e-post og medlemsdokument kreves; medlemsadministrasjon og skriving til `app/meta` krever administrator. Vanlige medlemmer har samme tilgang til domenedata. Firebase standard innloggingspersistens brukes.

`src/sync/writes.js` bygger writes for profile, preferences og metadata. Weeks, meals og shoppingItems har egne operasjoner og lyttere. `app.js` eier fortsatt når scopes lagres og hvordan UI-status vises. Alle writes er enkeltstående dokumentkall; ikke batch eller transaksjoner med mange dokumenter, siden medlemsreglene krever oppslag og slike operasjoner har en grense på 20 regeloppslag. Den gamle reads.js-modulen er fjernet fra v101.

Data er splittet i flere dokumenter/collections:

- profile
- preferences
- metadata
- shoppingItems (ett dokument per vare; app/shopping er arkiv)
- meals
- weeks
- members (e-post i små bokstaver som dokument-ID; rolle og valgfri addedAt/addedBy)
- app/meta (schemaVersion, initializedAt, initializedBy, minAppVersion; administratorstyrt)

For profile, preferences og metadata bruker synkstrategien `clientUpdatedAt` og `pendingRemoteScopes` for å unngå at eldre remote data overskriver lokale endringer. Før Firestore-writes utføres, leser write-laget remote `clientUpdatedAt` for samme dokument. Hvis remote er nyere enn lokal state, droppes lokal write slik at en gammel enhet ikke overskriver nyere data. Manglende remote scopedokumenter seedes bare ved eksplisitt førstegangsoppsett/migrering eller når lokal state faktisk har `pendingLocalSync`. Weeks er unntatt fra v101.

## Oppskriftssynk fra v100

normalizeMeals i domenemodulen deler dagens normalisering mellom oppstart, diffMeals og mealsFromDocs. Differ sammenligner normalisert innhold per ID uavhengig av objektfeltenes/listens rekkefølge. Bare nye/endret oppskrifter får setDoc med hele oppskriften og serverTimestamp i updatedAt, uten merge/getDoc. Fjernede ID-er får deleteDoc. Fjernede felt blir dermed borte. Firestore-stien er fortsatt families/familien/meals/{id}; eldre clientUpdatedAt ignoreres og faller bort ved neste ordinære lagring, uten migrering.

Modulen starter uten migrering/cache-opplasting og drenerer konkrete operasjoner i innsendingsrekkefølge før lytteren etableres. SDK-løfter ventes ikke sekvensielt, slik at en nettventende skriving ikke blokkerer lytteren. Cache-bilder ignoreres fram til første serverbilde. Listen sorteres stabilt på ID. Siste lokale operasjon per ID legges over hvert bilde mens den venter; andre oppskrifters fjernendringer tas inn. Lokal A kan dermed stå sammen med fjern B. Hvert bilde får et løpenummer, og operasjonen husker siste løpenummer ved kølegging. Operasjonen fjernes når SDK har kvittert og siste bilde er fra serveren uten ventende skrivinger, med høyere løpenummer enn operasjonen husker. Innholdet sammenlignes ikke: skyen kan allerede ha en annen enhets nyere versjon, eller oppskriften kan ha blitt opprettet på nytt etter lokal sletting. Kontrollen kjøres både ved bilde og kvittering; når kvitteringen kommer sist, publiseres listen på nytt uten det fjernede overlegget. Et bilde fra før kølegging teller ikke. Bare den nyeste operasjonen per ID kan fjernes, og avviste skrivinger beholder overlegget med Synk feilet. Samme oppskrift har siste dokument-skriving som vinner, uten feltvis konfliktfletting.

onMeals oppdaterer bare state.meals ved faktisk innholdsendring og beholder uendrede oppskriftsobjekter, editor/UI og ventende importvalg. Ingen global tidsmarkør, pendingLocalSync eller scope-skriving endres. setState køer brukerendringer når tilgang er ready og ikke offline. Lagring/merking, hurtigmiddag, sletting og metadataopprydding bruker denne veien. Sletting og hurtigmiddag endrer også plan med dagens uke-synk; oppskriftspatchen alene utløser ingen andre scopes.

Statusvisningen kombinerer scope-, handleliste- og oppskriftssynk: feil har prioritet, deretter Synker, ellers dagens status. Kø, SDK-venting, manglende første serverbilde og ubekreftet lokal operasjon viser Synker; skrive-/lytterfeil viser Synk feilet. Stopp forkaster all minnetilstand og gjør gamle callbacks ugyldige. Sendte SDK-operasjoner kan ikke trekkes tilbake. Offline-oppstart starter ingen synk og køer ikke lokale oppskriftsendringer; slike endringer kan erstattes av første serverbilde ved ny oppstart. Ingen varig kø eller automatisk retry er innført.

Den gamle meals-scopen, slettesettet, hele-liste-lytteren og buildMealsRemotePatch er fjernet. Tomt serverbilde tømmer listen når ingen konkrete lokale operasjoner venter, selv om global pendingLocalSync er sann. Sikkerhetskopi/restore beholder format og flyt; restore bruker felles minimum 100 i v100, hevet til 101 fra v101. Den eksplisitte restore-skriveren kan fortsatt legge historisk clientUpdatedAt i meals; den ignoreres på samme måte som eksisterende dokumenter.

R1 skjuler «Ingenting ble endret.» når erstatningsvalg venter. R2 bruker komma i nye formaterte handlemengder, men både punktum og komma tolkes. v100 er bare klientkode; functions/regler endres eller publiseres ikke.

## Ukesynk fra v101

diffWeeks sammenligner alle seks ukekart per uke og dag etter standardutfylling. Resultatet bruker ukedokumentets felt (plan, lockedPlan, dayTypes, servings, dayModes, dayNotes) og bare endrede dagverdier. Første endring starter et fast vindu på 500 ms per uke; nyere verdier for samme felt/dag erstatter tidligere verdier i vinduet. Én setDoc med merge:true og updatedAt skriver bare disse nested feltene, oppretter manglende dokument og trenger ingen getDoc. Tøm uke skriver endrede standardverdier; dokumentet slettes ikke.

weeksSync har separat kø, timere, lytter, status og generasjon. Den starter sammen med shoppingSync/mealsSync etter tilgangsvern og stopper i stopAllSync. Usendte endringer beholdes bare til start/stopp i samme økt. Snapshot ber om metadataendringer og ignorerer cache til første serverbilde. weeksFromDocs bygger alle seks kart med standardverdier for manglende dager, og ignorerer begge tidsmarkørene. Uker uten dokument vises med standardverdier, uten cache-opplasting.

Lokale verdier legges over hvert snapshot per uke/felt/dag. Fra v103 får hver celleoperasjon siste snapshot-løpenummer ved sending (flush), etter 500 ms-vinduet. Et bilde som kommer mens endringen bare ligger i kø, kan dermed ikke bekrefte skrivingen. Den fjernes når SDK har kvittert og siste bilde er fra serveren uten ventende skrivinger, med høyere nummer. Kontrollen kjøres både ved bilde og kvittering, med ny onWeeks-publisering om kvitteringen kommer sist. Innholdet sammenlignes ikke, og bare nyeste operasjon per celle gjelder. Dermed bevares ventende tirsdag mens fjern fredag tas inn, men en annen enhets nyere verdi for samme felt/dag blir synlig etter kvittering. Siste skriving av samme celle vinner. Feil beholder lokale verdier med Synk feilet, uten automatisk retry.

onWeeks erstatter bare de seks domenekartene ved endring og bevarer valgt uke, åpent editorutkast, UI og importvalg. Ukeendringer via setState endrer verken clientUpdatedAt/pendingLocalSync eller andre scopes. Den gamle weeks-scopen, pendingWeekKeys, changedWeekKeys, weekPayload og buildWeeksRemotePatch er fjernet. replaceOpenWeek bygger nå planen lokalt og sender den gjennom setState, uten direkte mutasjon før differanseberegning; forslagene bruker fortsatt planen under bygging.

REQUIRED_MIN_APP_VERSION er 101 ved administratorheving og restore. v100 skriver hele uker og må blokkeres før øvrige enheter brukes etter utrulling. Backup/restore beholder de seks kartene, unionen av ukenøkler og dokumentformen. Historisk clientUpdatedAt fra restore/eldre dokumenter ignoreres, og kan bli liggende etter merge-write. Frakoblet oppstart starter ingen synk/kø; ingen varig kø er innført. Service worker har bare ny versjon og oppdatert modulliste. Functions/regler er urørt.

## Handlelistesynk fra v93

Modulen src/sync/shopping.js eier separat varebasert synk. Brukerflytene sender fortsatt ny items-liste til setState; appen normaliserer varene, tildeler nye varer createdAt = nå + indeks og sender en diff umiddelbart. Eksisterende createdAt beholdes. Bare endrede felt sendes med updateDoc; nye varer bruker setDoc og slettinger deleteDoc. Ingen debounce, forhåndslesing eller writeBatch brukes for disse operasjonene. Handlelisteendringer påvirker ikke global clientUpdatedAt/pendingLocalSync, og generatedForWeek er bare lokal.

I v93/v94 gjennomførte oppstarten migrering fra skyens app/shopping i én transaksjon. I v95 kjøres denne historiske migreringen ikke: eksplisitt oppsett skriver vare-dokumentene og `app/shopping.migratedToItemsAt` før meta-markøren. Den gamle hjelpefunksjonen beholdes og testes for tidligere migreringsformat, men brukes ikke i v95-oppstart.

Deretter sendes minnekøen i registrert rekkefølge og collection-lytteren startes uten å vente på write-bekreftelser. Lytteren ber om metadataendringer og ignorerer cache-snapshots fram til første serversnapshot; senere brukes alle snapshots. Varer sorteres på createdAt og deretter ID. Remote-patcher erstatter bare items, beholder generatedForWeek og skriver ikke tilbake. Identisk innhold utløser ingen ny innholdsrender. Rendering fra synk/status bevarer tekst, markering og fokus i manuelt varefelt.

Synker vises mens operasjoner venter eller før første serversnapshot. Bare bekreftede operasjoner tas ut av pending-tellingen; updateDoc/not-found er et stille avsluttet forsøk mot en slettet vare. Andre feil gir Synk feilet, som ikke skjules av senere snapshots eller andre scopelyttere. Migreringsfeil beholder lokal liste, sender ikke minnekøen og starter ikke handlelistelytteren; neste oppstart forsøker migreringen igjen. Andre scopelyttere beholder sin eksisterende logikk.

Kjent begrensning: køen er bare i minnet. Offline-endringer sendes når nettet kommer tilbake så lenge appen forblir åpen og synken allerede er startet. Ved mislykket migrering kreves ny oppstart. Usynkede v92-endringer overføres ikke, og første serversnapshot kan erstatte dem. Gamle v92-klienter bruker arkivet og deler ikke videre handleliste med v93. Utrulling og tilbakerulling er beskrevet i docs/RELEASE.md.

## PWA og oppdatering

### Tilgang, oppsett og gjenoppretting fra v95

Tilgangsstate og medlemsrollen ligger utenfor synket domenestate. Konto og medlemmer viser egen e-post og medlemslisten; administratorer kan endre andre medlemmer. Selvredigering stoppes både i UI, skrivehjelper og regler. Utlogging bevarer lokal state, men fjerner offline-medlemsflagget. Ved kontobytte, utlogging og versjonsblokkering avsluttes lyttere og timere, og minnekøen forkastes. Generasjonstoken gjør at svar fra eldre async-operasjoner ikke starter synk eller sender nye writes. Allerede sendte SDK-operasjoner kan ikke trekkes tilbake.

Oppsett er bare tilgjengelig når `app/meta.initializedAt` mangler. Administratoren velger og validerer sikkerhetskopi, ser oppsummeringen og bekrefter. Før første write leses ID-ene i meals, weeks og shoppingItems fra serveren. Fremmede dokumenter avviser hele forsøket; dokumenter med de samme ID-ene kan overskrives ved retry. Deretter skrives profile, preferences, metadata, middager, unionen av seks ukekart, handlevarer med `createdAt = 0 + indeks`, handlemarkør og til slutt meta. Ingen medlemsdokumenter endres. Ingen opplasting fra lokal cache eller bruk av legacy `app/state` finnes. «Start med tom database» krever tomme samlinger og skriver de tre standarddokumentene, handlemarkør og meta til slutt.

Feil før meta gir uferdig oppsett og tillater nytt forsøk med samme fil. Gjennomfør oppsett fra én administratorenhet om gangen. For ny innlesing må eier slette meta og tømme de tre samlingene manuelt, med members beholdt; ingen automatisk sletting. Se `FIREBASE_OPPSETT.md` og `RELEASE.md`.

Offline-tilgang krever et lokalt flagg for riktig prosjekt, familie og UID/e-post, fra en tidligere godkjent og initialisert økt. Flagget er lokal bekvemmelighet, ikke en erstatning for Firestore-reglene. Offline-oppstart starter ikke Firebase-lyttere eller writes. Last appen inn igjen når nettet er tilbake for å kontrollere medlemskap og starte synk. Handlelisteendringer fra en slik lokal økt har fortsatt ingen varig operasjonskø og kan erstattes av skylisten. Ved avvist medlemskap slettes flagget og appinnhold skjules.

`service-worker.js` cacher appens statiske filer. Appfiler som `index.html`, `app.js`, `styles.css`, `manifest.json` og `service-worker.js` hentes med network-first-strategi.

Versjon bumpes manuelt på tre steder:

- `APP_VERSION` i `app.js`
- `?v=...` i `index.html`
- `CACHE_NAME` i `service-worker.js`

Se `docs/RELEASE.md`.

## Kjente tekniske forbedringsområder

Prioritert rekkefølge:

1. Dokumentasjon og utviklingsrutiner.
2. Trekke ut rene domene-funksjoner fra `app.js`.
3. Flytte Firebase-synk til egen modul.
4. Dele rendering per visning.
5. Dele CSS i logiske områder.
6. Legge til enkle tester for handleliste, mengder, ukeplan og synkbeskyttelse.

Første testområder er etablert i `tests/domain/meals.test.mjs`, `tests/domain/shopping.test.mjs`, `tests/domain/suggestions.test.mjs`, `tests/domain/weeks.test.mjs`, `tests/domain/week-view.test.mjs`, `tests/render/week.test.mjs`, `tests/app/week.test.mjs`, `tests/render/meals.test.mjs`, `tests/render/setup.test.mjs`, `tests/render/shopping.test.mjs`, `tests/sync/firebase.test.mjs`, `tests/sync/weeks.test.mjs` og `tests/app/weeks-sync.test.mjs`, `tests/sync/state.test.mjs` og `tests/sync/writes.test.mjs`.

## Foreslått fremtidig mappestruktur

Dette krever en planlagt refaktor, ikke en liten hurtigendring.

```text
src/
  domain/
    backup.js
    shopping.js
    meals.js
    suggestions.js
    weeks.js
  sync/
    firebase.js
    weeks.js
    state.js
    writes.js
  render/
    week.js
    meals.js
    setup.js
    shopping.js
  state.js
  sync.js
  render/
    week.js
    meals.js
    shopping.js
    setup.js
  ui/
    modals.js
    icons.js
styles/
  base.css
  layout.css
  components.css
  views.css
  mobile.css
```

Inntil et slikt steg tas, bør eksisterende filstruktur bevares og endringer holdes små.

## Bildeimport fra v102

Importer fra bilde åpner filvelgeren i oppskriftseditoren. Inntil fire bilder legges til i valgt rekkefølge; PC-utklippstavlen kan også levere bilder når panelet er åpent. Tekstinnliming er uendret. Listen viser bare Bilde 1–4 og Fjern, uten filnavn/miniatyrer. app.js holder bilder i separat recipeImportState og bevarer det brukeren skriver i skjemaet under forminsking og serverventing.

src/domain/image-prepare.js dekoder med EXIF-retning (createImageBitmap med from-image, eller nettleserens Image-fallback) og tegner på hvit canvas. Lengste side begrenses til 2000 px, JPEG starter på 0,8 og prøver 0,7/0,6 før 1600 px ved behov. Maks 1,4 MB per bilde. Fire slike bilder kan overstige 7 000 000 base64-tegn; recipeImagesForSend komprimerer da på nytt i minnet til et fordelt bytebudsjett før forespørselen. Feil sender ingen importforespørsel. Midlertidige blob-URL-er tilbakekalles og bitmap/canvas frigjøres.

Serverens image-inndata valideres strengt: 1–4 bilder, bare image/jpeg, ren og kanonisk base64, JPEG-signatur FF D8 FF, maks 2 000 000 tegn per bilde og 7 000 000 samlet. Ukjente felter avvises. sourceUrl følger tekstmodus. Samme medlemssjekk, lagrede/dekrypterte nøkkel og familiegrense (fra v104: 20 per ti minutter/150 per UTC-døgn) brukes; nøkkelen hentes før kvoten telles.

Responses får én brukermelding med innledende tekst og input_image i valgt rekkefølge, detail high og store:false. OPENAI_RECIPE_IMAGE_MODEL overstyrer bare bildemodellen; uten den brukes grunnmodellen (fra v104: gyldig aiConfig.model, ellers OPENAI_RECIPE_MODEL/dagens standard). Bildetekst behandles som data, uleselig innhold utelates. AI-budsjettet er samlet 90 sekunder med ett nytt forsøk; klienten har 130 sekunder. OpenAI 400 i bildemodus gir IMAGE_REJECTED. 401/403/404 behandles som før. Alle vellykkede bildeimporter advarer om å kontrollere mengder og ingredienser ekstra nøye.

Resultatet bruker uendret normalizeRecipe og dagens uavhengige ingrediens-/stegutfylling, grupper, porsjonsregler og synlige erstatningsvalg. Uten lenke vises kilden som bilde. Ingen automatisk lagring: Lagre/Avbryt bestemmer fortsatt. Bilder tømmes ved vellykket import, lukking/bytte av editor og tilgangsøkt/kontobytte. Sene svar og forminsking ignoreres etter slike endringer. Ingen bilde lagres i Firestore, lokal cache eller sikkerhetskopi. Datamodell, regler, synk, kvoter og REQUIRED_MIN_APP_VERSION 101 er uendret; serveren publiseres før v102-klienten og støtter v101 url/text.

## Importrettinger fra v103

normalizeAmount fjerner ett innledende omtrentlighetsprefiks (ca/ca., cirka, omtrent, omlag, about, approx., approximately eller ~) før dagens tall-/brøk-/intervallvalidering. Prefikset må slutte før blanktegn eller et mengdetegn; cab 2 er fortsatt ugyldig. AI instrueres til å gi bare tallet, uten ca.

En fast tabell normaliserer bøyde enheter til familiens units, uten å opprette enheter: bokser/boks, poser/pose, pakker og pk/pakke, begre/beger, stykk/stykker/stilk/stilker/stk, spiseskje(er)/ss, teskje(er)/ts, gram/g, kilo/kg, liter/l, desiliter/dl og milliliter/ml. Sammenligning ignorerer store/små bokstaver og avsluttende punktum. Ukjent enhet beholdes i navnet når målformen mangler i units. Samme tabell trekker et innledende enhetsord ut av name når unit er tom, amount er gyldig og resten av navnet ikke er tomt. Ingen mengdeord eller enheter gjettes. Svarformat, kvoter, tilgang, nøkkel og tidsgrenser er uendret.

Import- og erstatningsmeldinger nevner bare deler som faktisk ble fylt/byttet, uten null-tellinger. Ventende konflikt vises med overskriften Ikke alt ble byttet, presis forklaring om urørt innhold og antall funnet i konfliktdelene. Bytt til de importerte / Behold mine bruker samme runtime-pending og delvise utfylling som v99. Boksen har tydelig ramme/bakgrunn og scrollIntoView etter render når et nytt valg dukker opp; vanlige renders flytter ikke skjermen på nytt. Lagre mens valget venter lagrer dagens skjema og lukker editoren uten dialog. Minnekø, bildetilstand og Lagre/Avbryt er ellers uendret.

v103 er bakoverkompatibel med v102-serverformatet. Functions publiseres før appen. REQUIRED_MIN_APP_VERSION forblir 101; Firestore-regler og datamodell er uendret.

## Modellvalg og kvoter fra v104

functions/lib/models.js samler ren modellvalidering, prioritering og administratorflyten for aiModelSave. Private aiConfig-dokumentet inneholder modellnavn og serverens updatedAt/updatedBy; ingen klient-SDK-tilgang. getModel i functions/index.js leser det ved hvert relevant kall. Gyldig lagret modell prioriteres foran OPENAI_RECIPE_MODEL og DEFAULT_MODEL gpt-5.6-luna. Bildemodus bruker OPENAI_RECIPE_IMAGE_MODEL hvis satt, ellers samme grunnmodell. Status, nøkkellagring og nøkkeltest bruker grunnmodellen. Eksisterende v103-klient trenger ingen nye felter for å fortsette å importere.

aiModelSave krever verifisert administrator og kun { model } i formatet /^[a-z0-9][a-z0-9._-]{2,60}$/. Lagret nøkkel må kunne dekrypteres før delt keyUsage telles. Først kontrolleres kandidatmodellen med GET models/<model> (15 sekunder); deretter kjøres ti linjer egen norsk prøveoppskrift gjennom interpretRecipe med kandidatmodellen og fast enhetsliste, og normalizeRecipe. Minst fire ingredienser, tre gyldige mengder og to steg kreves. Bare bestått prøve lagrer aiConfig. 401/403 merker eksisterende testede nøkkel ugyldig; 404 gir MODEL_UNAVAILABLE, mislykket innholdsprøve MODEL_TEST_FAILED. Feil bevarer tidligere modell. Ingen prøveimport telles i importUsage, og ingen oppskrift lagres fra prøven.

Callable er v2/europe-west1, maxInstances 3, timeout 90 sekunder og eksisterende KEY_ENCRYPTION_SECRET; samlet abortsignal er 88 sekunder. AI-tekstbudsjettet på 45 sekunder inkludert retry beholdes. Klienten bruker 100 sekunder. Importens kvotekonstanter er 20 per rullerende ti minutter og 150 per UTC-døgn. keyUsage har fortsatt 10 nøkkel-/modellkontroller per ti minutter. Eksisterende tellehistorikk beholdes. remainingToday er 150 minus dagens telleverdi.

AI-innstillinger viser alltid modellnavnet. Administrator kan redigere modell og starte testen; medlemmene ser bare modellnavn. Felt/knapp deaktiveres uten nett, innlogging, lagret nøkkel eller mens en handling pågår. Kandidaten beholdes ved feil og erstattes av gjeldende navn ved suksess. aiKeyUi.modelDraft/status og recipeImportState.remainingToday ligger bare i minnet, med konto-/tilgangsvern for sene svar. Gjenstående importer vises etter vellykket import ved 30 eller færre. Ingen endring i synket state eller backup.

importRecipe og aiModelSave kan logge model bare i gyldig modellformat uten ekstra blanke tegn. aiModelSave logger bare functionName, code, durationMs og eventuelt validerte providerStatus/providerCode/reason, samt eksisterende begrensede INTERNAL-felter. Ingen prøvetekst, nøkkel, e-post, side-/bildeinnhold eller provider-feiltekst. Logger er fortsatt best effort. REQUIRED_MIN_APP_VERSION forblir 101; klientversjon/versjonsvakt/cache er v104/104. Ingen regelendring, datamigrering, nye avhengigheter eller ny klientmodul. Serveren publiseres før appen.

## Lokal lagring og lyttervern fra v105

src/sync/local-store.js eier trygg lesing, JSON-skriving og eksplisitt sletting. Alle appens kall for middagsapp-state og middagsapp-membership bruker denne modulen, med lazy tilgang til localStorage slik at også en blokkert getter håndteres. Lesefeil, ugyldig JSON og verdier som ikke er objekter behandles som tom lagring. Feil under domenenormalisering gir tom prosjektmerket lokal kopi. Ingen lagringsfeil fører til tømming av nøkler eller andre appers lagring.

Den lokale kopien bygges med en eksplisitt liste: PROJECT_DOMAIN_KEYS (familie, preferanser, metadata, oppskrifter, seks ukekart, handleliste og synkmarkører), projectId og filters. Åpne editorer/dialoger, utkast, toast, valgt oppskrift, handlelistegjennomgang og skjermvåkeflagg serialiseres ikke. loadState støtter eldre kopier og rekonstruerer UI-standardverdier; Handleliste er fortsatt startside. Backup og skyformatet er uendret.

En feilet skriving lar state leve i minnet og setter localStoreFailed. En senere vellykket skriving nullstiller flagget. saveState stopper aldri setState, onMeals/onWeeks/onItems, applyRemoteStatePatch eller tilgangsflyten. Medlemsflagget kan ikke blokkere ferdig nettinnlogging ved lagringsfeil. Varsellinjen vises bare under Innstillinger → Oppdatering og versjon; synkstatusen gjelder fortsatt skyen, uten lagringsfeil i toppfeltet. Den tidligere kopien kan være utdatert, og en ny offline-økt kan mangle oppdaterte data eller medlemsflagg når lokal skriving feiler. Ingen varig kø bygges.

Meals/weeks/shopping har separat deliveryFailed som fanger feil fra onMeals/onWeeks/onItems. Status publiseres i finally og blir Synk feilet ved callback-feil. Neste vellykkede levering fjerner bare deliveryFailed, uten å nullstille eksisterende Firestore-/skrivefeil. Vernet gjelder også levering etter SDK-kvittering i meals/weeks; en callback-feil forveksles ikke med en avvist skriving. Lytteren beholdes og senere bilder behandles som vanlig. Kø, overlays, løpenummer, generasjoner og stoppregler er uendret.

Klientversjon/cache/versjonsvakt er v105/105; REQUIRED_MIN_APP_VERSION er fortsatt 101. local-store.js legges i begge asset-listene uten endret service worker-strategi. Ingen endring i functions, regler eller serverstier, og ingen nettverk/publisering i denne leveransen.

## Porsjoner fra v106

family.familySize er nå standard antall porsjoner, med uendret felt og profilformat. Dagens servings-verdi i ukedokumentet er et eget tall eller null/manglende for standarden. emptyWeekServings og alle ukedefaults er null; ingen familieverdi bakes inn i snapshots, currentWeeks, differ eller restore. servingsForDay(state, weekKey, dayIndex) i domain/weeks.js, med app-wrapper, brukes av planlegger, oppskrift, enkeltoppskrift til handleliste, ukegjennomgang og generering. Dager uten eget valg følger standardendringer straks uten nytt ukebilde. Et tall satt lik standarden lagres som null.

Oppskriftens −/+ endrer 1–30 porsjoner. Ved plandagkontekst oppdateres den aktuelle uken/dagen gjennom setState og vanlig weeksSync; dagens dato vises under forklaringen. Fra listen starter visningen på standarden, og recipeServingsView holder et eventuelt avvik bare i minnet. Ingen recipeskriving eller lokal lagring ved slik visningsjustering. Bytte/lukking/tilgang nullstiller det. Legg i handleliste bruker samme viste porsjonstall. Synlige tekster bruker porsjoner i stedet for personer.

Avrunding ligger i domain/shopping.js: enhetstilpassede trinn ved skalert oppskrift, uten endring av lagret mengdetekst. For g/ml brukes 0,5 under 10, 1 fra 10 til under 20, 5 fra 20 til under 100, 10 fra 100 til under 250 og 25 fra 250; minste verdi er 0,5 og midtpunkt rundes opp. Intervaller beholder begge ender, og uskalerte ingredienser vises nøyaktig som skrevet. Handleberegning bruker fortsatt intervallets høyeste verdi. For generering og gjennomgang holdes rå bidrag i _rawAmount/_scaled i minnet, summeres med roundRecipeShoppingItems før siste avrunding, og feltene fjernes før lagring. Sammenslåtte ukebidrag med telle-/egne/tomme enheter rundes opp til heltall; måleenheter bruker de angitte trinnene. Eksisterende handlevarer omavrundes ikke; vanlig legg-til/regenerer-flyt beholdes.

createServingsDefaultsTransition i sync/servings-defaults.js gjør ett forsøk per tilgangsøkt. Bare online admin, etter familieprofil fra serveren og første autoritative ukebilde. Profillytteren ber om metadataendringer slik at også data som er identiske med hurtigbufferen gir serverbekreftelse. Meta leses fra serveren og må være initialisert, mangle servingsDefaultsV106:true og ha bekreftet minimum 106 eller høyere uten å overstige aktuell appversjon. Feilet minimumsheving tillater vanlig innlogging, men ingen overgang.

For aktuelle/fremtidige uker settes eksplisitt 5 eller gjeldende standard til null, uten å røre andre tall eller eldre uker. setState køer bare endrede servings-celler. weeksSync.waitForWrites venter gjennom samlingsvinduet og SDK-kvitteringer; stop/avvisning avbryter uten merke. Deretter leses meta igjen og admin oppdaterer bare servingsDefaultsV106:true. En ikke-blokkerende toast viser antall endrede dager og standarden. Ingen automatisk retry i samme økt; neste oppstart prøver på nytt uten skade etter delvis skriving. Den eksisterende snapshot-/overlay-/generasjonsbeskyttelsen og stale-vernet for profile/preferences/metadata er beholdt.

Backup v106 fyller null for manglende dager i ukekartene. Restore godtar null eller tall >=1. Eldre backupversjoner konverterer dagsverdier lik den eksporterte familySize til null; andre verdier og nye kopiers egne tall beholdes. Fullført restore skriver meta sist med minimum 106 og overgangsmerket true, siden konverteringen da allerede er utført. Firestore-stier, øvrige dokumentfelter, oppskrifter og funksjoner/regler er uendret. Minsteversjonen er 106 for å beskytte den nye betydningen og overgangen.

## Samlet Uke-visning fra v112

Handle, Uke og Oppskrifter er de tre fanene. Uke har activeView="week"; canonicalView tolker calendar/planner som week ved normalisering, brukerens navigasjon og oppskriftsretur. normalizeStateForStartup starter fremdeles på shopping. Fra v114 nullstilles ukevalget, mens oppskriftsfiltre overlever som før, mens UI-navn ikke inngår i domenepayload eller den kompakte lokale kopien. De gamle renderCalendar/renderPlanner-funksjonene og deres CSS/moduler er fjernet.

renderWeek samler én liste med primærhandling per dag og en egen blyant. Planlagt middag åpner oppskrift med uke-/dagkontekst; tom hjemmedag åpner velgeren direkte; annen plan og blyant åpner dagsarket. Egne porsjoner og notat vises på én linje. Dagens markering bruker faktisk dato, bare i inneværende uke, og er uavhengig av låsen. weekHeading gir ISO-ukenummer også ved årsskifte; midtknappen og I dag vender tilbake til denne uka. Begge pilene står i faste kolonner.

rankedSuggestions er den eksisterende pickSuggestion-rangeringen trukket ut som en hel liste, med uendret poengberegning og sortering. pickSuggestion tar første kandidat. Velgeren viser 0–3 forslag uten middager allerede brukt i uka; ellers vises kategoriene og dagens søk som før. lastPlannedLabel leser bare planlegging før den aktuelle datoen. Lås beskytter forslag, ikke manuelle endringer. Hovedknapp og ukemeny teller de samme ulåste hjemmedagene som fillWeek og replaceOpenWeek; sistnevnte omfatter også hjemmedager uten middag.

Dagsarket, velgeren, ukemenyen og tømmingsbekreftelsen vises ett om gangen over samme Uke-visning. Plan og type bruker native select inne i dagsarket; alternative planer vises inne i velgerens footer og bruker eksisterende updateDayMode. Notat lagres ved change/Enter, og porsjoner går gjennom updateDayServings. Dagsark → velger bevarer mealPickerReturn med skjult logisk forelder og v108-posisjon/fokus. Ukemeny → bekreftelse bevarer tilsvarende weekClearConfirmation; Avbryt/popstate gjenåpner menyen. Tøm uka nullstiller de samme seks ukekartene gjennom eksisterende setState/ukesynk og lukker begge nivåer uten window.confirm.

navigationLevels/backInApp registrerer også week-clear. Den eksisterende History-controlleren og rulle-/fokusfunksjonene brukes videre. render, skydata og status endrer ikke historikken. weekClearConfirmation og pickerOtherPlans ligger bare i minnet og nullstilles ved visnings-/tilgangsbytte. Nye rullbare vinduer skal ha stabile data-scroll-key og data-focus-key. Se tabellen ovenfor.

Sveip på dagslisten bruker passive touch-hendelser: én finger, start minst 24 px fra kanten, minst 60 px vannrett og mer enn 1,5 ganger loddrett avstand. Gjenkjent sveip undertrykker radens etterfølgende klikk; loddrett rulling og sveip fra kanten bytter ikke uke. Telefonens systemgest, virkelig rulling, skjermtastatur og safe-area må kontrolleres på ekte enhet. CSS følger skissene ved 375 px og sentrerer samme innhold med maks 720 px på PC.

Klienten/cache er v112/112, minsteversjonen er 106. Begge asset-listene har domain/week-view.js og render/week.js i stedet for de gamle kalender-/planleggermodulene. Ingen endring i service worker-strategi, synkmoduler, dokumentformat, functions eller firestore.rules.

## Middagsvelgerens fokus og farger fra v113

openMealPicker ber om fokus i søket bare når matchMedia("(pointer: fine)") stemmer, med preventScroll. Autofocus-attributtet og fokuskallet i bindEvents er fjernet. Berøringsåpning har ingen automatisk fokus/tastatur; når brukeren selv trykker søket, bevarer eksisterende data-focus-key/data-scroll-key dette gjennom senere render. Fine-pointer-fokus skjer ved åpning, ikke ved hver render, slik at footer og kort kan beholde faktisk brukerfokus. Fast picker-footer og sidelåsen er uendret.

Middagskortene har eksplisitt --text, inkludert strong-titlene i forslagene. Den tidligere ubetingede hover-regelen kunne gi grønn ramme på et uvalgt kort; hover endrer nå bare bakgrunn og bare ved hover + fin peker. Valgt ramme tilhører bare .selected for dagens middag. :focus-visible gir egen tastaturkontur, og :focus:not(:focus-visible) fjerner kontur ved annen fokus. Knappene i dagsark/ukemeny beholder sine eksplisitte tekst-, merke-, hvite og dempede farger.

Notatfeltet bruker anonym plassholder. Eksempeltekster, plassholdere og testdata som vises i appen skal aldri inneholde ekte navn på familiemedlemmer. Familiens eget navn fra data er uendret. Klient/cache er v113/113, minsteversjonen fortsatt 106. Ingen endring i domenedata, historikk, synk eller service worker-strategi.

## Poeng, ukevalg og velgerfiltre fra v114

Nye økter starter på Handle med weekOffset 0. localStateForStorage lagrer ikke ukevalget, og startup-normalisering ignorerer eldre kopiers verdi. handleVisibilityChange nullstiller offset etter mer enn 30 minutter i bakgrunnen eller skifte av kalenderuke, direkte med saveState/render uten nye historikknivåer. Åpne planvinduer bindes til planningWindowWeekKey, kun i minnet. Root-render leser den nye uka eksplisitt; datoer og handlinger i dagsark/velger/ukemeny/bekreftelse bruker opprinnelig uke til de lukkes. Det hindrer at et sent middagsvalg skrives på feil uke.

Poengmodellen i domain/suggestions.js:

| Del | Poeng |
|---|---|
| Dagstype | +22 for samsvar, +10 uten merker, −20 når merker ikke passer |
| Favoritt / barnevennlig | +10 / +6 |
| Rask på raske dager / ønskede rester | +25 / +6, uendret |
| Nærmeste planavstand 0–7 / 8–14 / 15–21 / 22–28 dager | −95 / −58 / −30 / −14, uendret |
| Planavstand over 28 dager | +2 per hel uke siden planlagt, maksimalt +30 |
| Ingen planhistorikk | +25 |
| Variasjon | Stabil FNV-hash av uke + dag + meal-id, modulo 16: 0–15 |
| Kategorimål og nylig kategoribruk | Tidligere regler beholdes |

recentMealDistanceDays søker alle plansByWeek, også framtidige planer, og bruker nærmeste absolutte kalenderdagsavstand. Datoer normaliseres til kl. 12 før differansen, slik at tidligere og framtidige dager får samme behandling. Gjeldende plancelle utelates som før ved rangering av et bytte. plannedTooClose og scoreCategoryPreference er uendret. suggestionScoreBreakdown gir rene delpoeng for dagstype, merker, raske dager/rester, recency, kategori og variasjon; den brukes bare i tester, ikke som appvisning.

rankedSuggestions er felles poengrangering for alle forslagkommandoene. Bare velgeren bruker selectPickerSuggestions etter filtrering. De to beste beholdes; blant de øvrige velges først den beste aldri planlagte, ellers den beste med nærmeste plan minst 56 dager unna, ellers nummer tre etter poeng. Kvalifiserte kandidater blant de to første beholder også linjen Aldri i planen/Ikke i planen på lenge, men hindrer ikke utvelgelse blant de øvrige. En fallback med nyere historikk får ingen egen linje. Nærmeste-avstandsregelen inkluderer også framtidige planer. Ingen ny lagret merking av oppskriften, og ingen endring i poengrangering eller filtre.

Filterraden har tre kombinerbare merker og én kategori, aria-pressed og vannrett rulling uten synlig rullefelt. Filtrene og søket brukes sammen for både forslag og kategoriresultater. Tom filtrert liste gir Fjern filtre; ingen raske nyopprettinger tilbys mens filtre skjuler resultater. Oppskriftslistens egne lagrede filtre er uendret. pickerFilters nullstilles ved åpning/lukking/tilgang. picker-filters bevarer scrollLeft synkront i eksisterende v108-funksjoner; øvrige vinduer bevarer scrollTop som før.

Planpanelet i footer erstatter knappen med overskriften IKKE MIDDAG HJEMME, kontrasterende planvalg med pil og Avbryt. Det bruker samme picker-plans-scrollnøkkel. Keyboard-click med detail 0 fokuserer første valg; vanlig touch ber ikke om søkefokus. Planvalg bruker eksisterende updateDayMode og lukker velgeren som før. Footer og vindushistorikk er beholdt.

Simuleringen bruker 52 lørdager, tre gamle helg/favoritt/barnevennlige middager med planavstand fem uker, fem med bare Hverdag og 22 nye uten merker/historikk. Velgeren har en ny middag 52/52 ganger; ren poengrangering har en ny blant topp tre 17/52 og minst én gammel favoritt 52/52. Dette er den avtalte syntetiske testen, ikke en garanti for enhver familiemiks.

Versjon/cache er v114/114; minsteversjonen er 106. Ingen functions, Firestore-regler, skysynk eller datamodell er endret.

Retting før v114-publisering: aldri planlagte prioriteres foran gamle favoritter i den faste plassen. Med tre favoritter sist planlagt for henholdsvis 12, 5 og 2 uker siden, pluss 22 aldri planlagte middager, har velgeren en ny middag 52/52 lørdager i alle tre simuleringene. Uten aldri planlagte får en kandidat borte i 10 uker den faste plassen og riktig linje. Første/to beste beholdes, filtrene testes også gjennom appens rendering. Versjonen og øvrige v114-flyter er uendret.

## Passer til-filter fra v115

renderPickerFilters bygger tre grupper: Rask/Barnevennlig/Favoritter, suitabilityEntries() og kategorier. Passer til har samme metadata-navn og rekkefølge som Innstillinger; nye valg vises automatisk. Gruppene skilles med aria-hidden span, 1 px --line og 24 px høy, i den samme vannrett rullende énlinjeraden.

pickerFilters.suitability er en enkelt valgt nøkkel eller tom streng. togglePickerFilter erstatter forrige verdi eller slår aktivt valg av. Det rene mealMatchesPickerFilters krever arraymedlemskap i meal.suitability; tomme/manglende merker filtreres bort. Alle andre filtre og søket kombineres som før for både forslag og resultatliste. Eksisterende fast plass velges etter filtrering; poeng og forslagkommandoer er uendret.

Runtime-feltet bruker samme lukking/nullstilling, aria-pressed, tomtilstand, scrollLeft-/fokusbevaring og Fjern filtre som øvrige filtre. App/cache er v115/115, minimum fortsatt 106. Ingen ny modul, asset-listendring, datamodell, skysynk eller serverendring.

## Tastaturtilgjengelige oppskriftskort fra v116

renderMealCardView tegner article som kortbeholder uten data-view-meal. Inne i kortets eksisterende rad står en native hovedknapp med tittel og eventuell Mangler oppskrift, og en separat redigeringsknapp. De er søsken, aldri nestede knapper. Hovedknappens aria-label er tittel + åpne oppskrift, blyantens er Rediger + tittel. Eksisterende hendelsesbindinger brukes uendret, også når søk erstatter kortlisten uten full render.

pencilIcon er flyttet fra weekIcon sin path-tabell til src/render/icons.js. Uke og Oppskrifter importerer samme funksjon; weekIcon("pencil") delegerer også dit for å bevare API-et. .pencil-button deler 44×44-trykkflate, 18 px SVG, --muted, gjennomsiktig bakgrunn og ingen ramme. Uke beholder sin eksisterende marg. Kortets ramme, radius, farger, tittelstil og mangler-merke beholdes; mer tittelbredde er tilgjengelig etter at den doble åpneknappen er fjernet. Hovedknappen har min-height 44 px og tastaturfokus vises med focus-visible.

Den nye lokale ikonmodulen er lagt i begge asset-listene. Versjon/cache er v116/116, minsteversjon 106. Ingen endring i service worker-strategi, domenedata, synk eller server/regler.

## Oppskriftsskjema fra v117

Editoren erstatter hele oppskriftslistens innhold mens den er åpen. Toppfeltet erstattes av .meal-editor-bar: sticky stripe med safe-area, Avbryt, Ny oppskrift/Rediger og Lagre. Begge Lagre-knapper sender samme mealEditorForm med eksisterende native feltvalidering og submit-handler. Nederst beholdes Lagre middag og Slett for eksisterende oppskrifter.

src/domain/meal-editor.js inneholder mealEditorFingerprint og socialRecipeSource. Fingeravtrykket sammenligner alle redigerbare felt, overskrifts-/ingrediensrader og steg; kategorier/merker sammenlignes uten hensyn til rekkefølgen på avkrysningsboksene. mealEditorSession fryser utgangspunktet når editoren åpnes, slik at senere renders eller skysnapshots ikke flytter sammenligningsgrunnlaget. Før Avbryt/tilbake leses dagens skjema og importfelter. Ulagret importresultat og uferdig arbeid i importkortet beskyttes også.

Uendret skjema lukkes direkte. Ved endringer vises editor-discard som alertdialog nedenfra, med Fortsett å redigere og Forkast endringene. Tilbake på selve editoren returnerer en blokkert navigasjon til den eksisterende historikkontrolleren når arket må vises; kontrolleren gjenoppretter editornivået og legger arket over. Tilbake/Escape i arket lukker bare arket. Forkast lukker editor og ark uten lagring. Fortsett bevarer alle utkast/importfelter. Arket har data-scroll-key="editor-discard", stabile fokusnøkler og avgrenset tastaturfokus. render eller synk legger fortsatt ikke historikkoppføringer inn.

src/render/recipe-import.js tegner importkortet separat fra selve oppskriftsskjemaet. Lenke/Bilde/Tekst er tre like knapper med aria-pressed; kun valgt modus tegnes. tab/expanded er tillegg i den eksisterende recipeImportState i minnet. Inputhendelser oppdaterer knappestatus og sosial forklaring uten full render per tastetrykk. Modusbytte leser først skjemaet og beholder lenke, tekst, bilder, meldinger og ventende erstatningsvalg. Kortet starter lukket på eksisterende oppskrifter, men åpent på nye og på oppskrifter med kilde uten ingredienser/steg. Åpneknappen velger Lenke og fyller en tom importlenke fra dagens kilde.

Bildevalget bruker egne knapper som åpner et visuelt skjult native filfelt. De forminskede bildene beholdes som før i minnet; visningen bruker de tillatte Bilde N-rutene med fjern-knapp og stiplet pluss-rute. Ingen ekstra bildekopier, filnavn eller bildedata settes inn i markup eller varig lagring.

socialRecipeSource analyserer vertsnavnet lokalt for instagram.com, facebook.com, fb.watch og tiktok.com, inkludert underdomener. En kjent sosial lenke viser Bruk tekst/Bruk bilde og skjuler Hent uten serverkall. Den fyller bare en tom recipeUrl i utkastet; en annen kilde beholdes. Kildelinjen er bekreftelse på utfylt skjema, ikke automatisk oppskriftslagring. En vanlig vellykket lenkeimport fyller også tom kilde. Serverens validering, SSRF-vern, AI-tolking og klientens import-/kvotelogikk er uendret.

App/cache er v117/117. De to nye modulene er med i begge asset-listene. Minsteversjon 106, domenefelter, synkmoduler, functions og regler er uendret.

## Direkte kilde og PC-skjema fra v118

renderMealDetailView tegner recipeUrl som en vanlig a-lenke under eventuell beskrivelse og over porsjonene bare når recipeSourceUrl i src/domain/meals.js godkjenner den. Hjelperen bruker new URL uten base og tillater bare http:/https:, og gir ellers null. Alle href fra oppskriftskilden skal bruke denne felles kontrollen og den tolkede url.href. Lagret kilde og editorens kildefelt endres ikke, slik at eldre ugyldige verdier kan rettes. renderRecipeSourceLink finner vertsnavnet uten www. og bruker plattformnavn for Instagram, Facebook/fb.watch og TikTok med underdomener. Ugyldig/annen protokoll gir ingen lenke. Lenken bruker target=_blank og rel=noopener med forklarende aria-label. SVG-lenkeikonet er 16 px, pilen ut av appen 12 px; tekst er 14 px/600 i brand og understrykes bare ved hover/fokus. Min-height:44px gir trykkflate uten større tekst.

Toppstripens høyre handling er nå en vanlig Rediger-knapp som bruker eksisterende data-edit-meal-handler. Oppskriftsmenyens rendering, runtime-flagg, hendelser, historikknivå, fokusvern og rullenøkkel er fjernet. Den tidligere Hent fra lenke-snarveien er også fjernet: Rediger åpner v117-kortet med kilde når ingredienser/steg mangler, og brukeren starter selv importen. Øvrige vinduer/radmenyer og navigasjonskontrolleren er beholdt.

Editorens form-row er et ytre to-kolonne-rutenett på PC, med setting som indre grid. Standard stretching gjorde at hjelpetekst og ulike antall bokser fordelte ledig høyde forskjellig. Ved min-width:861px setter editoren align-items:start på raden og align-content:start på kolonnene. Dermed starter etiketter og felter på linje; input/select beholder naturlig høyde uten strekk. Regelen er avgrenset til editoren og PC; mobilens én kolonne er uendret. Alle fire rader er målt i lokal Chrome ved 1280 px, med null høydeforskjell mellom kolonnenes etikett-/feltstart.

Bildeimportens fjern-knapp har en gjennomsiktig 44×44 px button rundt en 26 px mørk span-sirkel og 14 px ×. Knappens plassering -5 px og den sentrerte sirkelens 9 px innrykk gir 4 px fra rutens topp/høyre. Bildedata, filvalg og fjerning bruker samme flyt som før.

App/cache er v118/118, minimum fortsatt 106. Ingen nye moduler eller endring i asset-listene utover cacheversjonen. Data, synk, server og regler er uendret.

## Rulleposisjon ved skjermbytte fra v119

src/ui/page-scroll.js gir pageScreenKey, pageScrollTarget og createPageScroll. Nøkkelen er editor:<id> når activeView er meals med åpen editor, recipe:<id> i oppskriftsvisningen, ellers kanonisk activeView. Åpne vinduer inngår ikke; AI-innstillinger har egen nøkkel selv om editorens utkast beholdes. Den rene beslutningen gir null ved lik nøkkel, 0 ved endret nøkkel framover/fane, og husket posisjon eller 0 ved tilbake.

createPageScroll holder siste tegnede nøkkel og en Map av posisjoner i minnet. beforeRender husker posisjonen til skjermen som forlates og beregner neste mål. history.scrollRestoration settes til manual, så nettleseren ikke konkurrerer med appen. Ved tilgangsskjerm nullstilles minnet. Ingen nye state-/synk-/backupfelt.

app.js markerer retning bare rundt den synkrone handlingen: navigate bruker forward som standard, bunnmenyens fanebytte bruker tab, backInApp bruker back både for Tilbake-knappen og popstate. Avbryt/Forkast og sletting bruker også back. Flagget gjenopprettes etter handlingen, slik at en senere status-/synkcallback ikke arver retningen. Vanlige renders, ukebytte og åpning/lukking av vinduer har samme nøkkel og skal ikke rulle hovedsiden.

render leser nøkkel og window.scrollY før innerHTML byttes. Ved skjermbytte frigjøres en aktiv middagsvelgerlås først, slik at den virkelige underliggende posisjonen kan huskes. Den eksisterende låsen beholdes ved vanlig re-tegning. Målposisjonen settes med scrollTo etter markup, hendelsesbinding, v108-restaurering og loading-håndtering, før neste maling. Hvis neste skjerm har en velger, låses den først etter målsettingen. Velgerstatus skal bare låse week, ikke en annen skjerm med gammel UI-status.

Trykk på den allerede viste rotfanen trenger ingen render/historikk: scrollTo med top:0 og smooth, eller auto når prefers-reduced-motion er aktiv. Fra oppskrift/editor er trykk på tilhørende fane et bytte til rotvisningen, som starter øverst. data-scroll-key/data-focus-key og v108-bevaring av vinduenes scrollTop/scrollLeft/fokus er uendret.

openMealEditor deler Rediger-flyten mellom kort og oppskriftsvisning. Runtime mealEditorReturn beholder opprinnelig skjerm og dagskontekst. Editor fra oppskrift har oppskriftsnivået som logisk forelder i navigationLevels. Avbryt/tilbake viser oppskriften igjen på husket posisjon; fra listen returneres listen. Lagre viser den lagrede oppskriften som en ny framoverskjerm på 0, og tilbake fra den går til opprinnelig liste/Uke/Handle. Sletting går til denne foreldrevisningen med husket posisjon. Bare UI-patcher/retur er endret; oppskrifts- og ukeskrivinger bruker samme lagrings-/synkflyt.

App/cache er v119/119, minimum 106. page-scroll.js står i begge asset-listene. Tester bruker syntetiske data og simulerte scrollY/History-hendelser. Lokal Chrome med filer direkte fra prosjektet og nettverk blokkert bekreftet liste 1200 → oppskrift 0 → re-tegning 800 → tilbake 1200, editor 0 → Avbryt 800, og Lagre 0. Ekte iPhone/Safari-tilbake-sveip gjenstår etter eiers publisering.
