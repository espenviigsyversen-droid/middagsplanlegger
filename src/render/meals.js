export function renderCategoryChipsView(meal, labels = {}, escapeHtml = String) {
  return (meal.categories || []).map((cat) => `<span class="chip ${escapeHtml(cat)}">${escapeHtml(labels[cat] || cat)}</span>`).join("");
}

export function renderMealBadgesView(meal) {
  const badges = [];
  if (meal.favorite) badges.push('<span class="chip">Favoritt</span>');
  if (meal.kidFriendly) badges.push('<span class="chip">Barnevennlig</span>');
  if (meal.leftovers === "likely") badges.push('<span class="chip">Rester</span>');
  if (meal.prepTime === "quick") badges.push('<span class="chip">Rask</span>');
  return badges.join("");
}

export function renderSuitabilityChipsView(meal, labels = {}, escapeHtml = String) {
  return (meal.suitability || []).map((key) => `<span class="chip">${escapeHtml(labels[key] || key)}</span>`).join("");
}

export function renderMealCardView(options = {}) {
  const {
    meal,
    categoryLabels = {},
    suitabilityLabels = {},
    escapeHtml = String,
  } = options;

  return `
    <article class="meal-card">
      <div class="meal-card-head">
        <div>
          <p class="meal-title">${escapeHtml(meal.title)}</p>
          <p class="meal-description">${escapeHtml(meal.description)}</p>
        </div>
        <div class="card-actions">
          <button class="button secondary compact" data-view-meal="${escapeHtml(meal.id)}">Oppskrift</button>
          <button class="button ghost compact" data-edit-meal="${escapeHtml(meal.id)}">Rediger</button>
        </div>
      </div>
      <div class="chips">
        ${renderCategoryChipsView(meal, categoryLabels, escapeHtml)}
        ${renderMealBadgesView(meal)}
        ${renderSuitabilityChipsView(meal, suitabilityLabels, escapeHtml)}
        ${meal.excludeFromSuggestions ? '<span class="chip chip-recipe-only">Kun oppskrift</span>' : ""}
      </div>
    </article>
  `;
}

export function renderGroupedMealsView(options = {}) {
  const {
    meals = [],
    categoryLabels = {},
    suitabilityLabels = {},
    escapeHtml = String,
  } = options;

  const groups = Object.entries(categoryLabels)
    .map(([category, label]) => ({
      category,
      label,
      meals: meals.filter((meal) => meal.categories?.[0] === category),
    }))
    .filter((group) => group.meals.length);

  const other = meals.filter((meal) => !meal.categories?.[0] || !categoryLabels[meal.categories[0]]);
  if (other.length) groups.push({ category: "annet", label: "Annet", meals: other });

  return groups.map((group) => `
    <section class="meal-group">
      <h3>${escapeHtml(group.label)}</h3>
      <div class="meal-list">
        ${group.meals.map((meal) => renderMealCardView({ meal, categoryLabels, suitabilityLabels, escapeHtml })).join("")}
      </div>
    </section>
  `).join("");
}

