export const SYNCED_STATE_KEYS = [
  "family",
  "mealPreferences",
  "metadata",
  "plansByWeek",
  "lockedPlansByWeek",
  "dayTypesByWeek",
  "servingsByWeek",
  "dayModesByWeek",
  "dayNotesByWeek",
];

export const WEEK_SYNC_FIELDS = [
  "plansByWeek",
  "lockedPlansByWeek",
  "dayTypesByWeek",
  "servingsByWeek",
  "dayModesByWeek",
  "dayNotesByWeek",
];

export function patchTouchesSyncedData(patch, syncedKeys = SYNCED_STATE_KEYS) {
  const keySet = syncedKeys instanceof Set ? syncedKeys : new Set(syncedKeys);
  return Object.keys(patch || {}).some((key) => keySet.has(key));
}

export function syncedScopesForPatch(patch) {
  const scopes = new Set();
  if ("family" in patch) scopes.add("profile");
  if ("mealPreferences" in patch) scopes.add("preferences");
  if ("metadata" in patch) scopes.add("metadata");
  if (WEEK_SYNC_FIELDS.some((field) => field in patch)) scopes.add("weeks");
  return [...scopes];
}

export function changedWeekKeys(patch, previousState, currentState, fallbackWeekKey = "") {
  const keys = new Set();
  WEEK_SYNC_FIELDS.forEach((field) => {
    if (!(field in (patch || {}))) return;
    const previous = previousState?.[field] || {};
    const current = currentState?.[field] || {};
    Object.keys({ ...previous, ...current }).forEach((weekKey) => {
      if (JSON.stringify(previous[weekKey] || {}) !== JSON.stringify(current[weekKey] || {})) {
        keys.add(weekKey);
      }
    });
  });

  if (!keys.size && WEEK_SYNC_FIELDS.some((field) => field in (patch || {})) && fallbackWeekKey) {
    keys.add(fallbackWeekKey);
  }

  return [...keys];
}

export function shouldDeferRemotePayload(options = {}) {
  const {
    pendingLocalSync = false,
    remoteClientUpdatedAt = 0,
    localClientUpdatedAt = 0,
  } = options;
  return Boolean(pendingLocalSync) && Number(remoteClientUpdatedAt || 0) < Number(localClientUpdatedAt || 0);
}

export function remoteDocumentIsStale(options = {}) {
  const {
    pendingScopes = [],
    scope = "",
    remoteClientUpdatedAt = 0,
    localClientUpdatedAt = 0,
  } = options;
  const pending = pendingScopes instanceof Set ? pendingScopes : new Set(pendingScopes);
  return pending.has(scope) && Number(remoteClientUpdatedAt || 0) < Number(localClientUpdatedAt || 0);
}
