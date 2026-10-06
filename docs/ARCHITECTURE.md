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
- `src/sync/reads.js` bygger lokale state-patches fra Firestore snapshots for oppskrifter og uker.
- `src/sync/state.js` inneholder rene synkbeslutninger: hvilke scopes som er endret, hvilke uker som må lagres, og når remote data er eldre enn lokale endringer.
- `src/sync/writes.js` bygger Firestore writes for de ulike sync-scopene uten å eie appens render- eller statusflyt.
- `src/sync/shopping.js` håndterer migrering og separat varebasert handlelistesynk fra v93.
- `src/render/shopping.js` inneholder HTML-malene for handlelistevisningen, vareeditor, vareforslag og shopping review modal.
- `src/render/meals.js` inneholder HTML-malene for oppskriftsliste, oppskriftskort, gruppering, oppskriftsdetalj og oppskriftseditor.
- `src/render/calendar.js` inneholder HTML-malene for kalender/forside.
- `src/render/planner.js` inneholder HTML-malene for ukeplanleggeren, dagkort og planleggerens bottom sheets.
- `src/render/setup.js` inneholder HTML-malene for Innstillinger, familie-/app-undersider og enkle metadata-sider.
- `styles.css` inneholder alle visuelle regler.
- `service-worker.js` håndterer cache, offline-støtte og oppdateringsflyt.
- `manifest.json` definerer PWA-navn, farger og ikoner.
- `icons/` inneholder appikonene.
- `tests/` inneholder enkle Node-baserte tester for rene domene-funksjoner.

## Runtime-modell

Appen har ingen bundler og ingen installerte npm-avhengigheter. Lokale moduler importeres direkte som ES-moduler. Firebase SDK lastes dynamisk fra Google CDN i `src/sync/firebase.js`.

Oppstart:

1. `index.html` viser loading screen.
2. `app.js` leser prosjektmerket state fra `localStorage`. Manglende/ulik prosjekt-ID gir tomme domenedata. Nye økter starter på Handleliste.
3. Firebase melder innloggingsstatus. Lasteskjermen beholdes mens status og tilgang kontrolleres. Uten innlogging vises bare Google-knappen; popup åpnes kun fra knappetrykk, med kontovalg.
4. Innlogget bruker må ha verifisert e-post og gyldig rolle i eget medlemsdokument. Deretter leses `app/meta` fra serveren. Uten markør vises oppsettskjermen; for høy minimumsversjon viser oppdateringsskjermen.
5. Først etter godkjent medlemskap, oppsett og versjon vises appen og domenesynken startes. En tidligere godkjent enhet kan åpne lokale data uten nett med «Lokal lagring».
6. Remote data kan patche lokal state og trigge ny render. Meta-lytteren stopper all synk hvis oppsettet fjernes eller minimumsversjonen økes over appens versjonsnummer (97 fra v97).

Fra v92 kjører et vanlig innebygd skript i `index.html` før appmodulen. Det fanger feil før første render, inkludert lastingsfeil på appens script-element via en fangende `window.error`-lytter. Hvis appflaten fortsatt er tom etter 12 sekunder, vises samme feiltilstand: spinneren skjules, en forklaring vises og brukeren kan laste siden på nytt. En MutationObserver avslutter overvåkingen når appen har rendret. Eksisterende `hideLoadingScreen()` fjerner lasteskjermen også etter sen oppstart. Vernet er uavhengig av appens modulimporter og endrer ikke lagring, cacher eller navigasjon.

## Hovedområder i `app.js`

`app.js` er foreløpig en stor fil. Den kan leses som disse logiske områdene:

