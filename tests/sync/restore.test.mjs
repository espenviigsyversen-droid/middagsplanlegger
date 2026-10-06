import assert from "node:assert/strict";
import { backupFixture } from "../helpers/backup-fixture.mjs";
import { validateBackup, summarizeBackup, buildRestoreDocuments, checkRestoreCollections, executeRestore } from "../../src/sync/restore.js";

const backup = backupFixture();
const clone = validateBackup(backup);
clone.data.family.name = "changed";
assert.equal(backup.data.family.name, "Testfamilien");
assert.deepEqual(summarizeBackup(backup), { exportedAt: backup.exportedAt, appVersion: "v94", meals: 1, weeks: 2, items: 2 });
for (const mutation of [b => b.app = "other", b => b.exportVersion = 2, b => b.data.family = null,
  b => b.exportedAt = "bad", b => b.data.meals[0].id = "unsafe/path", b => b.data.shoppingList.items.push(b.data.shoppingList.items[0]),
  b => b.data.plansByWeek["bad-key"] = {}, b => b.data.servingsByWeek["2026-10-05"] = { 0: "4" },
  b => b.data.shoppingList.items[0].checked = "true", b => delete b.data.dayModesByWeek,
  b => b.data.metadata.ingredientMappings = [], b => b.data.metadata.storeCategories = [null],
  b => b.data.family.quickDays = "Tuesday", b => b.data.mealPreferences.categoryGoals.fisk = "bad",
  b => b.data.meals[0].suitability = "weekday"]) {
  const input = backupFixture(); mutation(input); assert.throws(() => validateBackup(input), /Ugyldig/);
}
const docs = buildRestoreDocuments(backup, { email: "admin@example.com" });
assert.deepEqual(docs.at(-1), { path: ["app", "meta"], data: { schemaVersion: 1, initializedBy: "admin@example.com", minAppVersion: 95 }, marker: "meta" });
assert.deepEqual(docs.filter(d => d.path[0] === "weeks").map(d => d.path[1]), ["2026-10-05", "2026-10-12"]);
assert.deepEqual(docs.filter(d => d.path[0] === "shoppingItems").map(d => [d.path[1], d.data.createdAt]), [["item-z", 0], ["item-a", 1]]);
assert.equal(docs.find(d => d.path[0] === "shoppingItems").data.id, undefined);
assert.equal(docs.find(d => d.path[0] === "shoppingItems").data.checked, true);
assert.equal(docs.find(d => d.path[1] === "metadata").data.metadata.storeCategoryOrder[0], "other");
assert.equal(docs.some(d => d.path[0] === "members"), false);
assert.equal(checkRestoreCollections(docs, {}), true);
assert.equal(checkRestoreCollections(docs, { meals: ["meal-1"], weeks: ["2026-10-12"], shoppingItems: ["item-a"] }), true);
assert.throws(() => checkRestoreCollections(docs, { meals: ["unknown"], shoppingItems: ["wrong"] }), /2 dokumenter/);

function execution({ existing = {}, meta = {}, failAt, valid = () => true } = {}) {
  const calls = [];
  const refs = Object.fromEntries(["meta", "profile", "preferences", "metadata", "shopping", "meals", "weeks", "shoppingItems"].map(k => [k, k]));
  const api = {
    doc: (ref, id) => `${ref}/${id}`, serverTimestamp: () => "server",
    getDocFromServer: async () => ({ exists: () => Object.keys(meta).length > 0, data: () => meta }),
    getDocsFromServer: async ref => ({ docs: (existing[ref] || []).map(id => ({ id })) }),
    setDoc: async (ref, data, options) => { if (ref === failAt) throw new Error("write failed"); calls.push({ ref, data, options }); },
  };
  return { calls, args: { backup, email: "admin@example.com", role: "admin", refs, api, valid } };
}
const success = execution();
assert.deepEqual(await executeRestore(success.args), backup.data);
assert.equal(success.calls.at(-1).ref, "meta");
assert.equal(success.calls.at(-1).data.initializedAt, "server");
assert.equal(success.calls.find(d => d.ref === "shopping").data.migratedToItemsAt, "server");
assert.equal(success.calls.find(d => d.ref === "meals/meal-1").data.clientUpdatedAt, 100);
const partial = execution({ existing: { meals: ["meal-1"], shoppingItems: ["item-z"] } });
await executeRestore(partial.args);
assert.equal(partial.calls.at(-1).ref, "meta");
for (const config of [{ failAt: "meals/meal-1" }, { existing: { weeks: ["2026-11-02"] } }, { meta: { initializedAt: "server" } }, { valid: () => false }]) {
  const run = execution(config);
  await assert.rejects(executeRestore(run.args));
  assert.equal(run.calls.some(d => d.ref === "meta"), false);
  if (config.existing || config.meta || config.valid) assert.equal(run.calls.length, 0);
}
const member = execution(); member.args.role = "member";
await assert.rejects(executeRestore(member.args), /administratorer/);
assert.equal(member.calls.length, 0);
const invalid = execution(); invalid.args.backup = { app: "bad" };
await assert.rejects(executeRestore(invalid.args), /Ugyldig/);
assert.equal(invalid.calls.length, 0);
const empty = backupFixture(); empty.data.meals = []; empty.data.shoppingList.items = [];
for (const key of ["plansByWeek", "lockedPlansByWeek", "dayTypesByWeek", "servingsByWeek", "dayModesByWeek", "dayNotesByWeek"]) empty.data[key] = {};
const emptyDocs = buildRestoreDocuments(empty, { email: "admin@example.com" });
assert.equal(checkRestoreCollections(emptyDocs, {}), true);
assert.throws(() => checkRestoreCollections(emptyDocs, { meals: ["meal-1"] }), /1 dokumenter/);
assert.equal(emptyDocs.length, 5);
console.log("restore tests ok");
