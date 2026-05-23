export function renderSetupView(options = {}) {
  const {
    family = {},
    quickDays = [],
    dayNames = [],
    counts = {},
    appVersion = "",
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Setup</h2>
        <p class="view-lead">Styr familieinnstillinger, metadata og appoppdatering fra ett sted.</p>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Familie</h2>
      <div class="settings-grid">
        <div class="setting">
          <label for="familyName">Familienavn</label>
          <input id="familyName" class="input" data-family="name" value="${escapeHtml(family.name)}">
        </div>
        <div class="setting">
          <label for="familySize">Personer i familien</label>
          <input id="familySize" class="input" type="number" min="1" max="30" data-family="familySize" value="${Math.max(1, Number(family.familySize) || 5)}">
        </div>
        <div class="setting">
          <label for="kidCount">Barnevennlige middager per uke</label>
          <input id="kidCount" class="input" type="number" min="0" max="7" data-family="kidFriendlyPerWeek" value="${family.kidFriendlyPerWeek}">
        </div>
        <div class="setting">
          <label>Regler</label>
          <button class="toggle-chip ${family.leftovers ? "active" : ""}" data-toggle-family="leftovers">Foreslå restdager</button>
          <button class="toggle-chip ${family.reuseIngredients ? "active" : ""}" data-toggle-family="reuseIngredients">Gjenbruk ingredienser</button>
        </div>
        <div class="setting">
          <label>Raske dager</label>
          <div class="quick-days">
            ${dayNames.map((day) => `<button class="toggle-chip ${quickDays.includes(day) ? "active" : ""}" data-quick-day="${escapeHtml(day)}">${escapeHtml(day.slice(0, 3))}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Middagspreferanser</h2>
      <p class="status-note">Sett myke mål for ukene. Rådgiveren prøver å treffe disse, men kan fortsatt velge praktisk hvis få middager passer.</p>
      <div class="setup-menu">
        <button class="setup-menu-item" data-view="meal-preferences">
          <span>Ukemål for kategorier</span>
          <strong>${counts.preferenceGoals || 0}</strong>
        </button>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Metadata</h2>
      <div class="setup-menu">
        <button class="setup-menu-item" data-view="categories"><span>Kategorier</span><strong>${counts.categories || 0}</strong></button>
        <button class="setup-menu-item" data-view="units"><span>Enheter</span><strong>${counts.units || 0}</strong></button>
        <button class="setup-menu-item" data-view="prep-times"><span>Tilberedningstid</span><strong>${counts.prepTimes || 0}</strong></button>
        <button class="setup-menu-item" data-view="suitability"><span>Passer til</span><strong>${counts.suitability || 0}</strong></button>
        <button class="setup-menu-item" data-view="plan-modes"><span>Plan</span><strong>${counts.planModes || 0}</strong></button>
        <button class="setup-menu-item" data-view="ingredient-mappings"><span>Vareoppslag</span><strong>${counts.ingredientMappings || 0}</strong></button>
        <button class="setup-menu-item" data-view="store-categories"><span>Butikkategorier</span><strong>${counts.storeCategories || 0}</strong></button>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>App</h2>
      <p class="status-note">Bruk denne etter publisering hvis appen ikke henter siste versjon automatisk. Middager og innstillinger i nettleseren beholdes.</p>
      <div class="app-update-row">
        <button class="button" data-refresh-app>Oppdater app</button>
        <span class="app-version-pill">Versjon ${escapeHtml(appVersion)}</span>
      </div>
    </section>
  `;
}

export function renderSetupPageView(options = {}) {
  const {
    title = "",
    lead = "",
    bodyHtml = "",
    escapeHtml = String,
  } = options;
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">${escapeHtml(title)}</h2>
        <p class="view-lead">${escapeHtml(lead)}</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">${bodyHtml}</section>
  `;
}

export function renderMetadataRowsView(options = {}) {
  const {
    entries = [],
    inputAttribute = "",
    saveAttribute = "",
    removeAttribute = "",
    editable = false,
    removeTitle = "Fjern",
    escapeHtml = String,
  } = options;

  return `
    <div class="metadata-list">
      ${entries.map(([key, label]) => editable ? `
        <div class="metadata-row editable">
          <input class="input" ${inputAttribute}="${escapeHtml(key)}" value="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">
          <button class="button secondary compact" ${saveAttribute}="${escapeHtml(key)}">Lagre</button>
          <button class="icon-button" ${removeAttribute}="${escapeHtml(key)}" title="${escapeHtml(removeTitle)}">×</button>
        </div>
      ` : `
        <div class="metadata-row">
          <span>${escapeHtml(label)}</span>
          <button class="icon-button" ${removeAttribute}="${escapeHtml(key)}" title="${escapeHtml(removeTitle)}">×</button>
        </div>
      `).join("")}
    </div>
  `;
}

export function renderMetadataAddFormView(options = {}) {
  const {
    formAttribute = "",
    inputName = "",
    placeholder = "",
    buttonLabel = "Legg til",
    extraHtml = "",
    escapeHtml = String,
  } = options;
  return `
    <form class="metadata-add" ${formAttribute}>
      <input class="input" name="${escapeHtml(inputName)}" placeholder="${escapeHtml(placeholder)}">
      ${extraHtml}
      <button class="button secondary" type="submit">${escapeHtml(buttonLabel)}</button>
    </form>
  `;
}
