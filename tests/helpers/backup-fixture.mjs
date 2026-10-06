export function backupFixture() {
  return { app: "middagsapp", exportVersion: 1, appVersion: "v94", familyId: "familien", exportedAt: "2026-10-06T12:00:00.000Z", data: {
    family: { name: "Testfamilien", familySize: 4, quickDays: [], kidFriendlyPerWeek: 2, leftovers: true, reuseIngredients: true },
    mealPreferences: { categoryGoals: {} },
    metadata: { categoryLabels: { fisk: "Fisk" }, units: ["", "stk"], prepTimeLabels: {}, suitabilityLabels: {}, planModeOptions: {}, ingredientMappings: {}, storeCategories: [], storeCategoryOrder: ["other"] },
    meals: [{ id: "meal-1", title: "Testmiddag", categories: [], description: "", recipeUrl: "", baseServings: 4,
      ingredients: [{ name: "Paprika", amount: "1", unit: "stk" }], steps: ["Kutt paprika"], prepTime: "", suitability: [],
      favorite: false, kidFriendly: false, leftovers: "none", minDaysBetween: 7, keyIngredients: [], excludeFromSuggestions: false }],
    plansByWeek: { "2026-10-05": { 0: "meal-1" } }, lockedPlansByWeek: {}, dayTypesByWeek: {}, servingsByWeek: {},
    dayModesByWeek: {}, dayNotesByWeek: { "2026-10-12": { 1: "Notat" } },
    shoppingList: { generatedForWeek: "2026-10-05", items: [
      { id: "item-z", name: "Paprika", amount: "1", unit: "stk", category: "other", checked: true, custom: false, createdAt: 123 },
      { id: "item-a", name: "Melk", amount: "2", unit: "", category: "other", checked: false, custom: true, createdAt: 124 },
    ] }, clientUpdatedAt: 100,
  } };
}
