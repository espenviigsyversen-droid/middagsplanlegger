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

function renderOption(value, label, selected, escapeHtml = String) {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

export function renderIngredientEditorRowView(options = {}) {
  const {
    item = { amount: "", unit: "", name: "" },
    index = 0,
    unitOptions = [],
    escapeHtml = String,
  } = options;

  return `
    <div class="ingredient-editor-row" data-ingredient-row="${index}">
      <input class="input" data-ingredient-field="amount" data-ingredient-index="${index}" value="${escapeHtml(item.amount)}" placeholder="Mengde">
      <select class="select" data-ingredient-field="unit" data-ingredient-index="${index}" aria-label="Enhet">
        ${unitOptions.map((unit) => `<option value="${escapeHtml(unit)}" ${item.unit === unit ? "selected" : ""}>${unit ? escapeHtml(unit) : "Enhet"}</option>`).join("")}
      </select>
      <input class="input" data-ingredient-field="name" data-ingredient-index="${index}" value="${escapeHtml(item.name)}" placeholder="Ingrediensnavn">
      <button class="icon-button" type="button" data-remove-ingredient="${index}" title="Fjern ingrediens">×</button>
    </div>
  `;
}

export function renderStepEditorRowView(options = {}) {
  const {
    step = "",
    index = 0,
    escapeHtml = String,
  } = options;

  return `
    <div class="step-editor-row" data-step-row="${index}">
      <div class="step-editor-number">${index + 1}</div>
      <textarea class="textarea" data-step-field data-step-index="${index}" placeholder="Beskriv dette steget">${escapeHtml(step)}</textarea>
      <button class="icon-button" type="button" data-remove-step="${index}" title="Fjern steg">×</button>
    </div>
  `;
}

export function renderMealEditorView(options = {}) {
  const {
    isNew = false,
    meal,
    baseServings = 4,
    ingredients = [],
    steps = [],
    categoryEntries = [],
    suitabilityEntries = [],
    prepTimeEntries = [],
    unitOptions = [],
    escapeHtml = String,
  } = options;

  if (!meal) return "";

  return `
    <section class="panel meal-editor">
      <div class="meal-editor-head">
        <h2>${isNew ? "Ny oppskrift" : `Rediger ${escapeHtml(meal.title)}`}</h2>
        <button class="button ghost" data-cancel-edit>Avbryt</button>
      </div>
      <form class="form" data-meal-form>
        <div class="form-row">
          <div class="setting">
            <label for="mealTitle">Navn</label>
            <input id="mealTitle" class="input" name="title" required value="${escapeHtml(meal.title)}">
          </div>
          <div class="setting">
            <label for="mealBaseServings">Porsjoner</label>
            <input id="mealBaseServings" class="input" type="number" min="1" max="30" name="baseServings" value="${baseServings}">
          </div>
        </div>
        <div class="form-row">
          <div class="setting">
            <label for="mealPrep">Tilberedningstid</label>
            <select id="mealPrep" class="select" name="prepTime">
              ${prepTimeEntries.map(([value, label]) => renderOption(value, label, meal.prepTime, escapeHtml)).join("")}
            </select>
          </div>
        </div>
        <div class="setting">
          <label for="mealDescription">Beskrivelse</label>
          <textarea id="mealDescription" class="textarea" name="description">${escapeHtml(meal.description)}</textarea>
        </div>
        <div class="setting">
          <label for="mealRecipeUrl">Lenke til oppskrift</label>
          <input id="mealRecipeUrl" class="input" type="text" inputmode="url" name="recipeUrl" value="${escapeHtml(meal.recipeUrl || "")}" placeholder="https://...">
        </div>
        <div class="form-row">
          <div class="setting">
            <label>Kategorier</label>
            <div class="checkbox-grid">
              ${categoryEntries.map(([value, label]) => `
                <label class="checkbox-line">
                  <input type="checkbox" name="categories" value="${escapeHtml(value)}" ${(meal.categories || []).includes(value) ? "checked" : ""}>
                  <span>${escapeHtml(label)}</span>
                </label>
              `).join("")}
            </div>
          </div>
          <div class="setting">
            <label>Merking</label>
            <div class="checkbox-grid">
              <label class="checkbox-line"><input type="checkbox" name="kidFriendly" ${meal.kidFriendly ? "checked" : ""}> <span>Barnevennlig</span></label>
              <label class="checkbox-line"><input type="checkbox" name="favorite" ${meal.favorite ? "checked" : ""}> <span>Favoritt</span></label>
              <label class="checkbox-line"><input type="checkbox" name="excludeFromSuggestions" ${meal.excludeFromSuggestions ? "checked" : ""}> <span>Kun oppskrift (ikke foreslå som middag)</span></label>
            </div>
          </div>
        </div>
        <div class="setting">
          <label>Passer til</label>
          <div class="checkbox-grid">
            ${suitabilityEntries.map(([value, label]) => `
              <label class="checkbox-line">
                <input type="checkbox" name="suitability" value="${escapeHtml(value)}" ${(meal.suitability || []).includes(value) ? "checked" : ""}>
                <span>${escapeHtml(label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="form-row">
          <div class="setting">
            <label for="mealLeftovers">Rester</label>
            <select id="mealLeftovers" class="select" name="leftovers">
              ${renderOption("none", "Nei", meal.leftovers, escapeHtml)}
              ${renderOption("possible", "Kanskje", meal.leftovers, escapeHtml)}
              ${renderOption("likely", "Sannsynlig", meal.leftovers, escapeHtml)}
            </select>
          </div>
          <div class="setting">
            <label for="mealSpacing">Minimum dager mellom</label>
            <input id="mealSpacing" class="input" type="number" min="1" max="365" name="minDaysBetween" value="${meal.minDaysBetween}">
          </div>
        </div>
        <div class="setting">
          <label for="mealIngredients">Ingredienser</label>
          <div class="ingredient-editor">
            <div class="ingredient-editor-head">
              <span>Mengde</span>
              <span>Enhet</span>
              <span>Ingrediens</span>
              <span></span>
            </div>
            ${ingredients.map((item, index) => renderIngredientEditorRowView({ item, index, unitOptions, escapeHtml })).join("")}
          </div>
          <button class="button secondary compact" type="button" data-add-ingredient>Legg til ingrediens</button>
          <p class="field-hint">Mengde og enhet kan stå tomt. Ingrediensnavn bør alltid fylles ut.</p>
        </div>
        <div class="setting">
          <label>Fremgangsmåte</label>
          <div class="step-editor">
            ${steps.map((step, index) => renderStepEditorRowView({ step, index, escapeHtml })).join("")}
          </div>
          <button class="button secondary compact" type="button" data-add-step>Legg til steg</button>
        </div>
        <div class="form-actions">
          ${isNew ? "" : '<button class="button danger" type="button" data-delete-meal>Slett</button>'}
          <button class="button secondary" type="button" data-cancel-edit>Avbryt</button>
          <button class="button" type="submit">Lagre middag</button>
        </div>
      </form>
    </section>
  `;
}
