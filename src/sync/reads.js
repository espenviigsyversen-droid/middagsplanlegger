export function maxClientUpdatedAtFromDocs(docs = []) {
  if (!docs.length) return 0;
  return Math.max(...docs.map((doc) => Number(doc.data().clientUpdatedAt || 0)));
}

export function buildMealsRemotePatch(docs = []) {
  const clientUpdatedAt = maxClientUpdatedAtFromDocs(docs);
  const meals = docs.map((mealDoc) => {
    const { clientUpdatedAt: _clientUpdatedAt, updatedAt: _updatedAt, ...meal } = mealDoc.data();
    return { ...meal, id: meal.id || mealDoc.id };
  });
  return { meals, clientUpdatedAt };
}

export function buildWeeksRemotePatch(options = {}) {
  const {
    docs = [],
    currentState = {},
    familySize = 4,
    defaults = {},
  } = options;

  const {
    emptyWeekPlan = () => ({}),
    emptyWeekLocks = () => ({}),
    emptyWeekDayTypes = () => ({}),
    emptyWeekServings = () => ({}),
    emptyWeekDayModes = () => ({}),
    emptyWeekDayNotes = () => ({}),
  } = defaults;

  const plansByWeek = { ...(currentState.plansByWeek || {}) };
  const lockedPlansByWeek = { ...(currentState.lockedPlansByWeek || {}) };
  const dayTypesByWeek = { ...(currentState.dayTypesByWeek || {}) };
  const servingsByWeek = { ...(currentState.servingsByWeek || {}) };
  const dayModesByWeek = { ...(currentState.dayModesByWeek || {}) };
  const dayNotesByWeek = { ...(currentState.dayNotesByWeek || {}) };

  docs.forEach((weekDoc) => {
    const data = weekDoc.data();
    plansByWeek[weekDoc.id] = { ...emptyWeekPlan(), ...(data.plan || {}) };
    lockedPlansByWeek[weekDoc.id] = { ...emptyWeekLocks(), ...(data.lockedPlan || {}) };
    dayTypesByWeek[weekDoc.id] = { ...emptyWeekDayTypes(), ...(data.dayTypes || {}) };
    servingsByWeek[weekDoc.id] = { ...emptyWeekServings(familySize), ...(data.servings || {}) };
    dayModesByWeek[weekDoc.id] = { ...emptyWeekDayModes(), ...(data.dayModes || {}) };
    dayNotesByWeek[weekDoc.id] = { ...emptyWeekDayNotes(), ...(data.dayNotes || {}) };
  });

  return {
    plansByWeek,
    lockedPlansByWeek,
    dayTypesByWeek,
    servingsByWeek,
    dayModesByWeek,
    dayNotesByWeek,
    clientUpdatedAt: maxClientUpdatedAtFromDocs(docs),
  };
}
