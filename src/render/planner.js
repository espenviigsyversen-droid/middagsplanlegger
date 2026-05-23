export function renderPlannerRowView(options = {}) {
  const {
    day = "",
    dateLabel = "",
    index = 0,
    locked = false,
    isPlannedMeal = true,
    summaryTitle = "",
    summaryText = "",
    dayMode = "home",
    dayNote = "",
    dayType = "weekday",
    dayServings = 1,
    mealId = "",
    mealTitle = "",
    typeLabel = "",
    reason = "",
    planModeEntries = [],
    suitabilityEntries = [],
    escapeHtml = String,
  } = options;

  return `
    <div class="planner-row">
      <div class="planner-day-block">
        <div>
          <div class="planner-day">${escapeHtml(day)}</div>
          <div class="day-date">${escapeHtml(dateLabel)}</div>
        </div>
        <button class="toggle-chip ${locked ? "active" : ""}" data-lock-day="${index}">${locked ? "Låst" : "Åpen"}</button>
      </div>
      <div class="planner-summary ${!isPlannedMeal || mealId ? "" : "empty"}">
        <strong>${escapeHtml(summaryTitle)}</strong>
        <span>${escapeHtml(summaryText)}</span>
      </div>
      <div class="planner-meal-block">
        <div class="planner-controls">
          <label class="planner-control">
            <span>Plan</span>
            <select class="select compact-select" data-day-mode="${index}" aria-label="Plan for ${escapeHtml(day)}">
              ${planModeEntries.map(([value, option]) => `<option value="${escapeHtml(value)}" ${dayMode === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
        ${!isPlannedMeal ? `
          <label class="planner-control wide">
            <span>Notat</span>
            <input class="input" data-day-note="${index}" value="${escapeHtml(dayNote)}" placeholder="F.eks. rester fra taco eller middag hos svigefar">
          </label>
        ` : `
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
          <label class="planner-control wide">
            <span>Middag</span>
            <button class="select select-trigger-btn" type="button" data-open-meal-picker="${index}">
              <span>${mealTitle ? escapeHtml(mealTitle) : "Velg middag..."}</span>
              <span class="chevron">▾</span>
            </button>
          </label>
          ${mealTitle ? `<p class="planner-reason">${escapeHtml(typeLabel)} · ${escapeHtml(reason)}</p>` : ""}
        `}
        </div>
      </div>
      <div class="planner-actions">
        ${!isPlannedMeal ? "" : `<button class="button secondary compact" data-random-day="${index}" ${locked ? "disabled" : ""}>Forslag</button>`}
        ${mealId && isPlannedMeal ? `<button class="button secondary compact" data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${index}">Oppskrift</button>` : ""}
      </div>
    </div>
  `;
}

export function renderPlannerView(options = {}) {
  const {
    weekRangeLabel = "",
    rowsHtml = "",
    advisorSummary = "",
    addIconHtml = "",
    escapeHtml = String,
  } = options;

  return `
    <section class="view-header planner-view-header">
      <h2 class="view-title">Planlegg uken</h2>
      <div class="planner-top-bar">
        <div class="week-nav-compact">
          <button class="button secondary week-arrow-btn" data-week="-1" aria-label="Forrige uke">←</button>
          <span class="week-nav-label">${escapeHtml(weekRangeLabel)}</span>
          <button class="button secondary week-arrow-btn" data-week="1" aria-label="Neste uke">→</button>
        </div>
        <button class="button compact" data-fill-week>${addIconHtml} Fyll ledige dager</button>
      </div>
      <div class="planner-secondary-actions">
        <button class="text-action" data-week="0">Denne uken</button>
        <span class="action-sep">·</span>
        <button class="text-action" data-replace-open-week>Bytt åpne forslag</button>
        <span class="action-sep">·</span>
        <button class="text-action quiet" data-clear-week>Tøm uke</button>
      </div>
    </section>
    <details class="advisor-panel">
      <summary>Rådgiverstatus</summary>
      <p class="status-note">${escapeHtml(advisorSummary)}</p>
    </details>
    <section class="panel">
      <div class="planner-list">${rowsHtml}</div>
    </section>
  `;
}
