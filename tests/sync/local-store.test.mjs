import assert from "node:assert/strict";
import { createLocalStore, localStateForStorage } from "../../src/sync/local-store.js";
import { PROJECT_DOMAIN_KEYS } from "../../src/sync/access.js";

const values = new Map([["other-app", "untouched"]]), results = [], removed = [];
let writeFails = false, readFails = false, removeFails = false;
const quotaError = () => Object.assign(new Error("Full storage"), { name: "QuotaExceededError" });
const storage = {
  getItem(key) { if (readFails) throw quotaError(); return values.get(key); },
  setItem(key, value) { if (writeFails) throw quotaError(); values.set(key, value); },
  removeItem(key) { if (removeFails) throw quotaError(); removed.push(key); values.delete(key); },
};
const store = createLocalStore({ getStorage: () => storage, onWrite: ok => results.push(ok) });
assert.equal(store.read("missing"), null);
for (const value of ["bad JSON", "null", "[]", "true", '"text"', "42"]) {
  values.set("middagsapp-state", value); assert.equal(store.read("middagsapp-state"), null);
}
assert.equal(store.write("middagsapp-state", { projectId: "project", meals: [] }), true);
const previous = values.get("middagsapp-state"); writeFails = true;
assert.equal(store.write("middagsapp-state", { meals: ["new"] }), false);
assert.equal(values.get("middagsapp-state"), previous, "Failed writes preserve the existing copy");
assert.equal(store.write("middagsapp-membership", { uid: "user" }), false);
assert.deepEqual(results, [true, false, false]); assert.deepEqual(removed, []);
readFails = true; assert.equal(store.read("middagsapp-state"), null);
removeFails = true; assert.equal(store.remove("middagsapp-membership"), false);
writeFails = readFails = removeFails = false;
assert.equal(store.write("middagsapp-state", { meals: [] }), true); assert.equal(results.at(-1), true);
assert.equal(store.remove("middagsapp-membership"), true);
assert.equal(values.get("other-app"), "untouched"); assert.deepEqual(removed, ["middagsapp-membership"]);
const blocked = createLocalStore({ getStorage: () => { throw new Error("Storage getter blocked"); } });
assert.equal(blocked.read("key"), null); assert.equal(blocked.write("key", {}), false); assert.equal(blocked.remove("key"), false);
const circular = {}; circular.self = circular; assert.equal(store.write("key", circular), false);
assert.doesNotThrow(() => createLocalStore({ getStorage: () => storage, onWrite: () => { throw new Error(); } }).write("key", {}));

const domain = Object.fromEntries(PROJECT_DOMAIN_KEYS.map(key => [key, { retained: key }]));
const state = { ...domain, weekOffset: 3, filters: { query: "fisk", sort: "title" },
  activeView: "meals", previousView: "planner", editingMealId: "recipe", selectedMealId: "recipe",
  draftMeal: { title: "PRIVATE_DRAFT" }, draftIngredients: [{ name: "PRIVATE_DRAFT" }], draftSteps: ["PRIVATE_DRAFT"],
  generateModal: { open: true }, mealPicker: { open: true }, plannerDaySheet: { open: true },
  shoppingReview: { groups: ["PRIVATE_REVIEW"] }, toast: "PRIVATE_TOAST", keepScreenAwake: true, localStoreFailed: true };
const local = localStateForStorage(state, "project");
assert.deepEqual(Object.keys(local).sort(), [...PROJECT_DOMAIN_KEYS, "weekOffset", "filters", "projectId"].sort());
for (const key of PROJECT_DOMAIN_KEYS) assert.deepEqual(local[key], domain[key]);
assert.equal(local.weekOffset, 3); assert.deepEqual(local.filters, state.filters); assert.equal(local.projectId, "project");
assert.doesNotMatch(JSON.stringify(local), /PRIVATE_|draft|Modal|Picker|Sheet|toast|activeView|localStoreFailed/);
assert.equal(state.draftMeal.title, "PRIVATE_DRAFT", "Compact serialization does not mutate the live draft");
console.log("local storage tests ok (quota, blocked access, malformed JSON, compact state)");
