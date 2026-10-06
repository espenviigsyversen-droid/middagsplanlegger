# State Model

Dette dokumentet beskriver hovedformen på appens state og hva som lagres lokalt eller synkes.

## Lagring

State lagres lokalt i `localStorage` under nøkkelen:

```text
middagsapp-state
```

Synkede deler lagres også i Firestore når Firebase er tilgjengelig.

Fra v95 lagres `projectId: "middagsplanlegger-6db4e"` sammen med state. Manglende eller avvikende ID nullstiller family, mealPreferences, metadata, meals, alle seks *ByWeek-kart, shoppingList, clientUpdatedAt og pendingLocalSync før noe kan sendes til skyen. Standardmetadata og familieinnstillinger beholdes som tomt oppsetts grunnlag; oppskrifter og plan inneholder ingen eksempeldata. Lik prosjekt-ID beholder domenedata, med vanlig normalisering. Prosjekt-ID er lokal og inngår ikke i sikkerhetskopiens domenepayload.

`middagsapp-membership` lagrer `{ projectId, familyId, uid, email, role, initialized, minAppVersion }` etter vellykket serverkontroll. Flagget brukes bare for lokal tilgang uten nett, og fjernes ved utlogging eller avvist medlemskap. Medlemsrollen, innlogget bruker, oppsettskjerm og filoppsummering ligger i separat tilgangs-/UI-state; de synkes og eksporteres ikke. Lokal state slettes ikke ved utlogging. En ny konto må alltid gjennom serverkontroll før den får se domenedata på nett.

## Viktige state-felter

UI-state:

- `activeView`
- `previousView`
- `weekOffset`
- `filters`
- `editingMealId`
- `draftMeal`
- `draftIngredients`
- `draftSteps`
- `selectedMealId`
- `selectedRecipeContext`
- `editingShoppingItemId`
- `mealPicker`
- `plannerDaySheet`
- `plannerActionsOpen`
- `shoppingReview`
- `generateModal`
- `toast`
- `keepScreenAwake`

Synket domenestate:

- `family`
- `mealPreferences`
- `meals`
- `metadata`
- `plansByWeek`
- `lockedPlansByWeek`
- `dayTypesByWeek`
- `servingsByWeek`
- `dayModesByWeek`
- `dayNotesByWeek`
- `shoppingList`

Synkstatus:

- `clientUpdatedAt`
- `pendingLocalSync`

`clientUpdatedAt` er klientens siste tidspunkt for endring i den opprinnelige scope-synken (profile/preferences/metadata/weeks). Handlevarer er unntatt fra v93 og oppskrifter fra v100. `pendingLocalSync` gjelder bare disse fire scopes og sporer verken handleliste- eller oppskriftsoperasjoner. Oppskriftspatch alene endrer ingen av de to feltene. Vanlig oppstart skal ikke alene gjøre lokal cache til en remote write.

## Firestore-splitting

Appen synker ikke hele state som ett dokument lenger. Den bruker flere områder:

- `families/{FAMILY_ID}/app/profile`
- `families/{FAMILY_ID}/app/preferences`
- `families/{FAMILY_ID}/app/metadata`
- `families/{FAMILY_ID}/shoppingItems/{itemId}`
- `families/{FAMILY_ID}/app/shopping` (arkiv; kun migreringsmarkør skrives av v93)
- `families/{FAMILY_ID}/meals/{mealId}`
- `families/{FAMILY_ID}/weeks/{weekKey}`

Fra v95 finnes også:

- `families/{FAMILY_ID}/members/{email}`: dokument-ID er e-post i små bokstaver; `{ role: "admin" | "member", addedAt, addedBy }`. Første manuelt opprettede administrator kan ha bare role.
- `families/{FAMILY_ID}/app/meta`: `{ schemaVersion: 1, initializedAt, initializedBy, minAppVersion }`. Gjeldende minimum er 100 fra v100. Bare administratorer skriver dette; alle medlemmer leser.

