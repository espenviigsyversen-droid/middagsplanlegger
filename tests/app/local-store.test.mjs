import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Run the real app and sync modules with DOM/Firestore stubs, never the CDN.
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
const projectId = "middagsplanlegger-6db4e", user = { uid: "user", email: "member@example.com", emailVerified: true };
const message = "Nettleserens lagring er full. Appen virker, men kan ikke startes uten nett på denne enheten.";
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function fixture({ writesFail = true, readsFail = false, deletesFail = false, rawState } = {}) {
  const storage = new Map([["another-app", "UNCHANGED"]]), writes = [], storageWrites = [], removed = [], watchers = [], timers = new Map();
  if (rawState !== undefined) storage.set("middagsapp-state", rawState);
  const quota = () => Object.assign(new Error("Full"), { name: "QuotaExceededError" });
  let options, time = 0, timerId = 0, rendered = 0;
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, { dataset: { view: key }, handlers: {}, addEventListener(name, handler) { this.handlers[name] = handler; } });
    return nodes.get(key);
  };
  let html = "";
  const app = { get innerHTML() { return html; }, set innerHTML(value) { html = value; rendered++; },
    querySelector: selector => selector === "[data-google-login]" && html.includes("data-google-login") ? node("login") : null,
    querySelectorAll: selector => selector === "[data-view]" ? [...html.matchAll(/data-view="([^"]+)"/g)].map(match => node(match[1])) : [] };
  const refs = Object.fromEntries(["meta", "members", "profile", "preferences", "metadata", "shopping", "shoppingItems", "meals", "weeks"].map(k => [k, k]));
  const api = {
    doc: (ref, id) => `${ref}/${id}`, serverTimestamp: () => "server",
    getDocFromServer: async ref => ({ exists: () => true, data: () => ref === "meta" ? { initializedAt: 1, minAppVersion: 101 } : { role: "member" } }),
    getDoc: async () => ({ exists: () => true, data: () => ({ clientUpdatedAt: 0 }) }),
    getDocsFromServer: async () => ({ docs: [] }),
    setDoc: async (...args) => writes.push(["set", ...args]), updateDoc: async (...args) => writes.push(["update", ...args]), deleteDoc: async (...args) => writes.push(["delete", ...args]),
    onSnapshot: (ref, ...args) => { const next = args.find(arg => typeof arg === "function"); const watch = { ref, next, stopped: false }; watchers.push(watch); return () => { watch.stopped = true; }; },
  };
  const connection = { refs, firestoreApi: api, firebaseApp: {}, signIn: async () => ({ user }), signOut: async () => {} };
  const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console,
    navigator: { onLine: true }, CSS: { escape: String }, window: { addEventListener() {}, scrollTo() {}, scrollY: 0 },
    document: { querySelector: selector => selector === "#app" ? app : null, addEventListener() {},
      body: { classList: { contains: () => false, add() {}, remove() {} }, style: {} } },
    localStorage: { getItem(key) { if (readsFail) throw new Error("Read denied"); return storage.get(key); },
      setItem(key, value) { storageWrites.push(key); if (writesFail) throw quota(); storage.set(key, value); },
      removeItem(key) { if (deletesFail) throw new Error("Delete denied"); removed.push(key); storage.delete(key); } },
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: time + delay }); return id; }, clearTimeout: id => timers.delete(id),
    initFirebaseClient: async value => { options = value; return connection; },
    createAiKeyClient: () => ({ status: async () => ({ ok: true, configured: false, model: "gpt-5.6-luna" }) }),
  });
  vm.runInContext(source, context);
  const run = code => vm.runInContext(code, context);
  const json = code => JSON.parse(JSON.stringify(run(code)));
  const snapshot = (ref, data) => {
    const watch = watchers.findLast(w => w.ref === ref && !w.stopped);
    const metadata = { fromCache: false, hasPendingWrites: false };
    assert.ok(watch, ref);
    watch.next(["meals", "weeks", "shoppingItems"].includes(ref)
      ? { metadata, docs: Object.entries(data).map(([id, data]) => ({ id, data: () => data })) }
      : { metadata, exists: () => true, data: () => data });
  };
  return { run, json, app, nodes, storage, writes, storageWrites, removed, snapshot, watchers,
    rendered: () => rendered, writesFail: value => { writesFail = value; },
    auth: value => options.onAuthReady({ ...connection, user: value }),
    tick: (ms = 500) => {
      const end = time + ms;
      while (true) { const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break;
        time = next[1].at; timers.delete(next[0]); next[1].callback(); }
      time = end;
    } };
}

