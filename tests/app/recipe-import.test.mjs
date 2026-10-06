import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g;
const bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/); bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const recipe = { title: "Imported title", description: "Importert beskrivelse", baseServings: 4, prepTime: "medium", categories: ["fisk"], recipeUrl: "https://example.com/recipe", ingredients: [{ name: "Fisk", amount: "500", unit: "g" }], steps: ["Stek fisken"] };
function fixture({ existing = false, content = false, ingredients = content, steps = content, replace = true, baseServings = content ? 2 : 4 } = {}) {
  const storage = new Map(), selectors = new Map(), calls = [], prompts = [];
  const values = { title: existing ? "Eget navn" : "", description: "", recipeUrl: "", baseServings: String(baseServings), prepTime: "", minDaysBetween: "14", leftovers: "none" };
  const form = { addEventListener() {}, values: { get: key => values[key] || "", getAll: () => [], has: () => false } };
  selectors.set("[data-meal-form]", [form]);
  selectors.set("[data-import-url]", [{ value: "https://example.com/recipe", addEventListener() {} }]);
  selectors.set("[data-import-text]", [{ value: "Oppskriftstekst som er lang nok.", addEventListener() {} }]);
  if (ingredients) {
    const fields = { amount: "2", unit: "g", name: "Egen vare" };
    selectors.set("[data-ingredient-row]", [{ querySelector: selector => ({ value: fields[/"(\w+)"/.exec(selector)[1]] }) }]);
  }
  if (steps) selectors.set("[data-step-row]", [{ querySelector: () => ({ value: "Eget steg" }) }]);
  const app = { innerHTML: "", querySelector: selector => selectors.get(selector)?.[0] || null, querySelectorAll: selector => selectors.get(selector) || [] };
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console, navigator: { onLine: true },
    window: { addEventListener() {}, confirm: message => { prompts.push(message); return replace; } },
    document: { querySelector: selector => selector === "#app" ? app : null, addEventListener() {} },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout() {}, clearTimeout() {}, FormData: class { constructor(form) { return form.values; } },
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  run('render = () => {}; accessState = { kind: "ready", user: { uid: "test", email: "test@example.com" }, role: "member", offline: false }; firebaseConnection = { firebaseApp: {} }; state.activeView = "meals"; aiKeyUi.status = { configured: true, status: "connected" };');
  context.existing = existing; context.content = content;
  run('state.editingMealId = existing ? "own" : "new"; state.meals = existing ? [{ ...emptyMeal(), id: "own", title: "Eget navn", ingredients: content ? [{name:"Egen vare",amount:"2",unit:"g"}] : [], steps: content ? ["Eget steg"] : [], baseServings: content ? 2 : 4 }] : []; resetRecipeImport(); saveState();');
  context.baseServings = baseServings; run("if (existing) state.meals[0].baseServings = baseServings; saveState();");
  context.importCall = async input => { calls.push(input); return { ok: true, recipe, warnings: ["Oversatt til norsk"] }; };
  run("recipeImporter = input => importCall(input)");
  const materializeEditor = () => {
    const html = run("renderMealEditor()");
    values.baseServings = /id="mealBaseServings"[^>]*value="([^"]+)"/.exec(html)[1];
    const draft = run('getDraftMeal(state.editingMealId === "new" ? emptyMeal() : getMeal(state.editingMealId))');
    for (const field of ["title", "description", "recipeUrl", "prepTime"]) values[field] = draft[field] || "";
    const rows = run('getDraftIngredients(state.editingMealId === "new" ? emptyMeal() : getMeal(state.editingMealId))');
    selectors.set("[data-ingredient-row]", Array.from(rows, row => ({
      dataset: row.type === "heading" ? { ingredientHeading: "true" } : {},
      querySelector: selector => ({ value: row.type === "heading" ? row.title : row[/"(\w+)"/.exec(selector)[1]] || "" }),
    })));
    selectors.set("[data-step-row]", Array.from(run('getDraftSteps(state.editingMealId === "new" ? emptyMeal() : getMeal(state.editingMealId))'), step => ({ querySelector: () => ({ value: step }) })));
    return html;
  };
  return { run, context, values, calls, prompts, storage, original: storage.get("middagsapp-state"), selectors, form, materializeEditor };
}
for (const config of [{}, { existing: true }, { existing: true, content: true }, { existing: true, content: true, replace: false }]) {
  const f = fixture(config); await f.run('startRecipeImport("url")');
  assert.equal(f.calls.length, 1);
  assert.equal(f.run("state.draftMeal.title"), config.existing ? "Eget navn" : recipe.title);
  assert.equal(f.run("state.draftIngredients[0].name"), config.replace === false ? "Egen vare" : "Fisk");
  assert.equal(f.run("state.draftMeal.baseServings"), config.replace === false ? 2 : 4);
  assert.equal(f.prompts.length, config.content ? 1 : 0);
  assert.equal(f.storage.get("middagsapp-state"), f.original, "Import must not write localStorage");
  assert.equal(f.run("state.meals.length"), config.existing ? 1 : 0);
  assert.equal(f.run("state.pendingLocalSync"), false);
  assert.equal(f.run("pendingRemoteScopes.size"), 0);
  assert.match(f.run("recipeImportState.message"), /example.com.*Se over/);
}
const needsText = fixture();
needsText.context.importCall = async () => ({ ok: false, code: "NEEDS_TEXT" });
await needsText.run('startRecipeImport("url")');
assert.equal(needsText.run("recipeImportState.showText"), true);
assert.equal(needsText.run("state.draftMeal.recipeUrl"), "https://example.com/recipe");
assert.equal(needsText.storage.get("middagsapp-state"), needsText.original);
const error = fixture({ existing: true, content: true });
error.context.importCall = async () => ({ ok: false, code: "NOT_A_RECIPE", message: "Fant ingen oppskrift" });
await error.run('startRecipeImport("text")');
assert.equal(error.run("state.draftIngredients[0].name"), "Egen vare");
assert.equal(error.run("recipeImportState.message"), "Fant ingen oppskrift");
const offline = fixture(); offline.run("accessState.offline = true"); await offline.run('startRecipeImport("url")'); assert.equal(offline.calls.length, 0);
for (const [mode, selector, value, message] of [["url", "[data-import-url]", "   ", "Lim inn en lenke først."],
  ["text", "[data-import-text]", "  kort tekst  ", "Lim inn oppskriftsteksten først."],
  ["text", "[data-import-text]", "  " + "x".repeat(19) + "  ", "Lim inn oppskriftsteksten først."]]) {
  const empty = fixture(); empty.selectors.get(selector)[0].value = value;
  await empty.run(`startRecipeImport("${mode}")`);
  assert.equal(empty.calls.length, 0); assert.equal(empty.run("recipeImportState.busy"), false);
  assert.equal(empty.run("recipeImportState.message"), message);
  assert.equal(empty.storage.get("middagsapp-state"), empty.original);
}
for (const status of [{ configured: false, status: "unavailable" }, { configured: true, status: "invalid" }]) {
  const unavailable = fixture(); unavailable.context.keyStatus = status; unavailable.run("aiKeyUi.status = keyStatus");
  await unavailable.run('startRecipeImport("url")'); assert.equal(unavailable.calls.length, 0);
  assert.equal(unavailable.storage.get("middagsapp-state"), unavailable.original);
}
const waiting = fixture(); let finish;
waiting.context.importCall = () => new Promise(resolve => { finish = resolve; });
const pending = waiting.run('startRecipeImport("url")');
waiting.values.title = "Skrevet mens vi venter";
finish({ ok: false, code: "FETCH_FAILED", message: "Kunne ikke hente" }); await pending;
assert.equal(waiting.run("state.draftMeal.title"), "Skrevet mens vi venter");
const cancelled = fixture();
cancelled.context.importCall = () => new Promise(resolve => { finish = resolve; });
const late = cancelled.run('startRecipeImport("url")');
cancelled.run('state.editingMealId = null; state.draftMeal = null; state.draftIngredients = null; state.draftSteps = null; resetRecipeImport();');
finish({ ok: true, recipe }); await late;
assert.equal(cancelled.run("state.draftMeal"), null);
assert.equal(cancelled.storage.get("middagsapp-state"), cancelled.original);
const onlySteps = fixture({ existing: true, ingredients: true });
onlySteps.context.importCall = async () => ({ ok: true, recipe: { ...recipe, title: "", ingredients: [], servingsKnown: false }, warnings: ["Ingen ingredienser funnet."] });
await onlySteps.run('startRecipeImport("text")');
assert.equal(onlySteps.prompts.length, 0);
assert.equal(onlySteps.run("state.draftIngredients[0].name"), "Egen vare");
assert.equal(onlySteps.run("state.draftSteps[0]"), "Stek fisken");
assert.match(onlySteps.run("recipeImportState.message"), /0 ingredienser og 1 steg/);
assert.equal(onlySteps.run("recipeImportState.warnings[0]"), "Ingen ingredienser funnet.");
assert.equal(onlySteps.run("recipeImportState.warnings[1]"), "Lim inn teksten for det som mangler, og trykk Tolk tekst.");
assert.equal(onlySteps.storage.get("middagsapp-state"), onlySteps.original);
for (const [part, prompt] of [["ingredients", "Erstatte ingrediensene med de importerte?"], ["steps", "Erstatte fremgangsmåten med den importerte?"]]) {
  for (const existing of [false, true]) for (const replace of [false, true]) {
    const f = fixture({ existing, content: true, replace });
    f.context.importCall = async () => ({ ok: true, recipe: { ...recipe, ingredients: part === "ingredients" ? recipe.ingredients : [], steps: part === "steps" ? recipe.steps : [], baseServings: 7, servingsKnown: true } });
    await f.run('startRecipeImport("text")');
    assert.deepEqual(f.prompts, [prompt]);
    assert.equal(f.run("state.draftIngredients[0].name"), part === "ingredients" && replace ? "Fisk" : "Egen vare");
    assert.equal(f.run("state.draftSteps[0]"), part === "steps" && replace ? "Stek fisken" : "Eget steg");
    assert.equal(f.run("state.draftMeal.baseServings"), part === "ingredients" && replace ? 7 : 2);
    if (part === "ingredients" && replace) assert.match(f.run("renderMealEditor()"), /name="baseServings"[^>]*value="7"/);
    assert.match(f.run("recipeImportState.message"), replace ? (part === "ingredients" ? /1 ingredienser og 0 steg/ : /0 ingredienser og 1 steg/) : /0 ingredienser og 0 steg/);
    assert.equal(f.storage.get("middagsapp-state"), f.original);
  }
}
const fillDespiteNo = fixture({ existing: true, ingredients: true, replace: false });
await fillDespiteNo.run('startRecipeImport("url")');
assert.deepEqual(fillDespiteNo.prompts, ["Erstatte ingrediensene med de importerte?"]);
assert.equal(fillDespiteNo.run("state.draftIngredients[0].name"), "Egen vare");
assert.equal(fillDespiteNo.run("state.draftSteps[0]"), "Stek fisken");
assert.match(fillDespiteNo.run("recipeImportState.message"), /0 ingredienser og 1 steg/);

