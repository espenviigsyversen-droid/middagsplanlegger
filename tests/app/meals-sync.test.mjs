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
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function fixture({ write = () => Promise.resolve() } = {}) {
  const calls = [], listeners = [], selectors = new Map(), storage = new Map();
  const app = { innerHTML: "", querySelector: key => selectors.get(key)?.[0] || null, querySelectorAll: key => selectors.get(key) || [] };
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console,
    navigator: { onLine: true }, window: { addEventListener() {}, confirm: () => true },
    document: { querySelector: selector => selector === "#app" ? app : null, addEventListener() {},
      body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout() {}, clearTimeout() {}, FormData: class { constructor(form) { return form.values; } },
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context), snapshot = code => JSON.parse(JSON.stringify(run(code)));
  run('const renderWithDom = render; render = () => {}; loadAiKeyStatus = async () => {}; accessState = {kind:"ready",user:{uid:"user",email:"member@example.com"},role:"member",offline:false}; syncAiKeyContext(); syncEnabled = true; syncStatus = "Synket"; state.activeView = "meals"; state.clientUpdatedAt = 1234; state.pendingLocalSync = false; state.meals = normalizeMeals(Array.from({length:50},(_,i)=>({...emptyMeal(),id:`meal-${String(i).padStart(2,"0")}`,title:`Middag ${i}`,ingredients:[{name:"Ris",amount:"2",unit:"dl",group:"Tilbehør"}],steps:["Kok"]})));');
  const refs = { meals: "meals", weeks: "weeks", profile: "profile", preferences: "preferences", metadata: "metadata" };
  const api = {
    doc: (collection, id) => `${collection}/${id}`, serverTimestamp: () => "server",
    getDoc: async ref => { calls.push(["get", ref]); return { exists: () => true, data: () => ({ clientUpdatedAt: 0 }) }; },
    setDoc: (...args) => { calls.push(["set", ...args]); return write(...args); },
    deleteDoc: (...args) => { calls.push(["delete", ...args]); return write(...args); },
    onSnapshot: (ref, options, next, error) => { const listener = { next, error, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; }; },
  };
  context.connection = { api, refs }; context.recipeRefs = refs;
  Object.assign(context.window, { middagsplanDoc: api.doc, middagsplanGetDoc: api.getDoc, middagsplanSetDoc: api.setDoc, middagsplanDeleteDoc: api.deleteDoc, middagsplanServerTimestamp: api.serverTimestamp });
  run("Object.assign(remoteRefs, recipeRefs)");
  const server = (meals, fromCache = false, index = listeners.length - 1, hasPendingWrites = false) => listeners[index].next({ docs: meals.map(meal => ({ id: meal.id, data: () => ({ ...meal, updatedAt: "server", clientUpdatedAt: 9999 }) })), metadata: { fromCache, hasPendingWrites } });
  const editForm = (id, change = {}) => {
    const meal = snapshot(`getMeal("${id}")`), fields = { ...meal, ...change };
    selectors.set("[data-ingredient-row]", meal.ingredients.map(ingredient => ({ querySelector: selector => ({ value: ingredient[/"(\w+)"/.exec(selector)[1]] || "" }) })));
    // Keep the group through the real heading/ingredient collection path.
    if (meal.ingredients[0]?.group) selectors.get("[data-ingredient-row]").unshift({ dataset: { ingredientHeading: "true" }, querySelector: () => ({ value: meal.ingredients[0].group }) });
    selectors.set("[data-step-row]", meal.steps.map(step => ({ querySelector: () => ({ value: step }) })));
    context.form = { values: { get: key => fields[key] ?? "", getAll: key => fields[key] || [], has: key => fields[key] === true } };
    run(`state.editingMealId = "${id}"; saveMealFromForm(form)`);
  };
  return { run, snapshot, calls, listeners, context, app, selectors, storage, server, editForm,
    start: () => run("mealsSync.start(connection)") };
}

