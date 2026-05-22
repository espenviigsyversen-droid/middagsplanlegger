import assert from "node:assert/strict";
import { buildRemoteWrites } from "../../src/sync/writes.js";

function createFakeApi() {
  const calls = [];
  return {
    calls,
    api: {
      doc: (collectionRef, id) => ({ collectionRef, id }),
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

function testBuildDocumentWrites() {
  const { api, calls } = createFakeApi();
  const writes = buildRemoteWrites({
    scopes: ["profile", "shopping", "profile"],
    state: {
      family: { familySize: 4 },
      shoppingList: { items: [{ name: "Pasta" }] },
    },
    refs: { profile: "profile-ref", shopping: "shopping-ref" },
    api,
    updatedAt: "server-time",
    clientUpdatedAt: 123,
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

function testBuildMealWritesAndDeletes() {
  const { api, calls } = createFakeApi();
  buildRemoteWrites({
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
    pendingMealDeleteIds: new Set(["old-meal", "pasta"]),
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0], { type: "delete", ref: { collectionRef: "meals-ref", id: "old-meal" } });
  assert.equal(calls[1].ref.id, "pasta");
  assert.equal(calls[2].ref.id, "taco");
  assert.equal(calls[1].data.clientUpdatedAt, 456);
}

function testBuildWeekWrites() {
  const { api, calls } = createFakeApi();
  buildRemoteWrites({
    scopes: ["weeks"],
    state: {},
    refs: { weeks: "weeks-ref" },
    api,
    updatedAt: "server-time",
    pendingWeekKeys: [],
    currentWeekKey: "2026-05-18",
    weekPayload: (weekKey) => ({ plan: { 0: "pasta" }, clientUpdatedAt: 789, weekKey }),
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].ref, { collectionRef: "weeks-ref", id: "2026-05-18" });
  assert.deepEqual(calls[0].data, { plan: { 0: "pasta" }, clientUpdatedAt: 789, weekKey: "2026-05-18", updatedAt: "server-time" });
}

testBuildDocumentWrites();
testBuildMealWritesAndDeletes();
testBuildWeekWrites();

console.log("sync writes tests ok");
