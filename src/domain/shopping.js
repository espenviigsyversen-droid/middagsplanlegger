export function parseAmount(value) {
  const text = String(value ?? "").trim().replace(/[½¼¾]/g, char => ` ${({ "½": "1/2", "¼": "1/4", "¾": "3/4" })[char]}`).trim().replace(",", ".");
  if (!text) return null;
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator ? Number(mixed[1]) + Number(mixed[2]) / denominator : null;
  }
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

export function parseAmountRange(value) {
  const text = String(value || "").trim();
  const parts = text.split(/[-–]/);
  if (parts.length !== 2) return null;
  const min = parseAmount(parts[0]), max = parseAmount(parts[1]);
  return min !== null && max !== null && Number.isFinite(min) && Number.isFinite(max) && min <= max ? { min, max } : null;
}

export function shoppingAmountValue(value) {
  return parseAmountRange(value)?.max ?? parseAmount(value);
}

export function roundScaledAmount(value, unit = "", { shoppingTotal = false } = {}) {
  const key = unit.trim().toLowerCase();
  let step;
  if (["g", "ml"].includes(key)) step = value < 10 ? 0.5 : value < 20 ? 1 : value < 100 ? 5 : value < 250 ? 10 : 25;
  else if (["kg", "l"].includes(key)) step = 0.1;
  else if (key === "dl") step = 0.5;
  else if (["ts", "ss"].includes(key)) step = value < 1 ? 0.25 : 0.5;
  else if (shoppingTotal) return Math.max(1, Math.ceil(value - 1e-10));
  else step = value < 3 ? 0.5 : 1;
  return Number((Math.max(1, Math.floor(value / step + 0.5 + 1e-10)) * step).toFixed(2));
}

export function scaleAmount(amount, baseServings, targetServings, unit = "") {
  if (!targetServings || targetServings === baseServings) return amount;
  const scaled = value => formatShoppingAmount(roundScaledAmount(value * targetServings / baseServings, unit));
  const range = parseAmountRange(amount);
  if (range) return `${scaled(range.min)}–${scaled(range.max)}`;
  const parsed = parseAmount(amount);
  if (parsed === null) return amount;
  return scaled(parsed);
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
      ...(Number.isFinite(item.createdAt) ? { createdAt: item.createdAt } : {}),
    })).filter((item) => item.name),
  };
}

export function formatShoppingAmount(num) {
  if (isNaN(num) || num === 0) return "";
  const rounded = parseFloat(num.toFixed(2));
  return String(rounded).replace(".", ",");
}

export function shoppingMergeKey(item) {
  return `${String(item.name || "").trim().toLowerCase()}__${String(item.unit || "").trim().toLowerCase()}`;
}

export function mergeShoppingAmount(existingAmount, incomingAmount) {
  const existing = shoppingAmountValue(existingAmount);
  const incoming = shoppingAmountValue(incomingAmount);
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

// Aggregate recipe contributions before rounding. Runtime fields never reach
// stored shopping items; existing/manual items are not passed through this step.
export function roundRecipeShoppingItems(items, { weekly = false } = {}) {
  const groups = new Map();
  for (const item of items) {
    const key = shoppingMergeKey(item), num = item._rawAmount ?? shoppingAmountValue(item.amount);
    const group = groups.get(key);
    if (group) {
      if (num !== null && group.num !== null) group.num += num;
      group.count++; group.scaled ||= item._scaled;
    } else groups.set(key, { item, num, count: 1, scaled: item._scaled });
  }
  return [...groups.values()].map(({ item, num, count, scaled }) => {
    const { _rawAmount, _scaled, ...clean } = item;
    const rounding = scaled || (weekly && count > 1);
    return { ...clean, amount: num === null ? clean.amount
      : rounding ? formatShoppingAmount(roundScaledAmount(num, clean.unit, { shoppingTotal: weekly && count > 1 }))
        : count > 1 ? formatShoppingAmount(num) : clean.amount };
  });
}

export function orderStoreCategories(categories, order = []) {
  const byKey = new Map(categories.map((category) => [category.key, category]));
  const orderedKeys = new Set((Array.isArray(order) ? order : []).filter((key) => byKey.has(key)));
  return [
    ...Array.from(orderedKeys, (key) => byKey.get(key)),
    ...categories.filter((category) => !orderedKeys.has(category.key)),
  ];
}
