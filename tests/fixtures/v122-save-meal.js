// Archived v122 save handler: used only to test forward field preservation.
function legacyNormalizeMeals(meals = []) {
  return (Array.isArray(meals) ? meals : []).map((value) => {
    const { updatedAt: ignoredUpdatedAt, clientUpdatedAt: ignoredClientUpdatedAt, ...meal } = value;
    const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
    return { ...meal, recipeUrl: String(meal.recipeUrl || "").trim(),
      baseServings: Math.max(1, Number(meal.baseServings) || 4), ingredients,
      keyIngredients: [...new Set(ingredients.map(item => ingredientBaseName(item.name).toLowerCase()))],
      suitability: Array.isArray(meal.suitability) ? meal.suitability : [] };
  });
}

function saveMealFromForm(form) {
  const formData = new FormData(form);
  const isNew = state.editingMealId === "new";
  const existing = isNew ? emptyMeal() : getMeal(state.editingMealId);
  if (!existing) return;
  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const id = isNew ? makeMealId(title) : existing.id;
  const categories = formData.getAll("categories");
  const ingredients = collectIngredientRows();
  const meal = {
    ...existing,
    id,
    title,
    description: String(formData.get("description") || "").trim(),
    recipeUrl: normalizedRecipeUrl(formData.get("recipeUrl")),
    baseServings: Math.max(1, Number(formData.get("baseServings")) || 4),
    categories,
    suitability: formData.getAll("suitability"),
    kidFriendly: formData.has("kidFriendly"),
    favorite: formData.has("favorite"),
    excludeFromSuggestions: formData.has("excludeFromSuggestions"),
    leftovers: String(formData.get("leftovers") || "none"),
    prepTime: String(formData.get("prepTime") || ""),
    minDaysBetween: Math.max(1, Number(formData.get("minDaysBetween")) || 14),
    ingredients,
    keyIngredients: [...new Set(ingredients.map((item) => ingredientBaseName(item.name).toLowerCase()))],
    steps: collectStepRows(),
  };

  const meals = isNew
    ? [...state.meals, meal]
    : state.meals.map((item) => item.id === meal.id ? meal : item);
  const origin = mealEditorReturn;
  mealEditorReturn = null;
  navigate({ meals, activeView: "recipe", previousView: origin?.activeView === "recipe" ? origin.previousView : "meals",
    selectedRecipeContext: origin?.activeView === "recipe" ? origin.selectedRecipeContext : null,
    editingMealId: null, draftMeal: null, draftIngredients: null, draftSteps: null, selectedMealId: meal.id });
}
