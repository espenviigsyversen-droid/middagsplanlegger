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
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture({ write = () => Promise.resolve() } = {}) {
  const calls = [], listeners = [], storage = new Map(), timers = new Map(), selectors = new Map();
  let now = 0, timerId = 0;
  const app = { innerHTML: "", querySelector: key => selectors.get(key)?.[0] || null, querySelectorAll: key => selectors.get(key) || [] };
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console,
    navigator: { onLine: true }, window: { addEventListener() {}, confirm: () => true },
    document: { querySelector: selector => selector === "#app" ? app : null, addEventListener() {},
      body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimeout: id => timers.delete(id), FormData: class { constructor(form) { return form.values; } },
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context), snapshot = code => JSON.parse(JSON.stringify(run(code)));
  run('const renderWithDom = render; render = () => {}; loadAiKeyStatus = async () => {}; accessState = {kind:"ready",user:{uid:"user",email:"member@example.com"},role:"member",offline:false}; syncAiKeyContext(); syncEnabled=true; syncStatus="Synket"; state.activeView="planner"; state.family.familySize=4; state.clientUpdatedAt=1234; state.pendingLocalSync=false; state.weekOffset=0; state.meals=normalizeMeals(Array.from({length:12},(_,i)=>({...emptyMeal(),id:`meal-${i}`,title:`Middag ${i}`,ingredients:[{name:"Ris",amount:"2",unit:"dl"}],steps:["Kok"]}))); Object.assign(state,Object.fromEntries(WEEK_SYNC_FIELDS.map(field=>[field,{}])));');
  const refs = { meals: "meals", weeks: "weeks", profile: "profile", preferences: "preferences", metadata: "metadata" };
  const api = {
    doc: (collection, id) => `${collection}/${id}`, serverTimestamp: () => "server",
    getDoc: () => { calls.push(["get"]); throw new Error("Recipe/week operations must not read before writing"); },
    setDoc: (...args) => { calls.push(["set", ...args]); return write(...args); },
    deleteDoc: (...args) => { calls.push(["delete", ...args]); return Promise.resolve(); },
    onSnapshot: (ref, options, next, error) => { const listener = { ref, next, error, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; }; },
  };
  context.connection = { api, refs }; context.recipeRefs = refs;
  Object.assign(context.window, { middagsplanDoc: api.doc, middagsplanGetDoc: api.getDoc, middagsplanSetDoc: api.setDoc, middagsplanDeleteDoc: api.deleteDoc, middagsplanServerTimestamp: api.serverTimestamp });
  run("Object.assign(remoteRefs, recipeRefs)");
  const server = (data = {}, metadata = {}) => listeners.findLast(listener => listener.ref === "weeks" && !listener.stopped).next({
    docs: Object.entries(data).map(([id, data]) => ({ id, data: () => ({ ...data, clientUpdatedAt: 9999, updatedAt: "server" }) })),
    metadata: { fromCache: false, hasPendingWrites: false, ...metadata },
  });
  function tick(ms = 500) {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].callback();
    }
    now = end;
  }
  return { run, snapshot, calls, listeners, timers, context, app, selectors, storage, server, tick, key: run("getWeekKey()"),
    start: async () => {
      await run("Promise.all([weeksSync.start(connection),mealsSync.start(connection)])");
      listeners.findLast(listener => listener.ref === "meals").next({ docs: snapshot("state.meals").map(meal => ({ id: meal.id, data: () => meal })), metadata: { fromCache: false } });
    }, stop: () => run("stopAllSync()") };
}
const selected = fixture(); await selected.start(); selected.server(); selected.run('updatePlanDay(1,"meal-1")');
assert.equal(selected.calls.length, 0); selected.tick();
assert.deepEqual(selected.calls, [["set", `weeks/${selected.key}`, { plan: { 1: "meal-1" }, updatedAt: "server" }, { merge: true }]]);
assert.equal(selected.run("state.clientUpdatedAt"), 1234); assert.equal(selected.run("state.pendingLocalSync"), false);
assert.equal(selected.run("pendingRemoteScopes.size"), 0); assert.equal(selected.run("Object.keys(remoteSaveTimers).length"), 0);
await settle(); selected.server({ [selected.key]: { plan: { 1: "meal-1" } } }); assert.equal(selected.run("syncStatusText()"), "Synket"); selected.stop();