const stale = JSON.stringify({ projectId, meals: [{ id: "stale", title: "Stale" }] });
const f = fixture({ rawState: stale });
f.run("render()"); assert.match(f.app.innerHTML, /Kontrollerer innlogging/);
await f.run("initFirebaseSync()"); await f.auth(null);
assert.match(f.app.innerHTML, /Logg inn med Google/);
await f.nodes.get("login").handlers.click();
assert.equal(f.run("accessState.kind"), "ready", "A failed membership write cannot block access");
assert.ok(f.storageWrites.includes("middagsapp-membership")); assert.equal(f.run("localStoreFailed"), true);
assert.equal(f.watchers.filter(w => !w.stopped).length, 7);
const meal = { id: "a", title: "Middag fra skyen", ingredients: [{ name: "Ris", amount: "2", unit: "dl" }], steps: ["Kok"] };
const item = { id: "item", name: "Vare fra skyen", amount: "1", unit: "stk", category: "other", checked: false, custom: true, createdAt: 1 };
const key = f.run("getWeekKey()");
f.snapshot("profile", { family: { ...f.json("state.family"), name: "Familie fra skyen" }, clientUpdatedAt: 100 });
f.snapshot("metadata", { metadata: f.json("state.metadata"), clientUpdatedAt: 100 });
f.snapshot("preferences", { mealPreferences: f.json("state.mealPreferences"), clientUpdatedAt: 100 });
f.snapshot("meals", { a: meal }); f.snapshot("weeks", { [key]: { plan: { 1: "a" } } }); f.snapshot("shoppingItems", { item });
assert.match(f.app.innerHTML, /Vare fra skyen/); assert.match(f.app.innerHTML, /Familie fra skyen/); assert.equal(f.run("syncStatusText()"), "Synket");
assert.equal(f.run("state.meals[0].id"), "a"); assert.equal(f.storage.get("middagsapp-state"), stale);
assert.equal(f.storage.get("another-app"), "UNCHANGED");
f.nodes.get("planner").handlers.click(); assert.equal(f.run("state.activeView"), "planner"); assert.match(f.app.innerHTML, /Middag fra skyen/);
f.nodes.get("meals").handlers.click(); assert.equal(f.run("state.activeView"), "meals"); assert.match(f.app.innerHTML, /Middag fra skyen/);
f.run('setState({meals:state.meals.map(meal=>({...meal,title:"Endret middag"}))}); updatePlanDay(2,"a"); setState({shoppingList:{...state.shoppingList,items:state.shoppingList.items.map(item=>({...item,name:"Endret vare"}))}});');
f.tick(); await settle();
assert.deepEqual(f.writes.map(write => write.slice(0, 2)), [["set", "meals/a"], ["update", "shoppingItems/item"], ["set", `weeks/${key}`]]);
assert.equal(f.writes[0][2].title, "Endret middag"); assert.equal(f.writes[1][2].name, "Endret vare"); assert.equal(f.writes[2][2].plan[2], "a");
f.snapshot("meals", { a: { ...meal, title: "Ny middag fra skyen" } });
assert.match(f.app.innerHTML, /Ny middag fra skyen/); assert.equal(f.run("mealsSyncStatus"), "Synket");
f.nodes.get("planner").handlers.click(); f.snapshot("weeks", { [key]: { plan: { 3: "a" }, dayNotes: { 3: "Notat fra skyen" } } });
assert.equal(f.run("state.dayNotesByWeek[getWeekKey()][3]"), "Notat fra skyen"); assert.match(f.app.innerHTML, /Ny middag fra skyen/);
assert.equal(f.run("weeksSyncStatus"), "Synket");
f.nodes.get("shopping").handlers.click(); f.snapshot("shoppingItems", { item: { ...item, name: "Ny vare fra skyen" } });
assert.match(f.app.innerHTML, /Ny vare fra skyen/); assert.equal(f.run("syncStatusText()"), "Synket");
f.run('setState({activeView:"app-settings"})'); assert.ok(f.app.innerHTML.includes(message));
assert.equal(f.run("state.toast"), null); assert.equal(f.run("syncStatusText()"), "Synket");
const renders = f.rendered(); f.writesFail(false); f.run('setState({activeView:"app-settings"})');
assert.equal(f.run("localStoreFailed"), false); assert.equal(f.app.innerHTML.includes(message), false); assert.ok(f.rendered() > renders);
f.run('state.weekOffset=2; state.filters={query:"Ris",category:"all",flag:"all",sort:"title"}; state.draftMeal={title:"PRIVATE_DRAFT"}; state.draftIngredients=[{name:"PRIVATE_DRAFT"}]; state.draftSteps=["PRIVATE_DRAFT"]; state.mealPicker={open:true}; state.generateModal={open:true}; state.plannerDaySheet={open:true}; state.shoppingReview={groups:["PRIVATE_REVIEW"]}; state.toast="PRIVATE_TOAST"; saveState();');
const saved = JSON.parse(f.storage.get("middagsapp-state"));
assert.doesNotMatch(JSON.stringify(saved), /PRIVATE_|draft|toast|Modal|Sheet|Picker|editing|activeView/);
assert.equal(saved.weekOffset, 2); assert.equal(saved.filters.query, "Ris"); assert.equal(saved.meals[0].title, "Ny middag fra skyen");
assert.equal(f.run("loadState().activeView"), "shopping"); assert.equal(f.run("loadState().weekOffset"), 2);
assert.equal(f.run("loadState().filters.query"), "Ris"); assert.equal(f.run("loadState().draftMeal"), null);
f.run("stopAllSync()");

