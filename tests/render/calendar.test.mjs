import assert from "node:assert/strict";
import { renderCalendarView, renderTodaySummaryView, renderWeekRowView } from "../../src/render/calendar.js";

const escapeHtml = (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function testCalendarRender() {
  const today = renderTodaySummaryView({
    dateLabel: "23. mai",
    title: "Pasta",
    description: "Rask middag",
    mealId: "pasta",
    dayIndex: 0,
    showRecipe: true,
    escapeHtml,
  });
  assert.match(today, /I dag · 23\. mai/);
  assert.match(today, /data-view-meal="pasta"/);

  const row = renderWeekRowView({ shortDay: "Man", dateLabel: "25. mai", title: "", showPlanner: true, escapeHtml });
  assert.match(row, /Ikke planlagt/);
  assert.match(row, /Planlegg/);

  const page = renderCalendarView({ weekRangeLabel: "18. mai - 24. mai", todayCardHtml: today, weekRowsHtml: row, isCurrentWeek: true, escapeHtml });
  assert.match(page, /Middagsplan/);
  assert.match(page, /Resten av uken/);
}

testCalendarRender();

console.log("calendar render tests ok");
