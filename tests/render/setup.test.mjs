import assert from "node:assert/strict";
import { renderMetadataRowsView, renderSetupPageView, renderSetupView } from "../../src/render/setup.js";

const escapeHtml = (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function testSetupRender() {
  const page = renderSetupView({
    family: { name: "Flo", familySize: 5, kidFriendlyPerWeek: 3, leftovers: true, reuseIngredients: false },
    quickDays: ["Mandag"],
    dayNames: ["Mandag", "Tirsdag"],
    counts: { categories: 4, units: 8, prepTimes: 3, suitability: 4, planModes: 3, ingredientMappings: 2, storeCategories: 7, preferenceGoals: 1 },
    appVersion: "v79",
    escapeHtml,
  });
  assert.match(page, /Setup/);
  assert.match(page, /Versjon v79/);
  assert.match(page, /data-view="categories"/);

  const rows = renderMetadataRowsView({ entries: [["fisk", "Fisk"]], inputAttribute: "data-category-label", saveAttribute: "data-save-category", removeAttribute: "data-remove-category", editable: true, escapeHtml });
  assert.match(rows, /data-category-label="fisk"/);

  const subPage = renderSetupPageView({ title: "Kategorier", lead: "Test", bodyHtml: rows, escapeHtml });
  assert.match(subPage, /Kategorier/);
  assert.match(subPage, /Tilbake/);
}

testSetupRender();

console.log("setup render tests ok");
