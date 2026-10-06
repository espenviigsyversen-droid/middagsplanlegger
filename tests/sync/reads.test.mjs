import assert from "node:assert/strict";
import {
  buildWeeksRemotePatch,
  maxClientUpdatedAtFromDocs,
} from "../../src/sync/reads.js";

function fakeDoc(id, data) {
  return { id, data: () => data };
}

function testMaxClientUpdatedAt() {
  assert.equal(maxClientUpdatedAtFromDocs([]), 0);
  assert.equal(maxClientUpdatedAtFromDocs([
    fakeDoc("a", { clientUpdatedAt: 10 }),
    fakeDoc("b", { clientUpdatedAt: 25 }),
    fakeDoc("c", {}),
  ]), 25);
}

function testBuildWeeksRemotePatch() {
  const patch = buildWeeksRemotePatch({
    docs: [
      fakeDoc("2026-05-18", {
        plan: { 0: "pasta" },
        lockedPlan: { 0: true },
        servings: { 0: 5 },
        clientUpdatedAt: 30,
      }),
    ],
    currentState: {
      plansByWeek: { "2026-05-11": { 1: "taco" } },
    },
    familySize: 4,
    defaults: {
      emptyWeekPlan: () => ({ 0: "", 1: "" }),
      emptyWeekLocks: () => ({ 0: false, 1: false }),
      emptyWeekDayTypes: () => ({ 0: "weekday" }),
      emptyWeekServings: (familySize) => ({ 0: familySize }),
      emptyWeekDayModes: () => ({ 0: "home" }),
      emptyWeekDayNotes: () => ({ 0: "" }),
    },
  });

  assert.equal(patch.clientUpdatedAt, 30);
  assert.deepEqual(patch.plansByWeek["2026-05-11"], { 1: "taco" });
  assert.deepEqual(patch.plansByWeek["2026-05-18"], { 0: "pasta", 1: "" });
  assert.deepEqual(patch.lockedPlansByWeek["2026-05-18"], { 0: true, 1: false });
  assert.deepEqual(patch.servingsByWeek["2026-05-18"], { 0: 5 });
  assert.deepEqual(patch.dayModesByWeek["2026-05-18"], { 0: "home" });
}

testMaxClientUpdatedAt();
testBuildWeeksRemotePatch();

console.log("sync reads tests ok");
