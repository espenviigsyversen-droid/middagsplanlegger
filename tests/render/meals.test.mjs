import assert from "node:assert/strict";
import {
  renderMealCardView,
  renderMealDetailView,
  renderMealEditorView,
  renderMealSearchSuggestionsView,
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
      ingredients: [{ name: "Pasta" }],
    },
    categoryLabels: { pasta: "Pasta" },
    suitabilityLabels: { weekday: "Hverdag" },
    escapeHtml,
  });
  assert.match(html, /Pasta &lt;god&gt;/);
  assert.match(html, /aria-label="Åpne oppskrift"/);
  assert.match(html, /aria-label="Rediger oppskrift"/);
  assert.doesNotMatch(html, /Favoritt/);
  assert.doesNotMatch(html, /Kun oppskrift/);
  assert.doesNotMatch(html, /Rask/);
  assert.doesNotMatch(html, /Mangler oppskrift/);
  assert.match(renderMealCardView({ meal: { id: "ny", title: "Ny middag" } }), /Mangler oppskrift/);
}

function testRecipeImportRender() {
  const meal = { id: "linked", title: "Lenke", description: "", recipeUrl: "https://example.com/recipe", ingredients: [], steps: [] };
  const linked = renderMealDetailView({ meal, importAvailable: true, escapeHtml });
  assert.match(linked, /data-import-from-link="linked"/);
  assert.match(linked, /Hent fra lenke/);
  assert.doesNotMatch(renderMealDetailView({ meal: { ...meal, ingredients: [{ name: "Fisk" }] }, escapeHtml }), /data-import-from-link/);
  assert.doesNotMatch(renderMealDetailView({ meal: { ...meal, recipeUrl: "" }, escapeHtml }), /data-import-from-link/);
  for (const isNew of [true, false]) {
    const html = renderMealEditorView({ meal, isNew, importAvailable: true, aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { url: meal.recipeUrl, showText: true, text: "<script>bad</script>" }, escapeHtml });
    assert.match(html, /Importer oppskrift/); assert.match(html, /data-import-fetch/); assert.match(html, /data-import-interpret/);
    assert.doesNotMatch(html, /<script>/);
    assert.ok(html.indexOf("recipe-import-panel") < html.indexOf("data-meal-form"));
  }
  const busy = renderMealEditorView({ meal, importAvailable: true, aiKeyStatus: { configured: true, status: "connected" }, recipeImport: { busy: true, showText: true }, escapeHtml });
  assert.match(busy, /data-import-fetch disabled/); assert.match(busy, /data-import-interpret disabled/);
  assert.match(busy, /Henter oppskrift/);
}
testRecipeImportRender();

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
  assert.match(html, /data-meal-search-suggestions/);
  assert.match(html, /meal-search-suggestion/);
  assert.match(html, /Ny oppskrift/);
  assert.match(html, /Pasta/);
  assert.match(html, /value="needs-recipe"/);
  const missingFilter = renderMealsView({ filters: { flag: "needs-recipe" } });
  assert.match(missingFilter, /value="needs-recipe" selected>Mangler oppskrift/);
}

function testMealSearchSuggestionsRender() {
  const html = renderMealSearchSuggestionsView({
    meals: [
      { id: "nachos", title: "Nachos", categories: ["meat"] },
      { id: "kyllingnachos", title: "Kyllingnachos", categories: ["chicken"] },
    ],
    query: "nach",
    categoryLabels: { meat: "Kjøtt", chicken: "Kylling" },
    escapeHtml,
  });
  assert.match(html, /data-view-meal="nachos"/);
  assert.match(html, /Nachos/);
  assert.match(html, /Kjøtt/);
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
  assert.doesNotMatch(html, /Ingen oppskrift lagt inn ennå/);
  const missingDetail = renderMealDetailView({ meal: { id: "ny", title: "Ny" } });
  assert.match(missingDetail, /Ingen oppskrift lagt inn ennå/);
  assert.match(missingDetail, /data-edit-meal="ny">Legg inn oppskrift/);
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
  assert.match(html, /Porsjoner i oppskriften/);
  assert.match(html, /Antallet mengdene er beregnet for\. Ukeplan og handleliste regner om til familiens størrelse\./);
  assert.match(html, /aria-describedby="mealBaseServingsHint"/);
  const quickEditor = renderMealEditorView({ meal: { id: "ny", title: "Ny", prepTime: "" }, prepTimeEntries: [["quick", "Rask"]] });
  assert.match(quickEditor, /value="" selected>Ikke angitt/);
  assert.doesNotMatch(quickEditor, /value="quick" selected/);
}

testMealCardRender();
testMealsViewRender();
testMealSearchSuggestionsRender();
testMealDetailRender();
testMealEditorRender();

const groupedIngredients = [{ name: "hvitløk, finhakket", amount: "2", unit: "stk", group: "Saus" }, { name: "melk", group: "Saus" }, { name: "ris", group: "Tilbehør" }, { name: "salt" }, { name: "olje", group: "Saus" }];
const groupedDetail = renderMealDetailView({ meal: { id: "group", title: "Test" }, ingredients: groupedIngredients, escapeHtml });
assert.equal((groupedDetail.match(/ingredient-group-heading/g) || []).length, 3);
assert.match(groupedDetail, /<strong>hvitløk<\/strong>, finhakket/);
assert.doesNotMatch(groupedDetail, /<strong>hvitløk, finhakket<\/strong>/);
const groupedEditor = renderMealEditorView({ meal: { id: "group", title: "Test" }, ingredients: groupedIngredients, escapeHtml });
assert.match(groupedEditor, /Overskrift, for eksempel Saus/); assert.match(groupedEditor, /data-add-ingredient-heading/);
assert.match(groupedEditor, /data-move-ingredient-heading/); assert.match(groupedEditor, /value="Saus"/);
assert.match(groupedEditor, /maxlength="60"/); assert.match(groupedEditor, /data-ingredient-heading="true"/);
const xssGroup = renderMealDetailView({ meal: { id: "group", title: "Test" }, ingredients: [{ name: "a, <script>", group: "<img>" }], escapeHtml });
assert.doesNotMatch(xssGroup, /<img>|<script>/); assert.match(xssGroup, /&lt;img&gt;/);

for (const [ingredients, steps, conflict] of [[true, true, "ingredienser og fremgangsmåte"], [true, false, "ingredienser"], [false, true, "fremgangsmåte"]]) {
  const choice = renderMealEditorView({ meal: { title: "Test" }, importAvailable: true,
    aiKeyStatus: { configured: true, status: "connected" },
    recipeImport: { showText: true, message: "Ingenting ble endret.", warnings: ["Kontroller porsjonene"], pending: {
      recipe: { ingredients: [{ name: "Vare" }], steps: ["Steg"] }, conflictIngredients: ingredients, conflictSteps: steps,
    } }, escapeHtml });
  assert.match(choice, new RegExp(`Oppskriften har allerede ${conflict}\\.`));
  assert.match(choice, /data-import-replace>Erstatt med det importerte/);
  assert.match(choice, /data-import-keep>Behold det jeg har/);
  assert.match(choice, /data-import-fetch >Hent/);
  assert.match(choice, /data-import-interpret >Tolk tekst/);
  assert.match(choice, /Kontroller porsjonene/);
  assert.doesNotMatch(choice, /Ingenting ble endret\./);
}

console.log("meals render tests ok");
