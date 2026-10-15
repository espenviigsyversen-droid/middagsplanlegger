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

// All presentations share options, ordering and filter identities.
const FLAGS = [["quick", "Rask"], ["kidFriendly", "Barnevennlig"], ["favorite", "Favoritter"]];
const filterIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>';

export function mealFilterGroups({ suitabilityEntries = [], categoryEntries = [], showNeedsRecipe = false, scope = "picker" } = {}) {
  return [
    { key: "flags", label: "EGENSKAPER", entries: FLAGS },
    { key: "suitability", label: "PASSER TIL", entries: suitabilityEntries.map(([key, label]) => ["suitability:" + key, label]) },
    { key: "category", label: "KATEGORI", entries: [...categoryEntries].sort((a, b) => a[1].localeCompare(b[1], "nb")).map(([key, label]) => ["category:" + key, label]) },
    { key: "other", label: "ANNET", entries: scope === "meal" && showNeedsRecipe ? [["needsRecipe", "Mangler oppskrift"]] : [] },
  ].filter(group => group.entries.length);
}

export function renderMealFilters(options = {}) {
  const { filters = {}, scope = "picker", desktop = false, expanded = false, count = 0, escapeHtml: e = String } = options;
  const groups = mealFilterGroups(options);
  const selected = key => key.startsWith("category:") ? filters.category === key.slice(9)
    : key.startsWith("suitability:") ? filters.suitability === key.slice(12) : Boolean(filters[key]);
  const button = ([key, label], remove = false, context = "") => `<button class="picker-filter" type="button" data-focus-key="${scope}-${context}${remove ? "remove" : "filter"}:${e(key)}" data-${scope}-filter="${e(key)}" aria-pressed="${Boolean(selected(key))}"${remove ? ` aria-label="Fjern filter ${e(label)}"` : ""}>${e(label)}${remove ? ' <span aria-hidden="true">×</span>' : ""}</button>`;
  const grouped = (frame = false) => groups.filter(group => !frame || group.key !== "other").map(group => {
    const id = `${scope}-filter-heading-${group.key}`;
    const other = frame && group.key === "flags" ? groups.find(item => item.key === "other") : null;
    return `<div class="filter-group" role="group" aria-labelledby="${id}"><h4 id="${id}">${group.label}</h4><div class="filter-group-chips">${group.entries.map(entry => button(entry, false, "group-")).join("")}${other ? '<span class="picker-filter-divider" aria-hidden="true"></span>' + other.entries.map(entry => button(entry, false, "group-")).join("") : ""}</div></div>`;
  }).join("");
  const action = (name, label, cls = "filter-text-button", focusName = name) => `<button type="button" class="${cls}" data-${scope}-filters-${name} data-focus-key="${scope}-filters-${focusName}"${cls === "modal-close" ? ' aria-label="Lukk filtre"' : ""}>${label}</button>`;
  if (scope === "meal" && desktop && filters.frameOpen !== false) {
    return `<section class="meal-filter-frame" aria-label="Filtre"><div class="filter-frame-tools">${action("close", "Skjul filtre")}</div>${grouped(true)}</section>`;
  }
  const chosen = groups.filter(group => group.key !== "flags").flatMap(group => group.entries).filter(([key]) => selected(key));
  const row = `<div class="picker-filters filter-compact ${scope === "meal" ? "meal-filters" : ""}" data-scroll-key="${scope}-filters" aria-label="Filtrer ${scope === "meal" ? "oppskrifter" : "middager"}"><button type="button" class="picker-filter filter-toggle" data-${scope}-filters-toggle data-focus-key="${scope}-filters-toggle" aria-expanded="${expanded}" aria-controls="${scope}-filter-panel">${filterIcon}Filtre${chosen.length ? `<span class="filter-count">${chosen.length}</span>` : ""}</button>${chosen.map(entry => button(entry, true)).join("")}${FLAGS.map(entry => button(entry)).join("")}</div>`;
  if (!expanded) return row;
  if (scope === "picker") return row + `<section class="picker-filter-panel" id="picker-filter-panel" aria-label="Filtergrupper"><div class="filter-group-scroll" data-scroll-key="picker-filter-groups">${grouped()}</div>${action("close", "Ferdig")}</section>`;
  return row + `<div class="modal-backdrop active filter-sheet-backdrop" data-meal-filters-backdrop><section class="meal-filter-sheet" id="meal-filter-panel" role="dialog" aria-modal="true" aria-labelledby="meal-filter-title"><div class="week-sheet-handle" aria-hidden="true"></div><header class="filter-sheet-header"><h3 id="meal-filter-title">Filtre</h3>${action("reset", "Nullstill")}${action("close", '<span aria-hidden="true">×</span>', "modal-close")}</header><div class="filter-group-scroll" data-scroll-key="meal-filter-groups">${grouped()}</div><footer>${action("close", `Vis ${count} ${count === 1 ? "oppskrift" : "oppskrifter"}`, "button filter-show-results", "show")}</footer></section></div>`;
}
