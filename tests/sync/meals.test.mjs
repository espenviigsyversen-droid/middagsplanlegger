import assert from "node:assert/strict";
import { normalizeMeals } from "../../src/domain/meals.js";
import { createMealsSync, diffMeals, mealsFromDocs } from "../../src/sync/meals.js";

const meal = (id, fields = {}) => ({ id, title: id, ingredients: [{ name: "Ris", amount: "2", unit: "dl", group: "Tilbehør" }], steps: ["Kok"], ...fields });
const normalized = value => normalizeMeals([value])[0];
const doc = value => ({ id: value.id, data: () => ({ ...value, updatedAt: "server", clientUpdatedAt: 999 }) });
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

assert.deepEqual(diffMeals([], [meal("a")]), { upserts: [normalized(meal("a"))], removed: [] });
assert.deepEqual(diffMeals([meal("a")], []), { upserts: [], removed: ["a"] });
assert.equal(diffMeals([meal("a")], [meal("a", { title: "Endret" })]).upserts.length, 1);
assert.deepEqual(diffMeals([meal("a"), meal("b")], [meal("b"), meal("a")]), { upserts: [], removed: [] });
assert.deepEqual(diffMeals([meal("a", { recipeUrl: " https://example.com ", baseServings: "4", clientUpdatedAt: 5 })],
  [meal("a", { recipeUrl: "https://example.com", baseServings: 4, updatedAt: 8 })]), { upserts: [], removed: [] });
assert.equal(diffMeals([{ optional: "removed", ...meal("a") }], [meal("a")]).upserts.length, 1);
assert.deepEqual(diffMeals([meal("a")], [{ steps: ["Kok"], ingredients: meal("a").ingredients, title: "a", id: "a" }]), { upserts: [], removed: [] });
const read = mealsFromDocs([doc(meal("b")), { id: "a", data: () => ({ title: "A", updatedAt: 1, clientUpdatedAt: 5 }) }]);
assert.deepEqual(read.map(meal => meal.id), ["a", "b"]);
assert.equal(read[0].updatedAt, undefined); assert.equal(read[0].clientUpdatedAt, undefined);
assert.equal(read[1].ingredients[0].group, "Tilbehør");
assert.equal(mealsFromDocs([{ id: "document", data: () => meal("stored") }])[0].id, "stored");

function connection(write = () => Promise.resolve()) {
  const calls = [], listeners = [];
  return { calls, listeners, refs: { meals: "meals" }, api: {
    doc: (collection, id) => `${collection}/${id}`, serverTimestamp: () => "server",
    getDoc: () => { throw new Error("Recipe writes must not read documents"); },
    setDoc: (...args) => { calls.push(["set", ...args]); return write(...args); },
    deleteDoc: (...args) => { calls.push(["delete", ...args]); return write(...args); },
    onSnapshot: (ref, options, next, error) => {
      assert.deepEqual(options, { includeMetadataChanges: true });
      const listener = { next, error, stopped: false }; listeners.push(listener);
      return () => { listener.stopped = true; };
    },
  }, snapshot: (meals, metadata = {}, index = listeners.length - 1) => listeners[index].next({ docs: meals.map(doc), metadata: { fromCache: false, hasPendingWrites: false, ...metadata } }),
  };
}
const statuses = [], received = [], ack = deferred();
const con = connection(() => ack.promise);
const sync = createMealsSync({ onStatus: status => statuses.push(status), onMeals: meals => received.push(meals) });
await sync.start(con);
con.snapshot([meal("a"), meal("b")], { fromCache: true }); assert.equal(received.length, 0);
con.snapshot([meal("a"), meal("b")]); assert.equal(statuses.at(-1), "Synket");
sync.enqueue(diffMeals([meal("a"), meal("b")], [meal("a", { title: "Lokal A" }), meal("b")]));
assert.equal(con.calls.length, 1); assert.equal(con.calls[0].length, 3, "No merge option");
assert.equal(con.calls[0][2].clientUpdatedAt, undefined); assert.equal(con.calls[0][2].updatedAt, "server");
con.snapshot([meal("a"), meal("b", { title: "Fjern B" })], { hasPendingWrites: true });
assert.deepEqual(received.at(-1).map(meal => meal.title), ["Lokal A", "Fjern B"]);
assert.equal(statuses.at(-1), "Synker");
ack.resolve(); await settle();
// A write acknowledgement alone cannot let an old cached A overwrite the edit.
con.snapshot([meal("a"), meal("b", { title: "Fjern B" })], { fromCache: true });
assert.equal(received.at(-1)[0].title, "Lokal A");
con.snapshot([meal("a", { title: "Lokal A" }), meal("b", { title: "Fjern B" })]);
assert.equal(statuses.at(-1), "Synket");
assert.deepEqual(received.at(-1).map(meal => meal.title), ["Lokal A", "Fjern B"]);
con.snapshot([meal("a", { title: "Neste fjernendring" }), meal("b")]);
assert.equal(received.at(-1)[0].title, "Neste fjernendring", "Confirmed edits must not hide future remote edits");
con.snapshot([]); assert.deepEqual(received.at(-1), []);

