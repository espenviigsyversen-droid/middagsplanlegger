export function renderPlannerRowView(options = {}) {
  const {
    day = "",
    dateLabel = "",
    index = 0,
    locked = false,
    isPlannedMeal = true,
    summaryTitle = "",
    summaryText = "",
    mealId = "",
    mealTitle = "",
    planModeLabel = "",
    dayServings = 1,
    escapeHtml = String,
  } = options;

  const hasMeal = Boolean(mealId && mealTitle && isPlannedMeal);
  const statusText = isPlannedMeal ? `${dayServings} personer` : planModeLabel;
  const title = hasMeal ? mealTitle : summaryTitle;
  const isEmptyHomeDay = isPlannedMeal && !hasMeal;
  const text = isEmptyHomeDay ? "" : hasMeal ? statusText : summaryText;

  return `
    <article class="planner-day-card ${hasMeal ? "planned" : "empty"} ${locked ? "locked" : ""}" data-edit-planner-day="${index}">
      <div class="planner-card-dateblock">
        <p class="planner-card-day">${escapeHtml(day)}</p>
        <p class="planner-card-date">${escapeHtml(dateLabel)}</p>
      </div>
      <div class="planner-card-main">
        ${hasMeal ? `
          <p class="planner-meal-line"><span>${escapeHtml(title)}</span><small> - ${escapeHtml(text)}</small></p>
        ` : `
          <p class="planner-meal-line"><span>${escapeHtml(title)}</span></p>
          ${text ? `<p>${escapeHtml(text)}</p>` : ""}
        `}
      </div>
      <div class="planner-card-actions">
        ${locked ? '<span class="planner-lock-badge">Låst</span>' : ""}
        ${hasMeal ? `<button class="icon-button planner-recipe-btn" type="button" data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${index}" aria-label="Åpne oppskrift">□</button>` : ""}
        ${hasMeal ? `<button class="icon-button planner-refresh-btn" type="button" data-random-day="${index}" ${locked ? "disabled" : ""} aria-label="Foreslå ny middag">↻</button>` : ""}
        <button class="icon-button planner-change-btn" type="button" data-open-meal-picker="${index}" aria-label="${hasMeal ? "Bytt middag" : "Legg til middag"}">${hasMeal ? "⇄" : "+"}</button>
      </div>
    </article>
  `;
}

export function renderPlannerDaySheetView(options = {}) {
  const {
    open = false,
    day = "",
    dateLabel = "",
    index = 0,
    locked = false,
    isPlannedMeal = true,
    mealId = "",
    mealTitle = "",
    dayMode = "home",
    dayNote = "",
    dayType = "weekday",
    dayServings = 1,
    planModeEntries = [],
    suitabilityEntries = [],
    escapeHtml = String,
  } = options;

  if (!open) return "";

  return `
    <div class="modal-backdrop planner-sheet-backdrop active" data-close-planner-day>
      <section class="modal planner-sheet active" onclick="event.stopPropagation()" aria-label="Rediger ${escapeHtml(day)}">
        <div class="modal-header">
          <div>
            <h3>${escapeHtml(day)}</h3>
            <p class="modal-subtitle">${escapeHtml(dateLabel)}</p>
          </div>
          <button class="modal-close" type="button" data-close-planner-day aria-label="Lukk">×</button>
        </div>
        <div class="modal-body planner-sheet-body">
          <label class="planner-control">
            <span>Plan</span>
            <select class="select compact-select" data-day-mode="${index}" aria-label="Plan for ${escapeHtml(day)}">
              ${planModeEntries.map(([value, option]) => `<option value="${escapeHtml(value)}" ${dayMode === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          ${!isPlannedMeal ? `
            <label class="planner-control wide">
              <span>Notat</span>
              <input class="input" data-day-note="${index}" value="${escapeHtml(dayNote)}" placeholder="F.eks. bursdag, rester eller middag ute">
            </label>
          ` : `
            <label class="planner-control">
              <span>Middag</span>
              <button class="select select-trigger-btn" type="button" data-open-meal-picker="${index}">
                <span>${mealTitle ? escapeHtml(mealTitle) : "Velg middag..."}</span>
                <span class="chevron">▾</span>
              </button>
            </label>
            <div class="planner-sheet-grid">
              <label class="planner-control">
                <span>Type</span>
                <select class="select compact-select" data-day-type="${index}" aria-label="Dagstype for ${escapeHtml(day)}">
                  ${suitabilityEntries.map(([value, label]) => `<option value="${escapeHtml(value)}" ${dayType === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
                </select>
              </label>
              <label class="planner-control persons">
                <span>Personer</span>
                <input class="input compact-input" type="number" min="1" max="30" data-day-servings="${index}" value="${dayServings}">
              </label>
            </div>
          `}
        </div>
        <div class="modal-footer planner-sheet-footer">
          <button class="button secondary" type="button" data-lock-day="${index}">${locked ? "Lås opp dagen" : "Lås dagen"}</button>
          ${isPlannedMeal ? `<button class="button" type="button" data-random-day="${index}" ${locked ? "disabled" : ""}>Foreslå ny</button>` : ""}
        </div>
      </section>
    </div>
  `;
}

export function renderPlannerActionSheetView(options = {}) {
  const { open = false } = options;
  if (!open) return "";

  return `
    <div class="modal-backdrop planner-sheet-backdrop active" data-close-planner-actions>
      <section class="modal planner-action-sheet active" onclick="event.stopPropagation()" aria-label="Foreslå ukemeny">
        <div class="modal-header">
          <div>
            <h3>Foreslå ukemeny</h3>
            <p class="modal-subtitle">Velg hvordan appen skal hjelpe med planleggingen.</p>
          </div>
          <button class="modal-close" type="button" data-close-planner-actions aria-label="Lukk">×</button>
        </div>
        <div class="planner-action-list">
          <button class="planner-action-option" type="button" data-fill-week>
            <strong>Bare fra mine middager</strong>
            <span>Fyll ledige dager og behold det som allerede er valgt.</span>
          </button>
          <button class="planner-action-option" type="button" data-replace-open-week>
            <strong>Foreslå hele åpne uken på nytt</strong>
            <span>Bytter middager på dager som ikke er låst.</span>
          </button>
          <button class="planner-action-option disabled" type="button" disabled>
            <strong>Oppdag nye middager</strong>
            <span>Kommer senere når AI/nettoppskrifter kobles på.</span>
          </button>
        </div>
        <div class="modal-footer planner-sheet-footer">
          <button class="button secondary" type="button" data-close-planner-actions>Avbryt</button>
        </div>
      </section>
    </div>
  `;
}

export function renderPlannerView(options = {}) {
  const {
    weekRangeLabel = "",
    rowsHtml = "",
    daySheetHtml = "",
    actionSheetHtml = "",
    addIconHtml = "",
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header planner-view-header planner-overview-header">
      <div>
        <h2 class="view-title">Planlegg uken</h2>
        <div class="week-nav-compact">
          <button class="button secondary week-arrow-btn" data-week="-1" aria-label="Forrige uke">←</button>
          <span class="week-nav-label">${escapeHtml(weekRangeLabel)}</span>
          <button class="button secondary week-arrow-btn" data-week="1" aria-label="Neste uke">→</button>
        </div>
      </div>
      <button class="button compact" data-open-planner-actions>${addIconHtml} Foreslå uke</button>
    </section>
    <div class="planner-secondary-actions">
      <button class="text-action" data-week="0">Denne uken</button>
      <span class="action-sep">·</span>
      <button class="text-action quiet" data-clear-week>Tøm uke</button>
    </div>
    <section class="planner-overview-list">${rowsHtml}</section>
    <button class="planner-fab" type="button" data-open-planner-actions>${addIconHtml}<span>Foreslå uke</span></button>
    ${daySheetHtml}
    ${actionSheetHtml}
  `;
}
