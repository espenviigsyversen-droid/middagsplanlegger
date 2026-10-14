export function parseRecipeServings(value, maximum = 30) {
  const text = String(value ?? "").trim();
  if (!/^[0-9]{1,3}$/.test(text) || text.length > String(maximum).length) return null;
  const number = Number(text);
  return number >= 1 && number <= maximum ? number : null;
}

// A short-lived UI buffer. The ordinary week sync still owns document writes.
export function createRecipeServingsBuffer({ commit, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let pending = null, timer = null, generation = 0;
  function cancel() {
    generation += 1;
    if (timer !== null) clearTimer(timer);
    timer = null; pending = null;
  }
  function flush() {
    if (!pending) return;
    if (timer !== null) clearTimer(timer);
    timer = null; generation += 1;
    const value = pending;
    // Keep the local overlay during synchronous sync/status callbacks.
    try { commit(value); } finally { if (pending === value) pending = null; }
  }
  function queue(value) {
    if (timer !== null) clearTimer(timer);
    pending = { ...value };
    const token = ++generation;
    timer = setTimer(() => { if (token === generation) flush(); }, 500);
  }
  return { queue, flush, cancel, get pending() { return pending; } };
}
