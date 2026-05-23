export function renderShoppingSuggestionsView(options = {}) {
  const { suggestions = [], categories = {}, escapeHtml = String } = options;
  if (!suggestions.length) return "";
  return suggestions.map((item) => `
    <button type="button" class="shopping-suggestion" data-shopping-suggestion="${escapeHtml(item.name)}">
      <span>${escapeHtml(item.name)}</span>
      <small>${escapeHtml(categories[item.category] || "Annet")}</small>
    </button>
  `).join("");
}

export function renderShoppingReviewModalView(options = {}) {
  const {
    review = { groups: [], selectedItemIds: [] },
    selectedCount = 0,
    totalCount = 0,
    escapeHtml = String,
  } = options;
  if (!review.open) return "";

  const selectedIds = new Set(review.selectedItemIds || []);
  const confirmText = selectedCount === 1 ? "Legg til 1 vare" : `Legg til ${selectedCount} varer`;
  const bodyClass = review.mode === "week" ? "shopping-review-body week-review" : "shopping-review-body";

  const groups = (review.groups || []).map((group) => {
    const items = group.items || [];
    const groupSelectedCount = items.filter((item) => selectedIds.has(item.id)).length;
    return `
      <section class="shopping-review-group">
        <div class="shopping-review-group-head">
          <div>
            <h4>${escapeHtml(group.title)}</h4>
            ${group.subtitle ? `<p>${escapeHtml(group.subtitle)}</p>` : ""}
          </div>
          <div class="shopping-review-group-actions">
            <button class="text-action quiet" type="button" data-review-group-select="${escapeHtml(group.id)}">Alle</button>
            <button class="text-action quiet" type="button" data-review-group-clear="${escapeHtml(group.id)}">Ingen</button>
          </div>
        </div>
        <div class="shopping-review-items">
          ${items.map((item) => {
            const amountText = [item.amount, item.unit].filter(Boolean).join(" ");
            const checked = selectedIds.has(item.id);
            return `
              <label class="shopping-review-item${checked ? " selected" : ""}">
                <input class="shopping-checkbox" type="checkbox" data-review-item="${escapeHtml(item.id)}" ${checked ? "checked" : ""}>
                <span class="shopping-review-item-name">${escapeHtml(item.name)}</span>
                ${amountText ? `<span class="shopping-review-item-amount">${escapeHtml(amountText)}</span>` : ""}
              </label>
            `;
          }).join("")}
        </div>
        <p class="shopping-review-group-count">${groupSelectedCount} av ${items.length} valgt</p>
      </section>
    `;
  }).join("");

  return `
    <div class="modal-backdrop shopping-review-backdrop" data-close-shopping-review>
      <div class="modal shopping-review-modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>${escapeHtml(review.title || "Se over varer")}</h3>
            <p class="modal-subtitle">${selectedCount} av ${totalCount} varer er valgt</p>
          </div>
          <button class="modal-close" type="button" data-close-shopping-review aria-label="Lukk">×</button>
        </div>
        <div class="${bodyClass}">
          ${groups || `<div class="shopping-empty">Ingen varer å legge til.</div>`}
        </div>
        <div class="modal-footer">
          <button class="button secondary compact" type="button" data-close-shopping-review>Avbryt</button>
          <button class="button${selectedCount ? "" : " disabled"}" type="button" data-confirm-shopping-review ${selectedCount ? "" : "disabled"}>${confirmText}</button>
        </div>
      </div>
    </div>
  `;
}

export function renderShoppingItemView(item, escapeHtml = String) {
  const amountText = [item.amount, item.unit].filter(Boolean).join(" ");
  return `
    <div class="shopping-item${item.checked ? " done" : ""}">
      <label class="shopping-item-main">
        <input type="checkbox" class="shopping-checkbox" data-toggle-item="${escapeHtml(item.id)}" ${item.checked ? "checked" : ""} aria-label="Huk av ${escapeHtml(item.name)}">
        <span class="shopping-item-name">${escapeHtml(item.name)}</span>
        ${amountText ? `<span class="shopping-item-amount">${escapeHtml(amountText)}</span>` : `<span></span>`}
        <button type="button" class="shopping-item-menu" data-edit-shopping-item="${escapeHtml(item.id)}" aria-label="Rediger ${escapeHtml(item.name)}">⋯</button>
      </label>
    </div>
  `;
}

