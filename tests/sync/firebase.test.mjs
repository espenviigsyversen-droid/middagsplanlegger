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
  assert.deepEqual(refs.meta.parts, [db, "families", "familien", "app", "meta"]);
  assert.deepEqual(refs.meals.parts, [db, "families", "familien", "meals"]);
  assert.deepEqual(refs.weeks.parts, [db, "families", "familien", "weeks"]);
  assert.equal(calls.filter(([type]) => type === "doc").length, 5);
  assert.deepEqual(refs.shoppingItems.parts, [db, "families", "familien", "shoppingItems"]);
  assert.equal(calls.filter(([type]) => type === "collection").length, 4);
}

testCreateRemoteRefs();

// Load the real client initialization with local SDK stubs; never fetch the CDN.
const db = { name: "stub-db" };
let authCallback;
let transactionDb;
let popupCalls = 0;
let logoutCalls = 0;
const updateDoc = () => {};
const getDocFromServer = () => {};
const getDocsFromServer = () => {};
const sdk = {
  initializeApp: () => ({}), getAuth: () => ({}),
  onAuthStateChanged: (_auth, callback) => { authCallback = callback; },
  GoogleAuthProvider: class { setCustomParameters(parameters) { assert.deepEqual(JSON.parse(JSON.stringify(parameters)), { prompt: "select_account" }); } },
  signInWithPopup: async () => { popupCalls += 1; return { user: { uid: "stub-user" } }; },
  signOut: async () => { logoutCalls += 1; }, getFirestore: () => db,
  doc: (...parts) => parts, collection: (...parts) => parts,
  updateDoc, getDocFromServer, getDocsFromServer, runTransaction: (database, callback) => { transactionDb = database; return callback("transaction"); },
};
const source = (await readFile(new URL("../../src/sync/firebase.js", import.meta.url), "utf8"))
  .replaceAll("export ", "").replaceAll("import(`", "sdkImport(`");
const context = vm.createContext({ sdkImport: async () => sdk });
vm.runInContext(source, context);
let ready;
context.options = { familyId: "familien", sdkVersion: "stub", firebaseConfig: {},
  onAuthReady: async (connection) => { ready = connection; } };
const client = await vm.runInContext("initFirebaseClient(options)", context);
assert.equal(popupCalls, 0);
await client.signIn();
assert.equal(popupCalls, 1);
await client.signOut();
assert.equal(logoutCalls, 1);
await authCallback({ uid: "stub-user" });
assert.equal(ready.firestoreApi.updateDoc, updateDoc);
assert.equal(ready.firestoreApi.getDocFromServer, getDocFromServer);
assert.equal(ready.firestoreApi.getDocsFromServer, getDocsFromServer);
assert.equal(await ready.firestoreApi.runTransaction(async (transaction) => transaction), "transaction");
assert.equal(transactionDb, db);

console.log("sync firebase tests ok");