Fra utvidet v96 finnes serverprivate dokumenter, uten endringer i domenemodellen eller klientreglene:

- `families/familien/private/openaiKey`: `{ v: 1, iv, tag, data, masked, status, updatedAt, updatedBy, checkedAt }`. iv/tag/data er base64 fra AES-256-GCM; status er connected, invalid eller unavailable. masked viser kun fire første og fire siste tegn. updatedBy er administratorens e-post, men returneres aldri til klienten og logges ikke.
- `families/familien/private/keyUsage`: `{ calls: [millisekunder] }`, delt grense på 10 save/test-kontroller per rullerende 10 minutter.
- `families/familien/private/importUsage`: eksisterende importgrense, 10 kall per 10 minutter og 40 per UTC-døgn. Nøkkelen kontrolleres før kvoten telles; manglende/uleselig nøkkel teller ikke.

aiKeyStatus returnerer bare configured, masked, status, updatedAt, canManage og model (samt ok). Administratorer kan lagre, teste og slette gjennom aiKeySave, aiKeyTest og aiKeyDelete. Nøkkelen valideres mot modellen før den krypteres og lagres. Mislykket save beholder eksisterende dokument. Test oppdaterer status og checkedAt. Dekrypteringsfeil feiler lukket; import krever ny nøkkel og bruker ingen kvote. Sene test-/importresultater oppdaterer bare status hvis det krypterte innholdet fortsatt er det samme.

KEY_ENCRYPTION_SECRET er en serverhemmelighet og bindes bare til krypterende/dekrypterende funksjoner. Klartekst fra administratorens passordfelt går direkte i den utgående forespørselen og feltet tømmes umiddelbart. Den lagres aldri i global state, localStorage, sikkerhetskopi eller logger. aiKeyUi er separat minnetilstand med begrenset status, venteflagg og norsk melding; den inneholder ingen nøkkel eller kryptert innhold og nullstilles ved endret bruker/tilgang/synkøkt. Ingen domenelytter eller vanlig synk berører private-dokumentene.

Prosjektet er `middagsplanlegger-6db4e`. `app/state` og automatisk legacy-migrering brukes ikke lenger. Det gamle Firebase-prosjektet er arkiv. Stier og felter for profile, preferences, metadata, meals, weeks og shoppingItems er de samme.

En database er satt opp bare når meta finnes med initializedAt. Før dette starter ingen domenelyttere eller vanlige writes. Meta opprettes sist i eksplisitt administratoroppsett og vanlig domenesynk skriver aldri til meta. Tilgangsflyten gjør én egen best-effort updateDoc til REQUIRED_MIN_APP_VERSION ved online administratoroppstart når minimumet er lavere. Denne konstanten er 100 fra v100 og brukes også ved restore. Vanlige medlemmer og offline-økter gjør ikke dette; feil er stille og neste oppstart prøver igjen. Hvis minAppVersion overstiger appens numeriske versjon (100 fra v100), avsluttes synken og appen krever oppdatering. v99 får dermed oppdateringsskjerm når minimumet er 100. Nytt oppsett og gjenoppretting skriver 100.

Oppsett validerer JSON-eksportformat 1 og dokument-ID-er før første write. En union av alle seks ukekart bestemmer hvilke weeks-dokumenter som skrives. Handlevarer beholder ID, innhold og rekkefølge, med createdAt = 0 + indeks. Fremmede ID-er i meals/weeks/shoppingItems blokkerer innlesing; delvis innlest samme fil kan kjøres på nytt. Medlemslisten røres aldri. Tomt oppsett krever tomme samlinger. Ny innlesing krever manuell sletting av app/meta og tømming av de tre samlingene, mens members beholdes.

## Uker

Uke-data er splittet i flere maps med samme weekKey:

- `plansByWeek`
- `lockedPlansByWeek`
- `dayTypesByWeek`
- `servingsByWeek`
- `dayModesByWeek`
- `dayNotesByWeek`

En weekKey er ISO-lignende dato for mandagen i uken, for eksempel:

