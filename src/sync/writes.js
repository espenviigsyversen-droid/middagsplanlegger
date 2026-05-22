export function buildRemoteWrites(options = {}) {
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
  } = options;

  const uniqueScopes = [...new Set(scopes)];
  const writes = [];
  const pendingMealDeletes = pendingMealDeleteIds instanceof Set ? [...pendingMealDeleteIds] : [...pendingMealDeleteIds];
  const weekKeys = pendingWeekKeys instanceof Set ? [...pendingWeekKeys] : [...pendingWeekKeys];

  if (uniqueScopes.includes("profile")) {
    writes.push(api.setDoc(refs.profile, { family: state.family, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("preferences")) {
    writes.push(api.setDoc(refs.preferences, { mealPreferences: state.mealPreferences, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("metadata")) {
    writes.push(api.setDoc(refs.metadata, { metadata: state.metadata, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("shopping")) {
    writes.push(api.setDoc(refs.shopping, { shoppingList: state.shoppingList, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("meals")) {
    const currentMealIds = new Set((state.meals || []).map((meal) => meal.id));
    pendingMealDeletes.forEach((mealId) => {
      if (!currentMealIds.has(mealId)) {
        writes.push(api.deleteDoc(api.doc(refs.meals, mealId)));
      }
    });
    (state.meals || []).forEach((meal) => {
      writes.push(api.setDoc(api.doc(refs.meals, meal.id), { ...meal, clientUpdatedAt, updatedAt }, { merge: true }));
    });
  }

  if (uniqueScopes.includes("weeks")) {
    const keysToWrite = weekKeys.length ? weekKeys : [currentWeekKey].filter(Boolean);
    keysToWrite.forEach((weekKey) => {
      writes.push(api.setDoc(api.doc(refs.weeks, weekKey), { ...weekPayload(weekKey), updatedAt }, { merge: true }));
    });
  }

  return writes;
}