const saved = fixture(); await saved.start(); saved.server(saved.snapshot("state.meals")); saved.calls.length = 0;
saved.editForm("meal-24", { title: "Én endret oppskrift" });
assert.equal(saved.calls.length, 1); assert.equal(saved.calls[0][0], "set"); assert.equal(saved.calls[0][1], "meals/meal-24");
assert.equal(saved.calls[0].length, 3, "Whole document write without merge");
assert.equal(saved.calls[0][2].clientUpdatedAt, undefined); assert.equal(saved.calls[0][2].ingredients[0].group, "Tilbehør");
assert.equal(saved.run("state.clientUpdatedAt"), 1234); assert.equal(saved.run("state.pendingLocalSync"), false);
assert.equal(saved.run("pendingRemoteScopes.size"), 0); assert.equal(saved.run("Object.keys(remoteSaveTimers).length"), 0);
assert.equal(saved.run("syncStatusText()"), "Synker");
saved.server(saved.snapshot("state.meals")); await settle(); assert.equal(saved.run("syncStatusText()"), "Synket");
saved.calls.length = 0; saved.editForm("meal-24", { favorite: true });
assert.equal(saved.calls.length, 1); assert.equal(saved.calls[0][2].favorite, true); assert.equal(saved.calls[0][1], "meals/meal-24");
assert.equal(saved.run("state.pendingLocalSync"), false); assert.equal(saved.run("state.clientUpdatedAt"), 1234);

