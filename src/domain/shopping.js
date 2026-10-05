export function parseAmount(value) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return null;
  const fraction = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator ? numerator / denominator : null;
  }
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

export function formatAmount(value) {
  const rounded = Math.round(value * 4) / 4;
  const decimals = Number.isInteger(rounded) ? 0 : rounded < 10 ? 2 : 1;
  return rounded.toLocaleString("no-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function scaleAmount(amount, baseServings, targetServings) {
  if (!targetServings || targetServings === baseServings) return amount;
  const parsed = parseAmount(amount);
  if (parsed === null) return amount;
  return formatAmount((parsed * targetServings) / baseServings);
}

export function normalizeShoppingList(shoppingList = {}) {
  const items = Array.isArray(shoppingList?.items) ? shoppingList.items : [];
  return {
    generatedForWeek: shoppingList?.generatedForWeek || null,
    items: items.map((item) => ({
      id: String(item.id || Math.random().toString(36).slice(2)),
      name: String(item.name || "").trim(),
      amount: String(item.amount || "").trim(),
      unit: String(item.unit || "").trim(),
      category: String(item.category || "other"),
      checked: Boolean(item.checked),
      custom: Boolean(item.custom),
    })).filter((item) => item.name),
  };
}

export function formatShoppingAmount(num) {
  if (isNaN(num) || num === 0) return "";
  const rounded = parseFloat(num.toFixed(2));
  return rounded % 1 === 0 ? String(rounded) : String(rounded);
}

export function shoppingMergeKey(item) {
  return `${String(item.name || "").trim().toLowerCase()}__${String(item.unit || "").trim().toLowerCase()}`;
}

export function mergeShoppingAmount(existingAmount, incomingAmount) {
  const existing = parseAmount(existingAmount);
  const incoming = parseAmount(incomingAmount);
  if (existing !== null && incoming !== null) {
    return formatShoppingAmount(existing + incoming);
  }
  return existingAmount || incomingAmount || "";
}

export function mergeShoppingItems(existingItems, incomingItems) {
  const merged = [...normalizeShoppingList({ items: existingItems }).items];
  const indexByKey = new Map(merged.map((item, index) => [shoppingMergeKey(item), index]));

  normalizeShoppingList({ items: incomingItems }).items.forEach((incoming) => {
    const key = shoppingMergeKey(incoming);
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(incoming);
      return;
    }
    const current = merged[existingIndex];
    merged[existingIndex] = {
      ...current,
      amount: mergeShoppingAmount(current.amount, incoming.amount),
      category: current.category || incoming.category,
      checked: current.checked && incoming.checked,
      custom: current.custom && incoming.custom,
    };
  });

  return merged;
}

export function orderStoreCategories(categories, order = []) {
  const byKey = new Map(categories.map((category) => [category.key, category]));
  const orderedKeys = new Set((Array.isArray(order) ? order : []).filter((key) => byKey.has(key)));
  return [
    ...Array.from(orderedKeys, (key) => byKey.get(key)),
    ...categories.filter((category) => !orderedKeys.has(category.key)),
  ];
}