// K6: follow actual editor output into FormData and today's save path.
for (const entry of ["editor", "link", "replace"]) {
  const f = fixture({ existing: true, content: entry === "replace", baseServings: 5 });
  f.context.importCall = async input => { f.calls.push(input); return { ok: true, recipe: { ...recipe, baseServings: 4, servingsKnown: true } }; };
  if (entry === "link") {
    f.run('state.meals[0].recipeUrl = "https://example.com/recipe"; state.selectedMealId = "own"; state.activeView = "recipe"; state.editingMealId = null; loadAiKeyStatus = async () => {};');
    let click;
    f.selectors.set("[data-import-from-link]", [{ dataset: { importFromLink: "own" }, addEventListener: (_event, callback) => { click = callback; } }]);
    f.run("bindRecipeImportEvents()"); await click();
  } else await f.run('startRecipeImport("url")');
  assert.equal(f.calls.length, 1); assert.equal(f.run("state.draftMeal.baseServings"), 4);
  assert.match(f.materializeEditor(), /id="mealBaseServings"[^>]*value="4"/);
  f.context.form = f.form; f.run("saveMealFromForm(form)");
  assert.equal(f.run("state.meals[0].baseServings"), 4);
  assert.equal(f.run("state.meals[0].ingredients[0].name"), "Fisk");
}

