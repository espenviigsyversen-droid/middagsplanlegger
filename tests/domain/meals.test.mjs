import assert from "node:assert/strict";
import {
  makeSlug,
  mealBaseServings,
  normalizeIngredients,
  normalizedRecipeUrl,
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

console.log("meals domain tests ok");