for (const [action, field, value] of [
  ['togglePlanLock(1)', "lockedPlan", true], ['updateDayType(1,"weekend")', "dayTypes", "weekend"],
  ['updateDayServings(1,3)', "servings", 3], ['updateDayMode(1,"away")', "dayModes", "away"], ['updateDayNote(1," Notat ")', "dayNotes", "Notat"],
]) {
  const f = fixture(); await f.start(); f.server(); f.run(action); f.tick();
  assert.deepEqual(f.calls, [["set", `weeks/${f.key}`, { [field]: { 1: value }, updatedAt: "server" }, { merge: true }]]);
  assert.equal(f.run("state.pendingLocalSync"), false); assert.equal(f.run("state.clientUpdatedAt"), 1234); f.stop();
}
const merged = fixture(); await merged.start(); merged.server(); merged.run('updatePlanDay(1,"meal-1")'); merged.tick(250);
merged.run('updatePlanDay(1,"meal-2"); updateDayNote(1,"Siste")'); merged.tick(250);
assert.equal(merged.calls.length, 1); assert.deepEqual(merged.calls[0][2], { plan: { 1: "meal-2" }, dayNotes: { 1: "Siste" }, updatedAt: "server" }); merged.stop();
const filled = fixture(); await filled.start(); filled.server(); filled.run("fillWeek()"); filled.tick();
assert.equal(filled.calls.length, 1); assert.equal(Object.keys(filled.calls[0][2].plan).length, 7); filled.stop();

// Replace-week must diff against the old saved plan, not an intermediate direct mutation.
const replaced = fixture(); await replaced.start(); replaced.server({ [replaced.key]: { plan: { 0: "meal-0", 1: "meal-1" }, lockedPlan: { 0: true } } });
replaced.run('pickSuggestion = (dayIndex) => `replacement-${dayIndex}`; replaceOpenWeek()'); replaced.tick();
assert.equal(replaced.calls.length, 1); assert.equal(replaced.calls[0][2].plan[0], undefined);
assert.equal(replaced.calls[0][2].plan[1], "replacement-1"); assert.equal(replaced.run("state.clientUpdatedAt"), 1234); replaced.stop();

const deleted = fixture(); await deleted.start();
const keys = [deleted.key, "2026-12-07", "2026-12-14"];
deleted.server(Object.fromEntries(keys.map(key => [key, { plan: { 1: "meal-1", 4: "meal-2" } }])));
deleted.run('state.editingMealId="meal-1"; deleteCurrentMeal()'); deleted.tick();
assert.equal(deleted.calls.filter(call => call[0] === "delete").length, 1);
const weekWrites = deleted.calls.filter(call => call[0] === "set"); assert.equal(weekWrites.length, 3);
assert.deepEqual(weekWrites.map(call => call[1]).sort(), keys.map(key => `weeks/${key}`).sort());
weekWrites.forEach(call => assert.deepEqual(call.slice(2), [{ plan: { 1: "" }, updatedAt: "server" }, { merge: true }]));
assert.equal(deleted.run("state.pendingLocalSync"), false); assert.equal(deleted.run("state.clientUpdatedAt"), 1234); deleted.stop();
const quick = fixture(); await quick.start(); quick.server(); quick.run('state.mealPicker={open:true,dayIndex:2,query:"Hurtigmiddag"}; addQuickMealForPicker()'); quick.tick();
assert.equal(quick.calls.filter(call => call[0] === "set" && call[1].startsWith("meals/")).length, 1);
assert.equal(quick.calls.filter(call => call[0] === "set" && call[1].startsWith("weeks/")).length, 1);
assert.equal(quick.run("state.pendingLocalSync"), false); quick.stop();