export function renderShoppingItemEditorView(options = {}) {
  const {
    item,
    unitOptions = [],
    storeCategories = [],
    escapeHtml = String,
  } = options;
  if (!item) return "";

  const unitOptionsHtml = unitOptions.map((unit) => `<option value="${escapeHtml(unit)}"${item.unit === unit ? " selected" : ""}>${escapeHtml(unit || "Ingen")}</option>`).join("");
  const categoryOptions = storeCategories.map((cat) => `<option value="${escapeHtml(cat.key)}"${item.category === cat.key ? " selected" : ""}>${escapeHtml(cat.label)}</option>`).join("");

  return `
    <div class="modal-backdrop" data-close-shopping-editor>
      <form class="modal shopping-editor-modal" data-shopping-editor-form role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Vare</h3>
          <button class="modal-close" type="button" data-close-shopping-editor aria-label="Lukk">×</button>
        </div>
        <div class="shopping-editor-fields">
          <label class="setting">
            <span>Navn</span>
            <input class="input" name="name" value="${escapeHtml(item.name)}" autocomplete="off">
          </label>
          <div class="shopping-editor-grid">
            <label class="setting">
              <span>Mengde</span>
              <input class="input" name="amount" value="${escapeHtml(item.amount)}" inputmode="decimal">
            </label>
            <label class="setting">
              <span>Enhet</span>
              <select class="select" name="unit">${unitOptionsHtml}</select>
            </label>
          </div>
          <label class="setting">
            <span>Butikkategori</span>
            <select class="select" name="category">${categoryOptions}</select>
          </label>
        </div>
        <div class="modal-footer shopping-editor-actions">
          <button class="button danger compact" type="button" data-delete-shopping-item="${escapeHtml(item.id)}">Slett</button>
          <button class="button secondary compact" type="button" data-close-shopping-editor>Avbryt</button>
          <button class="button compact" type="submit">Lagre</button>
        </div>
      </form>
    </div>
  `;
}

export function renderShoppingListView(options = {}) {
  const {
    items = [],
    storeCategories = [],
    generateModalHtml = "",
    itemEditorHtml = "",
    shoppingIconHtml = "",
    escapeHtml = String,
  } = options;
  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);
  const categoryGroups = storeCategories
    .map((cat) => ({ ...cat, items: unchecked.filter((item) => item.category === cat.key) }))
    .filter((cat) => cat.items.length > 0);
  const isEmpty = items.length === 0;

  return `
    ${generateModalHtml}${itemEditorHtml}
    <section class="view-header meals-view-header">
      <div class="meals-header-row">
        <h2 class="view-title">Handleliste</h2>
        <button class="button compact" data-generate-list>${shoppingIconHtml} Generer fra plan</button>
      </div>
      ${!isEmpty ? `<p class="view-lead">${unchecked.length} gjenstår · ${checked.length} avhuket</p>` : ""}
    </section>

    <div class="shopping-add-wrap">
      <form class="shopping-add-form" data-add-custom-form>
        <input class="input" name="item" placeholder="Legg til vare manuelt..." autocomplete="off" data-shopping-input>
        <button class="button secondary compact" type="submit">Legg til</button>
      </form>
      <div class="shopping-suggestions" data-shopping-suggestions></div>
    </div>

    ${isEmpty ? `
      <div class="shopping-empty">
        <p>Ingen varer lagt til ennå.</p>
        <p>Trykk <strong>Generer fra plan</strong> for å velge hvilke dager du skal handle for.</p>
      </div>
    ` : `
      <div class="shopping-list">
        ${categoryGroups.map((cat) => `
          <div class="shopping-category">
            <h4 class="shopping-category-heading">${escapeHtml(cat.label)}</h4>
            ${cat.items.map((item) => renderShoppingItemView(item, escapeHtml)).join("")}
          </div>
        `).join("")}
        ${checked.length > 0 ? `
          <div class="shopping-category checked-section">
            <h4 class="shopping-category-heading">I kurven (${checked.length})</h4>
            ${checked.map((item) => renderShoppingItemView(item, escapeHtml)).join("")}
            <button type="button" class="shopping-clear-btn text-action quiet" data-clear-checked>Fjern avhukede varer</button>
          </div>
        ` : ""}
      </div>
    `}
  `;
}
