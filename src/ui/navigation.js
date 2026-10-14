// UI-only history. Rendering, domain state and remote callbacks never call sync().
export function createNavigationHistory({ history, getLevels, onBack, session = `${Date.now()}-${Math.random()}` }) {
  let browserLevels = [], pending = null, handling = false, sessionIdentifier = session;
  const enabled = Boolean(history?.pushState && history?.replaceState && history?.go);
  const marker = levels => ({ middagsappNavigation: { session: sessionIdentifier, levels } });
  if (enabled) history.replaceState(marker([]), ""); // Keep the original entry; do not add a startup Back target.

  function sync() {
    if (!enabled || handling || pending) return;
    const desired = getLevels();
    let common = 0;
    while (common < browserLevels.length && common < desired.length && browserLevels[common] === desired[common]) common++;
    if (common < browserLevels.length) {
      pending = browserLevels.slice(0, common);
      history.go(common - browserLevels.length);
      return;
    }
    for (let index = common; index < desired.length; index++) {
      browserLevels = desired.slice(0, index + 1);
      history.pushState(marker(browserLevels), "");
    }
  }

  function pop(event) {
    if (!enabled) return;
    if (pending) {
      browserLevels = pending; pending = null; sync(); return;
    }
    const target = event.state?.middagsappNavigation;
    const levels = target?.session === sessionIdentifier && Array.isArray(target.levels) ? target.levels : [];
    if (levels.length > browserLevels.length) {
      // Forward must not resurrect a discarded editor, recipe or window.
      browserLevels = levels; sync(); return;
    }
    handling = true;
    try {
      for (let count = browserLevels.length - levels.length; count > 0; count--) if (!onBack()) break;
    } finally { handling = false; }
    browserLevels = levels;
    sync(); // A protected editor is put back after the browser traversed its entry.
  }

  function reset() {
    browserLevels = []; pending = null;
    sessionIdentifier = `${sessionIdentifier}-reset`;
    if (enabled) history.replaceState(marker([]), "");
  }
  return { sync, pop, reset };
}
