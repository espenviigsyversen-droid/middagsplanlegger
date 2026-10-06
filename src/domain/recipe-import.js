// Import changes only editor fields. Identity, flags and scheduling stay intact.
export function applyImportedRecipe(draft, recipe, { isNew = false, replaceContent = false } = {}) {
  const next = structuredClone(draft);
  for (const field of ["title", "description", "prepTime", "recipeUrl"]) {
    if (isNew || !String(next[field] || "").trim()) next[field] = recipe[field] || "";
  }
  if (isNew || !next.categories?.length) next.categories = [...(recipe.categories || [])];
  const hasContent = next.ingredients?.some(item => String(item.name || "").trim()) || next.steps?.some(step => String(step || "").trim());
  if (isNew || replaceContent || !hasContent) {
    next.ingredients = structuredClone(recipe.ingredients || []);
    next.steps = [...(recipe.steps || [])];
    next.baseServings = recipe.baseServings;
  }
  return next;
}
