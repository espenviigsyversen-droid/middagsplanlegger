import {
  emptyWeekPlan, emptyWeekLocks, emptyWeekDayTypes, emptyWeekServings,
  emptyWeekDayModes, emptyWeekDayNotes,
} from "../domain/weeks.js";

export const WEEK_FIELDS = {
  plansByWeek: "plan", lockedPlansByWeek: "lockedPlan", dayTypesByWeek: "dayTypes",
  servingsByWeek: "servings", dayModesByWeek: "dayModes", dayNotesByWeek: "dayNotes",
};
const defaults = familySize => ({
  plan: emptyWeekPlan(), lockedPlan: emptyWeekLocks(), dayTypes: emptyWeekDayTypes(),
  servings: emptyWeekServings(familySize), dayModes: emptyWeekDayModes(), dayNotes: emptyWeekDayNotes(),
});
const weekKeys = state => [...new Set(Object.keys(WEEK_FIELDS).flatMap(field => Object.keys(state?.[field] || {})))].sort();

export function diffWeeks(prev = {}, next = {}, familySize = next.family?.familySize ?? prev.family?.familySize ?? 5) {
  const changes = {}, standard = defaults(familySize);
  for (const weekKey of [...new Set([...weekKeys(prev), ...weekKeys(next)])].sort()) {
    for (const [stateField, field] of Object.entries(WEEK_FIELDS)) {
      for (let day = 0; day < 7; day++) {
        const before = prev[stateField]?.[weekKey]?.[day] ?? standard[field][day];
        const after = next[stateField]?.[weekKey]?.[day] ?? standard[field][day];
        if (!Object.is(before, after)) ((changes[weekKey] ??= {})[field] ??= {})[day] = after;
      }
    }
  }
  return changes;
}

export function weeksFromDocs(docs = [], familySize = 5) {
  const result = Object.fromEntries(Object.keys(WEEK_FIELDS).map(field => [field, {}]));
  const standard = defaults(familySize);
  for (const doc of [...docs].sort((a, b) => a.id.localeCompare(b.id))) {
    const data = doc.data();
    for (const [stateField, field] of Object.entries(WEEK_FIELDS)) {
      result[stateField][doc.id] = Object.fromEntries(Array.from({ length: 7 }, (_, day) =>
        [day, data[field]?.[day] ?? standard[field][day]]));
    }
  }
  return result;
}

export function createWeeksSync({ onWeeks = () => {}, onStatus = () => {}, getFamilySize = () => 5,
  setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let api, refs, starting, unsubscribe;
  let ready = false, stopped = false, serverSeen = false, failed = false;
  let deliveryFailed = false;
  let generation = 0, pending = 0, snapshotSequence = 0, lastSnapshot = null;
  const local = new Map(), staged = new Map();
  const publishStatus = () => onStatus(failed || deliveryFailed ? "Synk feilet"
    : pending || local.size || !serverSeen ? "Synker" : "Synket");

  function deliverWeeks() {
    try { onWeeks(currentWeeks()); deliveryFailed = false; }
    catch { deliveryFailed = true; }
    finally { publishStatus(); }
  }

  function currentWeeks() {
    const result = structuredClone(lastSnapshot.weeks), standard = defaults(getFamilySize());
    for (const operation of local.values()) {
      for (const [stateField, field] of Object.entries(WEEK_FIELDS)) {
        result[stateField][operation.weekKey] ??= { ...standard[field] };
        if (field === operation.field) result[stateField][operation.weekKey][operation.day] = operation.value;
      }
    }
    return result;
  }

  function retireConfirmed() {
    if (!lastSnapshot?.authoritative) return false;
    let retired = false;
    for (const [key, operation] of local) {
      if (operation.acknowledged && lastSnapshot.sequence > operation.snapshotSequence) {
        local.delete(key); retired = true;
      }
    }
    return retired;
  }

  function flush(weekKey) {
    const entry = staged.get(weekKey);
    if (!entry) return;
    entry.due = true;
    if (!ready || stopped) return;
    clearTimer(entry.timer);
    staged.delete(weekKey);
    const token = generation, operations = [...entry.operations.values()], changes = {};
    for (const operation of operations) {
      operation.snapshotSequence = snapshotSequence;
      (changes[operation.field] ??= {})[operation.day] = operation.value;
    }
    pending += 1;
    let result;
    try {
      result = api.setDoc(api.doc(refs.weeks, weekKey), { ...changes, updatedAt: api.serverTimestamp() }, { merge: true });
    } catch (error) { result = Promise.reject(error); }
    Promise.resolve(result).then(() => {
      if (token !== generation || stopped) return;
      operations.forEach(operation => { operation.acknowledged = true; });
      if (retireConfirmed()) deliverWeeks();
    }).catch(() => {
      if (token === generation && !stopped) failed = true;
    }).finally(() => {
      if (token !== generation || stopped) return;
      pending -= 1; publishStatus();
    });
  }

  function enqueue(changes = {}) {
    if (stopped) return;
    let changed = false;
    for (const [weekKey, fields] of Object.entries(changes)) {
      for (const field of Object.values(WEEK_FIELDS)) {
        for (const [day, value] of Object.entries(fields[field] || {})) {
          if (!/^[0-6]$/.test(day)) continue;
          changed = true;
          const key = JSON.stringify([weekKey, field, day]);
          const operation = { weekKey, field, day, value, acknowledged: false, snapshotSequence: null };
          local.set(key, operation);
          let entry = staged.get(weekKey);
          if (!entry) {
            const token = generation;
            entry = { operations: new Map(), due: false,
              timer: setTimer(() => { if (token === generation && !stopped) flush(weekKey); }, 500) };
            staged.set(weekKey, entry);
          }
          entry.operations.set(key, operation);
        }
      }
    }
    if (changed) publishStatus();
  }

  async function start(connection) {
    if (starting) return starting;
    ({ api, refs } = connection);
    stopped = false;
    const token = generation;
    starting = (async () => {
      publishStatus();
      await Promise.resolve();
      if (token !== generation || stopped) return false;
      try {
        ready = true;
        for (const [weekKey, entry] of staged) if (entry.due) flush(weekKey);
        const stopListener = api.onSnapshot(refs.weeks, { includeMetadataChanges: true }, snapshot => {
          if (token !== generation || stopped) return;
          snapshotSequence += 1;
          if (snapshot.metadata?.fromCache && !serverSeen) return;
          if (!snapshot.metadata?.fromCache) serverSeen = true;
          lastSnapshot = { weeks: weeksFromDocs(snapshot.docs, getFamilySize()), sequence: snapshotSequence,
            authoritative: !snapshot.metadata?.fromCache && !snapshot.metadata?.hasPendingWrites };
          retireConfirmed(); deliverWeeks();
        }, () => {
          if (token === generation && !stopped) { failed = true; publishStatus(); }
        });
        if (token !== generation || stopped) { stopListener?.(); return false; }
        unsubscribe = stopListener;
        return true;
      } catch {
        if (token !== generation || stopped) return false;
        ready = false; failed = true; publishStatus(); return false;
      }
    })();
    return starting;
  }

  function stop() {
    generation += 1;
    stopped = true; ready = false; serverSeen = false; failed = false; deliveryFailed = false;
    for (const entry of staged.values()) clearTimer(entry.timer);
    staged.clear(); local.clear(); pending = 0; snapshotSequence = 0; lastSnapshot = null; starting = null;
    unsubscribe?.(); unsubscribe = null;
  }
  return { enqueue, start, stop };
}