- Konstanter og standarddata.
- `defaultState` og state-normalisering.
- State/persistens: `loadState`, `saveState`, `setState`.
- Importert domenelogikk: oppskrift/måltid fra `src/domain/meals.js`, mengder/handleliste fra `src/domain/shopping.js`, forslagpoeng fra `src/domain/suggestions.js` og uke/dato fra `src/domain/weeks.js`.
- Importert synklogikk: Firebase-oppkobling fra `src/sync/firebase.js`, snapshot-lesing fra `src/sync/reads.js`, konflikt-/scopebeslutninger fra `src/sync/state.js` og write-bygging fra `src/sync/writes.js`.
- Importert renderlogikk: kalender-HTML fra `src/render/calendar.js`, oppskrifts-HTML fra `src/render/meals.js`, planlegger-HTML fra `src/render/planner.js`, innstillings-HTML fra `src/render/setup.js` og handleliste-HTML fra `src/render/shopping.js`.
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

Resultatet går gjennom `src/domain/recipe-import.js` og fyller bare draftMeal/draftIngredients/draftSteps. Fra v97 behandles ingredienser og steg uavhengig: importen fyller tomme deler, og spør før den erstatter deler som finnes både i import og utkast, også for nye oppskrifter. Et nei bevarer disse delene, mens tomme deler fortsatt fylles. Importerte porsjoner følger ingrediensene bare når servingsKnown ikke er false. Tom tittel er gyldig på serveren ved delvis innhold; tomme importfelter tømmer aldri utfylt metadata. Eksisterende oppskrifter beholder utfylt metadata som før. Meldingen teller bare ingredienser/steg som faktisk ble fylt inn og veileder til tekstimport for manglende deler. Importen skriver ikke localStorage, meals eller Firestore. Vanlig UI-lagring kan fortsatt mellomlagre editorstate som før; oppstart nullstiller utkast. Oppskriften lagres bare fra dagens Lagre-knapp. Avbryt eller kontobytte gjør sene importsvar ugyldige.

`mealCanImportFromLink` styrer detaljsnarveien for en oppskrift med lenke, men uten ingredienser og steg. `mealNeedsRecipe` er uendret. Importfelt, meldinger, warnings og bruksstatus er midlertidig runtime-state utenfor domenepayload. Skjemainput fanges lokalt under venting, slik at render/statusendringer ikke mister det brukeren skriver.

Serveren består av en tynn functions/index.js-adapter med Admin SDK/Functions SDK og rene CommonJS-moduler i functions/lib. Kun firebase-admin og firebase-functions installeres ved publisering; tester kjører uten disse. Medlemssjekk krever verifisert e-post og medlemsdokument. En enkelt dokumenttransaksjon teller felles bruk i families/familien/private/importUsage: maks 10 kall per rullerende 10 minutter og 40 per UTC-døgn, før sidehenting og AI. Klientreglene avviser private-stien; regler og domenemodell er uendret.

Sidehenting bruker https, maks tre manuelt validerte omdirigeringer, alle DNS-svar kontrollert og socket bundet til validert IP for å unngå nytt ukontrollert oppslag. Lokale/private adresser og IP som vertsnavn avvises. Bare text/html aksepteres, maks 1 500 000 byte og samlet 10 sekunder inkludert DNS og omdirigeringer. Sosiale lenker ber om innlimt tekst. Sosial sourceUrl i tekstmodus beholdes som referanse og hentes ikke.

Uttrekk finner første Recipe i JSON-LD, inkludert lister, @graph og HowToSection. Fra v97 regnes det som fullstendig bare med minst to ingredienser, mengdetegn i minst halvparten og minst én instruksjon (source jsonld). Mangelfulle data kombineres som structured og pageText (jsonld+page-text); uten Recipe brukes page-text, og innlimt tekst gir pasted-text. Én ingrediensstreng beholdes inntil 2000 tegn. Samlet AI-inndata er maks 20 000 tegn; strukturert JSON avgrenses med hele poster, med første instruksjon bevart, og sidetekst forkortes også med hensyn til JSON-escaping.

