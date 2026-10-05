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
vm.runInContext("let renders = 0; render = () => { renders += 1; };", context);
const run = (code) => vm.runInContext(code, context);
const snapshot = (code) => JSON.parse(JSON.stringify(run(code)));
const element = (properties = {}) => ({
  ...properties, handlers: {},
  addEventListener(name, callback) { this.handlers[name] = callback; },
  focus() {}, select() {},
});
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
assert.equal(run("renders"), beforeInput + 2); // One domain patch and one toast patch.
assert.equal(run("getMeal(currentPlan()[1]).title"), "Lasagne <ny>");
assert.equal(run("state.pendingLocalSync"), true);
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
context.button = { disabled: false };
await run("downloadBackup(button)");
const blob = downloads.find((entry) => entry instanceof Blob);
const exported = JSON.parse(await blob.text());
assert.equal(exported.appVersion, "v92");
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

console.log("app workflow tests ok (local stubs; no network)");
