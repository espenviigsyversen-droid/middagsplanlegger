import assert from "node:assert/strict";
import {
  createShoppingSync, diffShoppingItems, migrateShoppingItems,
  shoppingItemsFromDocs, shoppingMigrationPlan,
} from "../../src/sync/shopping.js";

const item = (id, fields = {}) => ({ id, name: "Melk", amount: "1", unit: "l",
  category: "dairy", checked: false, custom: true, createdAt: 10, ...fields });
const doc = (value) => ({ id: value.id, data: () => ({ ...value, updatedAt: "server" }) });
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

assert.deepEqual(diffShoppingItems([], [item("a")]), { added: [item("a")], updated: [], removed: [] });
assert.deepEqual(diffShoppingItems([item("a")], []), { added: [], updated: [], removed: ["a"] });
assert.deepEqual(diffShoppingItems([item("a")], [item("a", { checked: true })]), {
  added: [], updated: [{ id: "a", fields: { checked: true } }], removed: [],
});
assert.deepEqual(diffShoppingItems([item("a")], [item("a", { createdAt: 20 })]), {
  added: [], updated: [], removed: [],
});
for (const field of ["name", "amount", "unit", "category", "checked", "custom"]) {
  const value = typeof item("a")[field] === "boolean" ? !item("a")[field] : "changed";
  assert.deepEqual(diffShoppingItems([item("a")], [item("a", { [field]: value })]).updated,
    [{ id: "a", fields: { [field]: value } }]);
}
assert.deepEqual(shoppingItemsFromDocs([doc(item("b")), doc(item("a")), doc(item("c", { createdAt: 2 }))]),
  [item("c", { createdAt: 2 }), item("a"), item("b")]);
assert.equal(shoppingItemsFromDocs([{ id: "real-id", data: () => item("wrong-id") }])[0].id, "real-id");
assert.equal(shoppingMigrationPlan({ migratedToItemsAt: "server" }), null);
assert.equal(shoppingMigrationPlan({ migratedToItemsAt: null }), null);
assert.deepEqual(shoppingMigrationPlan(undefined), []);
assert.deepEqual(shoppingMigrationPlan({}), []);
const old = { shoppingList: { items: [item("b", { checked: true }), item("a")] } };
const migration = shoppingMigrationPlan(old);
assert.deepEqual(migration, [item("b", { checked: true, createdAt: 0 }), item("a", { createdAt: 1 })]);
assert.deepEqual(shoppingMigrationPlan(old), migration);
assert.equal(old.shoppingList.items[0].createdAt, 10);

function connection({ archive = old, migrationError, writeResult = () => Promise.resolve() } = {}) {
  const calls = [];
  let listener, listenerError;
  const refs = { shopping: "archive", shoppingItems: "items" };
  const api = {
    doc: (collection, id) => `${collection}/${id}`,
    serverTimestamp: () => "server",
    runTransaction: async (callback) => {
      calls.push(["transaction"]);
      if (migrationError) throw migrationError;
      await callback({
        get: async (ref) => { calls.push(["get", ref]); return { exists: () => archive != null, data: () => archive }; },
        set: (...args) => calls.push(["transaction-set", ...args]),
      });
    },
    setDoc: (...args) => { calls.push(["add", ...args]); return writeResult("add"); },
    updateDoc: (...args) => { calls.push(["update", ...args]); return writeResult("update"); },
    deleteDoc: (...args) => { calls.push(["delete", ...args]); return writeResult("delete"); },
    onSnapshot: (ref, options, callback, error) => {
      calls.push(["listen", ref, options]); listener = callback; listenerError = error;
    },
  };
  return { api, refs, calls,
    snapshot: (items, fromCache = false) => listener({ docs: items.map(doc), metadata: { fromCache } }),
    failListener: (error) => listenerError(error),
  };
}

const migrated = connection();
await migrateShoppingItems(migrated);
assert.deepEqual(migrated.calls.at(-1), ["transaction-set", "archive", { migratedToItemsAt: "server" }, { merge: true }]);
assert.equal(migrated.calls.filter(([type]) => type === "transaction-set").length, 3);
assert.equal(migrated.calls[2][1], "items/b");
assert.equal(migrated.calls[2][2].id, undefined);
assert.equal(migrated.calls[2][2].checked, true);
const alreadyMigrated = connection({ archive: { migratedToItemsAt: "server" } });
await migrateShoppingItems(alreadyMigrated);
assert.equal(alreadyMigrated.calls.some(([type]) => type === "transaction-set"), false);
const missingArchive = connection({ archive: null });
await migrateShoppingItems(missingArchive);
assert.equal(missingArchive.calls.filter(([type]) => type === "transaction-set").length, 1);