```text
2026-05-18
```

## Oppskrifter

En oppskrift inneholder typisk:

- `id`
- `title`
- `description`
- `categories`
- `recipeUrl`
- `baseServings`
- `ingredients`
- `steps`
- `prepTime`
- `favorite`
- `kidFriendly`
- `leftovers`
- `suitability`
- `minDaysBetween`
- `keyIngredients`

Ingredienser normaliseres til:

- `name`
- `amount`
- `unit`

Fra v98 finnes også valgfri `group`: trimmet tekst med maks 60 tegn, utelatt når tom. Ingrediensrekkefølgen beholdes. Sammenhengende ingredienser med samme gruppe vises med én overskrift, og ugrupperte ingredienser har ingen overskrift. Feltet bevares av normalisering, eksportformat 1, gjenoppretting og eksisterende meals-writes; ingen ny Firestore-sti eller regel er nødvendig. Eldre klienter kan fjerne group ved lagring og blokkeres derfor av minimum 98 når de kontrollerer serveren. Lokal offline-tilgang bruker fortsatt sist kjente minimum, men starter ingen synk.

I editorens draftIngredients representeres overskrifter som `{ type: "heading", title }`. Dette er UI-state. Ved lagring avledes group fra nærmeste overskrift over ingrediensen, og tomme overskrifter blir ikke dokumenter eller ingredienser. En tom overskrift starter en ugruppert del; fjernes den, overtar gruppen fra overskriften over. Rekkefølge, blanke overskrifter og rader bevares gjennom render, stegimport og AI-innstillinger. Ingrediensimport som fyller/erstatter en del bruker importens gruppeoverskrifter.

Fra v91 kan en hurtigmiddag opprettes med kun navn og eksisterende standardfelter. `categories`, `ingredients`, `steps`, `keyIngredients` og `suitability` er tomme lister, mens `prepTime` og `recipeUrl` er tomme strenger. Verken kategorien Kjøtt eller tilberedningstiden Rask tildeles automatisk ved lagring av en slik middag.

«Mangler oppskrift» er avledet via `mealNeedsRecipe`: ingen ingredienser, ingen steg og tom/blank `recipeUrl`. Beskrivelse alene regnes ikke som oppskrift. Det lagres eller synkes ikke noe nytt statusfelt på middagen. Hurtigmiddager kan foreslås av eksisterende forslagmotor (`excludeFromSuggestions: false`).

## Oppskriftsutkast ved import fra v96

Import bruker dagens meal-felter og dagens Lagre-flyt. applyImportedRecipe lager en kopi av utkastet; ingen lagret oppskrift endres før bekreftet Lagre. Fra v97 fylles/erstattes ingredienser og steg hver for seg, og manglende importert del bevarer utkastets innhold. baseServings byttes bare sammen med ingredienser når importens servingsKnown ikke er false; ellers beholdes den. servingsKnown er kun et importfelt og kopieres aldri til meal. Serverens baseServings er fortsatt numerisk (4 ved ukjent antall) for v96-klienter. Eksisterende utfylte metadata beholdes, mens nye oppskrifter får ikke-tomme importfelter. Identitet, favoritt/merking, forslagpreferanser og ukeplan påvirkes ikke.

recipeImportState (URL, tekst, busy, meldinger, warnings og fra v99 pending) er runtime-state og inngår ikke i localStorage/syncPayload/sikkerhetskopi. pending holder importrespons, konfliktflagg og en økt-/editorbundet gyldighetskontroll. Konflikter venter på synlige Erstatt/Behold-knapper; tomme deler fylles straks. Ved erstatning leses dagens skjema og bare konfliktområdene byttes. Ny import, lukking/bytte av editor, konto-/tilgangsendring og stopp av synk forkaster pending. Også ordinær saveState lagrer bare state, ikke den ventende responsen. draftMeal/draftIngredients/draftSteps er eksisterende UI-utkast og nullstilles ved oppstart/Avbryt. Importresponsen og erstatningsvalget kaller ikke saveState eller setState med domenedata. Ingen nytt felt legges til meal eller Firestore.

