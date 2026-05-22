export function normalizeIngredients(ingredients, fallbackNames = []) {
  if (Array.isArray(ingredients) && ingredients.length) {
    return ingredients.map((item) => ({
      name: String(item.name || "").trim(),
      amount: String(item.amount || "").trim(),
      unit: String(item.unit || "").trim(),
    })).filter((item) => item.name);
  }
  return (fallbackNames || []).map((name) => ({ name, amount: "", unit: "" }));
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
