import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g, bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/); bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const selectors = new Map(), storage = new Map(), documentEvents = {}, focus = [], scroll = [];
const values = { title: "Ulagret tittel", description: "Ulagret beskrivelse", recipeUrl: "", baseServings: "5", minDaysBetween: "14" };
const form = { addEventListener() {}, values: { get: key => values[key] || "", getAll: () => [], has: () => false } };
selectors.set("[data-meal-form]", [form]);
const app = { innerHTML: "", querySelectorAll: s => selectors.get(s) || [], querySelector: s => selectors.get(s)?.[0] || null };
const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console,
  navigator: { onLine: false }, window: { addEventListener() {} },
  document: { querySelector: s => s === "#app" ? app : null, addEventListener: (type, fn) => { documentEvents[type] = fn; },
    body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  setTimeout() {}, clearTimeout() {}, FormData: class { constructor(f) { return f.values; } },
});
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run('const originalRender = render; render = () => renderStub(); accessState = {kind:"ready", offline:true}; state.activeView="meals"; state.editingMealId="new"; loadAiKeyStatus=async()=>{};');
let ingredientRows = [], steps = [];
const button = (label, dataset = {}) => ({ dataset, addEventListener(type, fn) { this[type] = fn; },
  focus() { focus.push(label); }, scrollIntoView() { scroll.push(label); } });
function materialize() {
  ingredientRows = json("getDraftIngredients(emptyMeal())"); steps = json("getDraftSteps(emptyMeal())");
  const draft = json("getDraftMeal(emptyMeal())");
  for (const field of Object.keys(values)) values[field] = String(draft[field] ?? "");
  selectors.set("[data-ingredient-row]", ingredientRows.map((row, index) => {
    selectors.set(`[data-ingredient-row="${index}"] [data-ingredient-field="amount"]`, [button(`amount-${index}`)]);
    selectors.set(`[data-editor-row-menu="ingredient"][data-row-index="${index}"]`, [button(`ingredient-${index}`)]);
    return { dataset: row.type === "heading" ? { ingredientHeading: "true" } : {},
      querySelector: s => ({ value: row.type === "heading" ? row.title : row[/"(\w+)"/.exec(s)[1]] || "" }) };
  }));
  selectors.set("[data-step-row]", steps.map((_, index) => {
    selectors.set(`[data-editor-row-menu="step"][data-row-index="${index}"]`, [button(`step-${index}`)]);
    return { querySelector: () => ({ value: steps[index] }) };
  }));
  app.innerHTML = run("renderMealEditor()");
}
context.renderStub = materialize;
const rows = [{type:"heading",title:"Mat"}, ...["fiskepinner","kapteinens fylte","ris"].map(name=>({name,amount:"1",unit:"stk"})),
  {type:"heading",title:"Chilimajones"}, ...["majones","gulrot","soyasaus"].map(name=>({name,amount:"1",unit:"stk"}))];
context.rows = rows;
run('state.draftIngredients=structuredClone(rows); state.draftSteps=["Stek", "Server"]; state.draftMeal={...emptyMeal(),title:"Test"};'); materialize();
values.title = "Ulagret tittel"; values.description = "Ulagret beskrivelse";
ingredientRows[6].amount = "2 1/2"; steps[1] = "Ulagret fremgangsmåte";
run('openEditorRowMenu("ingredient",6)');
assert.match(app.innerHTML, /Flytt til/);
assert.equal(run("state.draftMeal.title"), "Ulagret tittel");
assert.equal(run("state.draftIngredients[6].amount"), "2 1/2");
run('chooseEditorRowAction("group",0)');
assert.equal(run("editorRowMenu"), null);
assert.equal(run("state.draftIngredients[4].name"), "gulrot");
assert.equal(focus.at(-1), "ingredient-4"); assert.equal(scroll.at(-1), "ingredient-4");
assert.equal(run("state.draftSteps[1]"), "Ulagret fremgangsmåte");
run('openEditorRowMenu("ingredient",7); chooseEditorRowAction("group",0)');
assert.deepEqual(json('editorRowsToIngredients(state.draftIngredients).filter(r=>r.group==="Mat").map(r=>r.name)'),
  ["fiskepinner","kapteinens fylte","ris","gulrot","soyasaus"]);
