const dayNames = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const categoryLabels = {
  fisk: "Fisk",
  vegetar: "Vegetar",
  kjott: "Kjøtt",
  pasta: "Pasta",
  suppe: "Suppe",
};

const unitOptions = ["", "g", "kg", "ml", "l", "dl", "ts", "ss", "stk", "pose", "pakke", "boks", "glass", "beger", "porsjoner"];
const defaultUnitOptions = unitOptions;
const defaultPrepTimeLabels = {
  quick: "Rask under 30 min",
  medium: "Middels 30-60 min",
  long: "Lang over 60 min",
};
const defaultSuitabilityLabels = {
  weekday: "Hverdag",
  weekend: "Helg",
  guests: "Gjester",
  celebration: "Bursdag/selskap",
};
const defaultPlanModeOptions = {
  home: { label: "Middag hjemme", type: "home" },
  away: { label: "Spise borte", type: "away" },
  leftovers: { label: "Rester", type: "leftovers" },
};

const firebaseConfig = {
  apiKey: "AIzaSyAMPfQ9gX9rbuvcPsVjYVtq5IT_orjDBPs",
  authDomain: "home-tasks-app-18de3.firebaseapp.com",
  projectId: "home-tasks-app-18de3",
  storageBucket: "home-tasks-app-18de3.firebasestorage.app",
  messagingSenderId: "253720858709",
  appId: "1:253720858709:web:8c5d8d0d13574e33c384dc",
};

const FIREBASE_SDK_VERSION = "12.13.0";
const FAMILY_ID = "familien";
const VARIATION_LOOKBACK_WEEKS = 4;
const syncedStateKeys = new Set([
  "family",
  "mealPreferences",
  "meals",
  "metadata",
  "plansByWeek",
  "lockedPlansByWeek",
  "dayTypesByWeek",
  "servingsByWeek",
  "dayModesByWeek",
  "dayNotesByWeek",
]);

const defaultMeals = [
  {
    id: "tikka",
    title: "Tikka masala",
    description: "Mild curry med ris og naan. En trygg familiefavoritt som ofte gir rester.",
    categories: ["kjott"],
    kidFriendly: true,
    favorite: true,
    leftovers: "likely",
    prepTime: "medium",
    suitability: ["weekday", "weekend", "guests"],
    minDaysBetween: 21,
    keyIngredients: ["ris", "kylling"],
    ingredients: [
      { name: "Kylling", amount: "600", unit: "g" },
      { name: "Tikka masala-saus", amount: "1", unit: "glass" },
      { name: "Ris", amount: "4", unit: "porsjoner" },
      { name: "Naan", amount: "1", unit: "pakke" },
    ],
    steps: ["Stek kylling", "La saus og krydder småkoke", "Server med ris og naan"],
  },
  {
    id: "laks",
    title: "Ovnsbakt laks",
    description: "Laks med poteter, rømme og agurksalat.",
    categories: ["fisk"],
    kidFriendly: true,
    favorite: false,
    leftovers: "none",
    prepTime: "quick",
    suitability: ["weekday"],
    minDaysBetween: 14,
    keyIngredients: ["potet", "laks"],
    ingredients: [
      { name: "Laksefilet", amount: "5", unit: "stk" },
      { name: "Poteter", amount: "900", unit: "g" },
      { name: "Rømme", amount: "1", unit: "beger" },
      { name: "Agurk", amount: "1", unit: "stk" },
    ],
    steps: ["Bak laksen i ovn", "Kok poteter", "Rør sammen agurksalat"],
  },
  {
    id: "pasta",
    title: "Pasta bolognese",
    description: "Rask hverdagsmiddag med kjøttsaus og grønnsaker.",
    categories: ["pasta", "kjott"],
    kidFriendly: true,
    favorite: true,
    leftovers: "possible",
    prepTime: "quick",
    suitability: ["weekday", "weekend"],
    minDaysBetween: 10,
    keyIngredients: ["pasta", "kjottdeig"],
    ingredients: [
      { name: "Pasta", amount: "500", unit: "g" },
      { name: "Kjøttdeig", amount: "500", unit: "g" },
      { name: "Hakkede tomater", amount: "2", unit: "bokser" },
      { name: "Parmesan", amount: "", unit: "" },
    ],
    steps: ["Kok pasta", "Lag kjøttsaus", "Server med parmesan"],
  },
  {
    id: "suppe",
    title: "Tomatsuppe med egg",
    description: "Enkel suppe med kokt egg og grovt brød.",
    categories: ["suppe", "vegetar"],
    kidFriendly: true,
    favorite: false,
    leftovers: "possible",
    prepTime: "quick",
    suitability: ["weekday"],
    minDaysBetween: 10,
    keyIngredients: ["tomat", "egg"],
    ingredients: [
      { name: "Tomatsuppe", amount: "1", unit: "pose" },
      { name: "Egg", amount: "5", unit: "stk" },
      { name: "Grovt brød", amount: "1", unit: "stk" },
    ],
    steps: ["Kok suppe", "Kok egg", "Server med brød"],
  },
  {
    id: "wok",
    title: "Grønnsakswok",
    description: "Wok med nudler, grønnsaker og soyasaus.",
    categories: ["vegetar"],
    kidFriendly: false,
    favorite: false,
    leftovers: "none",
    prepTime: "quick",
    suitability: ["weekday"],
    minDaysBetween: 14,
    keyIngredients: ["nudler", "grønnsaker"],
    ingredients: [
      { name: "Nudler", amount: "400", unit: "g" },
      { name: "Wokgrønnsaker", amount: "700", unit: "g" },
      { name: "Soyasaus", amount: "", unit: "" },
    ],
    steps: ["Stek grønnsaker raskt", "Vend inn nudler", "Smak til med saus"],
  },
  {
    id: "taco",
    title: "Fredagstaco",
    description: "Taco med skåler på bordet og valgfritt fyll.",
    categories: ["kjott"],
    kidFriendly: true,
    favorite: true,
    leftovers: "possible",
    prepTime: "quick",
    suitability: ["weekend", "guests"],
    minDaysBetween: 7,
    keyIngredients: ["lefser", "kjottdeig"],
    ingredients: [
      { name: "Tortillalefser", amount: "1", unit: "pakke" },
      { name: "Kjøttdeig", amount: "500", unit: "g" },
      { name: "Tacokrydder", amount: "1", unit: "pose" },
      { name: "Grønnsaker", amount: "", unit: "" },
    ],
    steps: ["Stek fyll", "Kutt grønnsaker", "Sett alt på bordet"],
  },
];

const defaultState = {
  activeView: "calendar",
  clientUpdatedAt: 0,
  pendingLocalSync: false,
  editingMealId: null,
  draftMeal: null,
  draftIngredients: null,
  draftSteps: null,
  selectedMealId: null,
  selectedRecipeContext: null,
  keepScreenAwake: false,
  previousView: "meals",
  weekOffset: 0,
  filters: { query: "", category: "all", flag: "all", sort: "category" },
  metadata: {
    categoryLabels,
    units: defaultUnitOptions,
    prepTimeLabels: defaultPrepTimeLabels,
    suitabilityLabels: defaultSuitabilityLabels,
    planModeOptions: defaultPlanModeOptions,
  },
  family: {
    name: "Familien",
    familySize: 5,
    kidFriendlyPerWeek: 2,
    leftovers: true,
    reuseIngredients: true,
    quickDays: ["Tirsdag", "Torsdag"],
  },
  mealPreferences: {
    categoryGoals: {
      fisk: { minPerWeek: 1, maxPerWeek: null, minEveryWeeks: 2 },
      vegetar: { minPerWeek: 1, maxPerWeek: null, minEveryWeeks: null },
      kjott: { minPerWeek: null, maxPerWeek: 3, minEveryWeeks: null },
      suppe: { minPerWeek: null, maxPerWeek: 1, minEveryWeeks: null },
    },
  },
  meals: defaultMeals,
  plan: {
    0: "laks",
    1: "pasta",
    2: "suppe",
    3: "",
    4: "taco",
    5: "",
    6: "tikka",
  },
  plansByWeek: {},
  lockedPlan: {
    0: true,
    1: false,
    2: false,
    3: false,
    4: true,
    5: false,
    6: false,
  },
  lockedPlansByWeek: {},
  dayTypesByWeek: {},
  servingsByWeek: {},
  dayModesByWeek: {},
  dayNotesByWeek: {},
};

let state = loadState();
const app = document.querySelector("#app");
let wakeLock = null;
const remoteRefs = {};
const remoteSaveTimers = {};
const pendingRemoteScopes = new Set();
const pendingMealDeleteIds = new Set();
const pendingWeekKeys = new Set();
let applyingRemoteState = false;
let syncStatus = "Kobler til synk";

