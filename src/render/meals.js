import { mealNeedsRecipe, mealCanImportFromLink, ingredientBaseName, ingredientsToEditorRows, ingredientEditorGroups, ingredientEditorGroupIndex, descriptionRepeatsTitle, recipeSourceUrl } from "../domain/meals.js";
import { renderSubpageBar } from "./subpage.js";
import { renderRecipeImport } from "./recipe-import.js";
import { pencilIcon } from "./icons.js";
import { renderMealFilters, mealFiltersActive } from "./meal-filters.js";
import { renderRecipeYieldEditor } from "./recipe-yield.js";

export function renderIngredientList(ingredients, { scaleAmount, baseServings, targetServings, escapeHtml }) {
  let previous = "";
  return ingredients.map(item => {
    const group = String(item.group || "").trim();
    const heading = group && group !== previous ? `<h4 class="ingredient-group-heading">${escapeHtml(group)}</h4>` : "";
    previous = group;
    const comma = item.name.indexOf(",");
    const suffix = comma > 0 ? item.name.slice(comma) : "";
    return `${heading}<div class="ingredient-row"><span>${escapeHtml([scaleAmount(item.amount, baseServings, targetServings, item.unit), item.unit].filter(Boolean).join(" "))}</span>
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
    <article class="meal-card compact-meal-card">
      <div class="meal-card-head">
        <button class="meal-card-main" type="button" data-view-meal="${escapeHtml(meal.id)}" aria-label="${escapeHtml(meal.title)}, åpne oppskrift">
          <span class="meal-title">${escapeHtml(meal.title)}</span>
          ${mealNeedsRecipe(meal) ? '<span class="chip missing-recipe-chip">Mangler oppskrift</span>' : ""}
        </button>
        <button class="pencil-button meal-edit-btn" type="button" data-edit-meal="${escapeHtml(meal.id)}" aria-label="Rediger ${escapeHtml(meal.title)}">${pencilIcon()}</button>
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
    showNeedsRecipe = false,
    categoryEntries = [],
    categoryLabels = {},
    suitabilityEntries = [],
    suitabilityLabels = {},
    editorHtml = "",
    addIconHtml = "",
    escapeHtml = String,
  } = options;

  if (editorHtml) return editorHtml;
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
        <input class="input meal-search-input" type="search" enterkeyhint="search" data-focus-key="meal-search" data-meal-search value="${escapeHtml(filters.query || "")}" placeholder="Søk etter oppskrift eller ingrediens" autocomplete="off">
        <button class="search-clear-btn meal-search-clear" type="button" data-clear-meal-search style="${filters.query ? "" : "display: none;"}" aria-label="Tøm søk">×</button>
      </div>
      ${renderMealFilters({filters, suitabilityEntries, categoryEntries, showNeedsRecipe, scope:"meal", escapeHtml})}
      <div class="meal-results-bar" data-meal-results>${renderMealResultsView({count:meals.length,filters})}</div>
    </section>
    <section class="meal-list" data-meal-list>
      ${!meals.length ? renderMealEmptyView() : grouped
        ? renderGroupedMealsView({ meals, categoryLabels, suitabilityLabels, escapeHtml })
        : meals.map((meal) => renderMealCardView({ meal, categoryLabels, suitabilityLabels, escapeHtml })).join("")}
    </section>
  `;
}

export function renderMealResultsView({count = 0, filters = {}} = {}) {
  const active = Boolean(filters.query?.trim()) || mealFiltersActive(filters);
  return `<span>${count} ${active ? "treff" : count === 1 ? "oppskrift" : "oppskrifter"}</span>`
    + (active ? '<button class="text-action" type="button" data-reset-meal-filters>Nullstill</button>'
      : '<div class="meal-sort" aria-label="Sorter oppskrifter">'+[["category","Kategori"],["alpha","A–Å"]].map(([key,label])=>`<button type="button" data-meal-sort="${key}" aria-pressed="${(filters.sort || "category") === key}">${label}</button>`).join("")+'</div>');
}

export function renderMealEmptyView() {
  return '<div class="meal-empty">Ingen oppskrifter passer.<button class="text-action" type="button" data-reset-meal-filters>Nullstill søk og filtre</button></div>';
}

export function renderMealDetailView(options = {}) {
  const {
    meal,
    steps = [],
    ingredients = [],
    wakeSupported = false,
    keepScreenAwake = false,
    leftoversText = "",
    servingText = "",
    servingScope = "",
    baseServings = 4,
    targetServings = null,
    pickerMaximum = 30,
    pickerUnit = "porsjoner",
    yieldEstimate = "",
    yieldNote = "",
    scaleBase = baseServings,
    shoppingIconHtml = "",
    scaleAmount = (amount) => amount,
    escapeHtml = String,
  } = options;

  return `
    ${renderSubpageBar({ backAttribute: "data-close-meal", actionHtml: `<button class="recipe-edit" type="button" data-edit-meal="${escapeHtml(meal.id)}">Rediger</button>` })}
    <section class="recipe-detail">
      <div class="recipe-hero">
        <div>
          <h2>${escapeHtml(meal.title)}</h2>
          ${meal.description && !descriptionRepeatsTitle(meal.title, meal.description) ? `<p>${escapeHtml(meal.description)}</p>` : ""}
          ${renderRecipeSourceLink(meal.recipeUrl, escapeHtml)}
          <p class="recipe-serving-note" data-recipe-serving-note>${escapeHtml(servingText)}</p>
          <div class="recipe-servings-control" aria-label="Juster porsjoner">
            <button class="button secondary" type="button" data-recipe-servings="-1" aria-label="Færre ${escapeHtml(pickerUnit)}" ${(targetServings ?? baseServings) <= 1 ? "disabled" : ""}>−</button>
            <label class="recipe-servings-value"><input type="text" inputmode="numeric" pattern="[0-9]*" data-recipe-servings-input aria-label="Antall ${escapeHtml(pickerUnit)}" value="${escapeHtml(targetServings ?? baseServings)}"><span data-recipe-picker-unit>${escapeHtml(pickerUnit)}</span></label>
            <button class="button secondary" type="button" data-recipe-servings="1" aria-label="Flere ${escapeHtml(pickerUnit)}" ${(targetServings ?? baseServings) >= pickerMaximum ? "disabled" : ""}>+</button>
          </div>
          <p class="recipe-yield-estimate" data-recipe-yield-estimate ${yieldEstimate?"":"hidden"}>${escapeHtml(yieldEstimate)}</p>
          <p class="field-hint" data-recipe-yield-note ${yieldNote?"":"hidden"}>${escapeHtml(yieldNote)}</p>
          <p class="field-hint" data-recipe-serving-scope ${servingScope ? "" : "hidden"}>${escapeHtml(servingScope)}</p>
        </div>
        ${ingredients.length ? `<button class="button recipe-primary" type="button" data-add-to-shopping="${escapeHtml(meal.id)}">${shoppingIconHtml} Legg i handleliste</button>`
          : `<button class="button recipe-primary" type="button" data-edit-meal="${escapeHtml(meal.id)}">Legg inn oppskrift</button>`}
        <button class="wake-switch" type="button" role="switch" aria-checked="${keepScreenAwake}" data-toggle-wake ${wakeSupported ? "" : "disabled"}>
          <span class="switch-track" aria-hidden="true"><span></span></span> Hold skjermen på
        </button>
      </div>
      ${wakeSupported ? "" : '<p class="wake-note">Denne nettleseren støtter ikke å holde skjermen våken fra web-appen.</p>'}
      ${mealNeedsRecipe(meal) ? '<p class="empty-recipe-text">Ingen oppskrift lagt inn ennå</p>' : ""}
      <div class="recipe-columns">
        <section class="recipe-section">
          <h3>Ingredienser</h3>
          ${ingredients.length ? `
            <div class="ingredient-table" data-recipe-ingredients>
              ${renderIngredientList(ingredients, { scaleAmount, baseServings: scaleBase, targetServings, escapeHtml })}
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

function renderRecipeSourceLink(recipeUrl, escapeHtml) {
  const url = recipeSourceUrl(recipeUrl);
  if (!url) return "";
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  let label = host;
  for (const [domain, name] of [["instagram.com", "Instagram"], ["facebook.com", "Facebook"], ["fb.watch", "Facebook"], ["tiktok.com", "TikTok"]]) {
    if (host === domain || host.endsWith(`.${domain}`)) { label = name; break; }
  }
  const ariaLabel = `Åpne oppskriften på ${label} (åpnes i ny fane)`;
  return `<a class="recipe-source" href="${escapeHtml(url.href)}" target="_blank" rel="noopener" aria-label="${escapeHtml(ariaLabel)}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/></svg>
    <span>${escapeHtml(label)}</span><svg class="recipe-source-external" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
  </a>`;
}

function renderOption(value, label, selected, escapeHtml = String) {
  return `<option value="${escapeHtml(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

export function renderIngredientEditorRowView(options = {}) {
  const {
    item = { amount: "", unit: "", name: "" },
    index = 0,
    totalRows = 1,
    unitOptions = [],
    escapeHtml = String,
  } = options;

  if (item.type === "heading") return `
    <div class="ingredient-heading-editor-row" data-ingredient-row="${index}" data-ingredient-heading="true">
      <input class="input" data-ingredient-field="group" maxlength="60" value="${escapeHtml(item.title || "")}" placeholder="Overskrift, for eksempel Saus" aria-label="Ingrediensoverskrift">
      <div class="ingredient-heading-actions">
        <button class="icon-button" type="button" data-move-ingredient-heading="${index}" data-direction="-1" aria-label="Flytt overskrift opp" ${index === 0 ? "disabled" : ""}>↑</button>
        <button class="icon-button" type="button" data-move-ingredient-heading="${index}" data-direction="1" aria-label="Flytt overskrift ned" ${index === totalRows - 1 ? "disabled" : ""}>↓</button>
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
      <button class="icon-button editor-row-menu-button" type="button" data-editor-row-menu="ingredient" data-row-index="${index}" aria-label="Valg for ${escapeHtml(item.name?.trim() || "ingrediens")}" aria-haspopup="dialog">⋯</button>
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
      <button class="icon-button editor-row-menu-button" type="button" data-editor-row-menu="step" data-row-index="${index}" aria-label="Valg for steg ${index + 1}" aria-haspopup="dialog">⋯</button>
    </div>
  `;
}

export function renderEditorRowMenuView({ kind, index, ingredients = [], steps = [], escapeHtml = String } = {}) {
  const isIngredient = kind === "ingredient", rows = isIngredient ? ingredients : steps;
  if (!Number.isInteger(index) || index < 0 || index >= rows.length || (isIngredient && rows[index].type === "heading")) return "";
  const title = isIngredient ? `Valg for ${rows[index].name?.trim() || "ingrediens"}` : `Valg for steg ${index + 1}`;
  const groups = isIngredient ? ingredientEditorGroups(rows) : [], current = isIngredient ? ingredientEditorGroupIndex(rows, index) : null;
  const targets = groups.filter(group => group.headingIndex !== current);
  return `<div class="modal-backdrop editor-row-menu-backdrop active" data-editor-menu-close>
    <section class="modal editor-row-menu active" data-editor-menu role="dialog" aria-modal="true" aria-labelledby="editorRowMenuTitle">
      <div class="modal-header"><h3 id="editorRowMenuTitle">${escapeHtml(title)}</h3>
        <button class="modal-close" type="button" data-focus-key="editor-row-close" data-editor-menu-close aria-label="Lukk radmeny">×</button></div>
      <div class="editor-row-menu-actions" data-scroll-key="editor-row-menu">
        <button class="button secondary" type="button" data-focus-key="editor-row-up" data-editor-menu-action="up" ${index === 0 ? "disabled" : ""}>Flytt opp</button>
        <button class="button secondary" type="button" data-focus-key="editor-row-down" data-editor-menu-action="down" ${index === rows.length - 1 ? "disabled" : ""}>Flytt ned</button>
        ${groups.some(group => group.headingIndex >= 0) ? `<h4>Flytt til</h4>
          ${targets.map(group => `<button class="button secondary" type="button" data-focus-key="editor-row-group:${group.headingIndex}" data-editor-menu-action="group" data-group-index="${group.headingIndex}">${escapeHtml(group.label)}</button>`).join("") || '<p class="field-hint">Ingen andre grupper.</p>'}` : ""}
        <button class="button ghost danger" type="button" data-focus-key="editor-row-remove" data-editor-menu-action="remove">Fjern</button>
      </div>
    </section></div>`;
}

export function renderMealEditorView(options = {}) {
  const {
    isNew = false,
    meal,
    ingredients = [],
    steps = [],
    categoryEntries = [],
    suitabilityEntries = [],
    prepTimeEntries = [],
    unitOptions = [],
    recipeImport = {},
    rowMenu = null,
    discardOpen = false,
    aiKeyStatus = null,
    aiKeyMessage = "",
    isAdmin = false,
    importAvailable = false,
    escapeHtml = String,
  } = options;

  if (!meal) return "";
  const ingredientRows = ingredients.some(item => item.type === "heading") ? ingredients : ingredientsToEditorRows(ingredients);
  let headingIndex = -1;

  return `
    <section class="panel meal-editor">
      <div class="meal-editor-bar"><button class="editor-cancel" type="button" data-cancel-edit>Avbryt</button><strong>${isNew?"Ny oppskrift":"Rediger"}</strong><button class="button editor-save" type="submit" form="mealEditorForm">Lagre</button></div>
      ${renderRecipeImport({isNew,meal,recipeImport,aiKeyStatus,aiKeyMessage,isAdmin,importAvailable,escapeHtml})}
      ${(recipeImport.expanded ?? (isNew || mealCanImportFromLink(meal)))?'<div class="editor-manual-divider"><span>eller fyll ut selv</span></div>':''}
      <form id="mealEditorForm" class="form" data-meal-form>
        <div class="form-row">
          <div class="setting">
            <label for="mealTitle">Navn</label>
            <input id="mealTitle" class="input" name="title" required value="${escapeHtml(meal.title)}">
          </div>
          <div class="setting">
            ${renderRecipeYieldEditor(meal, escapeHtml)}
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
          <label for="mealRecipeUrl">Kilde (lenke)</label>
          <input id="mealRecipeUrl" class="input" type="text" inputmode="url" name="recipeUrl" value="${escapeHtml(meal.recipeUrl || "")}" placeholder="https://...">
          <p class="field-hint">Åpnes med «Åpne lenke» i oppskriften.</p>
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
            ${ingredientRows.map((item, index) => {
              if (item.type === "heading") headingIndex = index;
              const row = renderIngredientEditorRowView({ item, index, totalRows: ingredientRows.length, unitOptions, escapeHtml });
              return row + (headingIndex >= 0 && (index === ingredientRows.length - 1 || ingredientRows[index + 1].type === "heading")
                ? `<button class="text-action ingredient-group-add" type="button" data-add-ingredient-group="${headingIndex}">+ Ingrediens</button>` : "");
            }).join("")}
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
          <button class="button" type="submit">Lagre middag</button>
        </div>
      </form>
      ${discardOpen ? renderDiscardMealEditor({meal,isNew,escapeHtml}) : ""}
      ${rowMenu ? renderEditorRowMenuView({ ...rowMenu, ingredients: ingredientRows, steps, escapeHtml }) : ""}
    </section>
  `;
}

export function renderDiscardMealEditor({meal,isNew,escapeHtml=String}) {
  const title=String(meal.title||'').trim();
  return `<div class="modal-backdrop editor-discard-backdrop"><section class="modal editor-discard" role="alertdialog" aria-modal="true" aria-labelledby="editorDiscardTitle" aria-describedby="editorDiscardText"><div class="week-sheet-handle" aria-hidden="true"></div><div class="editor-discard-body" data-scroll-key="editor-discard"><h3 id="editorDiscardTitle">Forkaste endringene?</h3><p id="editorDiscardText">${isNew&&!title?'Den nye oppskriften er ikke lagret.':'Endringene i «'+escapeHtml(title)+'» er ikke lagret.'}</p><button class="button" type="button" data-editor-continue data-focus-key="editor-continue">Fortsett å redigere</button><button class="editor-discard-confirm" type="button" data-editor-discard data-focus-key="editor-discard">Forkast endringene</button></div></section></div>`;
}
