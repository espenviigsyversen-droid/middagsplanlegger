import assert from "node:assert/strict";
import {
  renderMealCardView,
  renderMealDetailView,
  renderMealEditorView,
  renderMealsView,
} from "../../src/render/meals.js";

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

function testMealCardRender() {
  const html = renderMealCardView({
    meal: {
      id: "pasta",
      title: "Pasta <god>",
      description: "Rask",
      categories: ["pasta"],
      favorite: true,
      kidFriendly: true,
      prepTime: "quick",
      leftovers: "likely",
      suitability: ["weekday"],
      excludeFromSuggestions: true,
    },
    categoryLabels: { pasta: "Pasta" },
    suitabilityLabels: { weekday: "Hverdag" },
    escapeHtml,
  });
  assert.match(html, /Pasta &lt;god&gt;/);
  assert.match(html, /Favoritt/);
  assert.match(html, /Kun oppskrift/);
}

function testMealsViewRender() {
  const html = renderMealsView({
    meals: [{ id: "pasta", title: "Pasta", description: "", categories: ["pasta"], suitability: [] }],
    filters: { query: "pas", category: "pasta", flag: "all", sort: "alpha" },
    categoryEntries: [["pasta", "Pasta"]],
    categoryLabels: { pasta: "Pasta" },
    suitabilityEntries: [["weekday", "Hverdag"]],
    suitabilityLabels: { weekday: "Hverdag" },
    addIconHtml: "<svg></svg>",
    escapeHtml,
  });
  assert.match(html, /value="pas"/);
  assert.match(html, /data-clear-meal-search/);
  assert.match(html, /data-meal-list/);
  assert.match(html, /Ny oppskrift/);
  assert.match(html, /Pasta/);
}

function testMealDetailRender() {
  const html = renderMealDetailView({
    meal: { id: "pasta", title: "Pasta", description: "", recipeUrl: "https://example.com" },
    steps: ["Kok pasta"],
    ingredients: [{ amount: "2", unit: "stk", name: "Tomat" }],
    wakeSupported: false,
    servingText: "Oppskrift til 4 personer.",
    leftoversText: "Gir rester",
    shoppingIconHtml: "<svg></svg>",
    scaleAmount: (amount) => amount,
    escapeHtml,
  });
  assert.match(html, /Oppskrift til 4 personer/);
  assert.match(html, /Tomat/);
  assert.match(html, /Kok pasta/);
  assert.match(html, /Åpne lenke/);
}

function testMealEditorRender() {
  const html = renderMealEditorView({
    isNew: false,
    meal: {
      id: "pasta",
      title: "Pasta <god>",
      description: "Rask",
      recipeUrl: "example.com",
      categories: ["pasta"],
      suitability: ["weekday"],
      kidFriendly: true,
      favorite: false,
      excludeFromSuggestions: true,
      leftovers: "likely",
      prepTime: "quick",
      minDaysBetween: 14,
    },
    baseServings: 4,
    ingredients: [{ amount: "1", unit: "pakke", name: "Pasta" }],
    steps: ["Kok"],
    categoryEntries: [["pasta", "Pasta"]],
    suitabilityEntries: [["weekday", "Hverdag"]],
    prepTimeEntries: [["quick", "Rask"]],
    unitOptions: ["", "pakke"],
    escapeHtml,
  });
  assert.match(html, /Rediger Pasta &lt;god&gt;/);
  assert.match(html, /name="kidFriendly" checked/);
  assert.match(html, /name="excludeFromSuggestions" checked/);
  assert.match(html, /data-ingredient-row="0"/);
  assert.match(html, /data-step-row="0"/);
  assert.match(html, /Slett/);
}

testMealCardRender();
testMealsViewRender();
testMealDetailRender();
testMealEditorRender();

console.log("meals render tests ok");
