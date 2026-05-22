import assert from "node:assert/strict";
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
  assert.equal(calls.filter(([type]) => type === "collection").length, 2);
}

testCreateRemoteRefs();

console.log("sync firebase tests ok");
