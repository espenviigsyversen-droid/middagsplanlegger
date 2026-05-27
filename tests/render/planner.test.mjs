import assert from "node:assert/strict";
import {
  renderPlannerActionSheetView,
  renderPlannerDaySheetView,
  renderPlannerRowView,
  renderPlannerView,
} from "../../src/render/planner.js";

const escapeHtml = (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function testPlannerRender() {
  const row = renderPlannerRowView({
    day: "Mandag",
    dateLabel: "25. mai",
    index: 0,
    locked: true,
    isPlannedMeal: true,
    summaryTitle: "Pasta",
    summaryText: "Rask",
    dayMode: "home",
    dayType: "weekday",
    dayServings: 4,
    mealId: "pasta",
    mealTitle: "Pasta",
    typeLabel: "Hverdag",
    reason: "passer til hverdag",
    planModeEntries: [["home", { label: "Middag hjemme" }]],
    suitabilityEntries: [["weekday", "Hverdag"]],
    escapeHtml,
  });
  assert.match(row, /Låst/);
  assert.match(row, /data-open-meal-picker="0"/);
  assert.match(row, /Oppskrift/);
  assert.match(row, /Bytt/);
  assert.match(row, /data-edit-planner-day="0"/);
  assert.match(row, /data-random-day="0"/);
  assert.match(row, /4 personer/);

  const daySheet = renderPlannerDaySheetView({
    open: true,
    day: "Mandag",
    dateLabel: "25. mai",
    index: 0,
    locked: false,
    isPlannedMeal: true,
    mealTitle: "Pasta",
    dayMode: "home",
    dayType: "weekday",
    dayServings: 4,
    planModeEntries: [["home", { label: "Middag hjemme" }]],
    suitabilityEntries: [["weekday", "Hverdag"]],
    escapeHtml,
  });
  assert.match(daySheet, /data-day-mode="0"/);
  assert.match(daySheet, /data-day-servings="0"/);

  const actionSheet = renderPlannerActionSheetView({ open: true });
  assert.match(actionSheet, /data-fill-week/);
  assert.match(actionSheet, /Oppdag nye middager/);

  const page = renderPlannerView({
    weekRangeLabel: "18. mai - 24. mai",
    rowsHtml: row,
    advisorSummary: "Alt ok",
    daySheetHtml: daySheet,
    actionSheetHtml: actionSheet,
    addIconHtml: "<svg></svg>",
    escapeHtml,
  });
  assert.match(page, /Planlegg uken/);
  assert.match(page, /Rådgiverstatus/);
  assert.match(page, /Foreslå uke/);
  assert.match(page, /planner-fab/);
}

testPlannerRender();

console.log("planner render tests ok");
