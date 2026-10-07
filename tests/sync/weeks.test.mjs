import assert from "node:assert/strict";
import { createWeeksSync, diffWeeks, weeksFromDocs } from "../../src/sync/weeks.js";
import { emptyWeekPlan, emptyWeekLocks, emptyWeekDayTypes, emptyWeekServings, emptyWeekDayModes, emptyWeekDayNotes } from "../../src/domain/weeks.js";

const w = "2026-10-05", other = "2026-10-12";
const doc = (id, data) => ({ id, data: () => data });
const state = (data = {}, id = w) => weeksFromDocs([doc(id, data)], 4);
assert.deepEqual(diffWeeks(state(), state({ plan: { 1: "taco" } })), { [w]: { plan: { 1: "taco" } } });
assert.deepEqual(diffWeeks(state(), state({ plan: { 1: "taco" }, lockedPlan: { 1: true }, servings: { 1: 3 } }), 4),
  { [w]: { plan: { 1: "taco" }, lockedPlan: { 1: true }, servings: { 1: 3 } } });
assert.deepEqual(diffWeeks({}, { plansByWeek: { [w]: { 1: "a" }, [other]: { 4: "b" } } }),
  { [w]: { plan: { 1: "a" } }, [other]: { plan: { 4: "b" } } });
assert.deepEqual(diffWeeks(state({ plan: { 1: "a" }, lockedPlan: { 1: true }, dayTypes: { 2: "weekend" }, servings: { 3: 2 }, dayModes: { 4: "away" }, dayNotes: { 5: "Note" } }), state(), 4),
  { [w]: { plan: { 1: "" }, lockedPlan: { 1: false }, dayTypes: { 2: "weekday" }, servings: { 3: 4 }, dayModes: { 4: "home" }, dayNotes: { 5: "" } } });
