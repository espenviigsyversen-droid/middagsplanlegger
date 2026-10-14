import { canonicalView } from "../domain/week-view.js";

// Overlays never participate in the page key.
export function pageScreenKey(state) {
  const view = canonicalView(state.activeView);
  if (view === "meals" && state.editingMealId) return `editor:${state.editingMealId}`;
  if (view === "recipe") return `recipe:${state.selectedMealId}`;
  return view;
}

export function pageScrollTarget(previousKey, nextKey, direction, rememberedPosition) {
  if (previousKey === nextKey) return null;
  if (direction === "back" && Number.isFinite(rememberedPosition)) return Math.max(0, rememberedPosition);
  return 0;
}

export function createPageScroll({ history } = {}) {
  if (history) history.scrollRestoration = "manual";
  const positions = new Map();
  let key = null;
  return {
    get key() { return key; },
    beforeRender(nextKey, currentPosition, direction = "same") {
      if (key !== null && key !== nextKey) positions.set(key, Number.isFinite(currentPosition) ? Math.max(0, currentPosition) : 0);
      const target = pageScrollTarget(key, nextKey, direction, positions.get(nextKey));
      key = nextKey;
      return target;
    },
    reset() { positions.clear(); key = null; },
  };
}