Serverens eneste nye lagring er `families/familien/private/importUsage` med UTC day, dailyCount og en kort liste av kalltidspunkter for rullerende vindu. Det er en privat teller, ikke oppskriftsdata. Klientens regler gir ikke tilgang; Admin SDK bruker én transaksjon på dette dokumentet. Members og øvrige domenesamlinger røres ikke av importfunksjonen.

Fra v100 sammenlignes minAppVersion numerisk med appversjon 100; ved oppsett brukes den felles REQUIRED_MIN_APP_VERSION (100). Ingen datamigrering eller automatisk omskriving av eksisterende oppskrifter utføres. baseServings lagres uendret, og ledeteksten er «Porsjoner i oppskriften» med forklaring av oppskriftens mengdegrunnlag. «Ingenting ble endret.» skjules mens et importvalg venter.

## Oppskriftsoperasjoner fra v100

Lagrede oppskrifter ligger fortsatt i state.meals og eksporteres som før. normalizeMeals er felles for oppstart, differ og snapshots, og fjerner updatedAt/clientUpdatedAt fra den lokale oppskriften. Ny/endrede oppskrifter skrives som hele dokumentet med updatedAt, uten merge. Felt som fjernes, beholdes ikke i skyen. Ingen ny Firestore-sti, regel eller domenefelt innføres. Restore-flyten er ellers uendret og kan fortsatt skrive den historiske tidsmarkøren, som ignoreres ved lesing.

mealsSync har bare minnetilstand: kø før start, antall SDK-operasjoner, siste lokale operasjon per ID, siste snapshot og løpenummer, serverSett/feil og generasjon. Hver operasjon husker løpenummeret ved kølegging. Den tilstanden inngår aldri i state, localStorage eller sikkerhetskopi. En ventende oppskriftsendring legges over snapshots til SDK har kvittert og siste bilde er fra serveren uten ventende skrivinger, med høyere løpenummer enn operasjonens. Innholdet sammenlignes ikke; dermed blir en nyere versjon fra en annen enhet synlig. Kontrollen kjøres ved både bilde og kvittering, med ny listepublisering hvis kvitteringen kommer sist. Et serverbilde fra før kølegging kan ikke fjerne operasjonen. Bare nyeste operasjon per ID gjelder. Andre ID-er oppdateres samtidig. Slettinger følger samme regel, også når en annen enhet har opprettet oppskriften på nytt. Avviste operasjoner beholdes med Synk feilet. Ingen feltvis flettealgoritme finnes for samtidige endringer på samme oppskrift; siste skriving av hele dokumentet vinner.

onMeals sammenligner normalisert innhold per ID. Identisk liste/rekkefølgeendring alene gir ingen state-oppdatering. Ved endring byttes bare endrede oppskriftsobjekter; UI, editor-drafts, recipeImportState.pending, clientUpdatedAt og pendingLocalSync beholdes. En vanlig brukerendring via setState gir bare per-dokumentoperasjon, med unntak for andre felter som eksplisitt ligger i samme patch (for eksempel ukeplan ved sletting/hurtigmiddag).

Første cache-bilde ignoreres; serverlisten er kilden ved oppstart og kan være tom. Global pendingLocalSync eller lokal cache utløser aldri oppskriftsopplasting. Offline-oppstart har ingen lytter/skriving/kø. Kø og lokale overlegg forsvinner ved stopp/kontobytte/omlasting, og lokale endringer kan erstattes av serverlisten. Feil beholdes synlig som Synk feilet; det finnes ingen varig kø eller automatisk gjeninnsending.

## Metadata og butikkategorier

`metadata.storeCategoryOrder` er et valgfritt felt fra v91: en liste med innebygde eller egendefinerte kategorinøkler, inkludert `other` (Annet). Alt annet enn en liste normaliseres til `[]`. Manglende/tom liste bevarer tidligere standardrekkefølge.

