"use strict";
const assert = require("node:assert/strict");
const { validateInput, requireMember, nextUsage, normalizeAmount, normalizeRecipe, extractJson } = require("../lib/core.js");
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
  const normalize = ingredients => normalizeRecipe(JSON.stringify({ found: true, title: "Test", ingredients, steps: [] }), setup).recipe.ingredients;
  for (const [amount, expected] of [["3-4", "3-4"], ["0,5–1", "0,5-1"], ["½-1", "1/2-1"], ["3--4", ""], ["4-3", ""], ["", ""], ["litt", ""], ["1/0", ""]]) {
    const result = normalize([{ name: "melk", amount, unit: "dl" }])[0];
    assert.equal(result.amount, expected); assert.equal(result.unit, expected ? "dl" : "");
  }
  assert.deepEqual(normalize([{ name: "melk", group: " Saus ", amount: "2", unit: "dl" }, { name: "ris", group: " Tilbehør ", amount: "1", unit: "g" }]).map(i => i.group), ["Saus", "Tilbehør"]);
  assert.equal(normalize([{ name: "melk", group: "Saus" }, { name: "smør", group: "Saus" }]).every(i => !("group" in i)), true);
  assert.equal(normalize([{ name: "melk", group: "Saus" }, { name: "ris" }])[0].group, "Saus");
  assert.equal(normalize([{ name: "melk", group: "g".repeat(80) }, { name: "ris" }])[0].group.length, 60);
  for (const description of ["TEST!!! 🍽️ #middag", "test.", "TEST"]) {
    assert.equal(normalizeRecipe(JSON.stringify({ found: true, title: "Test", description, ingredients: [{ name: "ris" }], steps: [] }), setup).recipe.description, "");
  }
  assert.equal(normalizeRecipe(JSON.stringify({ found: true, title: "Test", description: "Rask middag 🍲 #enkel", ingredients: [{ name: "ris" }], steps: [] }), setup).recipe.description, "Rask middag");
  for (const [value, expected] of [["ca. 300", "300"], ["ca 2-3", "2-3"], ["omtrent 1/2", "1/2"], ["~2", "2"],
    ["CIRKA 2,5", "2,5"], ["omlag 3", "3"], ["about 4", "4"], ["approx. 5", "5"], ["approximately 1 1/2", "1 1/2"],
    ["ca", ""], ["cab 2", ""], ["cirka", ""], ["aboutish 3", ""], ["~", ""], ["ca. 1/0", ""], ["ca. 4-3", ""]]) {
    assert.equal(normalizeAmount(value), expected, value);
  }
  const withUnits = (item, units) => normalizeRecipe(JSON.stringify({ found: true, ingredients: [item], steps: [] }), { ...setup, units }).recipe.ingredients[0];
  const aliases = { bokser: "boks", poser: "pose", pakker: "pakke", pk: "pakke", begre: "beger", stykk: "stk", stykker: "stk",
    stilk: "stk", stilker: "stk", spiseskje: "ss", spiseskjeer: "ss", teskje: "ts", teskjeer: "ts", gram: "g", kilo: "kg", liter: "l", desiliter: "dl", milliliter: "ml" };
  for (const [form, canonical] of Object.entries(aliases)) {
    const item = { name: "vare", amount: "ca. 2", unit: form.toUpperCase() + "." };
    assert.deepEqual(withUnits(item, [canonical]), { name: "vare", amount: "2", unit: canonical });
    assert.deepEqual(withUnits(item, []), { name: item.unit + " vare", amount: "2", unit: "" });
  }
  for (const [form, canonical] of [["bokser", "boks"], ["poser", "pose"], ["STILKER.", "stk"]]) {
    const name = form + " hakkede tomater";
    assert.deepEqual(withUnits({ name, amount: "2", unit: "" }, [canonical]), { name: "hakkede tomater", amount: "2", unit: canonical });
    assert.deepEqual(withUnits({ name, amount: "2", unit: "" }, []), { name, amount: "2", unit: "" });
    for (const amount of ["", "ca", "cab 2"]) assert.deepEqual(withUnits({ name, amount, unit: "" }, [canonical]), { name, amount: "", unit: "" });
  }
  assert.deepEqual(withUnits({ name: "bokser", amount: "2", unit: "" }, ["boks"]), { name: "bokser", amount: "2", unit: "" });
  assert.deepEqual(withUnits({ name: "bokser hakkede tomater", amount: "2", unit: "stk" }, ["stk", "boks"]), { name: "bokser hakkede tomater", amount: "2", unit: "stk" });
  assert.equal(withUnits({ name: "vare", amount: "2", unit: "G." }, ["g"]).unit, "g");
  assert.equal(withUnits({ name: "vare", amount: "2", unit: "PK" }, ["pk"]).unit, "pk");
  const instructions = require("../lib/ai.js").instructionsFor(setup);
  assert.match(instructions, /amount er bare tallet/); assert.match(instructions, /ca\./); assert.match(instructions, /bokser til boks, poser til pose, stilker til stk/);
  console.log("functions core tests ok");
})().catch(error => { console.error(error); process.exitCode = 1; });
