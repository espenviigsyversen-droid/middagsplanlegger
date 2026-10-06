import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Run the real app functions with local DOM stubs, without Firebase or browser startup.
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g;
const bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter((item) => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/);
    bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");

const selectors = new Map();
const timers = [];
const downloads = [];
const backupErrors = [];
let coarsePointer = false;
const storage = new Map();
const app = {
  innerHTML: "",
  querySelector: (selector) => selectors.get(selector)?.[0] || null,
  querySelectorAll: (selector) => selectors.get(selector) || [],
};
const navigator = {};
const window = {
  scrollY: 330, addEventListener() {}, scrollTo: (x, y) => { window.scrollY = y; },
  matchMedia: (query) => { assert.equal(query, "(pointer: coarse)"); return { matches: coarsePointer }; },
};
const context = vm.createContext({
  ...bindings, structuredClone, Date, Blob, File, navigator, window,
  console: { error: (...args) => backupErrors.push(args) },
  CSS: { escape: (value) => value },
  document: {
    querySelector: () => app,
    addEventListener() {},
    body: { append: (link) => downloads.push(link) },
    createElement: () => ({ click() { this.clicked = true; }, remove() {} }),
  },
  localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  URL: { createObjectURL: (blob) => { downloads.push(blob); return "blob:backup"; }, revokeObjectURL() {} },
  setTimeout: (callback, delay) => timers.push({ callback, delay }),
  clearTimeout() {},
  FormData: class { constructor(form) { return form.values; } },
});
vm.runInContext(source, context);
vm.runInContext("const renderWithDom = render; let renders = 0; render = () => { renders += 1; };", context);
const run = (code) => vm.runInContext(code, context);
const snapshot = (code) => JSON.parse(JSON.stringify(run(code)));
const element = (properties = {}) => ({
  ...properties, handlers: {},
  addEventListener(name, callback) { this.handlers[name] = callback; },
  focus() {}, select() {},
});
assert.equal(run("state.activeView"), "shopping");
assert.equal(run("state.previousView"), "shopping");
run('state.activeView = "planner"; state.previousView = "meals"; saveState();');
assert.equal(run("loadState().activeView"), "shopping");
assert.equal(run("loadState().previousView"), "shopping");
run('state.activeView = "shopping"; renderShell("");');
assert.deepEqual([...app.innerHTML.matchAll(/class="nav-button[^"]*" data-view="([^"]+)"/g)].map(match => match[1]),
  ["shopping", "calendar", "planner", "meals"]);
// Explicit test fixtures replace production examples removed in v95.
run('accessState = { kind: "ready", user: { uid: "test", email: "test@example.com" }, role: "admin" }; state.meals = normalizeMeals([{ id: "taco", title: "Taco", categories: [], recipeUrl: "", baseServings: 4, ingredients: [{name:"Paprika",amount:"1",unit:"stk"}], steps: ["Stek"], suitability: [] }]);');
const initialData = snapshot("syncPayload()");
run('state.weekOffset = 2; state.mealPicker = { open: true, dayIndex: 1, query: "" };');
const search = element({ value: "Lasagne <ny>" });
const list = element({ innerHTML: "" });
selectors.set("[data-meal-picker-search]", [search]);
selectors.set(".meal-picker-list", [list]);
run("bindEvents()");
const beforeInput = run("renders");
search.handlers.input({ target: search });
assert.equal(run("renders"), beforeInput);
assert.match(list.innerHTML, /Lasagne &lt;ny&gt;/);
assert.ok(list.innerHTML.indexOf("data-create-quick-meal") < list.innerHTML.indexOf('data-select-meal=""'));
let prevented = false;
search.handlers.keydown({ key: "Enter", preventDefault() { prevented = true; } });
assert.equal(prevented, true);
assert.equal(run("state.mealPicker.open"), false);
assert.equal(run("renders"), beforeInput + 4); // Domain patch, recipe/week pending statuses and toast.
assert.equal(run("getMeal(currentPlan()[1]).title"), "Lasagne <ny>");
assert.equal(run("state.pendingLocalSync"), false);
assert.equal(run("state.toast.message"), "«Lasagne <ny>» er lagt til. Oppskriften kan fylles ut senere.");
assert.deepEqual(snapshot("state.meals.slice(0, -1)"), initialData.meals);
assert.equal(run("Object.keys(state.plansByWeek).includes(getWeekKey(2))"), true);
assert.deepEqual(snapshot("state.plansByWeek[getWeekKey(0)]"), initialData.plansByWeek[run("getWeekKey(0)")]);
const count = run("state.meals.length");
search.value = " ";
search.handlers.keydown({ key: "Enter", preventDefault() {} });
assert.equal(run("state.meals.length"), count);
run('state.mealPicker = { open: true, dayIndex: 1, query: " lasagne <NY> " }; addQuickMealForPicker();');
assert.equal(run("state.meals.length"), count);
assert.doesNotMatch(run('renderMealPickerListItems(" lasagne <NY> ", 1)'), /data-create-quick-meal/);
search.value = "tac";
search.handlers.keydown({ key: "Enter", preventDefault() { throw Error("Should not create a partial match"); } });
assert.equal(run("state.meals.length"), count);
run('state.mealPicker = { open: true, dayIndex: 2, query: "Ny middag" };');
list.handlers.click({ target: { closest: (selector) => selector === "[data-create-quick-meal]" ? {} : null } });
assert.equal(run("getMeal(currentPlan()[2]).title"), "Ny middag");
run('state.filters.flag = "needs-recipe";');
assert.equal(run('filteredMeals().some(meal => meal.title === "Ny middag")'), true);

run('state.editingMealId = currentPlan()[2];');
context.form = { values: {
  get: (name) => ({ title: "Ny middag", prepTime: "", baseServings: "4" })[name] || "",
  getAll: () => [], has: () => false,
} };
run("saveMealFromForm(form)");
assert.deepEqual(snapshot("getMeal(currentPlan()[2]).categories"), []);
assert.equal(run("getMeal(currentPlan()[2]).prepTime"), "");
const review = snapshot('createWeekShoppingReview([{ weekKey: getWeekKey(), dayIndex: 2, date: new Date(2026, 9, 7), dayMode: "home" }, { weekKey: getWeekKey(), dayIndex: 3, date: new Date(2026, 9, 8), dayMode: "home", meal: state.meals.find(meal => meal.ingredients.length) }])');
assert.equal(review.groups.length, 1);
assert.match(review.missingIngredients[0], /Ny middag \(Ons /);
assert.equal(run('createWeekShoppingReview([{ weekKey: getWeekKey(), dayIndex: 2, date: new Date(), dayMode: "home" }]).open'), false);

selectors.clear();
const confirmGenerate = element();
selectors.set("[data-confirm-generate]", [confirmGenerate]);
run('const upcoming = getUpcomingDays(9)[0]; state.plansByWeek[upcoming.weekKey] = { ...(state.plansByWeek[upcoming.weekKey] || {}), [upcoming.dayIndex]: state.meals.at(-1).id }; state.generateModal = { open: true, selectedDays: [upcoming.dateKey] };');
run("bindEvents()");
confirmGenerate.handlers.click();
assert.equal(run("state.toast.message"), "Ingen av de valgte middagene har ingredienser.");

selectors.clear();
const keys = snapshot("getStoreCategories().map(cat => cat.key)");
run('moveStoreCategory("other", -1)');
assert.equal(window.scrollY, 330);
assert.equal(run('getStoreCategories().at(-2).key'), "other");
const movedKeys = snapshot("state.metadata.storeCategoryOrder");
assert.equal(movedKeys.length, keys.length);
assert.match(run("renderStoreCategoriesSetup()"), /data-move-store-cat="other"/);
run('moveStoreCategory(state.metadata.storeCategoryOrder[0], -1)');
assert.deepEqual(snapshot("state.metadata.storeCategoryOrder"), movedKeys);
const categoryForm = element({ values: { get: () => "Frysevarer" }, reset() {} });
selectors.set("[data-store-cat-form]", [categoryForm]);
run("bindEvents()");
categoryForm.handlers.submit({ preventDefault() {}, currentTarget: categoryForm });
assert.equal(run("getStoreCategories().at(-1).label"), "Frysevarer");
const removeCategory = element({ dataset: { removeStoreCat: "frysevarer" } });
selectors.set("[data-remove-store-cat]", [removeCategory]);
run("bindEvents()");
removeCategory.handlers.click();
assert.equal(run('state.metadata.storeCategoryOrder.includes("frysevarer")'), false);
assert.deepEqual(snapshot("state.metadata.storeCategoryOrder"), movedKeys);
run("const reloaded = loadState();");
assert.deepEqual(snapshot("reloaded.metadata.storeCategoryOrder"), movedKeys);
run('const invalidOrder = normalizeState({ ...structuredClone(defaultState), metadata: { storeCategoryOrder: "invalid" } });');
assert.deepEqual(snapshot("invalidOrder.metadata.storeCategoryOrder"), []);

run('state.family.name = "<img src=x onerror=alert(1)>"; renderShell("");');
assert.match(app.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt; sin middagsplan/);
assert.doesNotMatch(app.innerHTML, /<img/);
// Shell uses the effective status (including pending shopping writes), with
// readable text always present and the compact class only on Synket.
run('shoppingSyncStatus = null; mealsSyncStatus = null; weeksSyncStatus = null;');
for (const status of ["Synket", "Kobler til synk", "Synker", "Synk feilet", "Lokal lagring"]) {
  context.testSyncStatus = status;
  run('syncStatus = testSyncStatus; renderShell("");');
  assert.equal(app.innerHTML.includes("sync-pill--synced"), status === "Synket");
  assert.ok(app.innerHTML.includes('<span class="sync-status-label">' + status + '</span>'));
}
run('syncStatus = "Kobler til synk";');
context.button = { disabled: false };
await run("downloadBackup(button)");
const blob = downloads.find((entry) => entry instanceof Blob);
const exported = JSON.parse(await blob.text());
assert.equal(exported.appVersion, "v104");
assert.deepEqual(exported.data, snapshot("syncPayload()"));
assert.equal(downloads.at(-1).clicked, true);
assert.match(downloads.at(-1).download, /^middagsapp-backup-\d{4}-\d{2}-\d{2}\.json$/);
assert.equal(context.button.disabled, false);
let shareCalls = 0;
navigator.canShare = () => true;
navigator.share = async () => { shareCalls += 1; };
await run("downloadBackup(button)");
assert.equal(shareCalls, 0); // Fine pointer must always use the link, even if canShare is true.
assert.equal(downloads.at(-1).clicked, true);
coarsePointer = true;
navigator.share = async () => { throw Error("Capability check should fall back to download"); };
navigator.canShare = () => { throw new Error("Unsupported capability check"); };
await run("downloadBackup(button)");
assert.equal(downloads.at(-1).clicked, true);
context.File = undefined;
await run("downloadBackup(button)");
assert.equal(downloads.at(-1).clicked, true);
context.File = File;
assert.equal(run("state.toast.message"), "Sikkerhetskopi lagret.");
navigator.canShare = () => true;
let sharedFile;
navigator.share = async ({ files }) => { sharedFile = files[0]; };
await run("downloadBackup(button)");
assert.deepEqual(JSON.parse(await sharedFile.text()).data, snapshot("syncPayload()"));
navigator.share = async () => { const error = new Error("Cancelled"); error.name = "AbortError"; throw error; };
run("state.toast = null;");
const beforeCancel = downloads.length;
await run("downloadBackup(button)");
assert.equal(run("state.toast"), null);
assert.equal(downloads.length, beforeCancel);
assert.equal(context.button.disabled, false);
navigator.share = async () => { const error = new Error("Denied"); error.name = "NotAllowedError"; throw error; };
await run("downloadBackup(button)");
assert.equal(downloads.length, beforeCancel + 2);
assert.equal(downloads.at(-1).clicked, true);
assert.equal(run("state.toast.message"), "Sikkerhetskopi lagret.");
assert.equal(backupErrors.length, 0);
const originalCreateElement = context.document.createElement;
context.document.createElement = () => ({ click() { throw new Error("Download failed"); }, remove() {} });
await run("downloadBackup(button)");
assert.equal(run("state.toast.message"), "Kunne ikke lagre sikkerhetskopien. Prøv igjen.");
assert.equal(context.button.disabled, false);
assert.equal(backupErrors.length, 1);
assert.equal(backupErrors[0][1].message, "Download failed");
coarsePointer = false;
await run("downloadBackup(button)");
assert.equal(backupErrors.length, 2);
assert.equal(context.button.disabled, false);
context.document.createElement = originalCreateElement;

// Exercise shopping patches through real setState: stable timestamps, separate
// sync queue, unchanged global sync clock, and backup retains the local list.
selectors.clear();
run('state.pendingLocalSync = false; state.clientUpdatedAt = 123; state.shoppingList = { items: [], generatedForWeek: "local-week" };');
run('setState({ shoppingList: { ...state.shoppingList, items: [{ id: "new-1", name: "Melk" }, { id: "new-2", name: "Brød" }] } });');
const created = snapshot("state.shoppingList.items");
assert.equal(created[1].createdAt, created[0].createdAt + 1);
assert.equal(run("state.clientUpdatedAt"), 123);
assert.equal(run("state.pendingLocalSync"), false);
assert.equal(run("shoppingSyncStatus"), "Synker");
run('syncStatus = "Synket";');
assert.equal(run("syncStatusText()"), "Synker");
run('setState({ shoppingList: { ...state.shoppingList, items: state.shoppingList.items.map(item => ({ ...item, checked: true })) } });');
assert.equal(run("state.shoppingList.items[0].createdAt"), created[0].createdAt);
assert.equal(run("syncPayload().shoppingList.generatedForWeek"), "local-week");

// Collection callbacks keep generatedForWeek and the global sync flags. Repeated
// identical server content does not render or generate writes.
const shoppingCalls = [];
let itemsListener;
const shoppingApi = {
  doc: (ref, id) => ref + "/" + id,
  serverTimestamp: () => "server",
  runTransaction: async callback => callback({ get: async () => ({ exists: () => true, data: () => ({ migratedToItemsAt: "done" }) }) }),
  setDoc: (...args) => { shoppingCalls.push(["add", ...args]); return Promise.resolve(); },
  updateDoc: (...args) => { shoppingCalls.push(["update", ...args]); return Promise.resolve(); },
  deleteDoc: (...args) => { shoppingCalls.push(["delete", ...args]); return Promise.resolve(); },
  onSnapshot: (_ref, _options, listener) => { itemsListener = listener; },
};
context.shoppingConnection = { api: shoppingApi, refs: { shopping: "archive", shoppingItems: "items" } };
await run("shoppingSync.start(shoppingConnection)");
for (let index = 0; index < 6; index += 1) await Promise.resolve();
const remoteItems = [{ id: "remote", name: "Egg", amount: "6", unit: "stk", category: "other", checked: false, custom: true, createdAt: 100 }];
const remoteSnapshot = { docs: remoteItems.map(item => ({ id: item.id, data: () => ({ ...item, updatedAt: "server" }) })), metadata: { fromCache: false } };
itemsListener(remoteSnapshot);
assert.equal(run("state.shoppingList.generatedForWeek"), "local-week");
assert.equal(run("state.clientUpdatedAt"), 123);
assert.equal(run("state.pendingLocalSync"), false);
const remoteRenderCount = run("renders");
const remoteWriteCount = shoppingCalls.length;
itemsListener(remoteSnapshot);
assert.equal(run("renders"), remoteRenderCount);
assert.equal(shoppingCalls.length, remoteWriteCount);

// Real render restores text, cursor and focus after replacing the input node.
const typedInput = element({ value: "Papri", selectionStart: 2, selectionEnd: 4, selectionDirection: "forward" });
const replacementInput = element({ value: "", setSelectionRange(start, end, direction) { this.selection = [start, end, direction]; },
  focus(options) { this.focusOptions = options; } });
replacementInput.focus = (options) => { replacementInput.focusOptions = options; };
selectors.set("[data-shopping-input]", [typedInput]);
context.document.activeElement = typedInput;
context.document.body.classList = { contains: () => false };
context.document.querySelector = selector => selector === "#app" ? app : null;
context.replacementInput = replacementInput;
context.installNewInput = () => selectors.set("[data-shopping-input]", [replacementInput]);
run('const savedShell = renderShell; renderShell = html => { savedShell(html); installNewInput(); }; state.activeView = "shopping"; renderWithDom();');
assert.equal(replacementInput.value, "Papri");
assert.deepEqual(replacementInput.selection, [2, 4, "forward"]);
assert.deepEqual(JSON.parse(JSON.stringify(replacementInput.focusOptions)), { preventScroll: true });
console.log("app workflow tests ok (local stubs; no network)");
run('state.meals = [{...emptyMeal(),id:"group-meal",title:"Grupper",baseServings:4,ingredients:[{name:"hvitløk, finhakket",amount:"3-4",unit:"stk",group:"Saus"},{name:"hvitløk",amount:"2",unit:"stk",group:"Tilbehør"}],keyIngredients:["hvitløk, finhakket","hvitløk"]}]; state.metadata.ingredientMappings = {hvitløk:"spices"}; state.plansByWeek = {"2026-10-05":{1:"group-meal"}}; state.servingsByWeek = {"2026-10-05":{1:4}}; state.family.familySize=4; state.selectedRecipeContext = null;');
const generated = snapshot('generateShoppingListItems([{weekKey:"2026-10-05",dayIndex:1,dayMode:"planned"}])');
assert.equal(generated.length, 1); assert.equal(generated[0].name, "hvitløk"); assert.equal(generated[0].amount, "6"); assert.equal(generated[0].category, "spices");
const singleRecipe = snapshot('mergeShoppingItems([], createMealShoppingReview(getMeal("group-meal")).groups[0].items)');
assert.equal(singleRecipe.length, 1); assert.equal(singleRecipe[0].name, "hvitløk"); assert.equal(singleRecipe[0].amount, "6");
assert.equal(run('categorizeIngredient("hvitløk, finhakket")'), "spices");
assert.equal(run('shoppingSuggestionSources().some(item => item.name === "hvitløk, finhakket")'), false);
assert.equal(run('shoppingSuggestionSources().find(item => item.name === "hvitløk").category'), "spices");
run('state.shoppingList.items = []; addShoppingItemByName("hvitløk, finhakket");');
assert.equal(run("state.shoppingList.items[0].name"), "hvitløk, finhakket");
assert.equal(run("state.meals[0].ingredients[0].name"), "hvitløk, finhakket");
run('state.meals[0].ingredients = [{name:"mel",amount:"2 1/2",unit:"dl"},{name:"mel",amount:"1",unit:"dl"}];');
const mixedWeek = snapshot('generateShoppingListItems([{weekKey:"2026-10-05",dayIndex:1,dayMode:"planned"}])');
const mixedRecipe = snapshot('mergeShoppingItems([], createMealShoppingReview(getMeal("group-meal")).groups[0].items)');
assert.equal(mixedWeek.length, 1); assert.equal(mixedWeek[0].amount, "3,5");
assert.equal(mixedRecipe.length, 1); assert.equal(mixedRecipe[0].amount, "3,5");
