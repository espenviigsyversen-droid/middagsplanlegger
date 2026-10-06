import assert from "node:assert/strict";
import { ingredientBaseName, ingredientsToEditorRows, editorRowsToIngredients, moveIngredientEditorRow } from "../../src/domain/meals.js";

assert.equal(ingredientBaseName(" hvitløk, finhakket "), "hvitløk");
assert.equal(ingredientBaseName(", pynt"), ", pynt");
const grouped = [{ name: "hvitløk", amount: "2", unit: "stk", group: "Saus" }, { name: "melk", amount: "3", unit: "dl", group: "Saus" }, { name: "ris", amount: "1", unit: "g", group: "Tilbehør" }, { name: "salt", amount: "", unit: "" }];
const rows = ingredientsToEditorRows(grouped);
assert.deepEqual(rows.filter(row => row.type === "heading").map(row => row.title), ["Saus", "Tilbehør", ""]);
assert.deepEqual(editorRowsToIngredients(rows), grouped);
assert.deepEqual(editorRowsToIngredients([...rows, { type: "heading", title: "" }]), grouped);
assert.equal(editorRowsToIngredients(rows.filter((row, index) => index !== 3))[2].group, "Saus");
assert.equal(editorRowsToIngredients(moveIngredientEditorRow(rows, 3, 1))[2].group, "Saus");
assert.equal(normalizeIngredients([{ name: "melk", amount: "1", unit: "dl", group: " Saus " }])[0].group, "Saus");
assert.equal(normalizeIngredients([{ name: "melk", group: "g".repeat(80) }])[0].group.length, 60);
assert.equal("group" in normalizeIngredients([{ name: "melk", group: " " }])[0], false);
import {
  createQuickMeal,
  makeSlug,
  mealBaseServings,
  mealNeedsRecipe,
  normalizeIngredients,
  normalizedRecipeUrl,
  quickMealTitleForQuery,
  splitLines,
  splitList,
  uniqueMetadataKey,
} from "../../src/domain/meals.js";

function testNormalizeIngredients() {
  assert.deepEqual(
    normalizeIngredients([
      { name: " Pasta ", amount: 1, unit: " pakke " },
      { name: " " },
      { name: "Salt", amount: "", unit: "" },
    ]),
    [
      { name: "Pasta", amount: "1", unit: "pakke" },
      { name: "Salt", amount: "", unit: "" },
    ],
  );

  assert.deepEqual(
    normalizeIngredients([], ["ris", " paprika "]),
    [
      { name: "ris", amount: "", unit: "" },
      { name: " paprika ", amount: "", unit: "" },
    ],
  );
}

function testRecipeUrlAndServings() {
  assert.equal(normalizedRecipeUrl(""), "");
  assert.equal(normalizedRecipeUrl("example.com/oppskrift"), "https://example.com/oppskrift");
  assert.equal(normalizedRecipeUrl("http://example.com"), "http://example.com");
  assert.equal(normalizedRecipeUrl("https://example.com"), "https://example.com");
  assert.equal(mealBaseServings({ baseServings: 6 }), 6);
  assert.equal(mealBaseServings({ baseServings: 0 }), 4);
  assert.equal(mealBaseServings({}), 4);
}

function testSlugAndUniqueKey() {
  assert.equal(makeSlug("Kjøtt & saus!"), "kj-tt-saus");
  assert.equal(makeSlug("", "middag"), "middag");
  assert.equal(uniqueMetadataKey("pasta", { pasta: "Pasta", "pasta-2": "Pasta 2" }), "pasta-3");
  assert.equal(uniqueMetadataKey("fisk", { pasta: "Pasta" }), "fisk");
}

function testSplitHelpers() {
  assert.deepEqual(splitList(" pasta, ris, , tomat "), ["pasta", "ris", "tomat"]);
  assert.deepEqual(splitList(""), []);
  assert.deepEqual(splitLines("Steg 1\n\n Steg 2 "), ["Steg 1", "Steg 2"]);
  assert.deepEqual(splitLines(""), []);
}

testNormalizeIngredients();
testRecipeUrlAndServings();
testSlugAndUniqueKey();
testSplitHelpers();

const quickMeal = createQuickMeal("  Lasagne  ", "lasagne");
assert.deepEqual(quickMeal, {
  id: "lasagne", title: "Lasagne", description: "", recipeUrl: "", baseServings: 4,
  categories: [], kidFriendly: false, favorite: false, excludeFromSuggestions: false,
  leftovers: "none", prepTime: "", minDaysBetween: 14, keyIngredients: [],
  ingredients: [], suitability: [], steps: [],
});
assert.equal(mealNeedsRecipe(quickMeal), true);
assert.equal(mealNeedsRecipe({}), true);
assert.equal(mealNeedsRecipe({ ...quickMeal, description: "Bare en middag", recipeUrl: "  " }), true);
assert.equal(mealNeedsRecipe({ ...quickMeal, ingredients: [{ name: "Mel" }] }), false);
assert.equal(mealNeedsRecipe({ ...quickMeal, steps: ["Kok"] }), false);
assert.equal(mealNeedsRecipe({ ...quickMeal, recipeUrl: "https://example.com" }), false);
assert.equal(quickMealTitleForQuery("  ", [quickMeal]), "");
assert.equal(quickMealTitleForQuery(" lASAgne ", [quickMeal]), "");
assert.equal(quickMealTitleForQuery(" taco ", [{ title: " Taco " }]), "");
assert.equal(quickMealTitleForQuery(" LAS ", [quickMeal]), "LAS");
assert.equal(quickMealTitleForQuery(" <ny> ", []), "<ny>");
assert.equal(quickMealTitleForQuery(" middag "), "middag");
const otherQuickMeal = createQuickMeal("Taco", "taco");
otherQuickMeal.categories.push("kjott");
assert.deepEqual(quickMeal.categories, []);

console.log("meals domain tests ok");
