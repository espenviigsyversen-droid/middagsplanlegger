// Import changes only editor fields. Identity, flags and scheduling stay intact.
export function applyImportedRecipe(draft, recipe, { isNew = false, replaceIngredients = false, replaceSteps = false } = {}) {
  const next = structuredClone(draft);
  for (const field of ["title", "description", "prepTime", "recipeUrl"]) {
    if ((isNew || !String(next[field] || "").trim()) && String(recipe[field] || "").trim()) next[field] = recipe[field];
  }
  if ((isNew || !next.categories?.length) && recipe.categories?.length) next.categories = [...recipe.categories];
  const hasIngredients = next.ingredients?.some(item => String(item.name || "").trim());
  const hasSteps = next.steps?.some(step => String(step || "").trim());
  if (recipe.ingredients?.length && (!hasIngredients || replaceIngredients)) {
    next.ingredients = structuredClone(recipe.ingredients);
    if (recipe.servingsKnown !== false) next.baseServings = recipe.baseServings;
  }
  if (recipe.steps?.length && (!hasSteps || replaceSteps)) next.steps = [...recipe.steps];
  return next;
}
