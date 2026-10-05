import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createRemoteRefs } from "../../src/sync/firebase.js";

function testCreateRemoteRefs() {
  const calls = [];
  const db = { name: "db" };
  const doc = (...parts) => {
    calls.push(["doc", ...parts]);
    return { type: "doc", parts };
  };
  const collection = (...parts) => {
    calls.push(["collection", ...parts]);
    return { type: "collection", parts };
  };

  const refs = createRemoteRefs({ db, doc, collection, familyId: "familien" });

  assert.deepEqual(refs.profile.parts, [db, "families", "familien", "app", "profile"]);
  assert.deepEqual(refs.legacyState.parts, [db, "families", "familien", "app", "state"]);
  assert.deepEqual(refs.meals.parts, [db, "families", "familien", "meals"]);
  assert.deepEqual(refs.weeks.parts, [db, "families", "familien", "weeks"]);
  assert.equal(calls.filter(([type]) => type === "doc").length, 5);
  assert.deepEqual(refs.shoppingItems.parts, [db, "families", "familien", "shoppingItems"]);
  assert.equal(calls.filter(([type]) => type === "collection").length, 3);
}

testCreateRemoteRefs();

// Load the real client initialization with local SDK stubs; never fetch the CDN.
const db = { name: "stub-db" };
let authCallback;
let transactionDb;
const updateDoc = () => {};
const sdk = {
  initializeApp: () => ({}), getAuth: () => ({}),
  onAuthStateChanged: (_auth, callback) => { authCallback = callback; },
  signInAnonymously: async () => {}, getFirestore: () => db,
  doc: (...parts) => parts, collection: (...parts) => parts,
  updateDoc, runTransaction: (database, callback) => { transactionDb = database; return callback("transaction"); },
};
const source = (await readFile(new URL("../../src/sync/firebase.js", import.meta.url), "utf8"))
  .replaceAll("export ", "").replaceAll("import(`", "sdkImport(`");
const context = vm.createContext({ sdkImport: async () => sdk });
vm.runInContext(source, context);
let ready;
context.options = { familyId: "familien", sdkVersion: "stub", firebaseConfig: {},
  onAuthReady: async (connection) => { ready = connection; } };
await vm.runInContext("initFirebaseClient(options)", context);
await authCallback({ uid: "stub-user" });
assert.equal(ready.firestoreApi.updateDoc, updateDoc);
assert.equal(await ready.firestoreApi.runTransaction(async (transaction) => transaction), "transaction");
assert.equal(transactionDb, db);

console.log("sync firebase tests ok");
