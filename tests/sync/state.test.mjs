import assert from "node:assert/strict";
import {
  changedWeekKeys,
  patchTouchesSyncedData,
  remoteDocumentIsStale,
  shouldDeferRemotePayload,
  syncedScopesForPatch,
} from "../../src/sync/state.js";

function testPatchTouchesSyncedData() {
  assert.equal(patchTouchesSyncedData({ activeView: "shopping" }), false);
  assert.equal(patchTouchesSyncedData({ shoppingList: { items: [] } }), false);
  assert.equal(patchTouchesSyncedData({ plansByWeek: {} }), true);
}

function testSyncedScopesForPatch() {
  assert.deepEqual(syncedScopesForPatch({ activeView: "planner" }), []);
  assert.deepEqual(syncedScopesForPatch({ family: {}, shoppingList: {} }), ["profile"]);
  assert.deepEqual(syncedScopesForPatch({ plansByWeek: {}, dayNotesByWeek: {} }), ["weeks"]);
  assert.deepEqual(syncedScopesForPatch({ meals: [], metadata: {} }), ["metadata", "meals"]);
}

function testChangedWeekKeys() {
  const previousState = {
    plansByWeek: {
      "2026-05-18": { 0: "pasta" },
      "2026-05-25": { 0: "taco" },
    },
  };
  const currentState = {
    plansByWeek: {
      "2026-05-18": { 0: "pasta" },
      "2026-05-25": { 0: "fisk" },
    },
  };
  assert.deepEqual(changedWeekKeys({ plansByWeek: currentState.plansByWeek }, previousState, currentState, "fallback"), ["2026-05-25"]);
  assert.deepEqual(changedWeekKeys({ plansByWeek: {} }, { plansByWeek: {} }, { plansByWeek: {} }, "fallback"), ["fallback"]);
  assert.deepEqual(changedWeekKeys({ shoppingList: {} }, previousState, currentState, "fallback"), []);
}

function testRemoteStaleness() {
  assert.equal(shouldDeferRemotePayload({ pendingLocalSync: true, remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), true);
  assert.equal(shouldDeferRemotePayload({ pendingLocalSync: false, remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), false);
  assert.equal(remoteDocumentIsStale({ pendingScopes: new Set(["weeks"]), scope: "weeks", remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), true);
  assert.equal(remoteDocumentIsStale({ pendingScopes: new Set(["meals"]), scope: "weeks", remoteClientUpdatedAt: 10, localClientUpdatedAt: 20 }), false);
}

testPatchTouchesSyncedData();
testSyncedScopesForPatch();
testChangedWeekKeys();
testRemoteStaleness();

console.log("sync state tests ok");
