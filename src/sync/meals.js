import { normalizeMeals } from "../domain/meals.js";

function contentKey(value) {
  const stable = item => Array.isArray(item) ? item.map(stable)
    : item && typeof item === "object" ? Object.fromEntries(Object.keys(item).sort().map(key => [key, stable(item[key])])) : item;
  return JSON.stringify(stable(value));
}

export function diffMeals(prev = [], next = []) {
  const previous = new Map(normalizeMeals(prev).map(meal => [meal.id, meal]));
  const current = new Map(normalizeMeals(next).map(meal => [meal.id, meal]));
  const upserts = [];
  for (const [id, meal] of current) {
    if (!previous.has(id) || contentKey(previous.get(id)) !== contentKey(meal)) upserts.push(meal);
  }
  return { upserts, removed: [...previous.keys()].filter(id => !current.has(id)) };
}

export function mealsFromDocs(docs = []) {
  return docs.map(doc => {
    const { updatedAt: ignoredUpdatedAt, clientUpdatedAt: ignoredClientUpdatedAt, ...meal } = doc.data();
    return { ...meal, id: meal.id || doc.id };
  })
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function createMealsSync({ onMeals = () => {}, onStatus = () => {} } = {}) {
  let api, refs, starting, unsubscribe;
  let ready = false, stopped = false, serverSeen = false, failed = false;
  let deliveryFailed = false;
  let generation = 0, pending = 0, snapshotSequence = 0;
  const queue = [];
  // Keep the latest local operation until its write is acknowledged and a newer
  // authoritative snapshot arrives. That snapshot may contain another writer's edit.
  const local = new Map();
  let lastSnapshot = null;
  const publishStatus = () => onStatus(failed || deliveryFailed ? "Synk feilet"
    : pending || local.size || !serverSeen ? "Synker" : "Synket");

  function deliverMeals() {
    try { onMeals(currentMeals(lastSnapshot.meals)); deliveryFailed = false; }
    catch { deliveryFailed = true; }
    finally { publishStatus(); }
  }

  function retireConfirmed() {
    if (!lastSnapshot?.authoritative) return false;
    let retired = false;
    for (const [id, operation] of local) {
      if (operation.acknowledged && lastSnapshot.sequence > operation.snapshotSequence) {
        local.delete(id);
        retired = true;
      }
    }
    return retired;
  }

  function currentMeals(remoteMeals) {
    const merged = new Map(remoteMeals.map(meal => [meal.id, meal]));
    for (const [id, operation] of local) {
      if (operation.type === "removed") merged.delete(id);
      else merged.set(id, structuredClone(operation.meal));
    }
    return [...merged.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  function dispatch(operation) {
    const token = generation;
    let result;
    try {
      const ref = api.doc(refs.meals, operation.id);
      result = operation.type === "removed" ? api.deleteDoc(ref)
        : api.setDoc(ref, { ...operation.meal, updatedAt: api.serverTimestamp() });
    } catch (error) { result = Promise.reject(error); }
    Promise.resolve(result).then(() => {
      if (token !== generation || stopped) return;
      operation.acknowledged = true;
      if (retireConfirmed()) deliverMeals();
    }).catch(() => {
      if (token === generation && !stopped) failed = true;
    }).finally(() => {
      if (token !== generation || stopped) return;
      pending -= 1;
      publishStatus();
    });
  }

  function enqueue({ upserts = [], removed = [] } = {}) {
    if (stopped) return;
    const operations = [
      ...normalizeMeals(structuredClone(upserts)).map(meal => ({ type: "upsert", id: meal.id, meal, acknowledged: false, snapshotSequence })),
      ...removed.map(id => ({ type: "removed", id, acknowledged: false, snapshotSequence })),
    ];
    if (!operations.length) return;
    pending += operations.length;
    for (const operation of operations) local.set(operation.id, operation);
    publishStatus();
    for (const operation of operations) {
      if (ready) dispatch(operation);
      else queue.push(operation);
    }
  }

  async function start(connection) {
    if (starting) return starting;
    ({ api, refs } = connection);
    stopped = false;
    const token = generation;
    starting = (async () => {
      publishStatus();
      // Allow operations queued during startup to join the same ordered drain.
      await Promise.resolve();
      if (token !== generation || stopped) return false;
      try {
        ready = true;
        for (const operation of queue.splice(0)) dispatch(operation);
        const stopListener = api.onSnapshot(refs.meals, { includeMetadataChanges: true }, snapshot => {
          if (token !== generation || stopped) return;
          snapshotSequence += 1;
          if (snapshot.metadata?.fromCache && !serverSeen) return;
          if (!snapshot.metadata?.fromCache) serverSeen = true;
          lastSnapshot = { meals: normalizeMeals(mealsFromDocs(snapshot.docs)), sequence: snapshotSequence,
            authoritative: !snapshot.metadata?.fromCache && !snapshot.metadata?.hasPendingWrites };
          retireConfirmed();
          deliverMeals();
        }, () => {
          if (token !== generation || stopped) return;
          failed = true; publishStatus();
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
    queue.length = 0; local.clear(); pending = 0; snapshotSequence = 0; lastSnapshot = null; starting = null;
    unsubscribe?.(); unsubscribe = null;
  }
  return { enqueue, start, stop };
}
