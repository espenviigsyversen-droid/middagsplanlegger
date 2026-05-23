export function renderTodaySummaryView(options = {}) {
  const {
    dateLabel = "",
    title = "",
    description = "",
    mealId = "",
    dayIndex = 0,
    showRecipe = false,
    escapeHtml = String,
  } = options;

  return `
    <section class="today-summary">
      <div>
        <span class="today-kicker">I dag · ${escapeHtml(dateLabel)}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="today-actions">
        ${showRecipe ? `<button class="button secondary compact" data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${dayIndex}">Oppskrift</button>` : ""}
        <button class="button secondary compact" data-view="planner">Planlegger</button>
      </div>
    </section>
  `;
}

export function renderWeekRowView(options = {}) {
  const {
    shortDay = "",
    dateLabel = "",
    title = "",
    mealId = "",
    dayIndex = 0,
    showRecipe = false,
    showPlanner = false,
    escapeHtml = String,
  } = options;

  return `
    <div class="week-row">
      <div class="week-row-day">
        <span class="week-row-name">${escapeHtml(shortDay)}</span>
        <span class="week-row-date">${escapeHtml(dateLabel)}</span>
      </div>
      <div class="week-row-meal${!title ? " muted" : ""}">
        ${escapeHtml(title || "Ikke planlagt")}
      </div>
      <div class="week-row-action">
        ${showRecipe
          ? `<button class="button secondary compact" data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${dayIndex}">Oppskrift</button>`
          : showPlanner
            ? `<button class="button secondary compact" data-view="planner">Planlegg</button>`
            : ""}
      </div>
    </div>
  `;
}

export function renderCalendarView(options = {}) {
  const {
    weekRangeLabel = "",
    todayCardHtml = "",
    weekRowsHtml = "",
    isCurrentWeek = false,
    escapeHtml = String,
  } = options;
  const listHeading = isCurrentWeek ? "Resten av uken" : "Alle dager";

  return `
    <section class="view-header calendar-view-header">
      <div>
        <h2 class="view-title">Middagsplan</h2>
        <div class="calendar-week-nav">
          <button class="button secondary week-arrow-btn" data-week="-1" aria-label="Forrige uke">←</button>
          <span class="calendar-week-label">${escapeHtml(weekRangeLabel)}</span>
          <button class="button secondary week-arrow-btn" data-week="1" aria-label="Neste uke">→</button>
          ${!isCurrentWeek ? `<button class="text-action" data-week="0">I dag</button>` : ""}
        </div>
      </div>
    </section>
    ${todayCardHtml}
    <section class="week-list">
      <h4 class="week-list-heading">${listHeading}</h4>
      ${weekRowsHtml}
    </section>
  `;
}
