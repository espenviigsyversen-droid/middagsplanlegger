export function renderWeekRowView(options = {}) {
  const {
    shortDay = "",
    dateLabel = "",
    title = "",
    mealId = "",
    dayIndex = 0,
    showRecipe = false,
    day = shortDay,
    isToday = false,
    note = "",
    escapeHtml = String,
  } = options;

  return `
    <button class="week-row${isToday ? " is-today" : ""}" type="button"
      ${showRecipe ? `data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${dayIndex}"` : `data-calendar-day="${dayIndex}"`}
      aria-label="${escapeHtml(day)} ${escapeHtml(dateLabel)}, ${escapeHtml(title || "Ikke planlagt")}, ${showRecipe ? "åpne oppskrift" : "åpne planlegger"}">
      <span class="week-row-day"><span class="week-row-name">${escapeHtml(shortDay)}</span>
        <span class="week-row-date">${escapeHtml(dateLabel)}</span>${isToday ? '<span class="week-today-badge">I dag</span>' : ""}</span>
      <span class="week-row-meal${!title ? " muted" : ""}"><span>${escapeHtml(title || "Ikke planlagt")}</span>
        ${note ? `<span class="week-row-note">${escapeHtml(note)}</span>` : ""}</span>
      <span class="week-row-chevron" aria-hidden="true">›</span>
    </button>
  `;
}

export function renderCalendarView(options = {}) {
  const {
    weekRangeLabel = "",
    weekRowsHtml = "",
    isCurrentWeek = false,
    escapeHtml = String,
  } = options;
  const listHeading = isCurrentWeek ? "Hele uken" : "Alle dager";

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
    <section class="week-list">
      <h4 class="week-list-heading">${listHeading}</h4>
      ${weekRowsHtml}
    </section>
  `;
}
