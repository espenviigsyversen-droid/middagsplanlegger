# State Model

Dette dokumentet beskriver hovedformen på appens state og hva som lagres lokalt eller synkes.

## Lagring

State lagres lokalt i `localStorage` under nøkkelen:

```text
middagsapp-state
```

Synkede deler lagres også i Firestore når Firebase er tilgjengelig.

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

`clientUpdatedAt` er klientens siste tidspunkt for endring av domenedata i den opprinnelige scope-synken. Handlevarer er unntatt fra v93. `pendingLocalSync` gjelder den opprinnelige scope-synken og sporer ikke handlelisteendringer fra v93. Vanlig oppstart skal ikke alene gjøre lokal cache til en remote write.

## Firestore-splitting

Appen synker ikke hele state som ett dokument lenger. Den bruker flere områder:

- `families/{FAMILY_ID}/app/profile`
- `families/{FAMILY_ID}/app/preferences`
- `families/{FAMILY_ID}/app/metadata`
- `families/{FAMILY_ID}/shoppingItems/{itemId}`
- `families/{FAMILY_ID}/app/shopping` (arkiv; kun migreringsmarkør skrives av v93)
- `families/{FAMILY_ID}/meals/{mealId}`
- `families/{FAMILY_ID}/weeks/{weekKey}`

Det finnes også legacy-støtte for:

- `families/{FAMILY_ID}/app/state`

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

Fra v91 kan en hurtigmiddag opprettes med kun navn og eksisterende standardfelter. `categories`, `ingredients`, `steps`, `keyIngredients` og `suitability` er tomme lister, mens `prepTime` og `recipeUrl` er tomme strenger. Verken kategorien Kjøtt eller tilberedningstiden Rask tildeles automatisk ved lagring av en slik middag.

«Mangler oppskrift» er avledet via `mealNeedsRecipe`: ingen ingredienser, ingen steg og tom/blank `recipeUrl`. Beskrivelse alene regnes ikke som oppskrift. Det lagres eller synkes ikke noe nytt statusfelt på middagen. Hurtigmiddager kan foreslås av eksisterende forslagmotor (`excludeFromSuggestions: false`).

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

### Firestore og migrering fra v93

Dokument-ID i shoppingItems er varens eksisterende id; id lagres ikke i dokumentfeltene. Dokumentet inneholder name, amount, unit, category, checked, custom, createdAt og updatedAt (serverTimestamp). updatedAt tas bort ved lesing. Sortering bruker createdAt stigende og så ID. generatedForWeek beholdes kun lokalt og i sikkerhetskopien.

Migreringen leser kun skyens app/shopping i én transaksjon. Hvis migratedToItemsAt finnes, skjer ingen ny oppretting. Ellers normaliseres skyvarene med opprinnelige ID-er og createdAt = 0 + indeks, og markøren skrives med merge. shoppingList-feltet i app/shopping endres eller slettes aldri av v93. Manglende dokument/handleliste gir tom migrering. Arkivet er ingen løpende v93-handleliste.

setState beregner diff mellom gammel og ny items-liste: added bruker setDoc, updated bruker updateDoc med bare endrede name/amount/unit/category/checked/custom, removed bruker deleteDoc. Ingen clientUpdatedAt-kontroll brukes for handlevarer; sen oppdatering av slettet dokument ignoreres ved not-found. Ulike felt på samme vare kan dermed bevares samtidig. Samtidige endringer av samme felt har siste write som vinner; dette er ikke en konfliktvelger eller numerisk summering mellom enheter.

Minnekø før klar sendes etter vellykket migrering, før lytteren startes. Cache-snapshots ignoreres til første serversnapshot. Remote-patcher endrer bare items, ikke generatedForWeek, clientUpdatedAt eller pendingLocalSync, og utløser ingen nye writes. Synker gjelder til ventende operasjoner er bekreftet; andre operasjons-/lytterfeil gir Synk feilet. Ved migreringsfeil beholdes lokal liste og ingen handlelistelytter startes før neste oppstart.

### Kjente begrensninger og overgang

Offline-endringer har ingen varig operasjonskø. De sendes når nettet kommer tilbake bare hvis appen forblir åpen og synken er startet. Lukking/omlasting kan miste usynkede endringer; første serversnapshot erstatter lokal liste. Mislykket migrering prøves igjen ved neste oppstart.

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
- Remote patches bevarer noe UI-state, men ikke alt. Nye UI-felter bør vurderes i `applyRemoteStatePatch` og `applyRemotePayload`.
- Nye felter i den opprinnelige scope-synken må legges til i `syncedStateKeys`, `syncPayload`, `syncedScopesForPatch` og remote save/listener-logikk.
- Firestore-writes for profile, preferences, metadata, meals og weeks skal sjekke remote `clientUpdatedAt` før skriving. Hvis remote er nyere enn lokal `clientUpdatedAt`, skal lokal cache ikke overskrive remote.
- Manglende remote dokumenter skal ikke automatisk seedes fra lokal cache ved vanlig oppstart. Det er bare tillatt ved eksplisitt migrering/førstegangsoppsett eller når appen har `pendingLocalSync`.