function loadState() {
  const saved = localStorage.getItem("middagsapp-state");
  if (!saved) return normalizeState(structuredClone(defaultState));
  try {
    return normalizeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeState(nextState) {
  nextState.family = {
    ...defaultState.family,
    ...(nextState.family || {}),
  };
  nextState.family.familySize = Math.max(1, Number(nextState.family.familySize) || 5);
  nextState.family.kidFriendlyPerWeek = Math.max(0, Number(nextState.family.kidFriendlyPerWeek) || 0);
  nextState.family.quickDays = Array.isArray(nextState.family.quickDays) ? nextState.family.quickDays : defaultState.family.quickDays;
  nextState.metadata = {
    categoryLabels,
    ...(nextState.metadata || {}),
    categoryLabels: {
      ...categoryLabels,
      ...(nextState.metadata?.categoryLabels || {}),
    },
    units: Array.isArray(nextState.metadata?.units) ? nextState.metadata.units : defaultUnitOptions,
    prepTimeLabels: {
      ...defaultPrepTimeLabels,
      ...(nextState.metadata?.prepTimeLabels || {}),
    },
    suitabilityLabels: {
      ...defaultSuitabilityLabels,
      ...(nextState.metadata?.suitabilityLabels || {}),
    },
    planModeOptions: normalizePlanModeOptions(nextState.metadata?.planModeOptions),
  };
  if (nextState.metadata.categoryLabels.kjott === "Kjott") {
    nextState.metadata.categoryLabels.kjott = "Kjøtt";
  }
  nextState.mealPreferences = normalizeMealPreferences(nextState.mealPreferences, nextState.metadata.categoryLabels);
  nextState.meals = nextState.meals.map((meal) => ({
    ...meal,
    recipeUrl: String(meal.recipeUrl || "").trim(),
    baseServings: Math.max(1, Number(meal.baseServings) || 4),
    ingredients: normalizeIngredients(meal.ingredients, meal.keyIngredients),
    suitability: Array.isArray(meal.suitability) ? meal.suitability : [],
  }));
  const currentWeekKey = getWeekKey(nextState.weekOffset || 0);
  nextState.plansByWeek = nextState.plansByWeek || {};
  nextState.lockedPlansByWeek = nextState.lockedPlansByWeek || {};
  nextState.dayTypesByWeek = nextState.dayTypesByWeek || {};
  nextState.servingsByWeek = nextState.servingsByWeek || {};
  nextState.dayModesByWeek = nextState.dayModesByWeek || {};
  nextState.dayNotesByWeek = nextState.dayNotesByWeek || {};
  if (!nextState.plansByWeek[currentWeekKey]) {
    nextState.plansByWeek[currentWeekKey] = { ...emptyWeekPlan(), ...(nextState.plan || {}) };
  }
  if (!nextState.lockedPlansByWeek[currentWeekKey]) {
    nextState.lockedPlansByWeek[currentWeekKey] = { ...emptyWeekLocks(), ...(nextState.lockedPlan || {}) };
  }
  if (!nextState.dayTypesByWeek[currentWeekKey]) {
    nextState.dayTypesByWeek[currentWeekKey] = emptyWeekDayTypes();
  }
  if (!nextState.servingsByWeek[currentWeekKey]) {
    nextState.servingsByWeek[currentWeekKey] = emptyWeekServings(nextState.family.familySize);
  }
  if (!nextState.dayModesByWeek[currentWeekKey]) {
    nextState.dayModesByWeek[currentWeekKey] = emptyWeekDayModes();
  }
  if (!nextState.dayNotesByWeek[currentWeekKey]) {
    nextState.dayNotesByWeek[currentWeekKey] = emptyWeekDayNotes();
  }
  nextState.plan = undefined;
  nextState.lockedPlan = undefined;
  return nextState;
}

function normalizeMealPreferences(preferences = {}, labels = categoryLabels) {
  const goals = preferences.categoryGoals || {};
  return {
    categoryGoals: Object.fromEntries(Object.keys(labels).map((key) => [
      key,
      normalizeCategoryGoal(goals[key]),
    ])),
  };
}

function normalizeCategoryGoal(goal = {}) {
  return {
    minPerWeek: nullablePositiveNumber(goal.minPerWeek),
    maxPerWeek: nullablePositiveNumber(goal.maxPerWeek),
    minEveryWeeks: nullablePositiveNumber(goal.minEveryWeeks),
  };
}

function nullablePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function getCategoryLabels() {
  return state.metadata?.categoryLabels || categoryLabels;
}

function categoryEntries() {
  return Object.entries(getCategoryLabels());
}

function getUnitOptions() {
  return state.metadata?.units || defaultUnitOptions;
}

function getPrepTimeLabels() {
  return state.metadata?.prepTimeLabels || defaultPrepTimeLabels;
}

function prepTimeEntries() {
  return Object.entries(getPrepTimeLabels());
}

function getSuitabilityLabels() {
  return state.metadata?.suitabilityLabels || defaultSuitabilityLabels;
}

function suitabilityEntries() {
  return Object.entries(getSuitabilityLabels());
}

function normalizePlanModeOptions(options = {}) {
  const normalized = {
    ...defaultPlanModeOptions,
    ...Object.fromEntries(Object.entries(options || {}).map(([key, option]) => [
      key,
      {
        label: String(option?.label || defaultPlanModeOptions[key]?.label || key).trim(),
        type: ["home", "away", "leftovers"].includes(option?.type) ? option.type : "leftovers",
      },
    ])),
  };
  if (!Object.values(normalized).some((option) => option.type === "home")) {
    normalized.home = defaultPlanModeOptions.home;
  }
  return normalized;
}

function getPlanModeOptions() {
  return state.metadata?.planModeOptions || defaultPlanModeOptions;
}

function planModeEntries() {
  return Object.entries(getPlanModeOptions());
}

function planModeOption(value) {
  return getPlanModeOptions()[value] || defaultPlanModeOptions.home;
}

function planModeLabel(value) {
  return planModeOption(value).label || value;
}

function planModeType(value) {
  return planModeOption(value).type || "home";
}

function dayPlansMeal(value) {
  return planModeType(value) === "home";
}

function normalizeIngredients(ingredients, fallbackNames = []) {
  if (Array.isArray(ingredients) && ingredients.length) {
    return ingredients.map((item) => ({
      name: String(item.name || "").trim(),
      amount: String(item.amount || "").trim(),
      unit: String(item.unit || "").trim(),
    })).filter((item) => item.name);
  }
  return (fallbackNames || []).map((name) => ({ name, amount: "", unit: "" }));
}

function saveState() {
  localStorage.setItem("middagsapp-state", JSON.stringify(state));
}

function patchTouchesSyncedData(patch) {
  return Object.keys(patch).some((key) => syncedStateKeys.has(key));
}

function setState(patch) {
  const previousState = state;
  state = { ...state, ...patch };
  if (patchTouchesSyncedData(patch)) {
    state.clientUpdatedAt = Date.now();
    state.pendingLocalSync = true;
  }
  saveState();
  render();
  syncWakeLock();
  scheduleRemoteSaveForPatch(patch, previousState);
}

function syncPayload() {
  return {
    family: state.family,
    mealPreferences: state.mealPreferences,
    meals: state.meals,
    metadata: state.metadata,
    plansByWeek: state.plansByWeek,
    lockedPlansByWeek: state.lockedPlansByWeek,
    dayTypesByWeek: state.dayTypesByWeek,
    servingsByWeek: state.servingsByWeek,
    dayModesByWeek: state.dayModesByWeek,
    dayNotesByWeek: state.dayNotesByWeek,
    clientUpdatedAt: state.clientUpdatedAt || 0,
  };
}

function weekPayload(weekKey) {
  return {
    plan: { ...emptyWeekPlan(), ...(state.plansByWeek?.[weekKey] || {}) },
    lockedPlan: { ...emptyWeekLocks(), ...(state.lockedPlansByWeek?.[weekKey] || {}) },
    dayTypes: { ...emptyWeekDayTypes(), ...(state.dayTypesByWeek?.[weekKey] || {}) },
    servings: { ...emptyWeekServings(state.family.familySize), ...(state.servingsByWeek?.[weekKey] || {}) },
    dayModes: { ...emptyWeekDayModes(), ...(state.dayModesByWeek?.[weekKey] || {}) },
    dayNotes: { ...emptyWeekDayNotes(), ...(state.dayNotesByWeek?.[weekKey] || {}) },
    clientUpdatedAt: state.clientUpdatedAt || 0,
  };
}

function syncedScopesForPatch(patch) {
  const scopes = new Set();
  if ("family" in patch) scopes.add("profile");
  if ("mealPreferences" in patch) scopes.add("preferences");
  if ("metadata" in patch) scopes.add("metadata");
  if ("meals" in patch) scopes.add("meals");
  if ("plansByWeek" in patch || "lockedPlansByWeek" in patch || "dayTypesByWeek" in patch || "servingsByWeek" in patch || "dayModesByWeek" in patch || "dayNotesByWeek" in patch) scopes.add("weeks");
  return [...scopes];
}

function changedWeekKeys(patch, previousState) {
  const keys = new Set();
  ["plansByWeek", "lockedPlansByWeek", "dayTypesByWeek", "servingsByWeek", "dayModesByWeek", "dayNotesByWeek"].forEach((field) => {
    if (!(field in patch)) return;
    const previous = previousState?.[field] || {};
    const current = state[field] || {};
    Object.keys({ ...previous, ...current }).forEach((weekKey) => {
      if (JSON.stringify(previous[weekKey] || {}) !== JSON.stringify(current[weekKey] || {})) {
        keys.add(weekKey);
      }
    });
  });
  if (!keys.size && ("plansByWeek" in patch || "lockedPlansByWeek" in patch || "dayTypesByWeek" in patch || "servingsByWeek" in patch || "dayModesByWeek" in patch || "dayNotesByWeek" in patch)) {
    keys.add(getWeekKey());
  }
  return [...keys];
}

function scheduleRemoteSaveForPatch(patch, previousState) {
  const scopes = syncedScopesForPatch(patch);
  if (!scopes.length) return;
  if (scopes.includes("meals")) {
    const currentMealIds = new Set((state.meals || []).map((meal) => meal.id));
    (previousState?.meals || []).forEach((meal) => {
      if (meal.id && !currentMealIds.has(meal.id)) pendingMealDeleteIds.add(meal.id);
    });
  }
  if (scopes.includes("weeks")) {
    changedWeekKeys(patch, previousState).forEach((weekKey) => pendingWeekKeys.add(weekKey));
  }
  scheduleRemoteSave(700, scopes);
}

function applyRemoteStatePatch(patch) {
  const uiState = {
    activeView: state.activeView,
    editingMealId: state.editingMealId,
    draftMeal: state.draftMeal,
    draftIngredients: state.draftIngredients,
    draftSteps: state.draftSteps,
    selectedMealId: state.selectedMealId,
    selectedRecipeContext: state.selectedRecipeContext,
    keepScreenAwake: state.keepScreenAwake,
    previousView: state.previousView,
    weekOffset: state.weekOffset,
    filters: state.filters,
  };
  state = normalizeState({ ...structuredClone(defaultState), ...state, ...patch, ...uiState });
  saveState();
  render();
}

function applyRemotePayload(payload) {
  const remoteClientUpdatedAt = Number(payload.clientUpdatedAt || 0);
  const localClientUpdatedAt = Number(state.clientUpdatedAt || 0);
  if (state.pendingLocalSync && remoteClientUpdatedAt < localClientUpdatedAt) {
    setTimeout(() => scheduleRemoteSave(0), 0);
    return;
  }
  const remoteState = {
    family: payload.family,
    mealPreferences: payload.mealPreferences,
    meals: payload.meals,
    metadata: payload.metadata,
    plansByWeek: payload.plansByWeek,
    lockedPlansByWeek: payload.lockedPlansByWeek,
    dayTypesByWeek: payload.dayTypesByWeek,
    servingsByWeek: payload.servingsByWeek,
    dayModesByWeek: payload.dayModesByWeek,
    dayNotesByWeek: payload.dayNotesByWeek,
    clientUpdatedAt: remoteClientUpdatedAt,
    pendingLocalSync: false,
  };
  const uiState = {
    activeView: state.activeView,
    editingMealId: state.editingMealId,
    draftMeal: state.draftMeal,
    draftIngredients: state.draftIngredients,
    draftSteps: state.draftSteps,
    selectedMealId: state.selectedMealId,
    selectedRecipeContext: state.selectedRecipeContext,
    keepScreenAwake: state.keepScreenAwake,
    previousView: state.previousView,
    weekOffset: state.weekOffset,
    filters: state.filters,
  };
  state = normalizeState({ ...structuredClone(defaultState), ...state, ...remoteState, ...uiState });
  saveState();
  render();
}

function syncStatusText() {
  return syncStatus;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  const icons = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    meals: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4v15.5A2.5 2.5 0 0 0 6.5 22H20V6a2 2 0 0 0-2-2H4z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  };
  return icons[name] || "";
}

function getMeal(id) {
  return state.meals.find((meal) => meal.id === id);
}

function sortedMeals() {
  return [...state.meals].sort((a, b) => a.title.localeCompare(b.title, "no"));
}

function mealSelectOptions(selectedId = "") {
  const labels = getCategoryLabels();
  const grouped = Object.keys(labels).map((category) => {
    const meals = sortedMeals().filter((meal) => meal.categories[0] === category);
    if (!meals.length) return "";
    const options = meals.map((meal) => {
      const details = [
        meal.prepTime === "quick" ? "Rask" : "",
        meal.kidFriendly ? "Barnevennlig" : "",
        meal.favorite ? "Favoritt" : "",
      ].filter(Boolean).join(", ");
      const label = details ? `${meal.title} - ${details}` : meal.title;
      return `<option value="${escapeHtml(meal.id)}" ${selectedId === meal.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
    return `<optgroup label="${escapeHtml(labels[category])}">${options}</optgroup>`;
  }).join("");

  const uncategorized = sortedMeals().filter((meal) => !meal.categories[0] || !labels[meal.categories[0]]);
  const other = uncategorized.length
    ? `<optgroup label="Annet">${uncategorized.map((meal) => `<option value="${escapeHtml(meal.id)}" ${selectedId === meal.id ? "selected" : ""}>${escapeHtml(meal.title)}</option>`).join("")}</optgroup>`
    : "";

  return grouped + other;
}

function getWeekDates(offset = state.weekOffset) {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay() || 7;
  monday.setDate(today.getDate() - day + 1 + offset * 7);
  return dayNames.map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getWeekKey(offset = state.weekOffset) {
  return getWeekDates(offset)[0].toISOString().slice(0, 10);
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyWeekPlan() {
  return { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
}

function emptyWeekLocks() {
  return { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
}

function emptyWeekDayTypes() {
  return { 0: "weekday", 1: "weekday", 2: "weekday", 3: "weekday", 4: "weekday", 5: "weekend", 6: "weekend" };
}

function emptyWeekDayModes() {
  return { 0: "home", 1: "home", 2: "home", 3: "home", 4: "home", 5: "home", 6: "home" };
}

function emptyWeekDayNotes() {
  return { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
}

function emptyWeekServings(familySize = 5) {
  familySize = Math.max(1, Number(familySize) || 5);
  return { 0: familySize, 1: familySize, 2: familySize, 3: familySize, 4: familySize, 5: familySize, 6: familySize };
}

function currentPlan() {
  return { ...emptyWeekPlan(), ...(state.plansByWeek?.[getWeekKey()] || {}) };
}

function currentLocks() {
  return { ...emptyWeekLocks(), ...(state.lockedPlansByWeek?.[getWeekKey()] || {}) };
}

function currentDayTypes() {
  return { ...emptyWeekDayTypes(), ...(state.dayTypesByWeek?.[getWeekKey()] || {}) };
}

function currentDayModes() {
  return { ...emptyWeekDayModes(), ...(state.dayModesByWeek?.[getWeekKey()] || {}) };
}

function currentDayNotes() {
  return { ...emptyWeekDayNotes(), ...(state.dayNotesByWeek?.[getWeekKey()] || {}) };
}

function currentServings() {
  return { ...emptyWeekServings(state.family.familySize), ...(state.servingsByWeek?.[getWeekKey()] || {}) };
}

function weekRangeLabel() {
  const dates = getWeekDates();
  return `${formatDate(dates[0])} - ${formatDate(dates[6])}`;
}

function setCurrentPlan(plan) {
  const weekKey = getWeekKey();
  setState({ plansByWeek: { ...(state.plansByWeek || {}), [weekKey]: plan } });
}

function setCurrentLocks(lockedPlan) {
  const weekKey = getWeekKey();
  setState({ lockedPlansByWeek: { ...(state.lockedPlansByWeek || {}), [weekKey]: lockedPlan } });
}

function setCurrentDayTypes(dayTypes) {
  const weekKey = getWeekKey();
  setState({ dayTypesByWeek: { ...(state.dayTypesByWeek || {}), [weekKey]: dayTypes } });
}

function setCurrentDayModes(dayModes) {
  const weekKey = getWeekKey();
  setState({ dayModesByWeek: { ...(state.dayModesByWeek || {}), [weekKey]: dayModes } });
}

function setCurrentDayNotes(dayNotes) {
  const weekKey = getWeekKey();
  setState({ dayNotesByWeek: { ...(state.dayNotesByWeek || {}), [weekKey]: dayNotes } });
}

function setCurrentServings(servings) {
  const weekKey = getWeekKey();
  setState({ servingsByWeek: { ...(state.servingsByWeek || {}), [weekKey]: servings } });
}

function formatDate(date) {
  return date.toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function categoryChips(meal) {
  const labels = getCategoryLabels();
  return meal.categories.map((cat) => `<span class="chip ${cat}">${escapeHtml(labels[cat] || cat)}</span>`).join("");
}

function mealBadges(meal) {
  const badges = [];
  if (meal.favorite) badges.push('<span class="chip">Favoritt</span>');
  if (meal.kidFriendly) badges.push('<span class="chip">Barnevennlig</span>');
  if (meal.leftovers === "likely") badges.push('<span class="chip">Rester</span>');
  if (meal.prepTime === "quick") badges.push('<span class="chip">Rask</span>');
  return badges.join("");
}

function suitabilityChips(meal) {
  const labels = getSuitabilityLabels();
  return (meal.suitability || []).map((key) => `<span class="chip">${escapeHtml(labels[key] || key)}</span>`).join("");
}

function suitabilityText(meal) {
  const labels = getSuitabilityLabels();
  const values = (meal.suitability || []).map((key) => labels[key] || key);
  return values.length ? values.join(", ") : "Ikke satt";
}

function prepTimeLabel(value) {
  return getPrepTimeLabels()[value] || "Ikke satt";
}

function leftoversLabel(value) {
  return {
    none: "Gir vanligvis ikke rester",
    possible: "Kan gi rester",
    likely: "Gir ofte rester",
  }[value] || "Ikke satt";
}

function normalizedRecipeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `https://${text}`;
}

function mealBaseServings(meal) {
  return Math.max(1, Number(meal?.baseServings) || 4);
}

function recipeTargetServings() {
  const context = state.selectedRecipeContext;
  if (!context) return null;
  const value = Number(state.servingsByWeek?.[context.weekKey]?.[context.dayIndex]);
  return value > 0 ? value : null;
}

function parseAmount(value) {
  const text = String(value || "").trim().replace(",", ".");
  if (!text) return null;
  const fraction = text.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator ? numerator / denominator : null;
  }
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function formatAmount(value) {
  const rounded = Math.round(value * 4) / 4;
  const decimals = Number.isInteger(rounded) ? 0 : rounded < 10 ? 2 : 1;
  return rounded.toLocaleString("no-NO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function scaleAmount(amount, baseServings, targetServings) {
  if (!targetServings || targetServings === baseServings) return amount;
  const parsed = parseAmount(amount);
  if (parsed === null) return amount;
  return formatAmount((parsed * targetServings) / baseServings);
}

function renderShell(viewHtml) {
  const isRecipeView = state.activeView === "recipe";
  app.innerHTML = `
    <div class="app-shell ${isRecipeView ? "recipe-mode" : ""}">
      ${isRecipeView ? "" : `<header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">M</div>
            <div>
              <h1 class="brand-title">${state.family.name} sin middagsplan</h1>
              <p class="brand-subtitle">Planlegg uka med gode middager</p>
            </div>
          </div>
          <div class="sync-pill"><span class="sync-dot"></span> ${escapeHtml(syncStatusText())}</div>
        </div>
      </header>`}
      <main class="content">${viewHtml}</main>
      <nav class="bottom-nav">
        <div class="bottom-nav-inner">
          ${navButton("calendar", "Kalender", "calendar")}
          ${navButton("planner", "Planlegger", "plan")}
          ${navButton("meals", "Middager", "meals")}
          ${navButton("setup", "Setup", "profile")}
        </div>
      </nav>
    </div>
  `;
}

function navButton(view, label, iconName) {
  const activeView = state.activeView === "recipe" ? state.previousView : state.activeView;
  return `<button class="nav-button ${activeView === view ? "active" : ""}" data-view="${view}" aria-label="${label}">
    ${icon(iconName)}<span>${label}</span>
  </button>`;
}

function renderCalendar() {
  const dates = getWeekDates();
  const plan = currentPlan();
  const dayModes = currentDayModes();
  const dayNotes = currentDayNotes();
  const todayIndex = getTodayIndexInCurrentWeek();
  const highlightedIndex = todayIndex >= 0 ? todayIndex : 0;
  const todayCard = renderTodaySummary(dates, plan, dayModes, dayNotes, todayIndex);

  const weekRows = dayNames.map((day, index) => {
    if (index === highlightedIndex) return "";
    const meal = getMeal(plan[index]);
    const isPlannedMeal = dayPlansMeal(dayModes[index]);
    const note = dayNotes[index] || "";
    const shortDay = day.substring(0, 3);
    const title = !isPlannedMeal
      ? planModeLabel(dayModes[index])
      : meal ? meal.title : null;

    return `
      <div class="week-row">
        <div class="week-row-day">
          <span class="week-row-name">${shortDay}</span>
          <span class="week-row-date">${formatDate(dates[index])}</span>
        </div>
        <div class="week-row-meal${!title ? " muted" : ""}">
          ${escapeHtml(title || "Ikke planlagt")}
        </div>
        <div class="week-row-action">
          ${meal && isPlannedMeal
            ? `<button class="button secondary compact" data-view-meal="${escapeHtml(meal.id)}" data-recipe-day="${index}">Oppskrift</button>`
            : !title
              ? `<button class="button secondary compact" data-view="planner">Planlegg</button>`
              : ""}
        </div>
      </div>
    `;
  }).join("");

  const listHeading = todayIndex >= 0 ? "Resten av uken" : "Alle dager";

  return `
    <section class="view-header calendar-view-header">
      <div>
        <h2 class="view-title">Middagsplan</h2>
        <p class="view-lead">${weekRangeLabel()}</p>
      </div>
    </section>
    ${todayCard}
    <section class="week-list">
      <h4 class="week-list-heading">${listHeading}</h4>
      ${weekRows}
    </section>
    <div class="week-nav">
      <button class="button secondary compact" data-week="-1">← Forrige</button>
      <button class="button secondary compact" data-week="0">Denne uken</button>
      <button class="button secondary compact" data-week="1">Neste →</button>
    </div>
  `;
}

function getTodayIndexInCurrentWeek() {
  const todayKey = localDateKey(new Date());
  return getWeekDates().findIndex((date) => localDateKey(date) === todayKey);
}

function renderTodaySummary(dates, plan, dayModes, dayNotes, todayIndex) {
  const index = todayIndex >= 0 ? todayIndex : 0;
  const day = todayIndex >= 0 ? "I dag" : dayNames[index];
  const meal = getMeal(plan[index]);
  const isPlannedMeal = dayPlansMeal(dayModes[index]);
  const note = dayNotes[index] || "";
  const title = !isPlannedMeal ? planModeLabel(dayModes[index]) : meal ? meal.title : "Ikke planlagt";
  const description = !isPlannedMeal
    ? (note || "Ingen detaljer lagt inn.")
    : meal
      ? (meal.description || "Ingen beskrivelse lagt inn.")
      : "Gå til Planlegger for å legge inn middag.";
  return `
    <section class="today-summary">
      <div>
        <span class="today-kicker">${day} · ${formatDate(dates[index])}</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="today-actions">
        ${meal && isPlannedMeal ? `<button class="button secondary compact" data-view-meal="${escapeHtml(meal.id)}" data-recipe-day="${index}">Oppskrift</button>` : ""}
        <button class="button secondary compact" data-view="planner">Planlegger</button>
      </div>
    </section>
  `;
}

function renderPlanner() {
  const dates = getWeekDates();
  const plan = currentPlan();
  const lockedPlan = currentLocks();
  const dayTypes = currentDayTypes();
  const servings = currentServings();
  const dayModes = currentDayModes();
  const dayNotes = currentDayNotes();
  const rows = dayNames.map((day, index) => {
    const mealId = plan[index] || "";
    const meal = getMeal(mealId);
    const locked = Boolean(lockedPlan[index]);
    const dayType = dayTypes[index] || "weekday";
    const dayServings = Math.max(1, Number(servings[index]) || 4);
    const dayMode = dayModes[index] || "home";
    const isPlannedMeal = dayPlansMeal(dayMode);
    const dayNote = dayNotes[index] || "";
    const typeLabel = getSuitabilityLabels()[dayType] || dayType;
    return `
      <div class="planner-row">
        <div class="planner-day-block">
          <div>
            <div class="planner-day">${day}</div>
            <div class="day-date">${formatDate(dates[index])}</div>
          </div>
          <button class="toggle-chip ${locked ? "active" : ""}" data-lock-day="${index}">${locked ? "Låst" : "Åpen"}</button>
        </div>
        <div class="planner-summary ${!isPlannedMeal || meal ? "" : "empty"}">
          ${!isPlannedMeal ? `
            <strong>${escapeHtml(planModeLabel(dayMode))}</strong>
            <span>${escapeHtml(dayNote || "Legg inn hvor dere skal spise.")}</span>
          ` : meal ? `
            <strong>${escapeHtml(meal.title)}</strong>
            <span>${escapeHtml(meal.description || suggestionReason(meal, index))}</span>
          ` : `
            <strong>Ikke planlagt</strong>
            <span>Velg en middag eller trykk Forslag.</span>
          `}
        </div>
        <div class="planner-meal-block">
          <div class="planner-controls">
            <label class="planner-control">
              <span>Plan</span>
              <select class="select compact-select" data-day-mode="${index}" aria-label="Plan for ${day}">
                ${planModeEntries().map(([value, option]) => `<option value="${escapeHtml(value)}" ${dayMode === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
              </select>
            </label>
          ${!isPlannedMeal ? `
            <label class="planner-control wide">
              <span>Notat</span>
              <input class="input" data-day-note="${index}" value="${escapeHtml(dayNote)}" placeholder="F.eks. rester fra taco eller middag hos svigefar">
            </label>
          ` : `
            <label class="planner-control">
              <span>Type</span>
              <select class="select compact-select" data-day-type="${index}" aria-label="Dagstype for ${day}">
                ${suitabilityEntries().map(([value, label]) => `<option value="${value}" ${dayType === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
              </select>
            </label>
            <label class="planner-control persons">
              <span>Personer</span>
              <input class="input compact-input" type="number" min="1" max="30" data-day-servings="${index}" value="${dayServings}">
            </label>
            <label class="planner-control wide">
              <span>Middag</span>
              <select class="select" data-plan-day="${index}">
                <option value="">Ikke planlagt</option>
                ${mealSelectOptions(mealId)}
              </select>
            </label>
            ${meal ? `<p class="planner-reason">${escapeHtml(typeLabel)} · ${escapeHtml(suggestionReason(meal, index))}</p>` : ""}
          `}
          </div>
        </div>
        <div class="planner-actions">
          ${!isPlannedMeal ? "" : `<button class="button secondary compact" data-random-day="${index}" ${locked ? "disabled" : ""}>Forslag</button>`}
          ${mealId && isPlannedMeal ? `<button class="button secondary compact" data-view-meal="${escapeHtml(mealId)}" data-recipe-day="${index}">Oppskrift</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  return `
    <section class="view-header planner-view-header">
      <h2 class="view-title">Planlegg uken</h2>
      <div class="planner-top-bar">
        <div class="week-nav-compact">
          <button class="button secondary week-arrow-btn" data-week="-1" aria-label="Forrige uke">←</button>
          <span class="week-nav-label">${weekRangeLabel()}</span>
          <button class="button secondary week-arrow-btn" data-week="1" aria-label="Neste uke">→</button>
        </div>
        <button class="button compact" data-fill-week>${icon("add")} Fyll ledige dager</button>
      </div>
      <div class="planner-secondary-actions">
        <button class="text-action" data-week="0">Denne uken</button>
        <span class="action-sep">·</span>
        <button class="text-action" data-replace-open-week>Bytt åpne forslag</button>
        <span class="action-sep">·</span>
        <button class="text-action quiet" data-clear-week>Tøm uke</button>
      </div>
    </section>
    <details class="advisor-panel">
      <summary>Rådgiverstatus</summary>
      <p class="status-note">${advisorSummary()}</p>
    </details>
    <section class="panel">
      <div class="planner-list">${rows}</div>
    </section>
  `;
}

function advisorSummary() {
  const plan = currentPlan();
  const lockedPlan = currentLocks();
  const dayTypes = currentDayTypes();
  const plannedMeals = Object.values(plan).filter(Boolean).map(getMeal).filter(Boolean);
  const kidCount = plannedMeals.filter((meal) => meal.kidFriendly).length;
  const quickDays = state.family.quickDays.join(", ");
  const lockedCount = Object.values(lockedPlan).filter(Boolean).length;
  const activeTypes = [...new Set(Object.values(dayTypes).map((type) => getSuitabilityLabels()[type] || type))].join(", ");
  const categoryStatus = categoryPreferenceStatus(plan);
  return `Rådgiveren fyller bare åpne dager og lar låste dager stå. Den matcher dagstype mot "Passer til", prioriterer raske middager på ${quickDays}, unngår duplikater i samme uke og prøver å variere mot de siste ${VARIATION_LOOKBACK_WEEKS} ukene. Dagstyper denne uken: ${activeTypes}. Barnevennlige middager: ${kidCount}/${state.family.kidFriendlyPerWeek}. Låste dager: ${lockedCount}.${categoryStatus ? ` Middagspreferanser: ${categoryStatus}.` : ""}`;
}

function categoryPreferenceStatus(plan) {
  const counts = categoryCountsForPlan(plan);
  return categoryEntries().map(([category, label]) => {
    const goal = preferenceGoalFor(category);
    const count = counts[category] || 0;
    const parts = [];
    if (goal.minPerWeek) parts.push(`${count}/${goal.minPerWeek}`);
    if (goal.maxPerWeek) parts.push(`maks ${goal.maxPerWeek}`);
    if (!parts.length) return "";
    return `${label} ${parts.join(", ")}`;
  }).filter(Boolean).join(" · ");
}

function suggestionReason(meal, dayIndex) {
  const dayType = currentDayTypes()[dayIndex] || "weekday";
  const typeLabel = getSuitabilityLabels()[dayType] || dayType;
  const parts = [];
  if ((meal.suitability || []).includes(dayType)) parts.push(`passer til ${typeLabel.toLowerCase()}`);
  if (state.family.quickDays.includes(dayNames[dayIndex]) && meal.prepTime === "quick") parts.push("rask dag");
  if (meal.kidFriendly) parts.push("barnevennlig");
  if (meal.favorite) parts.push("favoritt");
  if (recentMealDistanceDays(meal.id, dateForWeekDay(getWeekKey(), dayIndex)) === null) parts.push("ikke brukt nylig");
  return parts.length ? `Foreslått fordi den er ${parts.join(", ")}.` : `Valgt for ${typeLabel.toLowerCase()}.`;
}

function renderMeals() {
  const meals = filteredMeals();
  const grouped = state.filters.sort === "category" && !state.filters.query.trim() && state.filters.category === "all" && state.filters.flag === "all";
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Middager</h2>
        <p class="view-lead">Bygg familiens egen middagsbank. Det du legger inn her blir tilgjengelig i kalenderen og planleggeren.</p>
      </div>
      <div class="toolbar">
        <button class="button" data-edit-meal="new">${icon("add")} Ny middag</button>
      </div>
    </section>
    ${state.editingMealId ? renderMealEditor() : ""}
    <section class="filters">
      <input class="input" data-filter="query" value="${escapeHtml(state.filters.query)}" placeholder="Søk etter middag eller ingrediens">
      <select class="select" data-filter="category">
        <option value="all">Alle kategorier</option>
        ${categoryEntries().map(([value, label]) => `<option value="${value}" ${state.filters.category === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
      <select class="select" data-filter="flag">
        <option value="all">Alle typer</option>
        <option value="favorite" ${state.filters.flag === "favorite" ? "selected" : ""}>Favoritter</option>
        <option value="kid" ${state.filters.flag === "kid" ? "selected" : ""}>Barnevennlig</option>
        <option value="quick" ${state.filters.flag === "quick" ? "selected" : ""}>Rask middag</option>
        ${suitabilityEntries().map(([value, label]) => `<option value="suitability:${value}" ${state.filters.flag === `suitability:${value}` ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
      </select>
      <select class="select" data-filter="sort">
        <option value="category" ${state.filters.sort === "category" ? "selected" : ""}>Gruppert etter kategori</option>
        <option value="alpha" ${state.filters.sort === "alpha" ? "selected" : ""}>Alfabetisk liste</option>
      </select>
    </section>
    <section class="meal-list">
      ${grouped ? renderGroupedMeals(meals) : meals.map(renderMealCard).join("")}
    </section>
  `;
}

function filteredMeals() {
  const query = state.filters.query.trim().toLowerCase();
  return sortedMeals().filter((meal) => {
    const matchesQuery = !query || [meal.title, meal.description, ...meal.keyIngredients].join(" ").toLowerCase().includes(query);
    const matchesCategory = state.filters.category === "all" || meal.categories.includes(state.filters.category);
    const matchesFlag = state.filters.flag === "all"
      || (state.filters.flag === "favorite" && meal.favorite)
      || (state.filters.flag === "kid" && meal.kidFriendly)
      || (state.filters.flag === "quick" && meal.prepTime === "quick")
      || (state.filters.flag.startsWith("suitability:") && (meal.suitability || []).includes(state.filters.flag.replace("suitability:", "")));
    return matchesQuery && matchesCategory && matchesFlag;
  });
}

function renderGroupedMeals(meals) {
  const labels = getCategoryLabels();
  const groups = Object.entries(labels)
    .map(([category, label]) => ({
      category,
      label,
      meals: meals.filter((meal) => meal.categories[0] === category),
    }))
    .filter((group) => group.meals.length);

  const other = meals.filter((meal) => !meal.categories[0] || !labels[meal.categories[0]]);
  if (other.length) groups.push({ category: "annet", label: "Annet", meals: other });

  return groups.map((group) => `
    <section class="meal-group">
      <h3>${escapeHtml(group.label)}</h3>
      <div class="meal-list">${group.meals.map(renderMealCard).join("")}</div>
    </section>
  `).join("");
}

function renderMealCard(meal) {
  return `
    <article class="meal-card">
      <div class="meal-card-head">
        <div>
          <p class="meal-title">${escapeHtml(meal.title)}</p>
          <p class="meal-description">${escapeHtml(meal.description)}</p>
        </div>
        <div class="card-actions">
          <button class="button secondary compact" data-view-meal="${escapeHtml(meal.id)}">Oppskrift</button>
          <button class="button secondary compact" data-edit-meal="${escapeHtml(meal.id)}">Rediger</button>
          <button class="icon-button" data-add-next="${escapeHtml(meal.id)}" title="Legg i første ledige dag">${icon("add")}</button>
        </div>
      </div>
      <div class="chips">${categoryChips(meal)}${mealBadges(meal)}${suitabilityChips(meal)}</div>
      <div class="meta-line">
        <span>Min. ${meal.minDaysBetween} dager mellom</span>
        <span>Nøkkel: ${escapeHtml(meal.keyIngredients.join(", "))}</span>
      </div>
    </article>
  `;
}

function renderMealDetail() {
  const meal = getMeal(state.selectedMealId);
  if (!meal) return "";
  const steps = meal.steps?.length ? meal.steps : ["Ingen fremgangsmåte er lagt inn ennå."];
  const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
  const wakeSupported = "wakeLock" in navigator;
  const wakeText = state.keepScreenAwake ? "Skjermen holdes på" : "Hold skjermen på";
  const leftoversText = leftoversLabel(meal.leftovers);
  const baseServings = mealBaseServings(meal);
  const targetServings = recipeTargetServings();
  const displayServings = targetServings || baseServings;
  const servingText = targetServings
    ? targetServings === baseServings
      ? `Oppskrift til ${displayServings} personer.`
      : `Justert til ${displayServings} personer fra en oppskrift på ${baseServings}.`
    : `Oppskriften er lagt inn for ${baseServings} personer.`;

  return `
    <section class="recipe-detail">
      <div class="recipe-hero">
        <div>
          <h2>${escapeHtml(meal.title)}</h2>
          <p>${escapeHtml(meal.description || "Ingen beskrivelse er lagt inn ennå.")}</p>
          <p class="recipe-serving-note">${escapeHtml(servingText)}</p>
        </div>
        <div class="recipe-actions">
          <button class="button ghost" data-close-meal>Tilbake</button>
          <button class="button secondary wake-button ${state.keepScreenAwake ? "active" : ""}" data-toggle-wake ${wakeSupported ? "" : "disabled"}>${wakeText}</button>
          ${meal.recipeUrl ? `<a class="button secondary" href="${escapeHtml(meal.recipeUrl)}" target="_blank" rel="noopener">Åpne lenke</a>` : ""}
          <button class="button secondary" data-edit-meal="${escapeHtml(meal.id)}">Rediger</button>
        </div>
      </div>
      ${wakeSupported ? "" : '<p class="wake-note">Denne nettleseren støtter ikke å holde skjermen våken fra web-appen.</p>'}
      <div class="recipe-columns">
        <section class="recipe-section">
          <h3>Ingredienser</h3>
          ${ingredients.length ? `
            <div class="ingredient-table">
              ${ingredients.map((item) => `
                <div class="ingredient-row">
                  <span>${escapeHtml([scaleAmount(item.amount, baseServings, targetServings), item.unit].filter(Boolean).join(" "))}</span>
                  <strong>${escapeHtml(item.name)}</strong>
                </div>
              `).join("")}
            </div>
          ` : '<p class="empty-recipe-text">Ingen ingredienser er lagt inn ennå.</p>'}
        </section>
        <section class="recipe-section">
          <h3>Fremgangsmåte</h3>
          <div class="step-list">
            ${steps.map((step, index) => `
              <article class="recipe-step">
                <div class="recipe-step-number">${index + 1}</div>
                <p>${escapeHtml(step)}</p>
              </article>
            `).join("")}
          </div>
          <p class="recipe-note">${escapeHtml(leftoversText)}</p>
        </section>
      </div>
    </section>
  `;
}

function emptyMeal() {
  return {
    id: "",
    title: "",
    description: "",
    recipeUrl: "",
    baseServings: 4,
    categories: ["kjott"],
    kidFriendly: false,
    favorite: false,
    leftovers: "none",
    prepTime: "quick",
    minDaysBetween: 14,
    keyIngredients: [],
    ingredients: [],
    suitability: [],
    steps: [],
  };
}

function renderMealEditor() {
  const isNew = state.editingMealId === "new";
  const baseMeal = isNew ? emptyMeal() : getMeal(state.editingMealId);
  if (!baseMeal) return "";
  const meal = getDraftMeal(baseMeal);
  const ingredients = getDraftIngredients(meal);
  const steps = getDraftSteps(meal);
  return `
    <section class="panel meal-editor">
      <div class="meal-editor-head">
        <h2>${isNew ? "Ny middag" : `Rediger ${escapeHtml(meal.title)}`}</h2>
        <button class="button ghost" data-cancel-edit>Avbryt</button>
      </div>
      <form class="form" data-meal-form>
        <div class="form-row">
          <div class="setting">
            <label for="mealTitle">Navn</label>
            <input id="mealTitle" class="input" name="title" required value="${escapeHtml(meal.title)}">
          </div>
          <div class="setting">
            <label for="mealBaseServings">Porsjoner</label>
            <input id="mealBaseServings" class="input" type="number" min="1" max="30" name="baseServings" value="${mealBaseServings(meal)}">
          </div>
        </div>
        <div class="form-row">
          <div class="setting">
            <label for="mealPrep">Tilberedningstid</label>
            <select id="mealPrep" class="select" name="prepTime">
              ${prepTimeEntries().map(([value, label]) => prepOption(value, label, meal.prepTime)).join("")}
            </select>
          </div>
        </div>
        <div class="setting">
          <label for="mealDescription">Beskrivelse</label>
          <textarea id="mealDescription" class="textarea" name="description">${escapeHtml(meal.description)}</textarea>
        </div>
        <div class="setting">
          <label for="mealRecipeUrl">Lenke til oppskrift</label>
          <input id="mealRecipeUrl" class="input" type="text" inputmode="url" name="recipeUrl" value="${escapeHtml(meal.recipeUrl || "")}" placeholder="https://...">
        </div>
        <div class="form-row">
          <div class="setting">
            <label>Kategorier</label>
            <div class="checkbox-grid">
              ${categoryEntries().map(([value, label]) => `
                <label class="checkbox-line">
                  <input type="checkbox" name="categories" value="${value}" ${meal.categories.includes(value) ? "checked" : ""}>
                  <span>${escapeHtml(label)}</span>
                </label>
              `).join("")}
            </div>
          </div>
          <div class="setting">
            <label>Merking</label>
            <div class="checkbox-grid">
              <label class="checkbox-line"><input type="checkbox" name="kidFriendly" ${meal.kidFriendly ? "checked" : ""}> <span>Barnevennlig</span></label>
              <label class="checkbox-line"><input type="checkbox" name="favorite" ${meal.favorite ? "checked" : ""}> <span>Favoritt</span></label>
            </div>
          </div>
        </div>
        <div class="setting">
          <label>Passer til</label>
          <div class="checkbox-grid">
            ${suitabilityEntries().map(([value, label]) => `
              <label class="checkbox-line">
                <input type="checkbox" name="suitability" value="${value}" ${(meal.suitability || []).includes(value) ? "checked" : ""}>
                <span>${escapeHtml(label)}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <div class="form-row">
          <div class="setting">
            <label for="mealLeftovers">Rester</label>
            <select id="mealLeftovers" class="select" name="leftovers">
              ${leftoverOption("none", "Nei", meal.leftovers)}
              ${leftoverOption("possible", "Kanskje", meal.leftovers)}
              ${leftoverOption("likely", "Sannsynlig", meal.leftovers)}
            </select>
          </div>
          <div class="setting">
            <label for="mealSpacing">Minimum dager mellom</label>
            <input id="mealSpacing" class="input" type="number" min="1" max="365" name="minDaysBetween" value="${meal.minDaysBetween}">
          </div>
        </div>
        <div class="setting">
          <label for="mealIngredients">Ingredienser</label>
          <div class="ingredient-editor">
            <div class="ingredient-editor-head">
              <span>Mengde</span>
              <span>Enhet</span>
              <span>Ingrediens</span>
              <span></span>
            </div>
            ${ingredients.map((item, index) => renderIngredientEditorRow(item, index)).join("")}
          </div>
          <button class="button secondary compact" type="button" data-add-ingredient>Legg til ingrediens</button>
          <p class="field-hint">Mengde og enhet kan stå tomt. Ingrediensnavn bør alltid fylles ut.</p>
        </div>
        <div class="setting">
          <label>Fremgangsmåte</label>
          <div class="step-editor">
            ${steps.map((step, index) => renderStepEditorRow(step, index)).join("")}
          </div>
          <button class="button secondary compact" type="button" data-add-step>Legg til steg</button>
        </div>
        <div class="form-actions">
          ${isNew ? "" : '<button class="button danger" type="button" data-delete-meal>Slett</button>'}
          <button class="button secondary" type="button" data-cancel-edit>Avbryt</button>
          <button class="button" type="submit">Lagre middag</button>
        </div>
      </form>
    </section>
  `;
}

function prepOption(value, label, selected) {
  return `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`;
}

function leftoverOption(value, label, selected) {
  return `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`;
}

function getDraftMeal(meal) {
  return state.draftMeal ? { ...meal, ...state.draftMeal } : meal;
}

function getDraftIngredients(meal) {
  if (Array.isArray(state.draftIngredients)) return state.draftIngredients;
  const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
  return ingredients.length ? ingredients : [{ amount: "", unit: "", name: "" }];
}

function getDraftSteps(meal) {
  if (Array.isArray(state.draftSteps)) return state.draftSteps;
  return meal.steps?.length ? meal.steps : [""];
}

function renderIngredientEditorRow(item, index) {
  return `
    <div class="ingredient-editor-row" data-ingredient-row="${index}">
      <input class="input" data-ingredient-field="amount" data-ingredient-index="${index}" value="${escapeHtml(item.amount)}" placeholder="Mengde">
      <select class="select" data-ingredient-field="unit" data-ingredient-index="${index}" aria-label="Enhet">
        ${getUnitOptions().map((unit) => `<option value="${escapeHtml(unit)}" ${item.unit === unit ? "selected" : ""}>${unit ? escapeHtml(unit) : "Enhet"}</option>`).join("")}
      </select>
      <input class="input" data-ingredient-field="name" data-ingredient-index="${index}" value="${escapeHtml(item.name)}" placeholder="Ingrediensnavn">
      <button class="icon-button" type="button" data-remove-ingredient="${index}" title="Fjern ingrediens">×</button>
    </div>
  `;
}

function renderStepEditorRow(step, index) {
  return `
    <div class="step-editor-row" data-step-row="${index}">
      <div class="step-editor-number">${index + 1}</div>
      <textarea class="textarea" data-step-field data-step-index="${index}" placeholder="Beskriv dette steget">${escapeHtml(step)}</textarea>
      <button class="icon-button" type="button" data-remove-step="${index}" title="Fjern steg">×</button>
    </div>
  `;
}

function saveMealFromForm(form) {
  const formData = new FormData(form);
  const isNew = state.editingMealId === "new";
  const existing = isNew ? emptyMeal() : getMeal(state.editingMealId);
  if (!existing) return;
  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const id = isNew ? makeMealId(title) : existing.id;
  const categories = formData.getAll("categories");
  const ingredients = collectIngredientRows();
  const meal = {
    ...existing,
    id,
    title,
    description: String(formData.get("description") || "").trim(),
    recipeUrl: normalizedRecipeUrl(formData.get("recipeUrl")),
    baseServings: Math.max(1, Number(formData.get("baseServings")) || 4),
    categories: categories.length ? categories : ["kjott"],
    suitability: formData.getAll("suitability"),
    kidFriendly: formData.has("kidFriendly"),
    favorite: formData.has("favorite"),
    leftovers: String(formData.get("leftovers") || "none"),
    prepTime: String(formData.get("prepTime") || "quick"),
    minDaysBetween: Math.max(1, Number(formData.get("minDaysBetween")) || 14),
    ingredients,
    keyIngredients: ingredients.map((item) => item.name.toLowerCase()),
    steps: collectStepRows(),
  };

  const meals = isNew
    ? [...state.meals, meal]
    : state.meals.map((item) => item.id === meal.id ? meal : item);
  setState({ meals, editingMealId: null, draftMeal: null, draftIngredients: null, draftSteps: null, selectedMealId: meal.id });
}

function makeMealId(title) {
  const base = title.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "middag";
  let id = base;
  let count = 2;
  while (state.meals.some((meal) => meal.id === id)) {
    id = `${base}-${count}`;
    count += 1;
  }
  return id;
}

function splitList(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function splitLines(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

function collectIngredientRows() {
  return [...app.querySelectorAll("[data-ingredient-row]")]
    .map((row) => ({
      amount: row.querySelector('[data-ingredient-field="amount"]')?.value.trim() || "",
      unit: row.querySelector('[data-ingredient-field="unit"]')?.value.trim() || "",
      name: row.querySelector('[data-ingredient-field="name"]')?.value.trim() || "",
    }))
    .filter((item) => item.name);
}

function syncDraftIngredientsFromDom() {
  state.draftIngredients = [...app.querySelectorAll("[data-ingredient-row]")]
    .map((row) => ({
      amount: row.querySelector('[data-ingredient-field="amount"]')?.value.trim() || "",
      unit: row.querySelector('[data-ingredient-field="unit"]')?.value.trim() || "",
      name: row.querySelector('[data-ingredient-field="name"]')?.value.trim() || "",
    }));
}

function syncDraftMealFromDom() {
  const form = app.querySelector("[data-meal-form]");
  if (!form) return;
  const formData = new FormData(form);
  state.draftMeal = {
    title: String(formData.get("title") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    recipeUrl: String(formData.get("recipeUrl") || "").trim(),
    baseServings: Math.max(1, Number(formData.get("baseServings")) || 4),
    categories: formData.getAll("categories"),
    kidFriendly: formData.has("kidFriendly"),
    favorite: formData.has("favorite"),
    leftovers: String(formData.get("leftovers") || "none"),
    prepTime: String(formData.get("prepTime") || "quick"),
    minDaysBetween: Number(formData.get("minDaysBetween") || 14),
    suitability: formData.getAll("suitability"),
  };
}

function collectStepRows() {
  return [...app.querySelectorAll("[data-step-row]")]
    .map((row) => row.querySelector("[data-step-field]")?.value.trim() || "")
    .filter(Boolean);
}

function syncDraftStepsFromDom() {
  state.draftSteps = [...app.querySelectorAll("[data-step-row]")]
    .map((row) => row.querySelector("[data-step-field]")?.value.trim() || "");
}

function syncMealEditorDraftFromDom() {
  syncDraftMealFromDom();
  syncDraftIngredientsFromDom();
  syncDraftStepsFromDom();
}

function deleteCurrentMeal() {
  const mealId = state.editingMealId;
  if (!mealId || mealId === "new") return;
  const meal = getMeal(mealId);
  const mealTitle = meal?.title || "denne middagen";
  const confirmed = window.confirm(`Er du sikker på at du vil slette "${mealTitle}"? Middagen fjernes også fra ukeplaner der den er brukt.`);
  if (!confirmed) return;
  const plansByWeek = Object.fromEntries(Object.entries(state.plansByWeek || {}).map(([week, plan]) => [
    week,
    Object.fromEntries(Object.entries(plan).map(([day, plannedId]) => [day, plannedId === mealId ? "" : plannedId])),
  ]));
  const meals = state.meals.filter((meal) => meal.id !== mealId);
  setState({ meals, plansByWeek, editingMealId: null, draftMeal: null, draftIngredients: null, draftSteps: null, selectedMealId: null });
}

function renderSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Setup</h2>
        <p class="view-lead">Styr familieinnstillinger, metadata og appoppdatering fra ett sted.</p>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Familie</h2>
      <div class="settings-grid">
        <div class="setting">
          <label for="familyName">Familienavn</label>
          <input id="familyName" class="input" data-family="name" value="${escapeHtml(state.family.name)}">
        </div>
        <div class="setting">
          <label for="familySize">Personer i familien</label>
          <input id="familySize" class="input" type="number" min="1" max="30" data-family="familySize" value="${Math.max(1, Number(state.family.familySize) || 5)}">
        </div>
        <div class="setting">
          <label for="kidCount">Barnevennlige middager per uke</label>
          <input id="kidCount" class="input" type="number" min="0" max="7" data-family="kidFriendlyPerWeek" value="${state.family.kidFriendlyPerWeek}">
        </div>
        <div class="setting">
          <label>Regler</label>
          <button class="toggle-chip ${state.family.leftovers ? "active" : ""}" data-toggle-family="leftovers">Foreslå restdager</button>
          <button class="toggle-chip ${state.family.reuseIngredients ? "active" : ""}" data-toggle-family="reuseIngredients">Gjenbruk ingredienser</button>
        </div>
        <div class="setting">
          <label>Raske dager</label>
          <div class="quick-days">
            ${dayNames.map((day) => `<button class="toggle-chip ${state.family.quickDays.includes(day) ? "active" : ""}" data-quick-day="${day}">${day.slice(0, 3)}</button>`).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Middagspreferanser</h2>
      <p class="status-note">Sett myke mål for ukene. Rådgiveren prøver å treffe disse, men kan fortsatt velge praktisk hvis få middager passer.</p>
      <div class="setup-menu">
        <button class="setup-menu-item" data-view="meal-preferences">
          <span>Ukemål for kategorier</span>
          <strong>${activePreferenceGoalCount()}</strong>
        </button>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>Metadata</h2>
      <div class="setup-menu">
        <button class="setup-menu-item" data-view="categories">
          <span>Kategorier</span>
          <strong>${categoryEntries().length}</strong>
        </button>
        <button class="setup-menu-item" data-view="units">
          <span>Enheter</span>
          <strong>${getUnitOptions().filter(Boolean).length}</strong>
        </button>
        <button class="setup-menu-item" data-view="prep-times">
          <span>Tilberedningstid</span>
          <strong>${prepTimeEntries().length}</strong>
        </button>
        <button class="setup-menu-item" data-view="suitability">
          <span>Passer til</span>
          <strong>${suitabilityEntries().length}</strong>
        </button>
        <button class="setup-menu-item" data-view="plan-modes">
          <span>Plan</span>
          <strong>${planModeEntries().length}</strong>
        </button>
      </div>
    </section>
    <section class="panel setup-section">
      <h2>App</h2>
      <p class="status-note">Bruk denne etter publisering hvis appen ikke henter siste versjon automatisk. Middager og innstillinger i nettleseren beholdes.</p>
      <button class="button" data-refresh-app>Oppdater app</button>
    </section>
  `;
}

function activePreferenceGoalCount() {
  return Object.values(state.mealPreferences?.categoryGoals || {})
    .reduce((count, goal) => count + ["minPerWeek", "maxPerWeek", "minEveryWeeks"].filter((field) => goal?.[field]).length, 0);
}

function preferenceGoalFor(category) {
  return normalizeCategoryGoal(state.mealPreferences?.categoryGoals?.[category]);
}

function renderMealPreferencesSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Middagspreferanser</h2>
        <p class="view-lead">Definer hva dere helst vil ha i en vanlig uke. Tomme felt betyr ingen regel.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <form class="preference-list" data-meal-preferences-form>
        ${categoryEntries().map(([key, label]) => {
          const goal = preferenceGoalFor(key);
          return `
            <div class="preference-row">
              <div>
                <span class="chip ${key}">${escapeHtml(label)}</span>
                <p>Brukes når planleggeren foreslår middager.</p>
              </div>
              <div class="preference-fields">
                <label>
                  <span>Min. per uke</span>
                  <input class="input" type="number" min="0" max="7" name="${escapeHtml(key)}:minPerWeek" value="${goal.minPerWeek ?? ""}" placeholder="0">
                </label>
                <label>
                  <span>Maks per uke</span>
                  <input class="input" type="number" min="0" max="7" name="${escapeHtml(key)}:maxPerWeek" value="${goal.maxPerWeek ?? ""}" placeholder="Tomt">
                </label>
                <label>
                  <span>Minst hver</span>
                  <input class="input" type="number" min="0" max="12" name="${escapeHtml(key)}:minEveryWeeks" value="${goal.minEveryWeeks ?? ""}" placeholder="uker">
                </label>
              </div>
            </div>
          `;
        }).join("")}
        <p class="field-hint">Eksempel: Fisk med “Min. per uke 1” og “Minst hver 2” betyr at rådgiveren prioriterer fisk hvis det mangler fisk denne uken eller forrige uke.</p>
        <button class="button" type="submit">Lagre preferanser</button>
      </form>
    </section>
  `;
}

function saveMealPreferencesFromForm(form) {
  const formData = new FormData(form);
  const categoryGoals = {};
  categoryEntries().forEach(([key]) => {
    categoryGoals[key] = normalizeCategoryGoal({
      minPerWeek: formData.get(`${key}:minPerWeek`),
      maxPerWeek: formData.get(`${key}:maxPerWeek`),
      minEveryWeeks: formData.get(`${key}:minEveryWeeks`),
    });
  });
  setState({ mealPreferences: { categoryGoals } });
}

function renderCategoriesSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Kategorier</h2>
        <p class="view-lead">Kategorier brukes i middager, filter, kalender og planlegger.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <div class="metadata-list">
        ${categoryEntries().map(([key, label]) => `
          <div class="metadata-row editable">
            <input class="input" data-category-label="${escapeHtml(key)}" value="${escapeHtml(label)}" aria-label="Kategorinavn ${escapeHtml(label)}">
            <button class="button secondary compact" data-save-category="${escapeHtml(key)}">Lagre</button>
            <button class="icon-button" data-remove-category="${escapeHtml(key)}" title="Fjern kategori">×</button>
          </div>
        `).join("")}
      </div>
      <form class="metadata-add" data-category-form>
        <input class="input" name="categoryName" placeholder="Ny kategori, f.eks. Kylling">
        <button class="button secondary" type="submit">Legg til kategori</button>
      </form>
    </section>
  `;
}

function renderUnitsSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Enheter</h2>
        <p class="view-lead">Enhetene vises i ingrediensfeltet når du lager eller redigerer oppskrifter.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <div class="metadata-list">
        ${getUnitOptions().filter(Boolean).map((unit) => `
          <div class="metadata-row">
            <span>${escapeHtml(unit)}</span>
            <button class="icon-button" data-remove-unit="${escapeHtml(unit)}" title="Fjern enhet">×</button>
          </div>
        `).join("")}
      </div>
      <form class="metadata-add" data-unit-form>
        <input class="input" name="unitName" placeholder="Ny enhet, f.eks. klype">
        <button class="button secondary" type="submit">Legg til enhet</button>
      </form>
    </section>
  `;
}

function renderPrepTimesSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Tilberedningstid</h2>
        <p class="view-lead">Disse valgene brukes i oppskriftene og senere av rådgiveren når travle dager skal planlegges.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <div class="metadata-list">
        ${prepTimeEntries().map(([key, label]) => `
          <div class="metadata-row">
            <span>${escapeHtml(label)}</span>
            <button class="icon-button" data-remove-prep-time="${escapeHtml(key)}" title="Fjern tilberedningstid">×</button>
          </div>
        `).join("")}
      </div>
      <form class="metadata-add" data-prep-time-form>
        <input class="input" name="prepTimeName" placeholder="Ny tid, f.eks. Veldig rask under 15 min">
        <button class="button secondary" type="submit">Legg til tid</button>
      </form>
    </section>
  `;
}

function renderSuitabilitySetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Passer til</h2>
        <p class="view-lead">Brukes til å merke om en middag passer til hverdag, helg, gjester eller andre situasjoner.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <div class="metadata-list">
        ${suitabilityEntries().map(([key, label]) => `
          <div class="metadata-row">
            <span>${escapeHtml(label)}</span>
            <button class="icon-button" data-remove-suitability="${escapeHtml(key)}" title="Fjern passer til">×</button>
          </div>
        `).join("")}
      </div>
      <form class="metadata-add" data-suitability-form>
        <input class="input" name="suitabilityName" placeholder="Ny situasjon, f.eks. Turmat">
        <button class="button secondary" type="submit">Legg til</button>
      </form>
    </section>
  `;
}

function renderPlanModesSetup() {
  return `
    <section class="view-header">
      <div>
        <h2 class="view-title">Plan</h2>
        <p class="view-lead">Planvalg brukes i ukeplanen. Typen forteller appen om dagen skal ha oppskrift, være spise-borte-dag eller være rester.</p>
      </div>
      <button class="button secondary" data-view="setup">Tilbake</button>
    </section>
    <section class="panel setup-section">
      <div class="metadata-list">
        ${planModeEntries().map(([key, option]) => `
          <div class="metadata-row plan-mode-row">
            <input class="input" data-plan-mode-label="${escapeHtml(key)}" value="${escapeHtml(option.label)}" aria-label="Plannavn ${escapeHtml(option.label)}">
            <select class="select" data-plan-mode-type="${escapeHtml(key)}" aria-label="Plantype ${escapeHtml(option.label)}">
              ${planModeTypeOptions(option.type)}
            </select>
            <button class="button secondary compact" data-save-plan-mode="${escapeHtml(key)}">Lagre</button>
            <button class="icon-button" data-remove-plan-mode="${escapeHtml(key)}" title="Fjern planvalg" ${option.type === "home" ? "disabled" : ""}>×</button>
          </div>
        `).join("")}
      </div>
      <form class="metadata-add plan-mode-add" data-plan-mode-form>
        <input class="input" name="planModeName" placeholder="Nytt planvalg, f.eks. Lunsj ute">
        <select class="select" name="planModeType">
          ${planModeTypeOptions("leftovers")}
        </select>
        <button class="button secondary" type="submit">Legg til planvalg</button>
      </form>
      <p class="field-hint">Tips: Bruk typen “Rester” for dager der dere spiser mat som allerede er laget. Da hopper rådgiveren over dagen.</p>
    </section>
  `;
}

function planModeTypeOptions(selected) {
  return [
    ["home", "Vanlig middag"],
    ["away", "Spise borte"],
    ["leftovers", "Rester / ingen ny middag"],
  ].map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
}

function addCategoryFromForm(form) {
  const formData = new FormData(form);
  const label = String(formData.get("categoryName") || "").trim();
  if (!label) return;
  const key = makeSlug(label);
  const labels = getCategoryLabels();
  const nextKey = uniqueMetadataKey(key, labels);
  const nextLabels = { ...labels, [nextKey]: label };
  setState({
    metadata: { ...state.metadata, categoryLabels: nextLabels },
    mealPreferences: {
      categoryGoals: {
        ...(state.mealPreferences?.categoryGoals || {}),
        [nextKey]: normalizeCategoryGoal(),
      },
    },
  });
}

function updateCategoryLabel(key) {
  const input = app.querySelector(`[data-category-label="${CSS.escape(key)}"]`);
  const label = String(input?.value || "").trim();
  if (!label) return;
  const labels = { ...getCategoryLabels(), [key]: label };
  setState({ metadata: { ...state.metadata, categoryLabels: labels } });
}

function addUnitFromForm(form) {
  const formData = new FormData(form);
  const unit = String(formData.get("unitName") || "").trim();
  if (!unit) return;
  const currentUnits = getUnitOptions();
  if (currentUnits.includes(unit)) return;
  setState({ metadata: { ...state.metadata, units: [...currentUnits, unit] } });
}

function addPrepTimeFromForm(form) {
  const formData = new FormData(form);
  const label = String(formData.get("prepTimeName") || "").trim();
  if (!label) return;
  const labels = getPrepTimeLabels();
  const key = uniqueMetadataKey(makeSlug(label), labels);
  setState({ metadata: { ...state.metadata, prepTimeLabels: { ...labels, [key]: label } } });
}

function addSuitabilityFromForm(form) {
  const formData = new FormData(form);
  const label = String(formData.get("suitabilityName") || "").trim();
  if (!label) return;
  const labels = getSuitabilityLabels();
  const key = uniqueMetadataKey(makeSlug(label), labels);
  setState({ metadata: { ...state.metadata, suitabilityLabels: { ...labels, [key]: label } } });
}

function addPlanModeFromForm(form) {
  const formData = new FormData(form);
  const label = String(formData.get("planModeName") || "").trim();
  if (!label) return;
  const options = getPlanModeOptions();
  const key = uniqueMetadataKey(makeSlug(label), options);
  const type = String(formData.get("planModeType") || "leftovers");
  setState({ metadata: { ...state.metadata, planModeOptions: { ...options, [key]: { label, type } } } });
}

function updatePlanMode(key) {
  const labelInput = app.querySelector(`[data-plan-mode-label="${CSS.escape(key)}"]`);
  const typeSelect = app.querySelector(`[data-plan-mode-type="${CSS.escape(key)}"]`);
  const label = String(labelInput?.value || "").trim();
  const type = String(typeSelect?.value || "leftovers");
  if (!label) return;
  const options = { ...getPlanModeOptions(), [key]: { label, type } };
  setState({ metadata: { ...state.metadata, planModeOptions: options } });
}

function removeCategory(key) {
  const labels = { ...getCategoryLabels() };
  delete labels[key];
  const categoryGoals = { ...(state.mealPreferences?.categoryGoals || {}) };
  delete categoryGoals[key];
  const fallback = Object.keys(labels)[0] || "annet";
  const meals = state.meals.map((meal) => {
    const categories = meal.categories.filter((category) => category !== key);
    return { ...meal, categories: categories.length ? categories : [fallback] };
  });
  setState({ metadata: { ...state.metadata, categoryLabels: labels }, mealPreferences: { categoryGoals }, meals });
}

function removeUnit(unit) {
  const units = getUnitOptions().filter((item) => item !== unit);
  const meals = state.meals.map((meal) => ({
    ...meal,
    ingredients: normalizeIngredients(meal.ingredients, meal.keyIngredients).map((ingredient) => ({
      ...ingredient,
      unit: ingredient.unit === unit ? "" : ingredient.unit,
    })),
  }));
  setState({ metadata: { ...state.metadata, units }, meals });
}

function removePrepTime(key) {
  const labels = { ...getPrepTimeLabels() };
  delete labels[key];
  const fallback = Object.keys(labels)[0] || "quick";
  const meals = state.meals.map((meal) => ({
    ...meal,
    prepTime: meal.prepTime === key ? fallback : meal.prepTime,
  }));
  setState({ metadata: { ...state.metadata, prepTimeLabels: labels }, meals });
}

function removeSuitability(key) {
  const labels = { ...getSuitabilityLabels() };
  delete labels[key];
  const meals = state.meals.map((meal) => ({
    ...meal,
    suitability: (meal.suitability || []).filter((item) => item !== key),
  }));
  setState({ metadata: { ...state.metadata, suitabilityLabels: labels }, meals });
}

function removePlanMode(key) {
  const options = { ...getPlanModeOptions() };
  if (options[key]?.type === "home") return;
  delete options[key];
  const dayModesByWeek = Object.fromEntries(Object.entries(state.dayModesByWeek || {}).map(([weekKey, modes]) => [
    weekKey,
    Object.fromEntries(Object.entries(modes || {}).map(([dayIndex, mode]) => [dayIndex, mode === key ? "home" : mode])),
  ]));
  setState({ metadata: { ...state.metadata, planModeOptions: options }, dayModesByWeek });
}

function makeSlug(value) {
  return value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "kategori";
}

function uniqueMetadataKey(base, labels) {
  let key = base;
  let count = 2;
  while (labels[key]) {
    key = `${base}-${count}`;
    count += 1;
  }
  return key;
}

async function refreshApp() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  window.location.reload();
}

function dateForWeekDay(weekKey, dayIndex) {
  const date = new Date(`${weekKey}T00:00:00`);
  date.setDate(date.getDate() + Number(dayIndex));
  return date;
}

function daysBetweenDates(a, b) {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

function weekKeyOffset(weekKey, offsetWeeks) {
  const date = new Date(`${weekKey}T00:00:00`);
  date.setDate(date.getDate() + offsetWeeks * 7);
  return date.toISOString().slice(0, 10);
}

function planHasCategory(plan, category) {
  return Object.values(plan || {}).some((mealId) => {
    const meal = getMeal(mealId);
    return meal && (meal.categories || []).includes(category);
  });
}

function categoryCountsForPlan(plan, excludeDayIndex = null) {
  const counts = {};
  Object.entries(plan || {}).forEach(([index, mealId]) => {
    if (excludeDayIndex !== null && Number(index) === excludeDayIndex) return;
    const meal = getMeal(mealId);
    (meal?.categories || []).forEach((category) => {
      counts[category] = (counts[category] || 0) + 1;
    });
  });
  return counts;
}

function categoryDueThisWeek(category, intervalWeeks, plan, excludeDayIndex) {
  const interval = Number(intervalWeeks);
  if (!interval || interval < 2) return false;
  if ((categoryCountsForPlan(plan, excludeDayIndex)[category] || 0) > 0) return false;
  const currentWeekKey = getWeekKey();
  for (let offset = 1; offset < interval; offset += 1) {
    if (planHasCategory(state.plansByWeek?.[weekKeyOffset(currentWeekKey, -offset)], category)) return false;
  }
  return true;
}

function categoryPreferenceScore(meal, plan, dayIndex) {
  const counts = categoryCountsForPlan(plan, dayIndex);
  return (meal.categories || []).reduce((score, category) => {
    const goal = preferenceGoalFor(category);
    const current = counts[category] || 0;
    let nextScore = score;
    if (goal.minPerWeek && current < goal.minPerWeek) nextScore += 45;
    if (goal.maxPerWeek && current >= goal.maxPerWeek) nextScore -= 90;
    if (categoryDueThisWeek(category, goal.minEveryWeeks, plan, dayIndex)) nextScore += 35;
    return nextScore;
  }, 0);
}

function recentMealDistanceDays(mealId, targetDate, lookbackWeeks = VARIATION_LOOKBACK_WEEKS) {
  const currentWeekKey = getWeekKey();
  let closestDays = null;
  for (let offset = 1; offset <= lookbackWeeks; offset += 1) {
    const weekKey = weekKeyOffset(currentWeekKey, -offset);
    Object.entries(state.plansByWeek?.[weekKey] || {}).forEach(([plannedDayIndex, plannedMealId]) => {
      if (plannedMealId !== mealId) return;
      const distance = daysBetweenDates(targetDate, dateForWeekDay(weekKey, plannedDayIndex));
      closestDays = closestDays === null ? distance : Math.min(closestDays, distance);
    });
  }
  return closestDays;
}

function recentCategoryCount(categories, lookbackWeeks = 2) {
  const currentWeekKey = getWeekKey();
  let count = 0;
  for (let offset = 1; offset <= lookbackWeeks; offset += 1) {
    const weekKey = weekKeyOffset(currentWeekKey, -offset);
    Object.values(state.plansByWeek?.[weekKey] || {}).forEach((mealId) => {
      const plannedMeal = getMeal(mealId);
      if (plannedMeal && (plannedMeal.categories || []).some((category) => categories.includes(category))) {
        count += 1;
      }
    });
  }
  return count;
}

function rotationScore(meal, dayIndex) {
  const targetDate = dateForWeekDay(getWeekKey(), dayIndex);
  const daysSince = recentMealDistanceDays(meal.id, targetDate);
  let score = 0;
  if (daysSince === null) {
    score += 18;
  } else if (daysSince <= 7) {
    score -= 95;
  } else if (daysSince <= 14) {
    score -= 58;
  } else if (daysSince <= 21) {
    score -= 30;
  } else if (daysSince <= 28) {
    score -= 14;
  }

  const recentCategoryUses = recentCategoryCount(meal.categories || []);
  if (recentCategoryUses >= 6) score -= 22;
  else if (recentCategoryUses >= 4) score -= 14;
  else if (recentCategoryUses >= 2) score -= 6;
  return score;
}

function plannedTooClose(meal, dayIndex, planOverride) {
  const minDays = Math.max(1, Number(meal.minDaysBetween) || 1);
  const targetWeekKey = getWeekKey();
  const targetDate = dateForWeekDay(targetWeekKey, dayIndex);
  const allPlans = { ...(state.plansByWeek || {}), [targetWeekKey]: planOverride };
  return Object.entries(allPlans).some(([weekKey, plan]) => Object.entries(plan || {}).some(([plannedDayIndex, mealId]) => {
    if (mealId !== meal.id) return false;
    if (weekKey === targetWeekKey && Number(plannedDayIndex) === dayIndex) return false;
    return daysBetweenDates(targetDate, dateForWeekDay(weekKey, plannedDayIndex)) < minDays;
  }));
}

function pickSuggestion(dayIndex, planOverride = currentPlan()) {
  const plan = planOverride;
  const used = new Set(Object.entries(plan).filter(([index]) => Number(index) !== dayIndex).map(([, mealId]) => mealId));
  const day = dayNames[dayIndex];
  const wantsQuick = state.family.quickDays.includes(day);
  const dayType = currentDayTypes()[dayIndex] || "weekday";
  const candidates = state.meals
    .filter((meal) => !used.has(meal.id))
    .filter((meal) => !plannedTooClose(meal, dayIndex, plan))
    .map((meal) => {
      let score = 0;
      if (meal.favorite) score += 20;
      if (meal.kidFriendly) score += 15;
      if (wantsQuick && meal.prepTime === "quick") score += 25;
      if (state.family.leftovers && meal.leftovers === "likely") score += 6;
      if ((meal.suitability || []).includes(dayType)) score += 35;
      score += categoryPreferenceScore(meal, plan, dayIndex);
      score += rotationScore(meal, dayIndex);
      return { meal, score };
    })
    .sort((a, b) => b.score - a.score);
  return candidates[0]?.meal.id || "";
}

function updatePlanDay(dayIndex, mealId) {
  setCurrentPlan({ ...currentPlan(), [dayIndex]: mealId });
}

function togglePlanLock(dayIndex) {
  const lockedPlan = currentLocks();
  setCurrentLocks({ ...lockedPlan, [dayIndex]: !lockedPlan[dayIndex] });
}

function updateDayType(dayIndex, dayType) {
  setCurrentDayTypes({ ...currentDayTypes(), [dayIndex]: dayType });
}

function updateDayMode(dayIndex, mode) {
  const dayModes = { ...currentDayModes(), [dayIndex]: mode };
  const patch = { dayModesByWeek: { ...(state.dayModesByWeek || {}), [getWeekKey()]: dayModes } };
  if (!dayPlansMeal(mode)) {
    patch.plansByWeek = { ...(state.plansByWeek || {}), [getWeekKey()]: { ...currentPlan(), [dayIndex]: "" } };
  }
  setState(patch);
}

function updateDayNote(dayIndex, note) {
  setCurrentDayNotes({ ...currentDayNotes(), [dayIndex]: String(note || "").trim() });
}

function updateDayServings(dayIndex, servings) {
  setCurrentServings({ ...currentServings(), [dayIndex]: Math.max(1, Number(servings) || 1) });
}

function fillWeek() {
  const plan = currentPlan();
  const lockedPlan = currentLocks();
  const dayModes = currentDayModes();
  dayNames.forEach((_, index) => {
    if (!plan[index] && !lockedPlan[index] && dayPlansMeal(dayModes[index])) {
      plan[index] = pickSuggestion(index, plan);
    }
  });
  setCurrentPlan(plan);
}

function replaceOpenWeek() {
  const plan = currentPlan();
  const lockedPlan = currentLocks();
  const dayModes = currentDayModes();
  dayNames.forEach((_, index) => {
    if (!lockedPlan[index] && dayPlansMeal(dayModes[index])) {
      plan[index] = "";
    }
  });
  state.plansByWeek = { ...(state.plansByWeek || {}), [getWeekKey()]: plan };
  dayNames.forEach((_, index) => {
    if (!lockedPlan[index] && dayPlansMeal(dayModes[index])) {
      plan[index] = pickSuggestion(index, plan);
      state.plansByWeek[getWeekKey()] = plan;
    }
  });
  setCurrentPlan(plan);
}

function addMealToNextFreeDay(mealId) {
  const plan = currentPlan();
  const freeIndex = dayNames.findIndex((_, index) => !plan[index]);
  if (freeIndex >= 0) updatePlanDay(freeIndex, mealId);
}

function bindEvents() {
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setState({ activeView: button.dataset.view, selectedMealId: null, selectedRecipeContext: null, editingMealId: null, keepScreenAwake: false }));
  });

  app.querySelectorAll("[data-plan-day]").forEach((select) => {
    select.addEventListener("change", () => updatePlanDay(Number(select.dataset.planDay), select.value));
  });

  app.querySelectorAll("[data-day-type]").forEach((select) => {
    select.addEventListener("change", () => updateDayType(Number(select.dataset.dayType), select.value));
  });

  app.querySelectorAll("[data-day-mode]").forEach((select) => {
    select.addEventListener("change", () => updateDayMode(Number(select.dataset.dayMode), select.value));
  });

  app.querySelectorAll("[data-day-note]").forEach((input) => {
    input.addEventListener("change", () => updateDayNote(Number(input.dataset.dayNote), input.value));
  });

  app.querySelectorAll("[data-day-servings]").forEach((input) => {
    input.addEventListener("change", () => updateDayServings(Number(input.dataset.dayServings), input.value));
  });

  app.querySelectorAll("[data-random-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const dayIndex = Number(button.dataset.randomDay);
      if (!currentLocks()[dayIndex]) updatePlanDay(dayIndex, pickSuggestion(dayIndex));
    });
  });

  app.querySelector("[data-fill-week]")?.addEventListener("click", fillWeek);
  app.querySelector("[data-replace-open-week]")?.addEventListener("click", replaceOpenWeek);
  app.querySelector("[data-clear-week]")?.addEventListener("click", () => {
    const confirmed = window.confirm("Er du sikker på at du vil tømme denne uken? Middager og låser for valgt uke fjernes.");
    if (!confirmed) return;
    const weekKey = getWeekKey();
    setState({
      plansByWeek: { ...(state.plansByWeek || {}), [weekKey]: emptyWeekPlan() },
      lockedPlansByWeek: { ...(state.lockedPlansByWeek || {}), [weekKey]: emptyWeekLocks() },
      dayTypesByWeek: { ...(state.dayTypesByWeek || {}), [weekKey]: emptyWeekDayTypes() },
      servingsByWeek: { ...(state.servingsByWeek || {}), [weekKey]: emptyWeekServings(state.family.familySize) },
      dayModesByWeek: { ...(state.dayModesByWeek || {}), [weekKey]: emptyWeekDayModes() },
      dayNotesByWeek: { ...(state.dayNotesByWeek || {}), [weekKey]: emptyWeekDayNotes() },
    });
  });

  app.querySelectorAll("[data-lock-day]").forEach((button) => {
    button.addEventListener("click", () => togglePlanLock(Number(button.dataset.lockDay)));
  });

  app.querySelectorAll("[data-week]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.dataset.week);
      setState({ weekOffset: value === 0 ? 0 : state.weekOffset + value });
    });
  });

  app.querySelectorAll("[data-filter]").forEach((field) => {
    field.addEventListener("change", () => {
      state.filters = { ...state.filters, [field.dataset.filter]: field.value };
      setState({ filters: state.filters });
    });
  });

  app.querySelectorAll("[data-add-next]").forEach((button) => {
    button.addEventListener("click", () => addMealToNextFreeDay(button.dataset.addNext));
  });

  app.querySelectorAll("[data-edit-meal]").forEach((button) => {
    button.addEventListener("click", () => setState({ activeView: "meals", previousView: "meals", editingMealId: button.dataset.editMeal, draftMeal: null, draftIngredients: null, draftSteps: null, selectedMealId: null, selectedRecipeContext: null, keepScreenAwake: false }));
  });

  app.querySelectorAll("[data-cancel-edit]").forEach((button) => {
    button.addEventListener("click", () => setState({ editingMealId: null, draftMeal: null, draftIngredients: null, draftSteps: null }));
  });

  app.querySelectorAll("[data-view-meal]").forEach((button) => {
    const dayIndex = button.dataset.recipeDay === undefined ? null : Number(button.dataset.recipeDay);
    button.addEventListener("click", () => setState({
      activeView: "recipe",
      previousView: state.activeView === "recipe" ? state.previousView : state.activeView,
      selectedMealId: button.dataset.viewMeal,
      selectedRecipeContext: dayIndex === null ? null : { weekKey: getWeekKey(), dayIndex },
      editingMealId: null,
      keepScreenAwake: false,
    }));
  });

  app.querySelector("[data-close-meal]")?.addEventListener("click", () => {
    setState({ activeView: state.previousView || "meals", selectedMealId: null, selectedRecipeContext: null, keepScreenAwake: false });
  });

  app.querySelector("[data-toggle-wake]")?.addEventListener("click", () => {
    setState({ keepScreenAwake: !state.keepScreenAwake });
  });

  app.querySelector("[data-meal-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveMealFromForm(event.currentTarget);
  });

  app.querySelector("[data-delete-meal]")?.addEventListener("click", deleteCurrentMeal);

  app.querySelector("[data-add-ingredient]")?.addEventListener("click", () => {
    syncMealEditorDraftFromDom();
    const draftIngredients = [...(state.draftIngredients || []), { amount: "", unit: "", name: "" }];
    setState({ draftMeal: state.draftMeal, draftIngredients, draftSteps: state.draftSteps });
  });

  app.querySelectorAll("[data-remove-ingredient]").forEach((button) => {
    button.addEventListener("click", () => {
      syncMealEditorDraftFromDom();
      const index = Number(button.dataset.removeIngredient);
      const draftIngredients = (state.draftIngredients || []).filter((_, itemIndex) => itemIndex !== index);
      setState({ draftMeal: state.draftMeal, draftIngredients: draftIngredients.length ? draftIngredients : [{ amount: "", unit: "", name: "" }], draftSteps: state.draftSteps });
    });
  });

  app.querySelector("[data-add-step]")?.addEventListener("click", () => {
    syncMealEditorDraftFromDom();
    const draftSteps = [...(state.draftSteps || []), ""];
    setState({ draftMeal: state.draftMeal, draftIngredients: state.draftIngredients, draftSteps });
  });

  app.querySelectorAll("[data-remove-step]").forEach((button) => {
    button.addEventListener("click", () => {
      syncMealEditorDraftFromDom();
      const index = Number(button.dataset.removeStep);
      const draftSteps = (state.draftSteps || []).filter((_, itemIndex) => itemIndex !== index);
      setState({ draftMeal: state.draftMeal, draftIngredients: state.draftIngredients, draftSteps: draftSteps.length ? draftSteps : [""] });
    });
  });

  app.querySelectorAll("[data-family]").forEach((field) => {
    field.addEventListener("change", () => {
      const value = field.type === "number" ? Number(field.value) : field.value;
      state.family = { ...state.family, [field.dataset.family]: value };
      setState({ family: state.family });
    });
  });

  app.querySelector("[data-category-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addCategoryFromForm(event.currentTarget);
  });

  app.querySelector("[data-unit-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addUnitFromForm(event.currentTarget);
  });

  app.querySelector("[data-prep-time-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addPrepTimeFromForm(event.currentTarget);
  });

  app.querySelector("[data-suitability-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addSuitabilityFromForm(event.currentTarget);
  });

  app.querySelector("[data-plan-mode-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    addPlanModeFromForm(event.currentTarget);
  });

  app.querySelector("[data-meal-preferences-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveMealPreferencesFromForm(event.currentTarget);
  });

  app.querySelectorAll("[data-remove-category]").forEach((button) => {
    button.addEventListener("click", () => removeCategory(button.dataset.removeCategory));
  });

  app.querySelectorAll("[data-save-category]").forEach((button) => {
    button.addEventListener("click", () => updateCategoryLabel(button.dataset.saveCategory));
  });

  app.querySelectorAll("[data-remove-unit]").forEach((button) => {
    button.addEventListener("click", () => removeUnit(button.dataset.removeUnit));
  });

  app.querySelectorAll("[data-remove-prep-time]").forEach((button) => {
    button.addEventListener("click", () => removePrepTime(button.dataset.removePrepTime));
  });

  app.querySelectorAll("[data-remove-suitability]").forEach((button) => {
    button.addEventListener("click", () => removeSuitability(button.dataset.removeSuitability));
  });

  app.querySelectorAll("[data-save-plan-mode]").forEach((button) => {
    button.addEventListener("click", () => updatePlanMode(button.dataset.savePlanMode));
  });

  app.querySelectorAll("[data-remove-plan-mode]").forEach((button) => {
    button.addEventListener("click", () => removePlanMode(button.dataset.removePlanMode));
  });

  app.querySelector("[data-refresh-app]")?.addEventListener("click", refreshApp);

  app.querySelectorAll("[data-toggle-family]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggleFamily;
      state.family = { ...state.family, [key]: !state.family[key] };
      setState({ family: state.family });
    });
  });

  app.querySelectorAll("[data-quick-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = button.dataset.quickDay;
      const quickDays = state.family.quickDays.includes(day)
        ? state.family.quickDays.filter((item) => item !== day)
        : [...state.family.quickDays, day];
      state.family = { ...state.family, quickDays };
      setState({ family: state.family });
    });
  });
}

