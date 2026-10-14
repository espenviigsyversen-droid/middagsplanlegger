import { recipeYieldEditorValues } from "./recipe-yield.js";

// Only editable recipe values, never saved UI state or import payloads.
export function mealEditorFingerprint(meal, ingredients, steps) {
  const text = value => String(value ?? "").trim();
  return JSON.stringify({
    title: text(meal.title), description: text(meal.description), recipeUrl: text(meal.recipeUrl),
    baseServings: Number(meal.baseServings) || 4, minDaysBetween: Number(meal.minDaysBetween) || 14,
    recipeYield: recipeYieldEditorValues(meal),
    prepTime: meal.prepTime || "", leftovers: meal.leftovers || "none",
    categories: [...(meal.categories || [])].sort(), suitability: [...(meal.suitability || [])].sort(),
    kidFriendly: Boolean(meal.kidFriendly), favorite: Boolean(meal.favorite), excludeFromSuggestions: Boolean(meal.excludeFromSuggestions),
    ingredients: ingredients.map(item => item.type === "heading" ? { type: "heading", title: text(item.title) }
      : { type: "ingredient", name: text(item.name), amount: text(item.amount), unit: text(item.unit) }),
    steps: steps.map(text),
  });
}

export function socialRecipeSource(value) {
  try {
    const raw = String(value || "").trim();
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!["https:", "http:"].includes(url.protocol)) return "";
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    for (const [domain, label] of [["instagram.com", "Instagram"], ["facebook.com", "Facebook"], ["fb.watch", "Facebook"], ["tiktok.com", "TikTok"]]) {
      if (host === domain || host.endsWith(`.${domain}`)) return label;
    }
  } catch {}
  return "";
}
