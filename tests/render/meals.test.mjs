import assert from "node:assert/strict";
import {
  renderMealCardView,
  renderMealDetailView,
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

testMealCardRender();
testMealsViewRender();
testMealDetailRender();

console.log("meals render tests ok");
