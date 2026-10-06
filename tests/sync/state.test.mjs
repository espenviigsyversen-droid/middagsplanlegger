import assert from "node:assert/strict";
import {
  patchTouchesSyncedData,
  WEEK_SYNC_FIELDS,
  remoteDocumentIsStale,
  shouldDeferRemotePayload,
  syncedScopesForPatch,
} from "../../src/sync/state.js";

function testPatchTouchesSyncedData() {
  assert.equal(patchTouchesSyncedData({ activeView: "shopping" }), false);
  assert.equal(patchTouchesSyncedData({ shoppingList: { items: [] } }), false);
  assert.equal(patchTouchesSyncedData({ meals: [] }), false);
  assert.equal(patchTouchesSyncedData({ plansByWeek: {} }), false);
  for (const field of WEEK_SYNC_FIELDS) {
    assert.equal(patchTouchesSyncedData({ [field]: {} }), false);
    assert.deepEqual(syncedScopesForPatch({ [field]: {} }), []);
  }
  assert.deepEqual(syncedScopesForPatch({ plansByWeek: {}, family: {} }), ["profile"]);
}

function testSyncedScopesForPatch() {
  assert.deepEqual(syncedScopesForPatch({ activeView: "planner" }), []);
  assert.deepEqual(syncedScopesForPatch({ family: {}, shoppingList: {} }), ["profile"]);
  assert.deepEqual(syncedScopesForPatch({ plansByWeek: {}, dayNotesByWeek: {} }), []);
  assert.deepEqual(syncedScopesForPatch({ meals: [], metadata: {} }), ["metadata"]);
  assert.deepEqual(syncedScopesForPatch({ meals: [] }), []);
}

function testRemoteStaleness() {
  assert.equal(shouldDeferRemotePayload({ pendingLocalSync: true, remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), true);
  assert.equal(shouldDeferRemotePayload({ pendingLocalSync: false, remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), false);
  assert.equal(remoteDocumentIsStale({ pendingScopes: new Set(["profile"]), scope: "profile", remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), true);
  assert.equal(remoteDocumentIsStale({ pendingScopes: new Set(["metadata"]), scope: "profile", remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), false);
}

testPatchTouchesSyncedData();
testSyncedScopesForPatch();
testRemoteStaleness();

console.log("sync state tests ok");
