export function normalizeIngredients(ingredients, fallbackNames = []) {
  if (Array.isArray(ingredients) && ingredients.length) {
    return ingredients.map((item) => ({
      name: String(item.name || "").trim(),
      amount: String(item.amount || "").trim(),
      unit: String(item.unit || "").trim(),
      ...(String(item.group || "").trim() ? { group: String(item.group).trim().slice(0, 60) } : {}),
    })).filter((item) => item.name);
  }
  return (fallbackNames || []).map((name) => ({ name, amount: "", unit: "" }));
}

export function ingredientBaseName(name) {
  const whole = String(name || "").trim();
  return whole.split(",", 1)[0].trim() || whole;
}

// Shared by startup, per-document diffs and remote recipe snapshots.
export function normalizeMeals(meals = []) {
  return (Array.isArray(meals) ? meals : []).map((value) => {
    const { updatedAt: ignoredUpdatedAt, clientUpdatedAt: ignoredClientUpdatedAt, ...meal } = value;
    const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
    return { ...meal, recipeUrl: String(meal.recipeUrl || "").trim(),
      baseServings: Math.max(1, Number(meal.baseServings) || 4), ingredients,
      keyIngredients: [...new Set(ingredients.map(item => ingredientBaseName(item.name).toLowerCase()))],
      suitability: Array.isArray(meal.suitability) ? meal.suitability : [] };
  });
}

// Headings exist only in the editor; persisted ingredients carry their group.
export function ingredientsToEditorRows(ingredients = []) {
  const rows = [];
  let group = "";
  for (const ingredient of ingredients) {
    const nextGroup = String(ingredient.group || "").trim().slice(0, 60);
    if (nextGroup !== group) { rows.push({ type: "heading", title: nextGroup }); group = nextGroup; }
    const { group: ignored, ...row } = ingredient;
    rows.push({ ...row });
  }
  return rows;
}

export function editorRowsToIngredients(rows = []) {
  let group = "";
  const ingredients = [];
  for (const row of rows) {
    if (row.type === "heading") { group = String(row.title || "").trim().slice(0, 60); continue; }
    ingredients.push({ name: row.name, amount: row.amount, unit: row.unit, ...(group ? { group } : {}) });
  }
  return normalizeIngredients(ingredients);
}

export function moveIngredientEditorRow(rows, index, delta) {
  const next = structuredClone(rows);
  const target = index + delta;
  if (index >= 0 && index < next.length && target >= 0 && target < next.length) {
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function normalizedRecipeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

export function mealBaseServings(meal) {
  return Math.max(1, Number(meal?.baseServings) || 4);
}

export function makeSlug(value, fallback = "kategori") {
  return String(value || "").toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

export function uniqueMetadataKey(base, labels) {
  let key = base;
  let count = 2;
  while (labels[key]) {
    key = `${base}-${count}`;
    count += 1;
  }
  return key;
}

export function splitList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function splitLines(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

export function mealNeedsRecipe(meal) {
  return !meal?.ingredients?.length && !meal?.steps?.length && !String(meal?.recipeUrl || "").trim();
}

export function mealCanImportFromLink(meal) {
  return Boolean(String(meal?.recipeUrl || "").trim()) && !meal?.ingredients?.length && !meal?.steps?.length;
}

export function createQuickMeal(title, id) {
  return {
    id,
    title: String(title || "").trim(),
    description: "",
    recipeUrl: "",
    baseServings: 4,
    categories: [],
    kidFriendly: false,
    favorite: false,
    excludeFromSuggestions: false,
    leftovers: "none",
    prepTime: "",
    minDaysBetween: 14,
    keyIngredients: [],
    ingredients: [],
    suitability: [],
    steps: [],
  };
}

export function quickMealTitleForQuery(query, meals = []) {
  const title = String(query || "").trim();
  if (!title || meals.some((meal) => String(meal.title || "").trim().toLowerCase() === title.toLowerCase())) return "";
  return title;
}