export function renderMealsView(options = {}) {
  const {
    meals = [],
    filters = {},
    grouped = false,
    categoryEntries = [],
    categoryLabels = {},
    suitabilityEntries = [],
    suitabilityLabels = {},
    editorHtml = "",
    addIconHtml = "",
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header meals-view-header">
      <div class="meals-header-row">
        <h2 class="view-title">Oppskrifter</h2>
        <button class="button compact" data-edit-meal="new">${addIconHtml} Ny oppskrift</button>
      </div>
    </section>
    ${editorHtml}
    <section class="filters">
      <input class="input" data-filter="query" value="${escapeHtml(filters.query || "")}" placeholder="Søk etter oppskrift eller ingrediens">
      <div class="filter-row">
        <select class="select" data-filter="category">
          <option value="all">Alle kategorier</option>
          ${categoryEntries.map(([value, label]) => `<option value="${escapeHtml(value)}" ${filters.category === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
        <select class="select" data-filter="flag">
          <option value="all">Alle typer</option>
          <option value="favorite" ${filters.flag === "favorite" ? "selected" : ""}>Favoritter</option>
          <option value="kid" ${filters.flag === "kid" ? "selected" : ""}>Barnevennlig</option>
          <option value="quick" ${filters.flag === "quick" ? "selected" : ""}>Rask middag</option>
          ${suitabilityEntries.map(([value, label]) => `<option value="suitability:${escapeHtml(value)}" ${filters.flag === `suitability:${value}` ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </div>
      <select class="select" data-filter="sort">
        <option value="category" ${filters.sort === "category" ? "selected" : ""}>Gruppert etter kategori</option>
        <option value="alpha" ${filters.sort === "alpha" ? "selected" : ""}>Alfabetisk liste</option>
      </select>
    </section>
    <section class="meal-list">
      ${grouped
        ? renderGroupedMealsView({ meals, categoryLabels, suitabilityLabels, escapeHtml })
        : meals.map((meal) => renderMealCardView({ meal, categoryLabels, suitabilityLabels, escapeHtml })).join("")}
    </section>
  `;
}

export function renderMealDetailView(options = {}) {
  const {
    meal,
    steps = [],
    ingredients = [],
    wakeSupported = false,
    keepScreenAwake = false,
    wakeText = "Hold skjermen på",
    leftoversText = "",
    servingText = "",
    baseServings = 4,
    targetServings = null,
    shoppingIconHtml = "",
    scaleAmount = (amount) => amount,
    escapeHtml = String,
  } = options;

  return `
    <section class="recipe-detail">
      <div class="recipe-hero">
        <div>
          <h2>${escapeHtml(meal.title)}</h2>
          <p>${escapeHtml(meal.description || "Ingen beskrivelse er lagt inn ennå.")}</p>
          <p class="recipe-serving-note">${escapeHtml(servingText)}</p>
        </div>
        <div class="recipe-actions">
          <button class="button ghost" data-close-meal>Tilbake</button>
          <button class="button secondary wake-button ${keepScreenAwake ? "active" : ""}" data-toggle-wake ${wakeSupported ? "" : "disabled"}>${escapeHtml(wakeText)}</button>
          ${meal.recipeUrl ? `<a class="button secondary" href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener">Åpne lenke</a>` : ""}
          <button class="button secondary" data-add-to-shopping="${escapeHtml(meal.id)}">${shoppingIconHtml} Legg i handleliste</button>
          <button class="button secondary" data-edit-meal="${escapeHtml(meal.id)}">Rediger</button>
        </div>
      </div>
      ${wakeSupported ? "" : '<p class="wake-note">Denne nettleseren støtter ikke å holde skjermen våken fra web-appen.</p>'}
      <div class="recipe-columns">
        <section class="recipe-section">
          <h3>Ingredienser</h3>
          ${ingredients.length ? `
            <div class="ingredient-table">
              ${ingredients.map((item) => `
                <div class="ingredient-row">
                  <span>${escapeHtml([scaleAmount(item.amount, baseServings, targetServings), item.unit].filter(Boolean).join(" "))}</span>
                  <strong>${escapeHtml(item.name)}</strong>
                </div>
              `).join("")}
            </div>
          ` : '<p class="empty-recipe-text">Ingen ingredienser er lagt inn ennå.</p>'}
        </section>
        <section class="recipe-section">
          <h3>Fremgangsmåte</h3>
          <div class="step-list">
            ${steps.map((step, index) => `
              <article class="recipe-step">
                <div class="recipe-step-number">${index + 1}</div>
                <p>${escapeHtml(step)}</p>
              </article>
            `).join("")}
          </div>
          <p class="recipe-note">${escapeHtml(leftoversText)}</p>
        </section>
      </div>
    </section>
  `;
}
