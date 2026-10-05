export function remoteClientUpdatedAtFromSnapshot(snapshot) {
  if (!snapshot || !snapshot.exists?.()) return 0;
  return Number(snapshot.data()?.clientUpdatedAt || 0);
}

export function shouldWriteRemoteDocument(options = {}) {
  const {
    remoteClientUpdatedAt = 0,
    localClientUpdatedAt = 0,
    pendingLocalSync = false,
    allowMissingRemoteWrite = false,
  } = options;

  if (!remoteClientUpdatedAt) return Boolean(pendingLocalSync || allowMissingRemoteWrite);
  return Number(localClientUpdatedAt || 0) >= Number(remoteClientUpdatedAt || 0);
}

async function canWriteRemoteRef(options = {}) {
  const {
    ref,
    api = {},
    clientUpdatedAt = 0,
    pendingLocalSync = false,
    allowMissingRemoteWrite = false,
  } = options;

  if (!api.getDoc) return true;
  const snapshot = await api.getDoc(ref);
  const remoteClientUpdatedAt = remoteClientUpdatedAtFromSnapshot(snapshot);
  return shouldWriteRemoteDocument({
    remoteClientUpdatedAt,
    localClientUpdatedAt: clientUpdatedAt,
    pendingLocalSync,
    allowMissingRemoteWrite,
  });
}

export async function buildRemoteWrites(options = {}) {
  const {
    scopes = [],
    state = {},
    refs = {},
    api = {},
    updatedAt,
    clientUpdatedAt = Date.now(),
    pendingMealDeleteIds = [],
    pendingWeekKeys = [],
    currentWeekKey = "",
    weekPayload = () => ({}),
    pendingLocalSync = false,
    allowMissingRemoteWrite = false,
  } = options;

  const uniqueScopes = [...new Set(scopes)];
  const writes = [];
  const pendingMealDeletes = pendingMealDeleteIds instanceof Set ? [...pendingMealDeleteIds] : [...pendingMealDeleteIds];
  const weekKeys = pendingWeekKeys instanceof Set ? [...pendingWeekKeys] : [...pendingWeekKeys];

  if (uniqueScopes.includes("profile")) {
    if (await canWriteRemoteRef({ ref: refs.profile, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
      writes.push(api.setDoc(refs.profile, { family: state.family, clientUpdatedAt, updatedAt }, { merge: true }));
    }
  }

  if (uniqueScopes.includes("preferences")) {
    if (await canWriteRemoteRef({ ref: refs.preferences, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
      writes.push(api.setDoc(refs.preferences, { mealPreferences: state.mealPreferences, clientUpdatedAt, updatedAt }, { merge: true }));
    }
  }

  if (uniqueScopes.includes("metadata")) {
    if (await canWriteRemoteRef({ ref: refs.metadata, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
      writes.push(api.setDoc(refs.metadata, { metadata: state.metadata, clientUpdatedAt, updatedAt }, { merge: true }));
    }
  }

  if (uniqueScopes.includes("meals")) {
    const currentMealIds = new Set((state.meals || []).map((meal) => meal.id));
    for (const mealId of pendingMealDeletes) {
      if (!currentMealIds.has(mealId)) {
        const ref = api.doc(refs.meals, mealId);
        if (await canWriteRemoteRef({ ref, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
          writes.push(api.deleteDoc(ref));
        }
      }
    }
    for (const meal of state.meals || []) {
      const ref = api.doc(refs.meals, meal.id);
      if (await canWriteRemoteRef({ ref, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
        writes.push(api.setDoc(ref, { ...meal, clientUpdatedAt, updatedAt }, { merge: true }));
      }
    }
  }

  if (uniqueScopes.includes("weeks")) {
    const keysToWrite = weekKeys.length ? weekKeys : [currentWeekKey].filter(Boolean);
    for (const weekKey of keysToWrite) {
      const ref = api.doc(refs.weeks, weekKey);
      if (await canWriteRemoteRef({ ref, api, clientUpdatedAt, pendingLocalSync, allowMissingRemoteWrite })) {
        writes.push(api.setDoc(ref, { ...weekPayload(weekKey), updatedAt }, { merge: true }));
      }
    }
  }

  return writes;
}
