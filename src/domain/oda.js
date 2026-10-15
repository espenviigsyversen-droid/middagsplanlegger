// Oda is a manual handoff through ordinary links; no provider integration.
export function odaSearchTerm(name = "") {
  let result = "", depth = 0;
  for (const char of String(name).split(",")[0]) {
    if (char === "(") depth++;
    else if (char === ")" && depth) depth--;
    else if (!depth) result += char;
  }
  return result.trim().replace(/\s+/g, " ").toLocaleLowerCase("nb");
}

export function odaSearchUrl(name) {
  return "https://oda.com/no/search/products/?q=" + encodeURIComponent(odaSearchTerm(name));
}

export function orderedShoppingItems(items = [], categories = []) {
  const ranks = new Map(categories.map((category, index) => [category.key, index]));
  return [...items].sort((a, b) => (ranks.get(a.category) ?? categories.length) - (ranks.get(b.category) ?? categories.length));
}

export function toggleOdaItem(items, id) {
  return items.map(item => {
    if (item.id !== id || item.checked) return item;
    const { oda, ...rest } = item;
    return oda === true ? rest : { ...rest, oda: true };
  });
}

export function markOdaOrdered(items) {
  return items.map(item => {
    if (item.checked || item.oda !== true) return item;
    const { oda, ...rest } = item;
    return { ...rest, checked: true };
  });
}