const groupDraft = fixture({ existing: true });
groupDraft.run('state.draftIngredients = [{type:"heading",title:"Saus"},{name:"hvitløk, finhakket",amount:"2",unit:"stk"},{type:"heading",title:"Tilbehør"},{name:"ris",amount:"3",unit:"dl"}];');
groupDraft.materializeEditor(); groupDraft.run("syncMealEditorDraftFromDom()");
assert.equal(groupDraft.run("collectIngredientRows()[0].group"), "Saus");
groupDraft.run('changeIngredientEditorRows("heading")');
assert.equal(groupDraft.run("state.draftIngredients.at(-1).type"), "heading");
groupDraft.materializeEditor(); groupDraft.run('changeIngredientEditorRows("move", 2, 1)');
assert.equal(groupDraft.run("editorRowsToIngredients(state.draftIngredients)[1].group"), "Saus");
groupDraft.materializeEditor(); groupDraft.run('changeIngredientEditorRows("remove", 3)');
assert.equal(groupDraft.run("editorRowsToIngredients(state.draftIngredients)[1].group"), "Saus");
groupDraft.materializeEditor();
const savedDraft = JSON.stringify(groupDraft.run("state.draftIngredients"));
groupDraft.context.importCall = async () => ({ ok: true, recipe: { ...recipe, ingredients: [], servingsKnown: false } });
await groupDraft.run('startRecipeImport("text")');
assert.equal(JSON.stringify(groupDraft.run("state.draftIngredients")), savedDraft);
assert.equal(groupDraft.run("collectIngredientRows().some(item => item.group === '')"), false);
groupDraft.context.form = groupDraft.form; groupDraft.run("saveMealFromForm(form)");
assert.equal(groupDraft.run("state.meals[0].ingredients[0].group"), "Saus");
assert.equal(groupDraft.run("state.meals[0].keyIngredients[0]"), "hvitløk");
const importedGroupDraft = fixture({ existing: true });
importedGroupDraft.context.importCall = async () => ({ ok: true, recipe: { ...recipe, servingsKnown: true,
  ingredients: [{ name: "Fisk", amount: "500", unit: "g", group: "Saus" }, { name: "Ris", amount: "2", unit: "dl", group: "Tilbehør" }] } });
await importedGroupDraft.run('startRecipeImport("url")');
assert.equal(importedGroupDraft.run("state.draftIngredients[0].type"), "heading");
assert.equal(importedGroupDraft.run("state.draftIngredients[0].title"), "Saus");
assert.match(importedGroupDraft.materializeEditor(), /value="Tilbehør"/);
importedGroupDraft.context.form = importedGroupDraft.form; importedGroupDraft.run("saveMealFromForm(form)");
assert.equal(importedGroupDraft.run("state.meals[0].ingredients[1].group"), "Tilbehør");
console.log("app recipe import tests ok (drafts only, no network)");
