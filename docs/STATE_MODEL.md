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
- `shoppingReview`
- `generateModal`
- `toast`
- editor-drafts

`normalizeState` nullstiller flere slike felter ved oppstart.

## Viktige risikopunkter

- `setState` lagrer og rendrer umiddelbart. Vær forsiktig med hyppige input-events.
- Remote patches bevarer noe UI-state, men ikke alt. Nye UI-felter bør vurderes i `applyRemoteStatePatch` og `applyRemotePayload`.
- Nye synkede felter må legges til i `syncedStateKeys`, `syncPayload`, `syncedScopesForPatch` og remote save/listener-logikk.
