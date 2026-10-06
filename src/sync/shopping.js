import { normalizeShoppingList } from "../domain/shopping.js";

const ITEM_FIELDS = ["name", "amount", "unit", "category", "checked", "custom"];

export function diffShoppingItems(prevItems = [], nextItems = []) {
  const previous = new Map(prevItems.map((item) => [item.id, item]));
  const next = new Map(nextItems.map((item) => [item.id, item]));
  const added = [];
  const updated = [];
  const removed = [];
  for (const item of nextItems) {
    const old = previous.get(item.id);
    if (!old) {
      added.push({ ...item });
      continue;
    }
    const fields = {};
    for (const key of ITEM_FIELDS) {
      if (old[key] !== item[key]) fields[key] = item[key];
    }
    if (Object.keys(fields).length) updated.push({ id: item.id, fields });
  }
  for (const item of prevItems) {
    if (!next.has(item.id)) removed.push(item.id);
  }
  return { added, updated, removed };
}

export function shoppingItemsFromDocs(docs = []) {
  return normalizeShoppingList({ items: docs.map((doc) => ({
    ...doc.data(), id: doc.id,
  })) }).items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function shoppingMigrationPlan(oldDocData) {
  if (oldDocData && Object.hasOwn(oldDocData, "migratedToItemsAt")) return null;
  const items = Array.isArray(oldDocData?.shoppingList?.items) ? oldDocData.shoppingList.items : [];
  // Fixed epoch makes transaction retries deterministic and keeps old items first.
  return normalizeShoppingList({ items: items.map((item, index) => ({
    ...item, id: item.id || `migration-${index}`, createdAt: index,
  })) }).items;
}

export async function migrateShoppingItems({ api, refs }) {
  await api.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(refs.shopping);
    const plan = shoppingMigrationPlan(snapshot.exists() ? snapshot.data() : undefined);
    if (plan === null) return;
    for (const { id, ...item } of plan) {
      transaction.set(api.doc(refs.shoppingItems, id), { ...item, updatedAt: api.serverTimestamp() });
    }
    transaction.set(refs.shopping, { migratedToItemsAt: api.serverTimestamp() }, { merge: true });
  });
}

// The queue lives for this app session only. Firestore keeps dispatched writes
// pending while offline; we never wait for their acknowledgements to attach the listener.
export function createShoppingSync({ onItems = () => {}, onStatus = () => {} } = {}) {
  let api;
  let refs;
  let ready = false;
  let starting;
  let serverSeen = false;
  let failed = false;
  let pending = 0;
  let generation = 0;
  let unsubscribe;
  let stopped = false;
  const queue = [];
  const publishStatus = () => onStatus(failed ? "Synk feilet"
    : pending || !serverSeen ? "Synker" : "Synket");

  function dispatch(operation) {
    const token = generation;
    let result;
    try {
      const ref = api.doc(refs.shoppingItems, operation.id);
      if (operation.type === "added") {
        result = api.setDoc(ref, { ...operation.fields, updatedAt: api.serverTimestamp() });
      } else if (operation.type === "updated") {
        result = api.updateDoc(ref, { ...operation.fields, updatedAt: api.serverTimestamp() });
      } else {
        result = api.deleteDoc(ref);
      }
    } catch (error) {
      result = Promise.reject(error);
    }
    Promise.resolve(result).catch((error) => {
      if (token !== generation) return;
      if (!(operation.type === "updated" && error.code === "not-found")) failed = true;
    }).finally(() => {
      if (token !== generation) return;
      pending -= 1;
      publishStatus();
    });
  }

  function enqueue(diff) {
    if (stopped) return;
    const operations = [
      ...diff.added.map(({ id, ...fields }) => ({ type: "added", id, fields })),
      ...diff.updated.map(({ id, fields }) => ({ type: "updated", id, fields })),
      ...diff.removed.map((id) => ({ type: "removed", id })),
    ];
    if (!operations.length) return;
    pending += operations.length;
    publishStatus();
    for (const operation of operations) {
      if (ready) dispatch(operation);
      else queue.push(operation);
    }
  }

  async function start(connection) {
    if (starting) return starting;
    ({ api, refs } = connection);
    const token = generation;
    starting = (async () => {
      publishStatus();
      try {
        if (!connection.skipMigration) await migrateShoppingItems({ api, refs });
        if (token !== generation) return false;
        ready = true;
        for (const operation of queue.splice(0)) dispatch(operation);
        unsubscribe = api.onSnapshot(refs.shoppingItems, { includeMetadataChanges: true }, (snapshot) => {
          if (token !== generation) return;
          if (snapshot.metadata.fromCache && !serverSeen) return;
          if (!snapshot.metadata.fromCache) serverSeen = true;
          onItems(shoppingItemsFromDocs(snapshot.docs));
          publishStatus();
        }, () => {
          if (token !== generation) return;
          failed = true;
          publishStatus();
        });
        return true;
      } catch {
        if (token !== generation) return false;
        ready = false;
        failed = true;
        publishStatus();
        return false;
      }
    })();
    return starting;
  }

  function stop() {
    generation += 1;
    stopped = true;
    ready = false;
    queue.length = 0;
    pending = 0;
    unsubscribe?.();
  }

  return { enqueue, start, stop };
}