HTML skannes i lineær tid. script/style/nav/header/footer/select/datalist/noscript/svg/template/iframe fjernes, mens form beholdes. Første main til siste main-slutt brukes når renset tekst har minst 500 tegn. Tittelen fra og:title eller title står først innenfor sidetekstens 16 000 tegn. Lengre tekst får et sammenhengende vindu med flest mengde/enhet- og oppskriftsord-signaler, valgt med to monotone pekere; uten signaler brukes starten. AI instrueres til å hente manglende mengder og steg fra pageText og godta delvis innhold uten å dikte. Responses-kallet bruker store:false og maks 8000 output-tokens. Ett nytt forsøk ved 429/5xx deler samme 45 sekunders budsjett. En overordnet 58 sekunders abortvakt inkluderer medlemskontroll og telling, innenfor funksjonens 60 sekunder. AI-svaret valideres og begrenses før det sendes tilbake. Tomt oppskriftsinnhold avvises; servingsKnown beskriver kjent antall, mens baseServings alltid er et tall (4 når ukjent) for v96-kompatibilitet. servingsKnown lagres ikke på oppskriften.

Funksjonene logger funksjonsnavn, kode, varighet og eventuell providerStatus. Import logger også source når kilden er kjent, bare fra jsonld, jsonld+page-text, page-text eller pasted-text. AI_INVALID_RESPONSE kan ha reason fra den faste listen incomplete, no_text, no_json, shape. Bare ved INTERNAL tillates errorName med 1–40 bokstaver og errorCode som heltall eller 1–40 tegn fra bokstaver, sifre, understrek, skråstrek og bindestrek, uten prefiks sk-. Ingen råtekst, sideinnhold, e-post, nøkkel, vertsnavn, tokenbruk, providerCode, error.message, stack eller øvrige feilfelter. Logging er best effort og kan ikke velte et kall. Modellen kan velges med OPENAI_RECIPE_MODEL. Tekst sendes til OpenAI med store: false, men importen oppretter ingen oppskriftsdokumenter på serveren. Functions-publisering kan utføres av agenten etter uttrykkelig utviklerbeskjed fra eier, alltid med --only functions og riktig --project. Functions skal ikke caches av service worker.

De siste v96-rettingene avviser tom lenke og tekst med under 20 tegn etter trimming i både app og importklient, før busy eller serverkall. Nøkkelklienten tømmer feltet straks, trimmer rundt verdien og avviser tom/ugyldig verdi lokalt. SDK-feil skiller mellom ugyldig inndata, manglende tilgang og nettverksfeil. Status unavailable vises som «Kunne ikke kontrolleres» og blokkerer ikke import når nøkkel finnes; bare manglende nøkkel eller invalid blokkerer.

### OpenAI-nøkkel i appen (utvidelse av upublisert v96)

Innstillingssiden «AI og oppskriftsimport» bruker src/sync/ai-key.js og src/render/ai-key.js. Functions-SDK lastes ved første bruk. aiKeyStatus er tilgjengelig for alle verifiserte medlemmer; aiKeySave, aiKeyTest og aiKeyDelete krever administratorrolle kontrollert av serveren. Samtlige kjører i europe-west1, med maks tre instanser og 30 sekunders tidsgrense. Bare aiKeySave, aiKeyTest og importRecipe bindes til KEY_ENCRYPTION_SECRET.

functions/lib/keys.js bruker Node crypto: AES-256-GCM, HKDF-SHA256 med salt middagsapp-openai-key-v1, tom info og 32-byte avledet nøkkel, tilfeldig 12-byte IV og dokumentstien som AAD. Feil hemmelighet, endret innhold eller ukjent krypteringsversjon gir ingen klartekst. Dokumentet families/familien/private/openaiKey inneholder kryptert innhold og begrenset statusinformasjon; Admin SDK er eneste leser/skriver. Eksisterende Firestore-regler avviser private-stien for klienter.

functions/lib/key-service.js eier tilgang, validering og nøkkelflyter uten Firebase-avhengigheter. Før lagring kontrolleres nøkkelen med GET /v1/models/{modell}, maksimalt 15 sekunder. 401/403, 404 og øvrige feil gir norske meldinger og beholder forrige lagrede nøkkel. Save og test deler 10 kontroller per rullerende 10 minutter i private/keyUsage. Test oppdaterer status/checkedAt; delete sletter bare nøkkeldokumentet. Transaksjoner berører ett privat dokument om gangen. Sene statusoppdateringer sammenligner kryptert innhold og kan verken merke en ny nøkkel ugyldig eller gjenopprette en slettet nøkkel.

