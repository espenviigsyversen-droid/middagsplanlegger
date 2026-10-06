import assert from "node:assert/strict";
import { applyImportedRecipe } from "../../src/domain/recipe-import.js";
import { mealCanImportFromLink, mealNeedsRecipe } from "../../src/domain/meals.js";
const draft = { id: "existing", title: "Eget navn", description: "", categories: [], prepTime: "", recipeUrl: "", baseServings: 2,
  ingredients: [{ name: "Egen vare", amount: "2", unit: "g" }], steps: ["Eget steg"], favorite: true };
const recipe = { title: "Imported title", description: "Ny beskrivelse", categories: ["fisk"], prepTime: "medium", recipeUrl: "https://example.com/",
  baseServings: 4, ingredients: [{ name: "Fisk", amount: "500", unit: "g" }], steps: ["Stek fisken."] };
const added = applyImportedRecipe(draft, recipe, { isNew: true });
assert.equal(added.title, recipe.title); assert.deepEqual(added.ingredients, recipe.ingredients); assert.equal(added.baseServings, 4);
assert.equal(added.favorite, true); assert.equal(added.id, "existing");
const kept = applyImportedRecipe(draft, recipe, { replaceContent: false });
assert.equal(kept.title, "Eget navn"); assert.equal(kept.description, recipe.description);
assert.deepEqual(kept.categories, ["fisk"]); assert.equal(kept.prepTime, "medium"); assert.equal(kept.recipeUrl, recipe.recipeUrl);
assert.equal(kept.baseServings, 2); assert.deepEqual(kept.ingredients, draft.ingredients); assert.deepEqual(kept.steps, draft.steps);
const replaced = applyImportedRecipe(draft, recipe, { replaceContent: true });
assert.equal(replaced.title, "Eget navn"); assert.equal(replaced.baseServings, 4); assert.deepEqual(replaced.steps, recipe.steps);
const empty = applyImportedRecipe({ ...draft, title: "", ingredients: [{ name: "", amount: "", unit: "" }], steps: [""] }, recipe);
assert.equal(empty.title, recipe.title); assert.equal(empty.baseServings, 4); assert.deepEqual(empty.ingredients, recipe.ingredients);
added.ingredients[0].name = "changed";
assert.equal(recipe.ingredients[0].name, "Fisk"); assert.equal(draft.ingredients[0].name, "Egen vare");
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", ingredients: [], steps: [] }), true);
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", ingredients: [{ name: "mel" }] }), false);
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", steps: ["Stek"] }), false);
assert.equal(mealCanImportFromLink({ recipeUrl: "  " }), false);
assert.equal(mealNeedsRecipe({ recipeUrl: "https://example.com", ingredients: [], steps: [] }), false);
console.log("recipe import domain tests ok");