const ack = deferred(), concurrent = fixture({ write: () => ack.promise }); await concurrent.start(); concurrent.server();
concurrent.run('state.activeView="meals"; state.editingMealId="meal-1"; state.draftMeal={title:"Ulagret"}; state.draftIngredients=[{type:"heading",title:"Saus"}]; state.draftSteps=["Ulagret steg"]; resetRecipeImport(); recipeImportState.pending={recipe:{ingredients:[{name:"Ventende"}],steps:["Ventende"]},conflictIngredients:true,conflictSteps:true,valid:()=>true}; const choice=recipeImportState.pending; const draft=state.draftMeal; const offset=state.weekOffset; updatePlanDay(1,"meal-1"); render=renderWithDom; aiKeyUi.status={configured:true,status:"connected"}');
concurrent.tick(); concurrent.server({ [concurrent.key]: { plan: { 4: "meal-4" } } }, { hasPendingWrites: true });
assert.equal(concurrent.run("currentPlan()[1]"), "meal-1"); assert.equal(concurrent.run("currentPlan()[4]"), "meal-4");
ack.resolve(); await settle(); concurrent.server({ [concurrent.key]: { plan: { 1: "meal-1", 4: "meal-4" } } });
assert.equal(concurrent.run("currentPlan()[1]"), "meal-1"); assert.equal(concurrent.run("currentPlan()[4]"), "meal-4");
assert.equal(concurrent.run("state.draftMeal===draft"), true); assert.equal(concurrent.run("recipeImportState.pending===choice"), true);
assert.equal(concurrent.run("state.weekOffset===offset"), true); assert.match(concurrent.app.innerHTML, /data-import-replace/); assert.match(concurrent.app.innerHTML, /Ulagret/);
assert.equal(concurrent.run("syncStatusText()"), "Synket"); concurrent.stop();

const missing = fixture(); await missing.start(); missing.run('state.pendingLocalSync=true; state.plansByWeek[getWeekKey()]={1:"meal-1"}');
missing.server({}, { fromCache: true }); assert.equal(missing.run("currentPlan()[1]"), "meal-1"); missing.server();
assert.equal(missing.run("currentPlan()[1]"), ""); assert.equal(missing.run("currentServings()[1]"), 4);
assert.equal(missing.run("Object.keys(state.plansByWeek).length"), 0);
assert.equal(missing.calls.length, 0); assert.equal(missing.run("state.pendingLocalSync"), true); assert.equal(missing.run("state.clientUpdatedAt"), 1234); missing.stop();

const cleared = fixture(); await cleared.start(); cleared.server({ [cleared.key]: { plan: { 1: "meal-1" }, lockedPlan: { 1: true }, servings: { 1: 2 } } });
const button = { handlers: {}, addEventListener(name, callback) { this.handlers[name] = callback; } };
cleared.selectors.set("[data-clear-week]", [button]); cleared.run("bindEvents()"); button.handlers.click(); cleared.tick();
assert.deepEqual(cleared.calls[0]?.[2], { plan: { 1: "" }, lockedPlan: { 1: false }, servings: { 1: 4 }, updatedAt: "server" }); cleared.stop();

const exported = fixture(); await exported.start(); exported.server();
exported.run('updatePlanDay(1,"meal-1"); togglePlanLock(1); updateDayType(1,"weekend"); updateDayServings(1,3); updateDayMode(4,"away"); updateDayNote(1,"Notat")');
const payload = exported.snapshot("syncPayload()");
const backup = bindings.buildBackup({ data: payload, appVersion: "v101", familyId: "familien", now: new Date() });
const validated = bindings.validateBackup(JSON.parse(JSON.stringify(backup)));
for (const field of bindings.WEEK_SYNC_FIELDS) assert.deepEqual(validated.data[field], payload[field]);
assert.equal(backup.exportVersion, 1); exported.stop();

const failed = fixture({ write: () => Promise.reject(new Error("write failed")) }); await failed.start(); failed.server(); failed.run('updatePlanDay(1,"meal-1")'); failed.tick(); await settle();
assert.equal(failed.run("syncStatusText()"), "Synk feilet"); failed.stop();
const stopped = fixture(); await stopped.start(); stopped.server(); stopped.run('updatePlanDay(1,"meal-1")'); stopped.stop(); await stopped.start(); stopped.tick(); stopped.server();
assert.equal(stopped.calls.length, 0); stopped.stop(); stopped.run('accessState.offline=true; updatePlanDay(1,"meal-1")'); stopped.tick();
assert.equal(stopped.calls.length, 0); assert.equal(stopped.run("state.pendingLocalSync"), false);
console.log("app weeks sync tests ok (real plan actions, three-week deletion, concurrent updates, drafts and offline)");