const queued = createMealsSync(), queueCon = connection();
queued.enqueue(diffMeals([], [meal("q")]));
queued.enqueue(diffMeals([meal("q")], [meal("q", { favorite: true })]));
queued.enqueue(diffMeals([meal("q", { favorite: true })], []));
assert.equal(queueCon.calls.length, 0);
await queued.start(queueCon); assert.deepEqual(queueCon.calls.map(call => call[0]), ["set", "set", "delete"]);
assert.equal(queueCon.calls[1][2].favorite, true); assert.equal(queueCon.calls[2][1], "meals/q");

// A server snapshot can confirm before the write promise settles, but pending stays visible.
const earlyAck = deferred(), earlyCon = connection(() => earlyAck.promise), earlyStatuses = [];
const early = createMealsSync({ onStatus: status => earlyStatuses.push(status) });
await early.start(earlyCon); early.enqueue(diffMeals([], [meal("early")])); earlyCon.snapshot([meal("early")]);
assert.equal(earlyStatuses.at(-1), "Synker"); earlyAck.resolve(); await settle(); assert.equal(earlyStatuses.at(-1), "Synket");

// Another device can overwrite our acknowledged write before its server image arrives.
// An authoritative image retires the operation regardless of its contents, in either order.
for (const snapshotFirst of [false, true]) {
  const ack = deferred(), con = connection(() => ack.promise), received = [], statuses = [];
  const sync = createMealsSync({ onMeals: meals => received.push(meals), onStatus: status => statuses.push(status) });
  await sync.start(con); con.snapshot([meal("a", { title: "A0" })]);
  sync.enqueue({ upserts: [meal("a", { title: "A1" })] });
  con.snapshot([meal("a", { title: "A1" })], { hasPendingWrites: true });
  assert.equal(statuses.at(-1), "Synker");
  if (snapshotFirst) {
    con.snapshot([meal("a", { title: "A-annen" })]);
    assert.equal(received.at(-1)[0].title, "A1"); assert.equal(statuses.at(-1), "Synker");
    ack.resolve(); await settle();
  } else {
    ack.resolve(); await settle(); assert.equal(statuses.at(-1), "Synker");
    con.snapshot([meal("a", { title: "A-annen" })]);
  }
  assert.equal(received.at(-1)[0].title, "A-annen", `Other writer visible (snapshotFirst=${snapshotFirst})`);
  assert.equal(statuses.at(-1), "Synket");
  con.snapshot([meal("a", { title: "Senere fjernendring" })]);
  assert.equal(received.at(-1)[0].title, "Senere fjernendring"); assert.equal(statuses.at(-1), "Synket");
  sync.stop();
}

// A previously received authoritative image cannot retire an operation queued afterwards.
const oldAck = deferred(), oldCon = connection(() => oldAck.promise), oldReceived = [], oldStatuses = [];
const old = createMealsSync({ onMeals: meals => oldReceived.push(meals), onStatus: status => oldStatuses.push(status) });
await old.start(oldCon); oldCon.snapshot([meal("a", { title: "A0" })]);
old.enqueue({ upserts: [meal("a", { title: "A1" })] });
oldAck.resolve(); await settle(); assert.equal(oldStatuses.at(-1), "Synker");
oldCon.snapshot([meal("a", { title: "A0" })], { fromCache: true });
assert.equal(oldReceived.at(-1)[0].title, "A1"); assert.equal(oldStatuses.at(-1), "Synker");
oldCon.snapshot([meal("a", { title: "A0" })], { hasPendingWrites: true });
assert.equal(oldReceived.at(-1)[0].title, "A1"); assert.equal(oldStatuses.at(-1), "Synker");
oldCon.snapshot([meal("a", { title: "A1" })]);
assert.equal(oldReceived.at(-1)[0].title, "A1"); assert.equal(oldStatuses.at(-1), "Synket");
old.stop();

// The same sequence rule covers deletion, including a recipe recreated by another device.
for (const recreated of [false, true]) {
  for (const snapshotFirst of [false, true]) {
    const ack = deferred(), con = connection(() => ack.promise), received = [], statuses = [];
    const sync = createMealsSync({ onMeals: meals => received.push(meals), onStatus: status => statuses.push(status) });
    await sync.start(con); con.snapshot([meal("a")]);
    sync.enqueue({ removed: ["a"] });
    con.snapshot([], { hasPendingWrites: true });
    assert.deepEqual(received.at(-1), []); assert.equal(statuses.at(-1), "Synker");
    const remote = recreated ? [meal("a", { title: "Opprettet på nytt" })] : [];
    if (snapshotFirst) {
      con.snapshot(remote); assert.deepEqual(received.at(-1), []);
      ack.resolve(); await settle();
    } else {
      ack.resolve(); await settle(); assert.equal(statuses.at(-1), "Synker");
      con.snapshot(remote);
    }
    assert.deepEqual(received.at(-1), normalizeMeals(remote)); assert.equal(statuses.at(-1), "Synket");
    assert.deepEqual(con.calls.map(call => call.slice(0, 2)), [["delete", "meals/a"]]);
    sync.stop();
  }
}