for (const options of [{ readsFail: true, rawState: stale }, { rawState: "not JSON" }, { rawState: "[]" }, { rawState: "42" },
  { rawState: JSON.stringify({ projectId, mealPreferences: null }) }]) {
  const bad = fixture(options); bad.run("render()"); assert.deepEqual(bad.json("state.meals"), []);
  assert.equal(bad.run("state.projectId"), projectId);
  assert.equal(bad.run("readOfflineMembership()"), null);
  await bad.run("initFirebaseSync()"); await bad.auth(user); assert.equal(bad.run("accessState.kind"), "ready"); bad.run("stopAllSync()");
}
const blockedDeletion = fixture({ deletesFail: true }); await blockedDeletion.run("initFirebaseSync()");
await blockedDeletion.auth(user); await blockedDeletion.run("signOutAccount()");
assert.equal(blockedDeletion.run("accessState.kind"), "login");
const legacy = fixture({ writesFail: false, rawState: JSON.stringify({ projectId, meals: [meal], weekOffset: 2,
  filters: { query: "Ris", category: "all", flag: "all", sort: "title" }, activeView: "meals", editingMealId: "a",
  draftMeal: { title: "OLD_DRAFT" }, draftIngredients: [{ name: "OLD_DRAFT" }], draftSteps: ["OLD_DRAFT"],
  mealPicker: { open: true }, plannerDaySheet: { open: true }, generateModal: { open: true }, toast: { message: "OLD_TOAST" } }) });
assert.equal(legacy.run("state.meals[0].title"), meal.title); assert.equal(legacy.run("state.weekOffset"), 2);
assert.equal(legacy.run("state.filters.query"), "Ris"); assert.equal(legacy.run("state.activeView"), "shopping");
for (const field of ["draftMeal", "draftIngredients", "draftSteps", "editingMealId", "toast"]) assert.equal(legacy.run(`state.${field}`), null);
for (const field of ["mealPicker", "plannerDaySheet", "generateModal"]) assert.equal(legacy.run(`state.${field}.open`), false);
legacy.run("saveState()"); assert.doesNotMatch(legacy.storage.get("middagsapp-state"), /OLD_DRAFT|OLD_TOAST/);
console.log("app local storage tests ok (full quota, login, clicks, writes, snapshots, recovery and compact copy)");
