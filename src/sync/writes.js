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
    pendingLocalSync = false,
    allowMissingRemoteWrite = false,
  } = options;

  const uniqueScopes = [...new Set(scopes)];
  const writes = [];

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

  return writes;
}
