import assert from "node:assert/strict";
import { renderPlannerRowView, renderPlannerView } from "../../src/render/planner.js";

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

  const page = renderPlannerView({ weekRangeLabel: "18. mai - 24. mai", rowsHtml: row, advisorSummary: "Alt ok", addIconHtml: "<svg></svg>", escapeHtml });
  assert.match(page, /Planlegg uken/);
  assert.match(page, /Rådgiverstatus/);
}

testPlannerRender();

console.log("planner render tests ok");
