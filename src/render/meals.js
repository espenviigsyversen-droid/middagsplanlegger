import { mealNeedsRecipe, mealCanImportFromLink, ingredientBaseName, ingredientsToEditorRows } from "../domain/meals.js";

function renderIngredientList(ingredients, { scaleAmount, baseServings, targetServings, escapeHtml }) {
  let previous = "";
  return ingredients.map(item => {
    const group = String(item.group || "").trim();
    const heading = group && group !== previous ? `<h4 class="ingredient-group-heading">${escapeHtml(group)}</h4>` : "";
    previous = group;
    const comma = item.name.indexOf(",");
    const suffix = comma > 0 ? item.name.slice(comma) : "";
    return `${heading}<div class="ingredient-row"><span>${escapeHtml([scaleAmount(item.amount, baseServings, targetServings), item.unit].filter(Boolean).join(" "))}</span>
      <div><strong>${escapeHtml(ingredientBaseName(item.name))}</strong>${escapeHtml(suffix)}</div></div>`;
  }).join("");
}

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
    escapeHtml = String,
  } = options;

  return `
    <article class="meal-card compact-meal-card" data-view-meal="${escapeHtml(meal.id)}">
      <div class="meal-card-head">
        <div class="meal-card-main">
          <p class="meal-title">${escapeHtml(meal.title)}</p>
          ${mealNeedsRecipe(meal) ? '<span class="chip missing-recipe-chip">Mangler oppskrift</span>' : ""}
        </div>
        <div class="card-actions">
          <button class="icon-button meal-open-btn" type="button" data-view-meal="${escapeHtml(meal.id)}" aria-label="Åpne oppskrift">□</button>
          <button class="icon-button meal-edit-btn" type="button" data-edit-meal="${escapeHtml(meal.id)}" aria-label="Rediger oppskrift">✎</button>
        </div>
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

export function renderMealSearchSuggestionsView(options = {}) {
  const {
    meals = [],
    query = "",
    categoryLabels = {},
    escapeHtml = String,
  } = options;

  if (!query.trim() || !meals.length) return "";

  return meals.slice(0, 5).map((meal) => {
    const category = meal.categories?.[0];
    const categoryLabel = category ? categoryLabels[category] || category : "";
    return `
      <button class="meal-search-suggestion" type="button" data-view-meal="${escapeHtml(meal.id)}">
        <span>${escapeHtml(meal.title)}</span>
        ${categoryLabel ? `<small>${escapeHtml(categoryLabel)}</small>` : ""}
      </button>
    `;
  }).join("");
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
      <div class="meal-search-wrap">
        <input class="input meal-search-input" data-filter="query" data-meal-search value="${escapeHtml(filters.query || "")}" placeholder="Søk etter oppskrift eller ingrediens" autocomplete="off">
        <button class="search-clear-btn meal-search-clear" type="button" data-clear-meal-search style="${filters.query ? "" : "display: none;"}" aria-label="Tøm søk">×</button>
      </div>
      <div class="meal-search-suggestions" data-meal-search-suggestions>
        ${renderMealSearchSuggestionsView({ meals, query: filters.query || "", categoryLabels, escapeHtml })}
      </div>
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
          <option value="needs-recipe" ${filters.flag === "needs-recipe" ? "selected" : ""}>Mangler oppskrift</option>
          ${suitabilityEntries.map(([value, label]) => `<option value="suitability:${escapeHtml(value)}" ${filters.flag === `suitability:${value}` ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
        </select>
      </div>
      <select class="select" data-filter="sort">
        <option value="category" ${filters.sort === "category" ? "selected" : ""}>Gruppert etter kategori</option>
        <option value="alpha" ${filters.sort === "alpha" ? "selected" : ""}>Alfabetisk liste</option>
      </select>
    </section>
    <section class="meal-list" data-meal-list>
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
    importAvailable = false,
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
          ${mealCanImportFromLink(meal) ? `<button class="button" data-import-from-link="${escapeHtml(meal.id)}" ${importAvailable ? "" : "disabled"}>Hent fra lenke</button>` : ""}
          <button class="button ${mealNeedsRecipe(meal) ? "" : "secondary"}" data-edit-meal="${escapeHtml(meal.id)}">${mealNeedsRecipe(meal) ? "Legg inn oppskrift" : "Rediger"}</button>
        </div>
      </div>
      ${wakeSupported ? "" : '<p class="wake-note">Denne nettleseren støtter ikke å holde skjermen våken fra web-appen.</p>'}
      ${mealNeedsRecipe(meal) ? '<p class="empty-recipe-text">Ingen oppskrift lagt inn ennå</p>' : ""}
      <div class="recipe-columns">
        <section class="recipe-section">
          <h3>Ingredienser</h3>
          ${ingredients.length ? `
            <div class="ingredient-table">
              ${renderIngredientList(ingredients, { scaleAmount, baseServings, targetServings, escapeHtml })}
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

  if (item.type === "heading") return `
    <div class="ingredient-heading-editor-row" data-ingredient-row="${index}" data-ingredient-heading="true">
      <input class="input" data-ingredient-field="group" maxlength="60" value="${escapeHtml(item.title || "")}" placeholder="Overskrift, for eksempel Saus" aria-label="Ingrediensoverskrift">
      <div class="ingredient-heading-actions">
        <button class="icon-button" type="button" data-move-ingredient-heading="${index}" data-direction="-1" aria-label="Flytt overskrift opp" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" type="button" data-move-ingredient-heading="${index}" data-direction="1" aria-label="Flytt overskrift ned">↓</button>
        <button class="icon-button" type="button" data-remove-ingredient="${index}" aria-label="Fjern overskrift">×</button>
      </div>
    </div>`;

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
    recipeImport = {},
    aiKeyStatus = null,
    aiKeyMessage = "",
    isAdmin = false,
    importAvailable = false,
    escapeHtml = String,
  } = options;

  if (!meal) return "";
  const ingredientRows = ingredients.some(item => item.type === "heading") ? ingredients : ingredientsToEditorRows(ingredients);

  return `
    <section class="panel meal-editor">
      <div class="meal-editor-head">
        <h2>${isNew ? "Ny oppskrift" : `Rediger ${escapeHtml(meal.title)}`}</h2>
        <button class="button ghost" data-cancel-edit>Avbryt</button>
      </div>
      <section class="recipe-import-panel" aria-label="Importer oppskrift">
        <h3>Importer oppskrift</h3>
        ${!aiKeyStatus || !aiKeyStatus.configured || aiKeyStatus.status === "invalid" ? `
          <p role="status">${!importAvailable ? "Oppskriftsimport krever innlogging og nett." : !aiKeyStatus ? escapeHtml(aiKeyMessage || "Kontrollerer OpenAI-tilkoblingen …") : aiKeyStatus.status === "invalid" ? "OpenAI-nøkkelen virker ikke." : "Oppskriftsimport er ikke satt opp."}</p>
          ${isAdmin ? '<button class="button secondary" type="button" data-open-ai-settings>Åpne AI-innstillinger</button>' : '<p>Be en administrator legge inn OpenAI-nøkkel.</p>'}
          ${recipeImport.message && !(recipeImport.pending && recipeImport.message === "Ingenting ble endret.") ? `<p role="status">${escapeHtml(recipeImport.message)}</p>` : ""}
        ` : `
        <label for="recipeImportUrl">Lenke til oppskrift</label>
        <div class="recipe-import-url-row"><input id="recipeImportUrl" class="input" type="url" inputmode="url" data-import-url value="${escapeHtml(recipeImport.url || "")}" maxlength="2000" placeholder="https://…" ${recipeImport.busy ? "disabled" : ""}>
          <button class="button secondary" type="button" data-import-fetch ${recipeImport.busy || recipeImport.preparing || !importAvailable ? "disabled" : ""}>Hent</button></div>
        <div class="button-row"><button class="button ghost" type="button" data-import-show-text ${recipeImport.busy || recipeImport.preparing ? "disabled" : ""}>Lim inn tekst i stedet</button>
          <button class="button ghost" type="button" data-import-show-images ${recipeImport.busy || recipeImport.preparing ? "disabled" : ""}>Importer fra bilde</button></div>
        ${recipeImport.showText ? `<label for="recipeImportText">Oppskriftstekst</label><textarea id="recipeImportText" class="textarea" data-import-text maxlength="20000" ${recipeImport.busy ? "disabled" : ""}>${escapeHtml(recipeImport.text || "")}</textarea>
          <button class="button secondary" type="button" data-import-interpret ${recipeImport.busy || recipeImport.preparing || !importAvailable ? "disabled" : ""}>Tolk tekst</button>` : ""}
        ${recipeImport.showImages ? `<label for="recipeImportImages">Bilder og skjermbilder (inntil fire)</label>
          <input id="recipeImportImages" class="input" type="file" accept="image/*" multiple data-import-image-files ${recipeImport.busy || recipeImport.preparing || !importAvailable ? "disabled" : ""}>
          <ul>${(recipeImport.images || []).map((_, index) => `<li>Bilde ${index + 1} <button class="button ghost" type="button" data-import-remove-image="${index}" aria-label="Fjern bilde ${index + 1}" ${recipeImport.busy || recipeImport.preparing ? "disabled" : ""}>Fjern</button></li>`).join("")}</ul>
          <button class="button secondary" type="button" data-import-images ${recipeImport.busy || recipeImport.preparing || !importAvailable ? "disabled" : ""}>Tolk bilder</button>` : ""}
        ${!importAvailable ? '<p class="field-hint">Oppskriftsimport krever innlogging og nett.</p>' : ""}
        ${recipeImport.preparing ? '<p role="status">Klargjør bilder …</p>' : ""}
        ${recipeImport.busy ? `<p role="status">${recipeImport.mode === "image" ? "Leser bildene … Det kan ta opptil et minutt." : "Henter oppskrift … Det kan ta opptil et halvt minutt."}</p>` : ""}
        ${recipeImport.message && !(recipeImport.pending && recipeImport.message === "Ingenting ble endret.") ? `<p role="status">${escapeHtml(recipeImport.message)}</p>` : ""}
        ${recipeImport.pending ? `<div class="recipe-import-choice" role="group" aria-label="Velg hva som skal erstattes">
          <p role="status">Importen har ${recipeImport.pending.recipe.ingredients?.length || 0} ingredienser og ${recipeImport.pending.recipe.steps?.length || 0} steg. Oppskriften har allerede ${recipeImport.pending.conflictIngredients && recipeImport.pending.conflictSteps ? "ingredienser og fremgangsmåte" : recipeImport.pending.conflictIngredients ? "ingredienser" : "fremgangsmåte"}.</p>
          <div class="button-row"><button class="button" type="button" data-import-replace>Erstatt med det importerte</button>
          <button class="button secondary" type="button" data-import-keep>Behold det jeg har</button></div>
        </div>` : ""}
        ${recipeImport.warnings?.length ? `<ul>${recipeImport.warnings.map(message => `<li>${escapeHtml(message)}</li>`).join("")}</ul>` : ""}
        `}
      </section>
      <form class="form" data-meal-form>
        <div class="form-row">
          <div class="setting">
            <label for="mealTitle">Navn</label>
            <input id="mealTitle" class="input" name="title" required value="${escapeHtml(meal.title)}">
          </div>
          <div class="setting">
            <label for="mealBaseServings">Porsjoner i oppskriften</label>
            <input id="mealBaseServings" class="input" type="number" min="1" max="30" name="baseServings" value="${baseServings}" aria-describedby="mealBaseServingsHint">
            <p id="mealBaseServingsHint" class="field-hint">Antallet mengdene er beregnet for. Ukeplan og handleliste regner om til familiens størrelse.</p>
          </div>
        </div>
        <div class="form-row">
          <div class="setting">
            <label for="mealPrep">Tilberedningstid</label>
            <select id="mealPrep" class="select" name="prepTime">
              ${renderOption("", "Ikke angitt", meal.prepTime || "", escapeHtml)}
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
            ${ingredientRows.map((item, index) => renderIngredientEditorRowView({ item, index, unitOptions, escapeHtml })).join("")}
          </div>
          <div class="ingredient-editor-add-actions"><button class="button secondary compact" type="button" data-add-ingredient>Legg til ingrediens</button>
            <button class="button secondary compact" type="button" data-add-ingredient-heading>Legg til overskrift</button></div>
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
