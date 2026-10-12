import { REQUIRED_MIN_APP_VERSION } from "./version.js";

export function servingsDefaultsPatch(state, currentWeek) {
  const familySize = state.family.familySize, servingsByWeek = structuredClone(state.servingsByWeek || {});
  let count = 0;
  for (const [week, days] of Object.entries(servingsByWeek)) {
    if (week < currentWeek) continue;
    for (const [day, value] of Object.entries(days)) {
      if (value === 5 || value === familySize) { days[day] = null; count++; }
    }
  }
  return { servingsByWeek, count, familySize };
}

// One attempt per access session. Never mark a partial or interrupted transition.
export function createServingsDefaultsTransition({ readMeta, getState, currentWeek, enqueue, waitForWrites, markDone, onDone, valid, appVersion = REQUIRED_MIN_APP_VERSION }) {
  let attempt;
  function run({ role, offline, weeksReady, profileReady }) {
    if (role !== "admin" || offline || !weeksReady || !profileReady || !valid()) return Promise.resolve(false);
    if (attempt) return attempt;
    attempt = (async () => {
      try {
        const meta = await readMeta();
        if (!valid() || !meta?.initializedAt || !(Number(meta.minAppVersion) >= REQUIRED_MIN_APP_VERSION) || Number(meta.minAppVersion) > appVersion || meta.servingsDefaultsV106 === true) return false;
        const patch = servingsDefaultsPatch(getState(), currentWeek());
        if (patch.count) enqueue(patch.servingsByWeek);
        await waitForWrites();
        if (!valid()) return false;
        const latest = await readMeta();
        if (!valid() || !latest?.initializedAt || !(Number(latest.minAppVersion) >= REQUIRED_MIN_APP_VERSION) || Number(latest.minAppVersion) > appVersion) return false;
        if (latest.servingsDefaultsV106 === true) return false;
        await markDone();
        if (!valid()) return false;
        onDone(patch); return true;
      } catch { return false; }
    })();
    return attempt;
  }
  return { run };
}
