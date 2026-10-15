import { odaSearchTerm, odaSearchUrl, orderedShoppingItems } from "../domain/oda.js";
import { renderSubpageBar } from "./subpage.js";

export function renderOdaView({ items = [], storeCategories = [], searched = new Set(), escapeHtml: e = String } = {}) {
  const unchecked = orderedShoppingItems(items.filter(item => !item.checked), storeCategories);
  const selected = unchecked.filter(item => item.oda === true), rest = unchecked.filter(item => item.oda !== true);
  const row = item => {
    const term = odaSearchTerm(item.name), amount = [item.amount, item.unit].filter(Boolean).join(" ");
    const changed = term !== item.name.trim().toLocaleLowerCase("nb");
    return `<div class="oda-row${item.oda ? " selected" : ""}"><label class="oda-row-main"><input type="checkbox" class="shopping-checkbox" data-oda-item="${e(item.id)}" data-focus-key="oda-item:${e(item.id)}" aria-label="Bestill ${e(item.name)} på Oda" ${item.oda ? "checked" : ""}><span class="oda-item-copy"><strong>${e(item.name)}</strong>${amount || changed ? `<small>${e(amount)}${changed ? `${amount ? " · " : ""}søker etter «${e(term)}»` : ""}</small>` : ""}</span></label>${item.oda ? `<a class="oda-search${searched.has(item.id) ? " searched" : ""}" data-oda-search="${e(item.id)}" data-focus-key="oda-search:${e(item.id)}" href="${e(odaSearchUrl(item.name))}" target="_blank" rel="noopener noreferrer" aria-label="Søk etter ${e(term)} på Oda (åpnes i ny fane)">${searched.has(item.id) ? "Søkt ✓" : "Søk i Oda ↗"}</a>` : ""}</div>`;
  };
  return `<section class="oda-page">${renderSubpageBar({ actionHtml: '<h2 class="oda-title">Handle på Oda</h2>' })}<p class="oda-intro">Trykk på varene dere vil bestille. «Søk i Oda» åpner søket, og du legger varen i kurven der.</p>${unchecked.length ? `<section aria-labelledby="oda-selected"><h3 id="oda-selected" class="shopping-category-heading">TIL ODA (${selected.length})</h3><div class="oda-items">${selected.map(row).join("")}</div></section><section aria-labelledby="oda-remaining"><h3 id="oda-remaining" class="shopping-category-heading">RESTEN AV HANDLELISTEN (${rest.length})</h3><div class="oda-items">${rest.map(row).join("")}</div></section><footer class="oda-order-footer"><div><button type="button" class="button" data-oda-order data-focus-key="oda-order" ${selected.length ? "" : "disabled"}>Merk ${selected.length} som bestilt</button><p>Varene hukes av i handlelisten.</p></div></footer>` : '<p class="shopping-empty">Handlelisten er tom.</p>'}</section>`;
}