// Replacing an operation for the same ID must use the newest acknowledgement and baseline.
const firstAck = deferred(), secondAck = deferred(), latestAcks = [firstAck, secondAck], latestReceived = [], latestStatuses = [];
const latestCon = connection(() => latestAcks.shift().promise);
const latest = createMealsSync({ onMeals: meals => latestReceived.push(meals), onStatus: status => latestStatuses.push(status) });
await latest.start(latestCon); latestCon.snapshot([meal("a", { title: "A0" })]);
latest.enqueue({ upserts: [meal("a", { title: "A1" })] });
latestCon.snapshot([meal("a", { title: "A1" })]);
latest.enqueue({ upserts: [meal("a", { title: "A2" })] });
firstAck.resolve(); await settle(); assert.equal(latestStatuses.at(-1), "Synker");
latestCon.snapshot([meal("a", { title: "A-annen" })]);
assert.equal(latestReceived.at(-1)[0].title, "A2"); assert.equal(latestStatuses.at(-1), "Synker");
secondAck.resolve(); await settle();
assert.equal(latestReceived.at(-1)[0].title, "A-annen"); assert.equal(latestStatuses.at(-1), "Synket");
latest.stop();

const errorAck = deferred(), errorCon = connection(() => errorAck.promise), errors = [], failedReceived = [];
const failed = createMealsSync({ onStatus: status => errors.push(status), onMeals: meals => failedReceived.push(meals) });
await failed.start(errorCon); errorCon.snapshot([]); failed.enqueue(diffMeals([], [meal("bad")]));
errorAck.reject(new Error("write failed")); await settle(); assert.equal(errors.at(-1), "Synk feilet");
errorCon.snapshot([meal("bad", { title: "Fjern versjon" })]);
assert.equal(failedReceived.at(-1)[0].title, "bad"); assert.equal(errors.at(-1), "Synk feilet");
const beforeStop = errors.length; failed.stop(); errorCon.snapshot([]); assert.equal(errors.length, beforeStop);
await failed.start(errorCon); errorCon.snapshot([]); assert.equal(errors.at(-1), "Synket");
assert.equal(errorCon.calls.length, 1, "Restart does not replay failed writes");
errorCon.listeners.at(-1).error(new Error("listen failed")); assert.equal(errors.at(-1), "Synk feilet");

const cancelled = createMealsSync(), cancelledCon = connection();
cancelled.enqueue(diffMeals([], [meal("discard")])); const starting = cancelled.start(cancelledCon); cancelled.stop();
assert.equal(await starting, false); await cancelled.start(cancelledCon); assert.equal(cancelledCon.calls.length, 0);
const lateAck = deferred(), lateCon = connection(() => lateAck.promise), lateStatuses = [];
const late = createMealsSync({ onStatus: status => lateStatuses.push(status) });
await late.start(lateCon); late.enqueue(diffMeals([], [meal("old-account")])); late.stop();
await late.start(lateCon); lateCon.snapshot([]); const length = lateStatuses.length;
lateAck.reject(new Error("old failure")); await settle(); assert.equal(lateStatuses.length, length);
assert.equal(lateCon.calls.length, 1); assert.equal(lateCon.listeners[0].stopped, true);
console.log("meals sync tests ok (per document, queue, snapshots, acknowledgements, generations)");
for (const atAck of [false, true]) {
  let throws = false, delivered = 0; const statuses = [], write = deferred(), con = connection(() => write.promise);
  const sync = createMealsSync({ onMeals: () => { if (throws) throw new Error("Consumer failed"); delivered++; }, onStatus: status => statuses.push(status) });
  await sync.start(con);
  con.snapshot([meal("a")]);
  if (atAck) {
    sync.enqueue(diffMeals([meal("a")], [meal("a", { title: "Edited" })]));
    con.snapshot([meal("a", { title: "Edited" })]); throws = true;
    write.resolve(); await settle();
  } else { throws = true; assert.doesNotThrow(() => con.snapshot([meal("a")])); }
  assert.equal(statuses.at(-1), "Synk feilet");
  const count = delivered; throws = false;
  assert.doesNotThrow(() => con.snapshot([meal("a", { title: "Next snapshot" })]));
  assert.equal(delivered, count + 1); assert.equal(statuses.at(-1), "Synket"); sync.stop();
}