ingredientRows[2].name = "Ulagret kaptein"; steps[0] = "Ulagret steg";
run('changeIngredientEditorRows("add-group",0)');
assert.equal(focus.at(-1), "amount-6"); assert.equal(run("state.draftIngredients[7].title"), "Chilimajones");
assert.equal(run("state.draftIngredients[2].name"), "Ulagret kaptein");
assert.equal(run("state.draftSteps[0]"), "Ulagret steg");
run('openEditorRowMenu("step",1); chooseEditorRowAction("up")');
assert.deepEqual(json("state.draftSteps"), ["Ulagret fremgangsmåte", "Ulagret steg"]);
assert.equal(focus.at(-1), "step-0");
assert.ok(app.innerHTML.includes('step-editor-number">1</div>'));
values.description = "Endret mens menyen er åpen";
run('openEditorRowMenu("step",0)');
documentEvents.keydown({ key: "Escape", preventDefault() {} });
assert.equal(run("editorRowMenu"), null);
assert.equal(run("state.draftMeal.description"), "Endret mens menyen er åpen");
run('openEditorRowMenu("step",0); chooseEditorRowAction("remove")');
assert.deepEqual(json("state.draftSteps"), ["Ulagret steg"]);
run('openEditorRowMenu("step",0); chooseEditorRowAction("remove")');
assert.deepEqual(json("state.draftSteps"), [""]);

// Bottom add controls and heading removal also preserve every unsaved section.
const addIngredient = button("add ingredient"), addStep = button("add step");
selectors.set("[data-add-ingredient]", [addIngredient]); selectors.set("[data-add-step]", [addStep]);
run("bindEvents()");
values.title = "Ulagret tittel"; ingredientRows[3].amount = "9"; steps[0] = "Siste steg";
addIngredient.click();
assert.equal(run("state.draftIngredients.at(-1).name"), "");
assert.equal(run("state.draftIngredients[3].amount"), "9");
assert.equal(run("state.draftSteps[0]"), "Siste steg");
steps[0] = "Endret igjen"; ingredientRows[3].unit = "dl";
addStep.click();
assert.deepEqual(json("state.draftSteps"), ["Endret igjen", ""]);
assert.equal(run("state.draftIngredients[3].unit"), "dl");
run('changeIngredientEditorRows("remove",7)');
assert.equal(run("state.draftIngredients[7].name"), "majones");
assert.equal(run('editorRowsToIngredients(state.draftIngredients).find(r=>r.name==="majones").group'), "Mat");

// Exercise actual bindings: only backdrop clicks close, and opening replaces the previous menu.
const backdrop = button("backdrop"), open = button("open", {editorRowMenu:"ingredient",rowIndex:"1"});
selectors.set("[data-editor-menu-close]", [backdrop]); selectors.set("[data-editor-row-menu]", [open]);
run("bindEvents()"); open.click();
assert.equal(run("editorRowMenu.kind"), "ingredient");
run('openEditorRowMenu("step",0)'); assert.equal(run("editorRowMenu.kind"), "step");
backdrop.click({target:{},currentTarget:backdrop}); assert.notEqual(run("editorRowMenu"),null);
backdrop.click({target:backdrop,currentTarget:backdrop}); assert.equal(run("editorRowMenu"),null);

// Only saving persists the new group membership. UI menus never enter the payload or local copy.
run('saveState()');
assert.doesNotMatch(storage.get("middagsapp-state"), /editorRowMenu|Ulagret|Chilimajones/);
assert.doesNotMatch(run("JSON.stringify(syncPayload())"), /editorRowMenu|Ulagret/);
context.form = form; run("saveMealFromForm(form)");
assert.equal(run("state.meals[0].title"), "Ulagret tittel");
assert.equal(run('state.meals[0].ingredients.find(r=>r.name==="gulrot").group'), "Mat");
assert.equal(run('state.meals[0].ingredients.find(r=>r.name==="soyasaus").group'), "Mat");
assert.deepEqual(json("state.meals[0].steps"), ["Endret igjen"]);
run('state.editingMealId="new"; state.draftIngredients=[{name:"En",amount:"",unit:""}]; state.draftSteps=[""];'); materialize();
run('openEditorRowMenu("ingredient",0); chooseEditorRowAction("remove")');
assert.deepEqual(json("state.draftIngredients"), [{name:"",amount:"",unit:""}]);
// render owns lifecycle cleanup even when another view/editor or access replaces the editor.
for (const change of ['state.editingMealId=null', 'state.editingMealId="another"', 'state.activeView="shopping"', 'accessState={kind:"login"}']) {
  run('state.editingMealId="new"; state.activeView="meals"; accessState={kind:"ready",offline:true};'); materialize();
  run('openEditorRowMenu("ingredient",0)'); run(change);
  // Call original render with a minimal no-op binding to test its cleanup condition.
  run('bindEvents=()=>{}; originalRender()');
  assert.equal(run("editorRowMenu"), null);
}
console.log("editor row app tests ok");
