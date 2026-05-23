import assert from "node:assert/strict";
import {
  buildRemoteWrites,
  remoteClientUpdatedAtFromSnapshot,
  shouldWriteRemoteDocument,
} from "../../src/sync/writes.js";

function createFakeApi(remoteClientUpdatedAtById = {}) {
  const calls = [];
  return {
    calls,
    api: {
      doc: (collectionRef, id) => ({ collectionRef, id }),
      getDoc: async (ref) => {
        const key = typeof ref === "string" ? ref : ref.id;
        const clientUpdatedAt = remoteClientUpdatedAtById[key];
        return {
          exists: () => clientUpdatedAt !== undefined,
          data: () => ({ clientUpdatedAt }),
        };
      },
      setDoc: (ref, data, options) => {
        calls.push({ type: "set", ref, data, options });
        return { type: "set", ref, data, options };
      },
      deleteDoc: (ref) => {
        calls.push({ type: "delete", ref });
        return { type: "delete", ref };
      },
    },
  };
}

async function testBuildDocumentWrites() {
  const { api, calls } = createFakeApi();
  const writes = await buildRemoteWrites({
    scopes: ["profile", "shopping", "profile"],
    state: {
      family: { familySize: 4 },
      shoppingList: { items: [{ name: "Pasta" }] },
    },
    refs: { profile: "profile-ref", shopping: "shopping-ref" },
    api,
    updatedAt: "server-time",
    clientUpdatedAt: 123,
    pendingLocalSync: true,
  });

  assert.equal(writes.length, 2);
  assert.deepEqual(calls[0], {
    type: "set",
    ref: "profile-ref",
    data: { family: { familySize: 4 }, clientUpdatedAt: 123, updatedAt: "server-time" },
    options: { merge: true },
  });
  assert.equal(calls[1].ref, "shopping-ref");
  assert.deepEqual(calls[1].data.shoppingList, { items: [{ name: "Pasta" }] });
}

async function testBuildMealWritesAndDeletes() {
  const { api, calls } = createFakeApi();
  await buildRemoteWrites({
    scopes: ["meals"],
    state: {
      meals: [
        { id: "pasta", title: "Pasta" },
        { id: "taco", title: "Taco" },
      ],
    },
    refs: { meals: "meals-ref" },
    api,
    updatedAt: "server-time",
    clientUpdatedAt: 456,
    pendingLocalSync: true,
    pendingMealDeleteIds: new Set(["old-meal", "pasta"]),
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { type: "delete", ref: { collectionRef: "meals-ref", id: "old-meal" } });
  assert.equal(calls[1].ref.id, "pasta");
  assert.equal(calls[2].ref.id, "taco");
  assert.equal(calls[1].data.clientUpdatedAt, 456);
}

async function testBuildWeekWrites() {
  const { api, calls } = createFakeApi();
  await buildRemoteWrites({
    scopes: ["weeks"],
    state: {},
    refs: { weeks: "weeks-ref" },
    api,
    updatedAt: "server-time",
    pendingLocalSync: true,
    pendingWeekKeys: [],
    currentWeekKey: "2026-05-18",
    weekPayload: (weekKey) => ({ plan: { 0: "pasta" }, clientUpdatedAt: 789, weekKey }),
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].ref, { collectionRef: "weeks-ref", id: "2026-05-18" });
  assert.deepEqual(calls[0].data, { plan: { 0: "pasta" }, clientUpdatedAt: 789, weekKey: "2026-05-18", updatedAt: "server-time" });
}

function testRemoteWriteDecisions() {
  assert.equal(remoteClientUpdatedAtFromSnapshot({ exists: () => false, data: () => ({ clientUpdatedAt: 999 }) }), 0);
  assert.equal(remoteClientUpdatedAtFromSnapshot({ exists: () => true, data: () => ({ clientUpdatedAt: 22 }) }), 22);
  assert.equal(shouldWriteRemoteDocument({ remoteClientUpdatedAt: 200, localClientUpdatedAt: 100, pendingLocalSync: true }), false);
  assert.equal(shouldWriteRemoteDocument({ remoteClientUpdatedAt: 100, localClientUpdatedAt: 200, pendingLocalSync: true }), true);
  assert.equal(shouldWriteRemoteDocument({ remoteClientUpdatedAt: 0, localClientUpdatedAt: 200, pendingLocalSync: false }), false);
  assert.equal(shouldWriteRemoteDocument({ remoteClientUpdatedAt: 0, localClientUpdatedAt: 200, allowMissingRemoteWrite: true }), true);
}

async function testSkipsStaleDocumentWrite() {
  const { api, calls } = createFakeApi({ "profile-ref": 999 });
  const writes = await buildRemoteWrites({
    scopes: ["profile"],
    state: { family: { familySize: 4 } },
    refs: { profile: "profile-ref" },
    api,
    updatedAt: "server-time",
    clientUpdatedAt: 100,
    pendingLocalSync: true,
  });

  assert.equal(writes.length, 0);
  assert.equal(calls.length, 0);
}

async function testSkipsMissingRemoteWithoutPendingSync() {
  const { api, calls } = createFakeApi();
  const writes = await buildRemoteWrites({
    scopes: ["shopping"],
    state: { shoppingList: { items: [{ name: "Pasta" }] } },
    refs: { shopping: "shopping-ref" },
    api,
    updatedAt: "server-time",
    clientUpdatedAt: 100,
    pendingLocalSync: false,
  });

  assert.equal(writes.length, 0);
  assert.equal(calls.length, 0);
}

testRemoteWriteDecisions();
await testBuildDocumentWrites();
await testBuildMealWritesAndDeletes();
await testBuildWeekWrites();
await testSkipsStaleDocumentWrite();
await testSkipsMissingRemoteWithoutPendingSync();

console.log("sync writes tests ok");