function render() {
  const views = {
    calendar: renderCalendar,
    planner: renderPlanner,
    meals: renderMeals,
    recipe: renderMealDetail,
    setup: renderSetup,
    "meal-preferences": renderMealPreferencesSetup,
    categories: renderCategoriesSetup,
    units: renderUnitsSetup,
    "prep-times": renderPrepTimesSetup,
    suitability: renderSuitabilitySetup,
    "plan-modes": renderPlanModesSetup,
  };
  renderShell((views[state.activeView] || renderMeals)());
  bindEvents();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || wakeLock || document.visibilityState !== "visible") return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    state.keepScreenAwake = false;
    saveState();
    render();
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  const lock = wakeLock;
  wakeLock = null;
  await lock.release().catch(() => {});
}

function syncWakeLock() {
  if (state.activeView === "recipe" && state.keepScreenAwake) {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncWakeLock();
  }
});

async function initFirebaseSync() {
  try {
    const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`),
    ]);

    const { getAuth, onAuthStateChanged, signInAnonymously } = authModule;
    const { getFirestore, doc, collection, getDoc, onSnapshot, setDoc, deleteDoc, serverTimestamp } = firestoreModule;
    const firebaseApp = initializeApp(firebaseConfig);
    const auth = getAuth(firebaseApp);
    const db = getFirestore(firebaseApp);
    remoteRefs.legacyState = doc(db, "families", FAMILY_ID, "app", "state");
    remoteRefs.profile = doc(db, "families", FAMILY_ID, "app", "profile");
    remoteRefs.preferences = doc(db, "families", FAMILY_ID, "app", "preferences");
    remoteRefs.metadata = doc(db, "families", FAMILY_ID, "app", "metadata");
    remoteRefs.meals = collection(db, "families", FAMILY_ID, "meals");
    remoteRefs.weeks = collection(db, "families", FAMILY_ID, "weeks");
    window.middagsplanDoc = doc;
    window.middagsplanSetDoc = setDoc;
    window.middagsplanDeleteDoc = deleteDoc;
    window.middagsplanServerTimestamp = serverTimestamp;

    onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      syncStatus = "Synk aktiv";
      render();
      await migrateLegacyStateIfNeeded(getDoc);
      startSplitSyncListeners(onSnapshot);
    });

    await signInAnonymously(auth);
  } catch {
    syncStatus = "Lokal lagring";
    render();
  }
}

async function migrateLegacyStateIfNeeded(getDoc) {
  const profileSnapshot = await getDoc(remoteRefs.profile);
  if (profileSnapshot.exists()) return;
  const legacySnapshot = await getDoc(remoteRefs.legacyState);
  if (legacySnapshot.exists()) {
    applyingRemoteState = true;
    applyRemotePayload(legacySnapshot.data());
    applyingRemoteState = false;
  }
  await saveAllRemoteState();
}

function startSplitSyncListeners(onSnapshot) {
  onSnapshot(remoteRefs.profile, (snapshot) => {
    if (!snapshot.exists()) {
      scheduleRemoteSave(0, ["profile"]);
      return;
    }
    applyRemoteDocument("profile", snapshot.data(), (data) => {
      applyRemoteStatePatch({ family: data.family, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
    });
  }, markSyncFailed);

  onSnapshot(remoteRefs.metadata, (snapshot) => {
    if (!snapshot.exists()) {
      scheduleRemoteSave(0, ["metadata"]);
      return;
    }
    applyRemoteDocument("metadata", snapshot.data(), (data) => {
      applyRemoteStatePatch({ metadata: data.metadata, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
    });
  }, markSyncFailed);

  onSnapshot(remoteRefs.preferences, (snapshot) => {
    if (!snapshot.exists()) {
      scheduleRemoteSave(0, ["preferences"]);
      return;
    }
    applyRemoteDocument("preferences", snapshot.data(), (data) => {
      applyRemoteStatePatch({ mealPreferences: data.mealPreferences, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
    });
  }, markSyncFailed);

  onSnapshot(remoteRefs.meals, (snapshot) => {
    if (snapshot.empty) {
      if ((state.meals || []).length) {
        scheduleRemoteSave(0, ["meals"]);
      } else {
        pendingRemoteScopes.delete("meals");
        applyRemoteStatePatch({ meals: [], pendingLocalSync: pendingRemoteScopes.size > 0 });
        markSynced();
      }
      return;
    }
    const maxClientUpdatedAt = Math.max(...snapshot.docs.map((mealDoc) => Number(mealDoc.data().clientUpdatedAt || 0)));
    if (remoteDocumentIsOlder("meals", maxClientUpdatedAt)) return;
    const meals = snapshot.docs.map((mealDoc) => {
      const { clientUpdatedAt, updatedAt, ...meal } = mealDoc.data();
      return { ...meal, id: meal.id || mealDoc.id };
    });
    applyingRemoteState = true;
    pendingRemoteScopes.delete("meals");
    applyRemoteStatePatch({ meals, clientUpdatedAt: maxClientUpdatedAt, pendingLocalSync: pendingRemoteScopes.size > 0 });
    applyingRemoteState = false;
    markSynced();
  }, markSyncFailed);

  onSnapshot(remoteRefs.weeks, (snapshot) => {
    if (snapshot.empty) {
      pendingWeekKeys.add(getWeekKey());
      scheduleRemoteSave(0, ["weeks"]);
      return;
    }
    const maxClientUpdatedAt = Math.max(...snapshot.docs.map((weekDoc) => Number(weekDoc.data().clientUpdatedAt || 0)));
    if (remoteDocumentIsOlder("weeks", maxClientUpdatedAt)) return;
    const plansByWeek = { ...(state.plansByWeek || {}) };
    const lockedPlansByWeek = { ...(state.lockedPlansByWeek || {}) };
    const dayTypesByWeek = { ...(state.dayTypesByWeek || {}) };
    const servingsByWeek = { ...(state.servingsByWeek || {}) };
    const dayModesByWeek = { ...(state.dayModesByWeek || {}) };
    const dayNotesByWeek = { ...(state.dayNotesByWeek || {}) };
    snapshot.docs.forEach((weekDoc) => {
      const data = weekDoc.data();
      plansByWeek[weekDoc.id] = { ...emptyWeekPlan(), ...(data.plan || {}) };
      lockedPlansByWeek[weekDoc.id] = { ...emptyWeekLocks(), ...(data.lockedPlan || {}) };
      dayTypesByWeek[weekDoc.id] = { ...emptyWeekDayTypes(), ...(data.dayTypes || {}) };
      servingsByWeek[weekDoc.id] = { ...emptyWeekServings(state.family.familySize), ...(data.servings || {}) };
      dayModesByWeek[weekDoc.id] = { ...emptyWeekDayModes(), ...(data.dayModes || {}) };
      dayNotesByWeek[weekDoc.id] = { ...emptyWeekDayNotes(), ...(data.dayNotes || {}) };
    });
    applyingRemoteState = true;
    pendingRemoteScopes.delete("weeks");
    applyRemoteStatePatch({ plansByWeek, lockedPlansByWeek, dayTypesByWeek, servingsByWeek, dayModesByWeek, dayNotesByWeek, clientUpdatedAt: maxClientUpdatedAt, pendingLocalSync: pendingRemoteScopes.size > 0 });
    applyingRemoteState = false;
    markSynced();
  }, markSyncFailed);
}

function applyRemoteDocument(scope, data, apply) {
  const remoteClientUpdatedAt = Number(data.clientUpdatedAt || 0);
  if (remoteDocumentIsOlder(scope, remoteClientUpdatedAt)) return;
  applyingRemoteState = true;
  pendingRemoteScopes.delete(scope);
  apply(data);
  applyingRemoteState = false;
  markSynced();
}

function remoteDocumentIsOlder(scope, remoteClientUpdatedAt) {
  const localClientUpdatedAt = Number(state.clientUpdatedAt || 0);
  if (pendingRemoteScopes.has(scope) && remoteClientUpdatedAt < localClientUpdatedAt) {
    if (scope === "weeks") {
      Object.keys(state.plansByWeek || {}).forEach((weekKey) => pendingWeekKeys.add(weekKey));
    }
    setTimeout(() => scheduleRemoteSave(0, [scope]), 0);
    return true;
  }
  return false;
}

function markSynced() {
  syncStatus = "Synket";
  render();
}

function markSyncFailed() {
  syncStatus = "Synk feilet";
  render();
}

async function saveAllRemoteState() {
  Object.keys(state.plansByWeek || {}).forEach((weekKey) => pendingWeekKeys.add(weekKey));
  await saveRemoteScopes(["profile", "preferences", "metadata", "meals", "weeks"]);
}

function scheduleRemoteSave(delay = 700, scopes = ["profile", "preferences", "metadata", "meals", "weeks"]) {
  if (!remoteRefs.profile || applyingRemoteState) return;
  scopes.forEach((scope) => pendingRemoteScopes.add(scope));
  const key = [...new Set(scopes)].sort().join("-");
  clearTimeout(remoteSaveTimers[key]);
  remoteSaveTimers[key] = setTimeout(async () => {
    try {
      syncStatus = "Synker";
      render();
      await saveRemoteScopes(scopes);
      scopes.forEach((scope) => pendingRemoteScopes.delete(scope));
      state.pendingLocalSync = pendingRemoteScopes.size > 0;
      saveState();
      syncStatus = "Synket";
      render();
    } catch {
      syncStatus = "Synk feilet";
      render();
    }
  }, delay);
}

async function saveRemoteScopes(scopes) {
  const uniqueScopes = [...new Set(scopes)];
  const updatedAt = window.middagsplanServerTimestamp();
  const clientUpdatedAt = state.clientUpdatedAt || Date.now();
  const writes = [];

  if (uniqueScopes.includes("profile")) {
    writes.push(window.middagsplanSetDoc(remoteRefs.profile, { family: state.family, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("preferences")) {
    writes.push(window.middagsplanSetDoc(remoteRefs.preferences, { mealPreferences: state.mealPreferences, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("metadata")) {
    writes.push(window.middagsplanSetDoc(remoteRefs.metadata, { metadata: state.metadata, clientUpdatedAt, updatedAt }, { merge: true }));
  }

  if (uniqueScopes.includes("meals")) {
    const currentMealIds = new Set((state.meals || []).map((meal) => meal.id));
    pendingMealDeleteIds.forEach((mealId) => {
      if (!currentMealIds.has(mealId)) {
        writes.push(window.middagsplanDeleteDoc(window.middagsplanDoc(remoteRefs.meals, mealId)));
      }
    });
    (state.meals || []).forEach((meal) => {
      writes.push(window.middagsplanSetDoc(window.middagsplanDoc(remoteRefs.meals, meal.id), { ...meal, clientUpdatedAt, updatedAt }, { merge: true }));
    });
    pendingMealDeleteIds.clear();
  }

  if (uniqueScopes.includes("weeks")) {
    if (!pendingWeekKeys.size) pendingWeekKeys.add(getWeekKey());
    pendingWeekKeys.forEach((weekKey) => {
      writes.push(window.middagsplanSetDoc(window.middagsplanDoc(remoteRefs.weeks, weekKey), { ...weekPayload(weekKey), updatedAt }, { merge: true }));
    });
    pendingWeekKeys.clear();
  }

  await Promise.all(writes);
}

render();
initFirebaseSync();