const quick = fixture(); await quick.start(); quick.server(quick.snapshot("state.meals")); quick.calls.length = 0;
quick.run('state.mealPicker = {open:true,dayIndex:2,query:"Helt ny hurtigmiddag"}; addQuickMealForPicker()');
assert.equal(quick.calls.length, 1); assert.equal(quick.calls[0][0], "set"); assert.match(quick.calls[0][1], /^meals\//);
assert.equal(quick.run("pendingRemoteScopes.has('meals')"), false);
assert.equal(quick.run("pendingRemoteScopes.has('weeks')"), true, "Picker also deliberately updates the plan");

const deleted = fixture(); await deleted.start(); deleted.server(deleted.snapshot("state.meals")); deleted.calls.length = 0;
deleted.run('state.plansByWeek = {"2026-10-05":{1:"meal-24",2:"meal-25"}}; state.editingMealId="meal-24"; deleteCurrentMeal()');
assert.deepEqual(deleted.calls, [["delete", "meals/meal-24"]]);
assert.equal(deleted.run('state.plansByWeek["2026-10-05"][1]'), "");
await deleted.run('saveRemoteScopes(["weeks"])');
assert.equal(deleted.calls.filter(call => call[0] === "set").length, 1);
assert.equal(deleted.calls.at(-1)[1], "weeks/2026-10-05"); assert.equal(deleted.calls.at(-1)[2].plan[2], "meal-25");
assert.ok(deleted.calls.filter(call => call[0] === "get").every(call => call[1].startsWith("weeks/")));

// Remote B must not replace local A or editor/import state. Unchanged recipe objects stay intact.
let acknowledge;
const concurrent = fixture({ write: () => new Promise(resolve => { acknowledge = resolve; }) });
await concurrent.start(); const original = concurrent.snapshot("state.meals"); concurrent.server(original); concurrent.calls.length = 0;
concurrent.run('state.editingMealId="meal-24"; state.draftMeal={title:"Ulagret tittel"}; state.draftIngredients=[{type:"heading",title:"Saus"}]; state.draftSteps=["Ulagret steg"]; resetRecipeImport(); recipeImportState.pending={recipe:{ingredients:[{name:"Ventende import"}],steps:["Ventende steg"]},conflictIngredients:true,conflictSteps:true,valid:()=>true}; const pendingChoice=recipeImportState.pending; const draft=state.draftMeal; setState({meals:state.meals.map(meal=>meal.id==="meal-24"?{...meal,title:"Lokal A"}:meal)}); const untouched = getMeal("meal-00")');
const remote = original.map(meal => meal.id === "meal-25" ? { ...meal, title: "Fjern B" } : meal);
concurrent.run('render = renderWithDom; aiKeyUi.status = {configured:true,status:"connected"}');
concurrent.server(remote, false, concurrent.listeners.length - 1, true);
assert.equal(concurrent.run('getMeal("meal-24").title'), "Lokal A"); assert.equal(concurrent.run('getMeal("meal-25").title'), "Fjern B");
assert.equal(concurrent.run('getMeal("meal-00") === untouched'), true);
assert.equal(concurrent.run("state.draftMeal === draft"), true); assert.equal(concurrent.run("recipeImportState.pending === pendingChoice"), true);
assert.match(concurrent.app.innerHTML, /data-import-replace/); assert.match(concurrent.app.innerHTML, /Ulagret tittel/);
assert.equal(concurrent.run("state.editingMealId"), "meal-24"); assert.equal(concurrent.run("state.draftIngredients[0].title"), "Saus");
assert.equal(concurrent.run("state.clientUpdatedAt"), 1234); assert.equal(concurrent.run("state.pendingLocalSync"), false);
assert.equal(concurrent.calls.length, 1);
acknowledge(); await settle();
assert.equal(concurrent.run("syncStatusText()"), "Synker");
concurrent.server(remote.map(meal => meal.id === "meal-24" ? { ...meal, title: "Lokal A" } : meal));
assert.equal(concurrent.run("syncStatusText()"), "Synket");
assert.equal(concurrent.run('getMeal("meal-24").title'), "Lokal A"); assert.equal(concurrent.run('getMeal("meal-25").title'), "Fjern B");
assert.equal(concurrent.run("state.draftMeal === draft"), true); assert.equal(concurrent.run("recipeImportState.pending === pendingChoice"), true);

// A newer same-ID server version becomes visible even when the server image precedes acknowledgement.
let overwriteAck;
const overwritten = fixture({ write: () => new Promise(resolve => { overwriteAck = resolve; }) });
await overwritten.start(); const beforeOverwrite = overwritten.snapshot("state.meals"); overwritten.server(beforeOverwrite);
overwritten.editForm("meal-24", { title: "Min versjon" });
overwritten.server(beforeOverwrite.map(meal => meal.id === "meal-24" ? { ...meal, title: "Annen enhets versjon" } : meal));
assert.equal(overwritten.run('getMeal("meal-24").title'), "Min versjon"); assert.equal(overwritten.run("syncStatusText()"), "Synker");
overwriteAck(); await settle();
assert.equal(overwritten.run('getMeal("meal-24").title'), "Annen enhets versjon"); assert.equal(overwritten.run("syncStatusText()"), "Synket");

const empty = fixture(); empty.run('state.pendingLocalSync=true'); await empty.start(); empty.server([], true);
assert.equal(empty.run("state.meals.length"), 50); empty.server([]);
assert.equal(empty.run("state.meals.length"), 0); assert.equal(empty.calls.length, 0);
assert.equal(empty.run("state.clientUpdatedAt"), 1234); assert.equal(empty.run("state.pendingLocalSync"), true);

const failure = fixture({ write: () => Promise.reject(new Error("write failed")) }); await failure.start(); failure.server(failure.snapshot("state.meals"));
failure.editForm("meal-24", { favorite: true }); await settle(); assert.equal(failure.run("syncStatusText()"), "Synk feilet");
failure.run('syncStatus="Synket"; shoppingSyncStatus="Synket"'); assert.equal(failure.run("syncStatusText()"), "Synk feilet");

const stopped = fixture(); stopped.run('setState({meals:state.meals.map(meal=>meal.id==="meal-24"?{...meal,favorite:true}:meal)}); stopAllSync()');
assert.equal(stopped.calls.length, 0); await stopped.start(); stopped.server([]); assert.equal(stopped.calls.length, 0);
stopped.run('stopAllSync(); accessState.offline=true; setState({meals:[{...emptyMeal(),id:"offline",title:"Lokal"}]})');
assert.equal(stopped.calls.length, 0); assert.equal(stopped.run("state.pendingLocalSync"), false);
console.log("app meals sync tests ok (actual saves, flags, quick meals, deletion, pending edits and UI)");
