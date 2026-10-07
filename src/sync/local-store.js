import { PROJECT_DOMAIN_KEYS } from "./access.js";

// Only values used after startup belong in the device cache. Editor/UI state
// remains in memory; the startup view and transient defaults are reconstructed.
export function localStateForStorage(state, projectId) {
  const keys = [...PROJECT_DOMAIN_KEYS, "weekOffset", "filters"];
  return { ...Object.fromEntries(keys.filter(key => Object.hasOwn(state, key)).map(key => [key, state[key]])), projectId };
}

export function createLocalStore({ getStorage = () => globalThis.localStorage, onWrite = () => {} } = {}) {
  const reportWrite = ok => { try { onWrite(ok); } catch {} };
  return {
    read(key) {
      try {
        const value = JSON.parse(getStorage().getItem(key) || "null");
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
      } catch { return null; }
    },
    write(key, value) {
      let ok = false;
      try {
        getStorage().setItem(key, JSON.stringify(value));
        ok = true;
      } catch { /* Keep the app's in-memory state and its existing disk copy. */ }
      reportWrite(ok);
      return ok;
    },
    remove(key) {
      try { getStorage().removeItem(key); return true; } catch { return false; }
    },
  };
}
