export function renderSetupView(options = {}) {
  const {
    family = {},
    quickDays = [],
    counts = {},
    appVersion = "",
    aiStatusSummary = "Ikke satt opp",
    escapeHtml = String,
  } = options;
  const quickDayCount = Array.isArray(quickDays) ? quickDays.length : 0;
  const familySummary = [
    family.name || "Familie",
    `${Math.max(1, Number(family.familySize) || 5)} personer`,
    `${quickDayCount} raske ${quickDayCount === 1 ? "dag" : "dager"}`,
  ].join(" · ");

  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Innstillinger</h2>
        <p class="view-lead">Administrer familie, planlegging, data og appoppdatering.</p>
      </div>
    </section>
    <section class="settings-section">
      <h3 class="settings-section-title">Familie og planlegging</h3>
      <div class="settings-list">
        ${renderSettingsRowView({
          title: "Familie",
          subtitle: familySummary,
          view: "family-settings",
          escapeHtml,
        })}
        ${renderSettingsRowView({
          title: "Middagspreferanser",
          subtitle: "Ukemål for forslagmotoren",
          view: "meal-preferences",
          badge: counts.preferenceGoals || 0,
          escapeHtml,
        })}
      </div>
    </section>
    <section class="settings-section">
      <h3 class="settings-section-title">Datahåndtering</h3>
      <div class="settings-list">
        ${renderSettingsRowView({ title: "Kategorier", subtitle: "Brukes i oppskrifter og filtre", view: "categories", badge: counts.categories || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Enheter", subtitle: "Mengder i oppskrifter og handleliste", view: "units", badge: counts.units || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Tilberedningstid", subtitle: "Rask, middels og lengre middager", view: "prep-times", badge: counts.prepTimes || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Passer til", subtitle: "Hverdag, helg og andre merker", view: "suitability", badge: counts.suitability || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Planvalg", subtitle: "Middag hjemme, rester og spise borte", view: "plan-modes", badge: counts.planModes || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Vareoppslag", subtitle: "Koble ingredienser til butikkategorier", view: "ingredient-mappings", badge: counts.ingredientMappings || 0, escapeHtml })}
        ${renderSettingsRowView({ title: "Butikkategorier", subtitle: "Gruppering av handlelisten", view: "store-categories", badge: counts.storeCategories || 0, escapeHtml })}
      </div>
    </section>
    <section class="settings-section">
      <h3 class="settings-section-title">App</h3>
      <div class="settings-list">
        ${renderSettingsRowView({ title: "Konto og medlemmer", subtitle: "Google-konto og familiens tilgang", view: "account-settings", escapeHtml })}
        ${renderSettingsRowView({ title: "AI og oppskriftsimport", subtitle: aiStatusSummary, view: "ai-settings", escapeHtml })}
        ${renderSettingsRowView({
          title: "Oppdatering og versjon",
          subtitle: `Versjon ${appVersion}`,
          view: "app-settings",
          escapeHtml,
        })}
      </div>
    </section>
  `;
}

export function renderFamilySettingsView(options = {}) {
  const {
    family = {},
    quickDays = [],
    dayNames = [],
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Familie</h2>
        <p class="view-lead">Familienavn, personer, raske dager og forslagregler.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
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
  `;
}

export function renderAppSettingsView(options = {}) {
  const {
    appVersion = "",
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Oppdatering og versjon</h2>
        <p class="view-lead">Bruk oppdatering etter publisering hvis appen ikke henter siste versjon automatisk.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <p class="status-note">Middager og innstillinger i nettleseren beholdes når appen oppdateres.</p>
      <div class="app-update-row">
        <button class="button" data-refresh-app>Oppdater app</button>
        <span class="app-version-pill">Versjon ${escapeHtml(appVersion)}</span>
      </div>
    </section>
    <section class="settings-section backup-section">
      <h3 class="settings-section-title">Sikkerhetskopi</h3>
      <p class="status-note">Inneholder oppskrifter, ukeplaner, handleliste og innstillinger slik de ligger på denne enheten.</p>
      <button class="button secondary" type="button" data-download-backup>Last ned sikkerhetskopi</button>
    </section>
  `;
}

function renderSettingsRowView(options = {}) {
  const {
    title = "",
    subtitle = "",
    view = "",
    badge = null,
    escapeHtml = String,
  } = options;
  const badgeHtml = badge === null || badge === undefined
    ? ""
    : `<strong class="settings-row-badge">${escapeHtml(badge)}</strong>`;

  return `
    <button class="settings-row" data-view="${escapeHtml(view)}">
      <span class="settings-row-text">
        <span>${escapeHtml(title)}</span>
        ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}
      </span>
      <span class="settings-row-meta">
        ${badgeHtml}
        <span class="settings-row-chevron" aria-hidden="true">›</span>
      </span>
    </button>
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