// Queued calls retain their order across migration. Pending offline writes must
// not block the listener, and no cached subset replaces the local list at startup.
const ack = deferred();
const queued = connection({ writeResult: () => ack.promise });
const statuses = [], received = [];
const sync = createShoppingSync({ onStatus: (status) => statuses.push(status), onItems: (items) => received.push(items) });
sync.enqueue(diffShoppingItems([], [item("new")]));
sync.enqueue(diffShoppingItems([item("new")], [item("new", { checked: true })]));
sync.enqueue(diffShoppingItems([item("new", { checked: true })], []));
assert.equal(queued.calls.length, 0);
assert.equal(statuses.at(-1), "Synker");
await sync.start(queued);
assert.deepEqual(queued.calls.slice(-4).map(([type]) => type), ["add", "update", "delete", "listen"]);
assert.equal(queued.calls.find(([type]) => type === "add")[2].createdAt, 10);
assert.deepEqual(queued.calls.find(([type]) => type === "update")[2], { checked: true, updatedAt: "server" });
queued.snapshot([], true);
assert.equal(received.length, 0);
queued.snapshot([item("remote")]);
assert.equal(received.length, 1);
assert.equal(statuses.at(-1), "Synker");
ack.resolve();
await settle();
assert.equal(statuses.at(-1), "Synket");
queued.snapshot([], true);
assert.deepEqual(received.at(-1), []);
const callCount = queued.calls.length;
await sync.start(queued);
assert.equal(queued.calls.length, callCount);

for (const code of ["not-found", "permission-denied"]) {
  const statuses = [];
  const client = connection({ writeResult: () => Promise.reject({ code }) });
  const sync = createShoppingSync({ onStatus: (status) => statuses.push(status) });
  await sync.start(client);
  client.snapshot([]);
  sync.enqueue(diffShoppingItems([item("a")], [item("a", { checked: true })]));
  await settle();
  assert.equal(statuses.at(-1), code === "not-found" ? "Synket" : "Synk feilet");
  client.snapshot([]);
  assert.equal(statuses.at(-1), code === "not-found" ? "Synket" : "Synk feilet");
}

const blocked = connection({ migrationError: { code: "permission-denied" } });
const blockedStatuses = [], blockedItems = [];
const blockedSync = createShoppingSync({ onStatus: (status) => blockedStatuses.push(status), onItems: (items) => blockedItems.push(items) });
blockedSync.enqueue(diffShoppingItems([], [item("a")]));
assert.equal(await blockedSync.start(blocked), false);
assert.equal(blockedStatuses.at(-1), "Synk feilet");
assert.deepEqual(blocked.calls, [["transaction"]]);
assert.deepEqual(blockedItems, []);
blockedSync.enqueue(diffShoppingItems([], [item("b")]));
assert.deepEqual(blocked.calls, [["transaction"]]);

// A transaction retry reads the marker again and performs no second migration.
let archive = old;
let transactionWrites = 0;
await migrateShoppingItems({ refs: migrated.refs, api: { ...migrated.api,
  runTransaction: async (callback) => {
    const attempt = async () => callback({
      get: async () => ({ exists: () => true, data: () => archive }),
      set: () => { transactionWrites += 1; },
    });
    await attempt();
    archive = { ...old, migratedToItemsAt: "other-device" };
    await attempt();
  },
} });
assert.equal(transactionWrites, 3);

// Separate changed fields preserve checkbox and amount changes; a deleted item
// cannot be recreated by a late updateDoc.
const store = new Map([["a", item("a")]]);
const client = connection();
client.api.updateDoc = async (ref, fields) => {
  const id = ref.split("/").at(-1);
  if (!store.has(id)) throw { code: "not-found" };
  store.set(id, { ...store.get(id), ...fields });
};
client.api.deleteDoc = async (ref) => { store.delete(ref.split("/").at(-1)); };
const left = createShoppingSync(), right = createShoppingSync();
await left.start(client); await right.start(client);
left.enqueue(diffShoppingItems([item("a")], [item("a", { checked: true })]));
right.enqueue(diffShoppingItems([item("a")], [item("a", { amount: "2" })]));
await settle();
assert.equal(store.get("a").checked, true);
assert.equal(store.get("a").amount, "2");
left.enqueue(diffShoppingItems([item("a")], []));
right.enqueue(diffShoppingItems([item("a")], [item("a", { checked: true })]));
await settle();
assert.equal(store.has("a"), false);

console.log("sync shopping tests ok");