importRecipe henter og dekrypterer nøkkelen etter medlems- og inndatakontroll, før importUsage telles. Manglende eller uleselig nøkkel gir AI_NOT_CONFIGURED uten å bruke importkvote. Uleselig innhold markeres invalid slik at klienten viser behov for nytt oppsett; 401/403 under import markerer også den brukte nøkkelen invalid. Administrator må legge inn nøkkelen på nytt etter bytte av krypteringshemmeligheten.

Klartekst finnes bare midlertidig i passordfeltet, den utgående HTTPS-forespørselen og serverminnet. Den inngår aldri i appens state, localStorage eller sikkerhetskopi. Feltet tømmes synkront når Lagre og valider trykkes, også før SDK-lasting er ferdig. Ufarlig status og en maske med maksimalt åtte nøkkeltegn holdes bare i minnet. Status hentes når editoren eller innstillingene åpnes; sene svar etter tilgangs-/brukerbytte ignoreres. Manglende/invalid oppsett erstatter importknappene med veiledning. Administrator kan gå til AI-innstillinger og tilbake med utkastet beholdt.

## Synk

Fra v95 brukes det egne Firebase-prosjektet `middagsplanlegger-6db4e` med Google-innlogging og familie-ID `familien`. Ingen kode kobler til det gamle prosjektet. `firestore.rules` i repoet er fasit: verifisert e-post og medlemsdokument kreves; medlemsadministrasjon og skriving til `app/meta` krever administrator. Vanlige medlemmer har samme tilgang til domenedata. Firebase standard innloggingspersistens brukes.

`src/sync/reads.js` bygger lokale patches fra remote snapshots, og `src/sync/writes.js` bygger writes for scopes som profile, preferences, metadata, meals og weeks. `app.js` eier fortsatt når snapshots skal aksepteres, når lagring planlegges og hvordan UI-status vises. Eksisterende dokumentformat og konfliktbeskyttelse beholdes. Alle writes er enkeltstående dokumentkall; ikke batch eller transaksjoner med mange dokumenter, siden medlemsreglene krever oppslag og slike operasjoner har en grense på 20 regeloppslag.

Data er splittet i flere dokumenter/collections:

- profile
- preferences
- metadata
- shoppingItems (ett dokument per vare; app/shopping er arkiv)
- meals
- weeks
- members (e-post i små bokstaver som dokument-ID; rolle og valgfri addedAt/addedBy)
- app/meta (schemaVersion, initializedAt, initializedBy, minAppVersion; administratorstyrt)

For profile, preferences, metadata, meals og weeks bruker synkstrategien `clientUpdatedAt`, `pendingRemoteScopes` og `pendingWeekKeys` for å unngå at eldre remote data overskriver lokale endringer. Før Firestore-writes utføres, leser write-laget remote `clientUpdatedAt` for samme dokument. Hvis remote er nyere enn lokal state, droppes lokal write slik at en gammel device ikke kan overskrive nyere planlegging. Manglende remote dokumenter seedes bare ved eksplisitt førstegangsoppsett/migrering eller når lokal state faktisk har `pendingLocalSync`.

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

Første testområder er etablert i `tests/domain/meals.test.mjs`, `tests/domain/shopping.test.mjs`, `tests/domain/suggestions.test.mjs`, `tests/domain/weeks.test.mjs`, `tests/render/calendar.test.mjs`, `tests/render/meals.test.mjs`, `tests/render/planner.test.mjs`, `tests/render/setup.test.mjs`, `tests/render/shopping.test.mjs`, `tests/sync/firebase.test.mjs`, `tests/sync/reads.test.mjs`, `tests/sync/state.test.mjs` og `tests/sync/writes.test.mjs`.

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
    reads.js
    state.js
    writes.js
  render/
    calendar.js
    meals.js
    planner.js
    setup.js
    shopping.js
  state.js
  sync.js
  render/
    calendar.js
    planner.js
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