Kjente nøkler vises først i lagret rekkefølge; ukjente nøkler ignoreres og duplikater vises bare én gang. Kategorier som ikke er nevnt, legges til slutt i standardrekkefølge. Ved oppretting av en egen kategori lagres hele den viste rekkefølgen med den nye nøkkelen sist. Sletting fjerner nøkkelen fra rekkefølgen og flytter kategoriens varekoblinger til `other` som tidligere.

Dette er en additiv utvidelse inne i eksisterende metadata, ikke en ny Firestore-sti eller et nytt synk-scope. Ingen migrering kreves; gamle data mangler bare den valgfrie rekkefølgen. `syncPayload`, write-bygging og listeners behandler allerede metadata som et objekt og er uendret. Visningsrekkefølgen endrer ikke automatisk ingredienskategorisering.

## Handleliste

`shoppingList` har:

- `items`
- `generatedForWeek`

En lokal vare har:

- `id`
- `name`
- `amount`
- `unit`
- `category`
- `checked`
- `custom`
- `createdAt` (tall, lokal opprettingstid i ms; bevares ved normalisering)

Varer slås sammen basert på navn og enhet. Mengder slås sammen når begge kan tolkes som tall.

Fra v98 brukes teksten før første komma som grunnnavn når oppskrifter lager varer. Det samme grunnnavnet brukes i keyIngredients, vareoppslag og ingrediensforslag. Lagret ingrediensnavn og manuelt innskrevet varenavn beholdes. Intervaller (bindestrek/tankestrek, desimaler og brøker) skaleres i begge ender i oppskriftsvisningen og bruker høyeste verdi i handlelisten/summeringen. Uten skalering beholdes oppskriftens mengdetekst.

Fra v99 tolkes også blandede tall (2 1/2, 2½, 2 ½) og ½/¼/¾ numerisk, inkludert hver ende av intervaller. Den lagrede amount-strengen er uendret; skalering og handlelistesummering bruker den utvidede parseAmount. 2 1/0, 1 2 3 og ca 2 gir fortsatt null. Visningens avrunding og handlelistens formatering er beholdt.

Fra v100 bruker formatShoppingAmount komma som desimaltegn (3,5). Eldre mengder med punktum tolkes fortsatt; lagrede strenger omskrives ikke ved innlasting.

### Firestore og migrering fra v93

Dette avsnittet beskriver v93/v94-migreringen. Fra v95 erstattes den ved oppstart av eksplisitt oppsett fra sikkerhetskopi, som skriver handlemarkøren og starter varelytteren direkte. Transaksjonsmigreringen kjøres ikke i det nye prosjektet.

Dokument-ID i shoppingItems er varens eksisterende id; id lagres ikke i dokumentfeltene. Dokumentet inneholder name, amount, unit, category, checked, custom, createdAt og updatedAt (serverTimestamp). updatedAt tas bort ved lesing. Sortering bruker createdAt stigende og så ID. generatedForWeek beholdes kun lokalt og i sikkerhetskopien.

Migreringen leser kun skyens app/shopping i én transaksjon. Hvis migratedToItemsAt finnes, skjer ingen ny oppretting. Ellers normaliseres skyvarene med opprinnelige ID-er og createdAt = 0 + indeks, og markøren skrives med merge. shoppingList-feltet i app/shopping endres eller slettes aldri av v93. Manglende dokument/handleliste gir tom migrering. Arkivet er ingen løpende v93-handleliste.

setState beregner diff mellom gammel og ny items-liste: added bruker setDoc, updated bruker updateDoc med bare endrede name/amount/unit/category/checked/custom, removed bruker deleteDoc. Ingen clientUpdatedAt-kontroll brukes for handlevarer; sen oppdatering av slettet dokument ignoreres ved not-found. Ulike felt på samme vare kan dermed bevares samtidig. Samtidige endringer av samme felt har siste write som vinner; dette er ikke en konfliktvelger eller numerisk summering mellom enheter.

