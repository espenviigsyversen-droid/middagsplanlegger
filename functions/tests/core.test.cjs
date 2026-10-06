"use strict";
const assert = require("node:assert/strict");
const { validateInput, requireMember, nextUsage, normalizeRecipe, extractJson } = require("../lib/core.js");
const setup = { categories: [{ key: "fisk", label: "Fisk" }], units: ["", "g", "dl"] };
const input = { mode: "text", text: "Dette er en oppskriftstekst", ...setup };
assert.equal(validateInput(input).mode, "text");
for (const bad of [{ ...input, extra: true }, { ...input, text: "kort" }, { ...input, text: "x".repeat(20001) },
  { ...input, categories: Array(31).fill(setup.categories[0]) }, { ...input, units: Array(41).fill("g") },
  { ...input, sourceUrl: "a".repeat(2001) }, { ...input, categories: [{ key: "x", label: "y", extra: true }] }]) assert.throws(() => validateInput(bad), e => e.code === "invalid-argument");
(async () => {
  for (const auth of [null, { token: {} }, { token: { email: "a@b.com", email_verified: false } }]) {
    await assert.rejects(requireMember(auth, () => { throw new Error("must not read"); }), e => e.code === "unauthenticated");
  }
  const auth = { token: { email: "Admin@Example.com", email_verified: true } };
  await assert.rejects(requireMember(auth, async () => false), e => e.code === "permission-denied");
  await requireMember(auth, async email => { assert.equal(email, "admin@example.com"); return true; });
  const now = Date.parse("2026-10-06T12:00:00Z");
  let usage = {};
  for (let i = 0; i < 10; i++) usage = nextUsage(usage, now + i);
  assert.throws(() => nextUsage(usage, now + 11), e => e.code === "RATE_LIMITED");
  assert.equal(nextUsage(usage, now + 600010).dailyCount, 11);
  usage = {};
  for (let i = 0; i < 40; i++) usage = nextUsage(usage, now + i * 600001);
  assert.throws(() => nextUsage(usage, now + 40 * 600001), e => e.code === "DAILY_LIMIT");
  assert.equal(nextUsage(usage, Date.parse("2026-10-07T00:00:00Z")).dailyCount, 1);
  const recipe = { found: true, title: "  Original title ", description: "x".repeat(600), baseServings: 99,
    ingredients: [{ name: "mel", amount: "2 cups", unit: "cups" }, { name: "sukker", amount: "1 1/2", unit: "dl" }],
    steps: ["", "   Stek   ", "x".repeat(900)], totalMinutes: 30, categories: ["fisk", "ukjent", "fisk"], translated: true };
  const result = normalizeRecipe(`prefix\n\`\`\`json\n${JSON.stringify(recipe)}\n\`\`\``, setup);
  assert.equal(result.recipe.title, "Original title");
  assert.deepEqual(result.recipe.ingredients[0], { name: "cups mel", amount: "", unit: "" });
  assert.equal(result.recipe.ingredients[1].amount, "1 1/2");
  assert.equal(result.recipe.description.length, 500);
  assert.equal(result.recipe.steps.length, 2); assert.equal(result.recipe.steps[1].length, 800);
  assert.equal(result.recipe.baseServings, 4); assert.equal(result.recipe.prepTime, "medium");
  assert.equal(result.recipe.servingsKnown, false);
  assert.ok(result.warnings.includes("Fant ikke antall porsjoner. Kontroller feltet Porsjoner."));
  assert.deepEqual(result.recipe.categories, ["fisk"]);
  assert.equal(result.warnings.length, 2);
  assert.equal(extractJson('nonsense {nope} then {"found":true,"title":"a } { \\\" b"}').found, true);
  assert.throws(() => normalizeRecipe('{"found":false}', setup), e => e.code === "NOT_A_RECIPE");
  assert.throws(() => normalizeRecipe('{"found":true}', setup), e => e.code === "AI_INVALID_RESPONSE");
  const stepOnly = normalizeRecipe(JSON.stringify({ found: true, title: "", ingredients: [], steps: ["Stek i ovn"], baseServings: null }), setup);
  assert.equal(stepOnly.recipe.title, ""); assert.deepEqual(stepOnly.recipe.steps, ["Stek i ovn"]);
  assert.equal(stepOnly.recipe.baseServings, 4); assert.equal(stepOnly.recipe.servingsKnown, false);
  const ingredientOnly = normalizeRecipe(JSON.stringify({ found: true, ingredients: [{ name: "melk" }], steps: [], baseServings: 3 }), setup);
  assert.equal(ingredientOnly.recipe.servingsKnown, true); assert.equal(ingredientOnly.recipe.baseServings, 3);
  for (const contents of [{ ingredients: [], steps: [] }, { ingredients: [{ name: " " }], steps: [" "] }]) {
    assert.throws(() => normalizeRecipe(JSON.stringify({ found: true, ...contents }), setup), e => e.code === "NOT_A_RECIPE");
  }
  const large = { ...recipe, title: "x".repeat(200), baseServings: 30,
    ingredients: Array(70).fill({ name: "x".repeat(100), unit: "g", amount: "123456789012bad" }), steps: Array(50).fill("Stek"), totalMinutes: 61 };
  const limited = normalizeRecipe(JSON.stringify(large), setup).recipe;
  assert.equal(limited.title.length, 120); assert.equal(limited.ingredients.length, 60);
  assert.equal(limited.ingredients[0].name.length, 80); assert.equal(limited.ingredients[0].amount, "");
  assert.equal(limited.steps.length, 40); assert.equal(limited.prepTime, "long");
  console.log("functions core tests ok");
})().catch(error => { console.error(error); process.exitCode = 1; });
