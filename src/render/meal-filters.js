export function mealFiltersActive(filters = {}) {
  return Boolean(filters.quick || filters.kidFriendly || filters.favorite || filters.needsRecipe
    || filters.suitability || (filters.category && filters.category !== "all"));
}

export function toggleMealFilter(filters, key) {
  const next = { ...filters };
  if (key.startsWith("category:")) {
    const value = key.slice(9); next.category = next.category === value ? "all" : value;
  } else if (key.startsWith("suitability:")) {
    const value = key.slice(12); next.suitability = next.suitability === value ? "" : value;
  } else if (["quick", "kidFriendly", "favorite", "needsRecipe"].includes(key)) next[key] = !next[key];
  return next;
}

export function renderMealFilters({ filters = {}, suitabilityEntries = [], categoryEntries = [],
  showNeedsRecipe = false, scope = "picker", escapeHtml: e = String } = {}) {
  const groups = [
    [["quick", "Rask"], ["kidFriendly", "Barnevennlig"], ["favorite", "Favoritter"]],
    suitabilityEntries.map(([key, label]) => ["suitability:" + key, label]),
    categoryEntries.map(([key, label]) => ["category:" + key, label]),
    showNeedsRecipe ? [["needsRecipe", "Mangler oppskrift"]] : [],
  ].filter(group => group.length);
  const button = ([key, label]) => {
    const selected = key.startsWith("category:") ? filters.category === key.slice(9)
      : key.startsWith("suitability:") ? filters.suitability === key.slice(12) : filters[key];
    return `<button class="picker-filter" type="button" data-focus-key="${scope}-filter:${e(key)}" data-${scope}-filter="${e(key)}" aria-pressed="${Boolean(selected)}">${e(label)}</button>`;
  };
  return `<div class="picker-filters ${scope === "meal" ? "meal-filters" : ""}" data-scroll-key="${scope}-filters" aria-label="Filtrer ${scope === "meal" ? "oppskrifter" : "middager"}">`
    + groups.map(group => group.map(button).join("")).join('<span class="picker-filter-divider" aria-hidden="true"></span>') + '</div>';
}