Minnekø før klar sendes etter vellykket migrering, før lytteren startes. Cache-snapshots ignoreres til første serversnapshot. Remote-patcher endrer bare items, ikke generatedForWeek, clientUpdatedAt eller pendingLocalSync, og utløser ingen nye writes. Synker gjelder til ventende operasjoner er bekreftet; andre operasjons-/lytterfeil gir Synk feilet. Ved migreringsfeil beholdes lokal liste og ingen handlelistelytter startes før neste oppstart.

### Kjente begrensninger og overgang

Offline-endringer har ingen varig operasjonskø. De sendes når nettet kommer tilbake bare hvis appen forblir åpen og synken er startet. Lukking/omlasting kan miste usynkede endringer; første serversnapshot erstatter lokal liste. Mislykket migrering prøves igjen ved neste oppstart.

Fra v95 forkastes også minnekø, timere og øvrige usendte operasjoner ved utlogging, kontobytte eller versjonsblokkering. Lokal state beholdes. Allerede sendte SDK-operasjoner kan ikke kanselleres. Ved ny godkjent innlogging startes synken rent på nytt. Offline-oppstart med godkjent medlemsflagg viser «Lokal lagring» og starter ingen synk; last appen inn igjen når nett er tilgjengelig. Endringer i handlelisten fra en slik økt overføres ikke automatisk og kan erstattes av første serversnapshot.

Usynkede v92-endringer overføres ikke. pendingLocalSync er globalt og identifiserer ikke handlelisteendringer. Lokal liste flettes derfor ikke inn i skyen; det kunne gjeninnført varer slettet på andre enheter. Før oppdatering må alle enheter være på nett, vise Synket og ha lik handleliste. v92-klienter som fortsetter å kjøre, skriver bare til arkivet. Disse senere endringene overføres ikke til v93. Se Utrulling av v93 i docs/RELEASE.md.

## Midlertidig state

Noen felter er kun midlertidige UI-flyter og bør ikke regnes som domenedata:

- `mealPicker`
- `plannerDaySheet`
- `plannerActionsOpen`
- `shoppingReview`
- `generateModal`
- `toast`
- editor-drafts

`normalizeState` nullstiller flere slike felter ved oppstart.

`shoppingReview.missingIngredients` er kun UI-state: en liste med middagsnavn og dag/dato for planlagte middager uten ingredienser. Den vises som en advarsel i gjennomgangen, men inngår ikke i synk eller sikkerhetskopi. Hvis ingen valgte middager har ingredienser, åpnes ingen gjennomgang; brukeren får en toast.

## Eksportformat

Sikkerhetskopi har `exportVersion: 1` og inneholder en kopi av `syncPayload()` under `data`, sammen med appversjon, familie-ID og eksporttid. Eksport skriver ikke state eller Firestore. UI-state, innlogging og synk-køer eksporteres ikke. Sikkerhetskopien har ingen automatisk gjenoppretting i v91.

## Viktige risikopunkter

- `setState` lagrer og rendrer umiddelbart. Vær forsiktig med hyppige input-events.
- Remote patches bevarer noe UI-state, men ikke alt. Nye UI-felter bør vurderes i `applyRemoteStatePatch`.
- Nye felter i den opprinnelige scope-synken må legges til i `syncedStateKeys`, `syncPayload`, `syncedScopesForPatch` og remote save/listener-logikk.
- Firestore-writes for profile, preferences, metadata og weeks skal sjekke remote `clientUpdatedAt` før skriving. Hvis remote er nyere enn lokal `clientUpdatedAt`, skal lokal cache ikke overskrive remote. Meals bruker egne konkrete operasjoner fra v100, uten global tidsmarkør eller getDoc.
- Manglende remote dokumenter skal ikke automatisk seedes fra lokal cache ved vanlig oppstart. Det er bare tillatt ved eksplisitt migrering/førstegangsoppsett eller når appen har `pendingLocalSync`.
