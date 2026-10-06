import assert from "node:assert/strict";
import { applyImportedRecipe } from "../../src/domain/recipe-import.js";
import { mealCanImportFromLink, mealNeedsRecipe } from "../../src/domain/meals.js";
const draft = { id: "existing", title: "Eget navn", description: "", categories: [], prepTime: "", recipeUrl: "", baseServings: 2,
  ingredients: [{ name: "Egen vare", amount: "2", unit: "g" }], steps: ["Eget steg"], favorite: true };
const recipe = { title: "Imported title", description: "Ny beskrivelse", categories: ["fisk"], prepTime: "medium", recipeUrl: "https://example.com/",
  baseServings: 4, ingredients: [{ name: "Fisk", amount: "500", unit: "g" }], steps: ["Stek fisken."] };
const added = applyImportedRecipe(draft, recipe, { isNew: true, replaceIngredients: true, replaceSteps: true });
assert.equal(added.title, recipe.title); assert.deepEqual(added.ingredients, recipe.ingredients); assert.equal(added.baseServings, 4);
assert.equal(added.favorite, true); assert.equal(added.id, "existing");
const kept = applyImportedRecipe(draft, recipe, { replaceIngredients: false, replaceSteps: false });
assert.equal(kept.title, "Eget navn"); assert.equal(kept.description, recipe.description);
assert.deepEqual(kept.categories, ["fisk"]); assert.equal(kept.prepTime, "medium"); assert.equal(kept.recipeUrl, recipe.recipeUrl);
assert.equal(kept.baseServings, 2); assert.deepEqual(kept.ingredients, draft.ingredients); assert.deepEqual(kept.steps, draft.steps);
const replaced = applyImportedRecipe(draft, recipe, { replaceIngredients: true, replaceSteps: true });
assert.equal(replaced.title, "Eget navn"); assert.equal(replaced.baseServings, 4); assert.deepEqual(replaced.steps, recipe.steps);
const empty = applyImportedRecipe({ ...draft, title: "", ingredients: [{ name: "", amount: "", unit: "" }], steps: [""] }, recipe);
assert.equal(empty.title, recipe.title); assert.equal(empty.baseServings, 4); assert.deepEqual(empty.ingredients, recipe.ingredients);
for (const isNew of [false, true]) for (const draftIngredients of [false, true]) for (const draftSteps of [false, true])
  for (const importIngredients of [false, true]) for (const importSteps of [false, true])
    for (const replaceIngredients of [false, true]) for (const replaceSteps of [false, true]) {
      const before = { ...draft, ingredients: draftIngredients ? draft.ingredients : [], steps: draftSteps ? draft.steps : [] };
      const imported = { ...recipe, ingredients: importIngredients ? recipe.ingredients : [], steps: importSteps ? recipe.steps : [] };
      const after = applyImportedRecipe(before, imported, { isNew, replaceIngredients, replaceSteps });
      const fillsIngredients = importIngredients && (!draftIngredients || replaceIngredients);
      const fillsSteps = importSteps && (!draftSteps || replaceSteps);
      assert.deepEqual(after.ingredients, fillsIngredients ? imported.ingredients : before.ingredients);
      assert.deepEqual(after.steps, fillsSteps ? imported.steps : before.steps);
      assert.equal(after.baseServings, fillsIngredients ? 4 : 2);
      const unknown = applyImportedRecipe(before, { ...imported, servingsKnown: false }, { isNew, replaceIngredients, replaceSteps });
      assert.equal(unknown.baseServings, 2);
    }
const noMetadata = applyImportedRecipe({ ...draft, description: "Egen beskrivelse", prepTime: "long", recipeUrl: "https://own.example", categories: ["egen"] },
  { ...recipe, title: "", description: "", prepTime: "", recipeUrl: "", categories: [] }, { isNew: true });
assert.equal(noMetadata.title, draft.title); assert.equal(noMetadata.description, "Egen beskrivelse");
assert.equal(noMetadata.prepTime, "long"); assert.equal(noMetadata.recipeUrl, "https://own.example"); assert.deepEqual(noMetadata.categories, ["egen"]);
added.ingredients[0].name = "changed";
assert.equal(recipe.ingredients[0].name, "Fisk"); assert.equal(draft.ingredients[0].name, "Egen vare");
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", ingredients: [], steps: [] }), true);
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", ingredients: [{ name: "mel" }] }), false);
assert.equal(mealCanImportFromLink({ recipeUrl: "https://example.com", steps: ["Stek"] }), false);
assert.equal(mealCanImportFromLink({ recipeUrl: "  " }), false);
assert.equal(mealNeedsRecipe({ recipeUrl: "https://example.com", ingredients: [], steps: [] }), false);
console.log("recipe import domain tests ok");