assert.deepEqual(diffWeeks(state(), {} ,4), {});
assert.deepEqual(diffWeeks({}, state(), 4), {});
assert.deepEqual(diffWeeks(state(), state(), 4), {});
const read = state({ plan: { 1: "a" }, clientUpdatedAt: 999, updatedAt: 888 });
assert.deepEqual(Object.keys(read), ["plansByWeek", "lockedPlansByWeek", "dayTypesByWeek", "servingsByWeek", "dayModesByWeek", "dayNotesByWeek"]);
assert.deepEqual(read.plansByWeek[w], { ...emptyWeekPlan(), 1: "a" });
assert.deepEqual(read.lockedPlansByWeek[w], emptyWeekLocks());
assert.deepEqual(read.dayTypesByWeek[w], emptyWeekDayTypes());
assert.deepEqual(read.servingsByWeek[w], emptyWeekServings(4));
assert.deepEqual(read.dayModesByWeek[w], emptyWeekDayModes());
assert.deepEqual(read.dayNotesByWeek[w], emptyWeekDayNotes());
assert.deepEqual(weeksFromDocs([], 4), Object.fromEntries(Object.keys(read).map(field => [field, {}])));

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
let now = 0, timerId = 0;
const timers = new Map();
globalThis.setTimeout = (callback, delay) => { const id = ++timerId; timers.set(id, { callback, at: now + delay }); return id; };
globalThis.clearTimeout = id => timers.delete(id);
function advance(ms) {
  const end = now + ms;
  while (true) {
    const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
    if (!next) break;
    now = next[1].at; timers.delete(next[0]); next[1].callback();
  }
  now = end;
}
function fixture(write = () => Promise.resolve(), onWeeks) {
  const calls = [], received = [], statuses = [], listeners = [];
  const connection = { refs: { weeks: "weeks" }, api: {
    doc: (collection, id) => `${collection}/${id}`, serverTimestamp: () => "server",
    getDoc: () => { throw new Error("Must not read before writing"); },
    deleteDoc: () => { throw new Error("Must not delete weeks"); },
    setDoc: (...args) => { calls.push(args); return write(...args); },
    onSnapshot: (ref, options, next, error) => {
      assert.deepEqual(options, { includeMetadataChanges: true });
      const listener = { next, error, stopped: false }; listeners.push(listener); return () => { listener.stopped = true; };
    },
  } };
  const sync = createWeeksSync({ onWeeks: weeks => { onWeeks?.(weeks); received.push(weeks); }, onStatus: status => statuses.push(status), getFamilySize: () => 4 });
  return { sync, calls, received, statuses, listeners, start: () => sync.start(connection),
    snapshot: (data = {}, metadata = {}, index = listeners.length - 1) => listeners[index].next({ docs: Object.entries(data).map(([id, data]) => doc(id, data)), metadata: { fromCache: false, hasPendingWrites: false, ...metadata } }) };
}
try {
  const merged = fixture(); await merged.start(); merged.snapshot({ [w]: {} });
  merged.sync.enqueue({ [w]: { plan: { 1: "a" }, dayNotes: { 1: "først" } } });
  advance(300); merged.sync.enqueue({ [w]: { plan: { 1: "b", 4: "c" }, dayNotes: { 2: "andre" } } });
  advance(199); assert.equal(merged.calls.length, 0); advance(1);
  assert.deepEqual(merged.calls, [[`weeks/${w}`, { plan: { 1: "b", 4: "c" }, dayNotes: { 1: "først", 2: "andre" }, updatedAt: "server" }, { merge: true }]]);
  await settle(); assert.equal(merged.statuses.at(-1), "Synker");
  merged.snapshot({ [w]: { plan: { 1: "b", 4: "c" }, dayNotes: { 1: "først", 2: "andre" } } });
  assert.equal(merged.statuses.at(-1), "Synket"); merged.sync.stop();

  const ack = deferred(), concurrent = fixture(() => ack.promise); await concurrent.start();
  concurrent.snapshot({ [w]: { plan: { 1: "a0" } } }, { fromCache: true }); assert.equal(concurrent.received.length, 0);
  concurrent.snapshot({ [w]: { plan: { 1: "a0" } } });
  concurrent.sync.enqueue({ [w]: { plan: { 1: "lokal" } } }); advance(500);
  concurrent.snapshot({ [w]: { plan: { 1: "a0", 4: "fjern" } } }, { hasPendingWrites: true });
  assert.equal(concurrent.received.at(-1).plansByWeek[w][1], "lokal"); assert.equal(concurrent.received.at(-1).plansByWeek[w][4], "fjern");
  ack.resolve(); await settle(); assert.equal(concurrent.statuses.at(-1), "Synker");
  concurrent.snapshot({ [w]: { plan: { 1: "lokal", 4: "fjern" } } });
  assert.equal(concurrent.received.at(-1).plansByWeek[w][1], "lokal"); assert.equal(concurrent.received.at(-1).plansByWeek[w][4], "fjern");
  assert.equal(concurrent.statuses.at(-1), "Synket"); concurrent.snapshot({});
  assert.equal(concurrent.received.at(-1).plansByWeek[w], undefined); concurrent.sync.stop();

  for (const snapshotFirst of [false, true]) {
    const ack = deferred(), f = fixture(() => ack.promise); await f.start(); f.snapshot({ [w]: { plan: { 1: "a0" } } });
    f.sync.enqueue({ [w]: { plan: { 1: "a1" } } }); advance(500);
    if (snapshotFirst) {
      f.snapshot({ [w]: { plan: { 1: "annen" } } }); assert.equal(f.received.at(-1).plansByWeek[w][1], "a1");
      ack.resolve(); await settle();
    } else {
      ack.resolve(); await settle(); assert.equal(f.statuses.at(-1), "Synker");
      f.snapshot({ [w]: { plan: { 1: "annen" } } });
    }
    assert.equal(f.received.at(-1).plansByWeek[w][1], "annen"); assert.equal(f.statuses.at(-1), "Synket"); f.sync.stop();
  }

  const old = fixture(); await old.start(); old.snapshot({ [w]: { plan: { 1: "før" } } });
  old.sync.enqueue({ [w]: { plan: { 1: "etter" } } }); advance(500); await settle();
  assert.equal(old.statuses.at(-1), "Synker");
  old.snapshot({ [w]: {} }, { fromCache: true }); assert.equal(old.received.at(-1).plansByWeek[w][1], "etter");
  old.snapshot({ [w]: {} }, { hasPendingWrites: true }); assert.equal(old.received.at(-1).plansByWeek[w][1], "etter");
  old.snapshot({ [w]: { plan: { 1: "etter" } } }); assert.equal(old.statuses.at(-1), "Synket"); old.sync.stop();

  // Later change to the same cell supersedes the old operation; other cells retire independently.
  const first = deferred(), second = deferred(), acks = [first, second], latest = fixture(() => acks.shift().promise);
  await latest.start(); latest.snapshot({ [w]: {} });
  latest.sync.enqueue({ [w]: { plan: { 1: "først" }, dayNotes: { 4: "notat" } } }); advance(500);
  latest.sync.enqueue({ [w]: { plan: { 1: "sist" } } });
  latest.snapshot({ [w]: { plan: { 1: "annen" }, dayNotes: { 4: "fjernnotat" } } });
  first.resolve(); await settle();
  assert.equal(latest.received.at(-1).plansByWeek[w][1], "sist"); assert.equal(latest.received.at(-1).dayNotesByWeek[w][4], "fjernnotat");
  advance(500); second.resolve(); await settle(); assert.equal(latest.statuses.at(-1), "Synker");
  latest.snapshot({ [w]: { plan: { 1: "sist" }, dayNotes: { 4: "fjernnotat" } } });
  assert.equal(latest.statuses.at(-1), "Synket"); latest.sync.stop();

  // An authoritative snapshot received during the 500 ms queue cannot confirm the later write.
  for (const snapshotFirst of [false, true]) {
    const ack = deferred(), f = fixture(() => ack.promise); await f.start(); f.snapshot({ [w]: { plan: { 1: "før" } } });
    f.sync.enqueue({ [w]: { plan: { 1: "lokal" } } }); advance(250);
    f.snapshot({ [w]: { plan: { 1: "før", 4: "fjern" } } });
    assert.equal(f.calls.length, 0); assert.equal(f.received.at(-1).plansByWeek[w][1], "lokal");
    advance(250);
    if (snapshotFirst) f.snapshot({ [w]: { plan: { 1: "nyere", 4: "fjern" } } });
    ack.resolve(); await settle();
    if (!snapshotFirst) {
      assert.equal(f.statuses.at(-1), "Synker"); assert.equal(f.received.at(-1).plansByWeek[w][1], "lokal");
      f.snapshot({ [w]: { plan: { 1: "nyere", 4: "fjern" } } });
    }
    assert.equal(f.statuses.at(-1), "Synket"); assert.equal(f.received.at(-1).plansByWeek[w][1], "nyere");
    assert.equal(f.received.at(-1).plansByWeek[w][4], "fjern"); f.sync.stop();
  }

  const rejected = deferred(), failed = fixture(() => rejected.promise); await failed.start(); failed.snapshot({ [w]: {} });
  failed.sync.enqueue({ [w]: { dayNotes: { 2: "lokalt" } } }); advance(500); rejected.reject(new Error("failed")); await settle();
  failed.snapshot({ [w]: { dayNotes: { 2: "fjern" } } });
  assert.equal(failed.received.at(-1).dayNotesByWeek[w][2], "lokalt"); assert.equal(failed.statuses.at(-1), "Synk feilet"); failed.sync.stop();

  const queued = fixture(); queued.sync.enqueue({ [w]: { plan: { 1: "klar" } } }); advance(500);
  assert.equal(queued.calls.length, 0); await queued.start(); assert.equal(queued.calls.length, 1); queued.sync.stop();
  const stopped = fixture(); await stopped.start(); stopped.sync.enqueue({ [w]: { plan: { 1: "forkast" } } });
  const oldTimer = [...timers.values()].at(-1).callback; stopped.sync.stop(); await stopped.start(); oldTimer(); advance(500);
  stopped.snapshot({}); assert.equal(stopped.calls.length, 0); assert.equal(stopped.statuses.at(-1), "Synket");
  const count = stopped.received.length; stopped.snapshot({ [w]: {} }, {}, 0); assert.equal(stopped.received.length, count);
  stopped.listeners.at(-1).error(new Error("listen failed")); assert.equal(stopped.statuses.at(-1), "Synk feilet"); stopped.sync.stop();
  const lateAck = deferred(), late = fixture(() => lateAck.promise); await late.start(); late.sync.enqueue({ [w]: { plan: { 1: "gammel" } } }); advance(500);
  late.sync.stop(); await late.start(); late.snapshot({}); const statuses = late.statuses.length;
  lateAck.reject(new Error("old account")); await settle(); assert.equal(late.statuses.length, statuses); late.sync.stop();
  for (const atAck of [false, true]) {
    let throws = false; const write = deferred();
    const f = fixture(() => write.promise, () => { if (throws) throw new Error("Consumer failed"); });
    await f.start(); f.snapshot({ [w]: {} });
    if (atAck) {
      f.sync.enqueue({ [w]: { plan: { 1: "a" } } }); advance(500);
      f.snapshot({ [w]: { plan: { 1: "a" } } }); throws = true; write.resolve(); await settle();
    } else { throws = true; assert.doesNotThrow(() => f.snapshot({ [w]: {} })); }
    assert.equal(f.statuses.at(-1), "Synk feilet");
    const count = f.received.length; throws = false;
    assert.doesNotThrow(() => f.snapshot({ [w]: { plan: { 4: "next" } } }));
    assert.equal(f.received.length, count + 1); assert.equal(f.statuses.at(-1), "Synket"); f.sync.stop();
  }
  assert.equal(timers.size, 0);
} finally {
  globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear;
}
console.log("weeks sync tests ok (day/field diffs, merge, coalescing, overlays, acknowledgements and stop)");
