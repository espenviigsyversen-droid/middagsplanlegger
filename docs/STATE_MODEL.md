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

`clientUpdatedAt` er klientens siste tidspunkt for endring av synket domenedata. `pendingLocalSync` betyr at lokal state har endringer som ennå ikke er bekreftet skrevet til Firestore. Vanlig oppstart skal ikke alene gjøre lokal cache til en remote write.

## Firestore-splitting

Appen synker ikke hele state som ett dokument lenger. Den bruker flere områder:

- `families/{FAMILY_ID}/app/profile`
- `families/{FAMILY_ID}/app/preferences`
- `families/{FAMILY_ID}/app/metadata`
- `families/{FAMILY_ID}/app/shopping`
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

En vare har:

- `id`
- `name`
- `amount`
- `unit`
- `category`
- `checked`
- `custom`

Varer slås sammen basert på navn og enhet. Mengder slås sammen når begge kan tolkes som tall.

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
- Nye synkede felter må legges til i `syncedStateKeys`, `syncPayload`, `syncedScopesForPatch` og remote save/listener-logikk.
- Firestore-writes skal sjekke remote `clientUpdatedAt` før skriving. Hvis remote er nyere enn lokal `clientUpdatedAt`, skal lokal cache ikke overskrive remote.
- Manglende remote dokumenter skal ikke automatisk seedes fra lokal cache ved vanlig oppstart. Det er bare tillatt ved eksplisitt migrering/førstegangsoppsett eller når appen har `pendingLocalSync`.
