import { mealEditorFingerprint, socialRecipeSource } from "./src/domain/meal-editor.js";
import { renderSocialImportNotice } from "./src/render/recipe-import.js";
import { pageScreenKey, createPageScroll } from "./src/ui/page-scroll.js";
import { renderMealFilters, mealFiltersActive, toggleMealFilter } from "./src/render/meal-filters.js";
import { createRecipeServingsBuffer, parseRecipeServings } from "./src/ui/recipe-servings.js";
import { renderPickerPlansView } from "./src/render/picker-plans.js";
import { canonicalView, weekHeading, weekEligibleDays, weekSwipeDirection, lastPlannedLabel } from "./src/domain/week-view.js";
import { renderWeekView, renderWeekRow, renderDaySheet, renderWeekMenu, renderWeekClear, weekIcon } from "./src/render/week.js";
import { renderSubpageBar } from "./src/render/subpage.js";
import { createNavigationHistory } from "./src/ui/navigation.js";
import {
  createQuickMeal,
  makeSlug,
  mealBaseServings,
  mealNeedsRecipe,
  mealCanImportFromLink,
  normalizeIngredients,
  normalizeMeals,
  ingredientBaseName,
  ingredientsToEditorRows,
  editorRowsToIngredients,
  moveIngredientEditorRow,
  ingredientEditorGroups,
  ingredientEditorGroupIndex,
  moveIngredientToGroup,
  insertIngredientInGroup,
  moveStepEditorRow,
  removeStepEditorRow,
  normalizedRecipeUrl,
  quickMealTitleForQuery,
  splitLines,
  splitList,
  uniqueMetadataKey,
} from "./src/domain/meals.js";
import {
  formatShoppingAmount,
  mergeShoppingItems,
  normalizeShoppingList,
  orderStoreCategories,
  parseAmount,
  parseAmountRange,
  shoppingAmountValue,
  scaleAmount,
  roundScaledAmount,
  roundRecipeShoppingItems,
  shoppingMergeKey,
} from "./src/domain/shopping.js";
import { backupFileName, buildBackup } from "./src/domain/backup.js";
import { applyImportedRecipe } from "./src/domain/recipe-import.js";
import { prepareRecipeImage, recipeImagesForSend, IMAGE_ERROR_MESSAGE, IMAGE_LIMIT_MESSAGE } from "./src/domain/image-prepare.js";
import { createRecipeImporter } from "./src/sync/recipe-import.js";
import { createAiKeyClient, sanitizeAiKeyStatus } from "./src/sync/ai-key.js";
import { renderAiKeyView, aiKeyStatusLabel } from "./src/render/ai-key.js";
import {
  dateForWeekDay,
  daysBetweenDates,
  emptyWeekDayModes,
  emptyWeekDayNotes,
  emptyWeekDayTypes,
  emptyWeekLocks,
  emptyWeekPlan,
  emptyWeekServings,
  servingsForDay as resolveServingsForDay,
  getDayIndexForDate,
  getWeekDatesForOffset,
  getWeekKeyForDate,
  getWeekKeyForOffset,
  localDateKey,
  weekKeyOffset,
} from "./src/domain/weeks.js";
import {
  selectPickerSuggestions,
  scoreVariation,
  mealMatchesPickerFilters,
  scoreCategoryPreference,
  scoreMealFit,
  scoreMealRecency,
  scoreRecentCategoryUse,
} from "./src/domain/suggestions.js";
import {
  WEEK_SYNC_FIELDS,
  patchTouchesSyncedData as syncPatchTouchesSyncedData,
  remoteDocumentIsStale,
  shouldDeferRemotePayload,
  syncedScopesForPatch as getSyncedScopesForPatch,
} from "./src/sync/state.js";
import { stateForProject, createAccessSession, offlineMemberMatches, loginErrorMessage, isNetworkError, writeMember } from "./src/sync/access.js";
import { createLocalStore, localStateForStorage } from "./src/sync/local-store.js";
import { validateBackup, summarizeBackup, executeRestore } from "./src/sync/restore.js";
import { renderAccessScreen, renderAccountView } from "./src/render/account.js";
import { initFirebaseClient } from "./src/sync/firebase.js";
import { createShoppingSync, diffShoppingItems } from "./src/sync/shopping.js";
import { createMealsSync, diffMeals } from "./src/sync/meals.js";
import { createWeeksSync, diffWeeks } from "./src/sync/weeks.js";
import { createServingsDefaultsTransition } from "./src/sync/servings-defaults.js";
import { buildRemoteWrites } from "./src/sync/writes.js";
import {
  renderCategoryChipsView,
  renderGroupedMealsView,
  renderMealBadgesView,
  renderMealCardView,
  renderMealDetailView,
  renderMealEditorView,
  renderMealResultsView,
  renderIngredientList,
  renderMealEmptyView,
  renderMealsView,
  renderIngredientEditorRowView,
  renderStepEditorRowView,
  renderSuitabilityChipsView,
} from "./src/render/meals.js";
import {
  renderAppSettingsView,
  renderFamilySettingsView,
  renderMetadataAddFormView,
  renderMetadataRowsView,
  renderSetupPageView,
  renderSetupView,
} from "./src/render/setup.js";
import {
  renderShoppingItemEditorView,
  renderShoppingItemView,
  renderShoppingListView,
  renderShoppingReviewModalView,
  renderShoppingSuggestionsView,
} from "./src/render/shopping.js";

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
  apiKey: "AIzaSyBguv9pz0exQzMPH3cYYz6tVksJGUNBsEg",
  authDomain: "middagsplanlegger-6db4e.firebaseapp.com",
  projectId: "middagsplanlegger-6db4e",
  storageBucket: "middagsplanlegger-6db4e.firebasestorage.app",
  messagingSenderId: "449556442190",
  appId: "1:449556442190:web:980e3c597122b57fed271f"
};

const FIREBASE_SDK_VERSION = "12.13.0";
const FAMILY_ID = "familien";
const defaultMeals = [];

const defaultState = {
  activeView: "shopping",
  shoppingList: { items: [], generatedForWeek: null },
  generateModal: { open: false, selectedDays: [] },
  shoppingReview: { open: false, mode: null, title: "", groups: [], selectedItemIds: [] },
  toast: null,
  editingShoppingItemId: null,
  clientUpdatedAt: 0,
  pendingLocalSync: false,
  editingMealId: null,
  draftMeal: null,
  draftIngredients: null,
  draftSteps: null,
  selectedMealId: null,
  selectedRecipeContext: null,
  keepScreenAwake: false,
  previousView: "shopping",
  weekOffset: 0,
  filters: { query: "", category: "all", suitability: "", quick: false, kidFriendly: false, favorite: false, needsRecipe: false, sort: "category" },
  metadata: {
    categoryLabels,
    units: defaultUnitOptions,
    prepTimeLabels: defaultPrepTimeLabels,
    suitabilityLabels: defaultSuitabilityLabels,
    planModeOptions: defaultPlanModeOptions,
    ingredientMappings: {},
    storeCategories: [], // populated lazily via getStoreCategories() which falls back to STORE_CATEGORIES
    storeCategoryOrder: [],
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
  plan: {},
  plansByWeek: {},
  lockedPlan: {},
  lockedPlansByWeek: {},
  dayTypesByWeek: {},
  servingsByWeek: {},
  dayModesByWeek: {},
  dayNotesByWeek: {},
  mealPicker: { open: false, dayIndex: null, query: "" },
  plannerDaySheet: { open: false, dayIndex: null },
  plannerActionsOpen: false,
};

const APP_VERSION = "v122";
const APP_VERSION_NUMBER = 122;

let localStoreFailed = false;
const localStore = createLocalStore({ getStorage: () => localStorage, onWrite: ok => { localStoreFailed = !ok; } });
let state = loadState();
const app = document.querySelector("#app");
let wakeLock = null;
const remoteRefs = {};
const remoteSaveTimers = {};
const pendingRemoteScopes = new Set();
let applyingRemoteState = false;
let syncStatus = "Kobler til synk";
let mealPickerScrollY = 0;
let mealPickerReturn = null;
let pickerOtherPlans = false, weekClearConfirmation = null;
let pickerNote = null;
let mealEditorSession = null, editorDiscardOpen = false;
let mealEditorReturn = null;
const pageScroll = createPageScroll({ history: window.history });
let pageScrollDirection = "same";
const emptyPickerFilters = () => ({ quick: false, kidFriendly: false, favorite: false, suitability: "", category: "all" });
let pickerFilters = emptyPickerFilters(), planningWindowWeekKey = null;
let backgroundAt = null, lastVisibleWeekKey = getWeekKeyForOffset(0);
let shoppingSyncStatus = null;
let mealsSyncStatus = null;
let weeksSyncStatus = null;
let servingsTransition = null, weeksServerReady = false, profileServerReady = false;
let recipeServingsView = { key: null, value: null };
const recipeServingsBuffer = createRecipeServingsBuffer({
  commit: ({ weekKey, dayIndex, value }) => updateDayServings(dayIndex, value, weekKey, { redraw: false, immediateWeeks: true }),
  setTimer: setTimeout, clearTimer: clearTimeout,
});
let editorRowMenu = null;
let accessState = { kind: "checking" };
let firebaseConnection = null;
let currentAuthUser = null;
let accessSession = null;
let syncEnabled = false;
let syncGeneration = 0;
const syncUnsubscribers = [];
let restoreBackup = null;
let accountBusy = false;
let accountMembers = [];
let accountMessage = "";
let recipeImporter = null;
let recipeImportSerial = 0;
let recipeImportState = { editorId: null, busy: false, preparing: false, mode: "", images: [], showImages: false,
  url: "", text: "", showText: false, message: "", warnings: [], pending: null, remainingToday: null };
let aiKeyClient = null;
let aiKeySession = "", aiKeyTarget = "", aiKeySerial = 0;
let aiKeyEditorReturn = null;
let aiKeyUi = { status: null, loading: false, busy: false, busyAction: "", modelDraft: null, message: "" };
let shoppingSync = makeShoppingSync();
let mealsSync = makeMealsSync();
let weeksSync = makeWeeksSync();

const SUBPAGE_VIEWS = new Set(["account-settings", "ai-settings", "family-settings", "app-settings", "meal-preferences",
  "categories", "units", "prep-times", "suitability", "plan-modes", "ingredient-mappings", "store-categories"]);
const uiHistory = createNavigationHistory({ history: window.history, getLevels: navigationLevels, onBack: backInApp });
window.addEventListener("popstate", event => uiHistory.pop(event));

function navigationLevels() {
  if (accessState.kind !== "ready") return [];
  const levels = [];
  if (state.editingMealId && (state.activeView === "meals" || aiKeyEditorReturn)) {
    if (mealEditorReturn?.activeView === "recipe") levels.push(`recipe:${mealEditorReturn.selectedMealId}`);
    levels.push(`editor:${state.editingMealId}`);
  }
  if (state.activeView === "recipe") levels.push(`recipe:${state.selectedMealId}`);
  else if (SUBPAGE_VIEWS.has(state.activeView)) levels.push(`page:${state.activeView}`);
  if ((state.plannerActionsOpen || weekClearConfirmation) && canonicalView(state.activeView) === "week") levels.push("planner-actions");
  if (weekClearConfirmation) levels.push("week-clear");
  if (canonicalView(state.activeView) === "week") {
    const sheetDay = state.plannerDaySheet?.open ? state.plannerDaySheet.dayIndex
      : state.mealPicker?.open ? mealPickerReturn?.dayIndex : null;
    if (sheetDay !== null && sheetDay !== undefined) levels.push(`planner-day:${sheetDay}`);
  }
  if (state.mealPicker?.open) levels.push(`picker:${state.mealPicker.dayIndex}`);
  if (state.mealPicker?.open && pickerNote) levels.push("picker-note");
  if (state.generateModal?.open && state.activeView === "shopping") levels.push("generate-days");
  if (state.shoppingReview?.open) levels.push("shopping-review");
  if (editorRowMenu) levels.push(`row-menu:${editorRowMenu.kind}:${editorRowMenu.index}`);
  if (editorDiscardOpen) levels.push("editor-discard");
  return levels;
}

function withPageScrollDirection(direction, action) {
  const previousDirection = pageScrollDirection;
  pageScrollDirection = direction;
  try { return action(); } finally { pageScrollDirection = previousDirection; }
}

function navigate(patch, direction = "forward") {
  withPageScrollDirection(direction, () => setState(patch));
  uiHistory.sync();
}

function backInApp() {
  return withPageScrollDirection("back", performBackInApp);
}

function performBackInApp() {
  if (accessState.kind !== "ready") return false;
  if (editorDiscardOpen) { continueMealEditing(); return true; }
  if (weekClearConfirmation) { cancelWeekClear(); return true; }
  if (editorRowMenu) { closeEditorRowMenu(); return true; }
  if (pickerNote) { closePickerNote(); return true; }
  if (state.shoppingReview?.open) { closeShoppingReview(); return true; }
  if (state.generateModal?.open && state.activeView === "shopping") { setState({ generateModal: { open: false, selectedDays: [] } }); return true; }
  if (state.mealPicker?.open) { closeMealPicker(); return true; }
  if (state.plannerDaySheet?.open && canonicalView(state.activeView) === "week") { setState({ plannerDaySheet: { open: false, dayIndex: null } }); return true; }
  if (state.plannerActionsOpen && canonicalView(state.activeView) === "week") { setState({ plannerActionsOpen: false }); return true; }
  if (state.activeView === "ai-settings" && aiKeyEditorReturn) {
    const editorId = aiKeyEditorReturn; aiKeyEditorReturn = null;
    setState({ activeView: "meals", editingMealId: editorId }); return true;
  }
  if (state.activeView === "meals" && state.editingMealId) return requestCancelMealEditor();
  if (state.activeView === "recipe") {
    setState({ activeView: state.previousView || "meals", selectedMealId: null, selectedRecipeContext: null, keepScreenAwake: false }); return true;
  }
  if (SUBPAGE_VIEWS.has(state.activeView)) { setState({ activeView: "setup" }); return true; }
  return false;
}

function navigateBack() { backInApp(); uiHistory.sync(); }

function openMealPicker(dayIndex, fromDaySheet = false) {
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 6) return;
  planningWindowWeekKey = getWeekKey(); pickerFilters = emptyPickerFilters();
  pickerOtherPlans = false; pickerNote = null; weekClearConfirmation = null;
  const returnsToSheet = fromDaySheet && canonicalView(state.activeView) === "week" && state.plannerDaySheet?.open
    && state.plannerDaySheet.dayIndex === dayIndex;
  mealPickerReturn = returnsToSheet ? { dayIndex, positions: captureWindowPositions()
    .filter(position => position.key === "planner-day")
    .map(position => ({ ...position, focusKey: `planner-meal:${dayIndex}` })) } : null;
  navigate({ mealPicker: { open: true, dayIndex, query: "" }, plannerDaySheet: { open: false, dayIndex: null }, plannerActionsOpen: false });
  // Only desktop opening requests search focus. Later renders restore the user's actual focus.
  if (window.matchMedia?.("(pointer: fine)")?.matches) {
    const input = app.querySelector("[data-meal-picker-search]");
    input?.focus({ preventScroll: true });
    input?.select();
  }
}

function closeMealPicker(patch = {}) {
  if (!state.mealPicker?.open) return;
  pickerOtherPlans = false; pickerNote = null; pickerFilters = emptyPickerFilters();
  const returnTo = mealPickerReturn;
  mealPickerReturn = null;
  navigate({ ...patch, mealPicker: { open: false, dayIndex: null, query: "" },
    ...(returnTo ? { plannerDaySheet: { open: true, dayIndex: returnTo.dayIndex } } : {}) });
  if (returnTo) restoreWindowPositions(returnTo.positions);
}

function openDaySheet(index) {
  planningWindowWeekKey = getWeekKey();
  weekClearConfirmation = null; pickerOtherPlans = false; mealPickerReturn = null;
  navigate({ activeView: "week", plannerDaySheet: { open: true, dayIndex: index }, plannerActionsOpen: false,
    mealPicker: { open: false, dayIndex: null, query: "" } });
}

function openWeekMenu() {
  planningWindowWeekKey = getWeekKey();
  weekClearConfirmation = null; mealPickerReturn = null;
  navigate({ plannerActionsOpen: true, plannerDaySheet: { open: false, dayIndex: null }, mealPicker: { open: false, dayIndex: null, query: "" } });
}

function startWeekClear() {
  if (!state.plannerActionsOpen) return;
  weekClearConfirmation = { positions: captureWindowPositions().filter(position=>position.key==="week-menu")
    .map(position=>({...position,focusKey:"week-menu-clear"})) };
  navigate({ plannerActionsOpen: false });
}

function cancelWeekClear() {
  const previous = weekClearConfirmation; weekClearConfirmation = null;
  navigate({ plannerActionsOpen: true });
  if (previous) restoreWindowPositions(previous.positions);
}

function confirmWeekClear() {
  if (!weekClearConfirmation) return;
  const weekKey = getWeekKey();
  weekClearConfirmation = null;
  navigate({ plansByWeek: { ...state.plansByWeek, [weekKey]: emptyWeekPlan() },
    lockedPlansByWeek: { ...state.lockedPlansByWeek, [weekKey]: emptyWeekLocks() },
    dayTypesByWeek: { ...state.dayTypesByWeek, [weekKey]: emptyWeekDayTypes() },
    servingsByWeek: { ...state.servingsByWeek, [weekKey]: emptyWeekServings() },
    dayModesByWeek: { ...state.dayModesByWeek, [weekKey]: emptyWeekDayModes() },
    dayNotesByWeek: { ...state.dayNotesByWeek, [weekKey]: emptyWeekDayNotes() }, plannerActionsOpen: false, plannerDaySheet: { open: false, dayIndex: null } });
}

function changeWeek(value) {
  planningWindowWeekKey = null;
  weekClearConfirmation = null; mealPickerReturn = null; pickerOtherPlans = false;
  navigate({ weekOffset: value === 0 ? 0 : state.weekOffset + value, plannerDaySheet: { open: false, dayIndex: null },
    plannerActionsOpen: false, mealPicker: { open: false, dayIndex: null, query: "" } });
}

function openRecipeFromView(mealId, dayIndex) {
  navigate({ activeView: "recipe", previousView: canonicalView(state.activeView === "recipe" ? state.previousView : state.activeView),
    selectedMealId: mealId, selectedRecipeContext: dayIndex === null ? null : { weekKey: getWeekKey(), dayIndex },
    editingMealId: null, keepScreenAwake: false, plannerDaySheet: { open: false, dayIndex: null }, plannerActionsOpen: false });
}

function bindWeekSwipe() {
  const list = app.querySelector("[data-week-days]"); if (!list) return;
  let start = null, swiped = false;
  const blocked = () => state.activeView !== "week" || state.plannerDaySheet?.open || state.mealPicker?.open || state.plannerActionsOpen || weekClearConfirmation || state.shoppingReview?.open;
  list.addEventListener("touchstart", event => {
    swiped = false; start = !blocked() && event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  list.addEventListener("touchmove", event => { if (event.touches.length !== 1) start = null; }, { passive: true });
  list.addEventListener("touchcancel", () => { start = null; });
  list.addEventListener("touchend", event => {
    const touch = event.changedTouches[0];
    const direction = !blocked() && touch ? weekSwipeDirection(start, { x: touch.clientX, y: touch.clientY }, window.innerWidth || document.documentElement?.clientWidth || 0) : 0;
    start = null; if (direction) { swiped = true; changeWeek(direction); }
  }, { passive: true });
  list.addEventListener("click", event => { if (swiped) { event.preventDefault(); event.stopPropagation(); } }, { capture: true });
}

function maybeTransitionServings() {
  void servingsTransition?.run({ role: accessState.role, offline: accessState.offline,
    weeksReady: weeksServerReady, profileReady: profileServerReady });
}

function makeWeeksSync() { return createWeeksSync({
  setTimer: setTimeout, clearTimer: clearTimeout,
  onWeeks: (incoming, info) => {
    if (info?.authoritative) weeksServerReady = true;
    if (WEEK_SYNC_FIELDS.every(field => JSON.stringify(state[field] || {}) === JSON.stringify(incoming[field] || {}))) { maybeTransitionServings(); return; }
    // Only replace domain maps; selected week, editor and pending import stay intact.
    for (const field of WEEK_SYNC_FIELDS) state[field] = incoming[field];
    saveState();
    render();
    maybeTransitionServings();
  },
  onStatus: (status) => {
    if (weeksSyncStatus === status) return;
    weeksSyncStatus = status;
    render();
  },
}); }

function makeMealsSync() { return createMealsSync({
  onMeals: (incoming) => {
    const normalized = normalizeMeals(incoming);
    const diff = diffMeals(state.meals, normalized);
    if (!diff.upserts.length && !diff.removed.length) return;
    const changed = new Set(diff.upserts.map(meal => meal.id));
    const previous = new Map(state.meals.map(meal => [meal.id, meal]));
    // Keep unchanged recipe objects and all editor/UI state intact.
    state.meals = normalized.map(meal => changed.has(meal.id) ? meal : previous.get(meal.id));
    saveState();
    render();
  },
  onStatus: (status) => {
    if (mealsSyncStatus === status) return;
    mealsSyncStatus = status;
    render();
  },
}); }

function makeShoppingSync() { return createShoppingSync({
  onItems: (items) => {
    if (JSON.stringify(items) === JSON.stringify(state.shoppingList.items)) return;
    state.shoppingList = { ...state.shoppingList, items };
    saveState();
    render();
  },
  onStatus: (status) => {
    if (shoppingSyncStatus === status) return;
    shoppingSyncStatus = status;
    // The existing sync listeners may also set status. Keep shopping pending/error visible.
    render();
  },
}); }

function loadState() {
  const saved = localStore.read("middagsapp-state");
  try {
    return normalizeStateForStartup(stateForProject(saved, defaultState, firebaseConfig.projectId));
  } catch {
    return normalizeStateForStartup(stateForProject(null, defaultState, firebaseConfig.projectId));
  }
}

function normalizeStateForStartup(nextState) {
  const normalized = normalizeState({ ...nextState, weekOffset: 0 });
  return {
    ...normalized,
    filters: { ...defaultState.filters, sort: nextState.filters?.sort === "alpha" ? "alpha" : "category" },
    activeView: "shopping",
    previousView: "shopping",
    selectedMealId: null,
    selectedRecipeContext: null,
    editingMealId: null,
    editingShoppingItemId: null,
    draftMeal: null,
    draftIngredients: null,
    draftSteps: null,
    keepScreenAwake: false,
    mealPicker: { open: false, dayIndex: null, query: "" },
    plannerDaySheet: { open: false, dayIndex: null },
    plannerActionsOpen: false,
    generateModal: { open: false, selectedDays: [] },
    shoppingReview: { open: false, mode: null, title: "", groups: [], selectedItemIds: [] },
    toast: null,
  };
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
    ingredientMappings: nextState.metadata?.ingredientMappings && typeof nextState.metadata.ingredientMappings === "object" ? nextState.metadata.ingredientMappings : {},
    storeCategories: Array.isArray(nextState.metadata?.storeCategories) ? nextState.metadata.storeCategories : [],
    storeCategoryOrder: Array.isArray(nextState.metadata?.storeCategoryOrder) ? nextState.metadata.storeCategoryOrder : [],
  };
  if (nextState.metadata.categoryLabels.kjott === "Kjott") {
    nextState.metadata.categoryLabels.kjott = "Kjøtt";
  }
  nextState.mealPreferences = normalizeMealPreferences(nextState.mealPreferences, nextState.metadata.categoryLabels);
  nextState.shoppingList = normalizeShoppingList(nextState.shoppingList);
  nextState.activeView = canonicalView(nextState.activeView);
  nextState.previousView = canonicalView(nextState.previousView);
  nextState.meals = normalizeMeals(nextState.meals);
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
    nextState.servingsByWeek[currentWeekKey] = emptyWeekServings();
  }
  if (!nextState.dayModesByWeek[currentWeekKey]) {
    nextState.dayModesByWeek[currentWeekKey] = emptyWeekDayModes();
  }
  if (!nextState.dayNotesByWeek[currentWeekKey]) {
    nextState.dayNotesByWeek[currentWeekKey] = emptyWeekDayNotes();
  }
  nextState.mealPicker = { open: false, dayIndex: null, query: "" };
  nextState.plannerDaySheet = nextState.plannerDaySheet || { open: false, dayIndex: null };
  nextState.plannerActionsOpen = Boolean(nextState.plannerActionsOpen);
  nextState.shoppingReview = { open: false, mode: null, title: "", groups: [], selectedItemIds: [] };
  nextState.toast = null;
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
    ...Object.fromEntries(Object.entries(options || {}).filter(([key]) => key !== "_note").map(([key, option]) => [
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
  return Object.entries(getPlanModeOptions()).filter(([key]) => key !== "_note");
}

function planModeOption(value) {
  if (value === "_note") return { label: "Eget notat", type: "note" };
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

function saveState() {
  return localStore.write("middagsapp-state", localStateForStorage(state, firebaseConfig.projectId));
}

function patchTouchesSyncedData(patch) {
  return syncPatchTouchesSyncedData(patch);
}

function setState(patch, { redraw = true, immediateWeeks = false } = {}) {
  if (state.activeView === "recipe" && (("activeView" in patch && patch.activeView !== "recipe")
    || ("selectedMealId" in patch && patch.selectedMealId !== state.selectedMealId)
    || "selectedRecipeContext" in patch || patch.shoppingReview?.open)) flushRecipeServings();
  if ("activeView" in patch) patch = { ...patch, activeView: canonicalView(patch.activeView) };
  if ("previousView" in patch) patch = { ...patch, previousView: canonicalView(patch.previousView) };
  const previousState = state;
  if ("meals" in patch) patch = { ...patch, meals: normalizeMeals(patch.meals) };
  if ("shoppingList" in patch) {
    const previousItems = new Map(state.shoppingList.items.map((item) => [item.id, item]));
    const createdAt = Date.now();
    patch = { ...patch, shoppingList: normalizeShoppingList({ ...patch.shoppingList,
      items: (patch.shoppingList?.items || []).map((item, index) => ({ ...item,
        createdAt: previousItems.get(item.id)?.createdAt ?? item.createdAt ?? (createdAt + index),
      })),
    }) };
  }
  state = { ...state, ...patch };
  if (patchTouchesSyncedData(patch)) {
    state.clientUpdatedAt = Date.now();
    state.pendingLocalSync = true;
  }
  saveState();
  if (redraw) render(false);
  syncWakeLock();
  if ("shoppingList" in patch && !applyingRemoteState && accessState.kind === "ready" && !accessState.offline) {
    shoppingSync.enqueue(diffShoppingItems(previousState.shoppingList.items, state.shoppingList.items));
  }
  if ("meals" in patch && !applyingRemoteState && accessState.kind === "ready" && !accessState.offline) {
    mealsSync.enqueue(diffMeals(previousState.meals, state.meals));
  }
  if (WEEK_SYNC_FIELDS.some(field => field in patch) && !applyingRemoteState && accessState.kind === "ready" && !accessState.offline) {
    weeksSync.enqueue(diffWeeks(previousState, state), { immediate: immediateWeeks });
  }
  scheduleRemoteSaveForPatch(patch);
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
    shoppingList: state.shoppingList,
    clientUpdatedAt: state.clientUpdatedAt || 0,
  };
}

function syncedScopesForPatch(patch) {
  return getSyncedScopesForPatch(patch);
}

function scheduleRemoteSaveForPatch(patch) {
  const scopes = syncedScopesForPatch(patch);
  if (!scopes.length) return;
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
    editingShoppingItemId: state.editingShoppingItemId,
    keepScreenAwake: state.keepScreenAwake,
    previousView: state.previousView,
    weekOffset: state.weekOffset,
    filters: state.filters,
  };
  state = normalizeState({ ...structuredClone(defaultState), ...state, ...patch, ...uiState });
  saveState();
  render();
}

function syncStatusText() {
  const statuses = [syncStatus, shoppingSyncStatus, mealsSyncStatus, weeksSyncStatus];
  if (statuses.includes("Synk feilet")) return "Synk feilet";
  if (statuses.includes("Synker")) return "Synker";
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
    shopping: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>',
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

function renderMealPickerModal() {
  const picker = state.mealPicker || { open: false, dayIndex: null, query: "" };
  if (!picker.open || picker.dayIndex === null) return "";

  const dayIndex = picker.dayIndex;
  const dayName = dayNames[dayIndex];
  const query = picker.query || "";

  return `
    <div class="modal-backdrop active" data-close-meal-picker>
      <div class="modal bottom-sheet meal-picker-modal active" onclick="event.stopPropagation()">
        <div class="modal-header">
          <div><h3>Velg middag</h3><p class="modal-subtitle">${escapeHtml(dayName)} ${escapeHtml(getWeekDates()[dayIndex].toLocaleDateString("nb-NO", {day:"numeric",month:"long"}))} · ${escapeHtml(getSuitabilityLabels()[currentDayTypes()[dayIndex]] || currentDayTypes()[dayIndex])}</p></div>
          <button class="modal-close" type="button" data-focus-key="picker-close" data-close-meal-picker aria-label="Lukk">×</button>
        </div>
        <div class="modal-body">
          <div class="meal-picker-search-wrap">${weekIcon("search")}
            <input 
              type="text" 
              class="meal-picker-search-input" 
              placeholder="Søk i oppskrifter (f.eks. taco, laks...)" 
              value="${escapeHtml(query)}" 
              data-meal-picker-search 
              data-focus-key="picker-search"
              autocomplete="off"
            />
            <button class="search-clear-btn" type="button" data-focus-key="picker-clear" aria-label="Tøm søk" data-clear-search-input style="${query ? '' : 'display: none;'}">×</button>
          </div>
          ${renderPickerFilters()}
          <div class="meal-picker-list" data-scroll-key="meal-picker">
            ${renderMealPickerListItems(query, dayIndex)}
          </div>
        </div>
        <div class="picker-footer">${renderPickerPlans()}</div>
      </div>
    </div>
  `;
}

function pickerFiltersActive() { return pickerFilters.quick || pickerFilters.kidFriendly || pickerFilters.favorite || Boolean(pickerFilters.suitability) || pickerFilters.category !== "all"; }

function renderPickerFilters() {
  return renderMealFilters({ filters: pickerFilters, suitabilityEntries: suitabilityEntries(),
    categoryEntries: Object.entries(getCategoryLabels()), escapeHtml });
}

function renderPickerPlans() {
  return renderPickerPlansView({ expanded: pickerOtherPlans, noteDraft: pickerNote,
    plans: planModeEntries().filter(([key]) => !dayPlansMeal(key)), escapeHtml });
}

function openPickerNote() {
  if (!state.mealPicker?.open) return;
  pickerOtherPlans = true;
  pickerNote = { text: String(currentDayNotes()[state.mealPicker.dayIndex] || "").slice(0, 60) };
  render(); uiHistory.sync();
  app.querySelector("[data-picker-note-input]")?.focus?.({ preventScroll: true });
}

function closePickerNote() {
  pickerNote = null; pickerOtherPlans = true;
  render(); uiHistory.sync();
  app.querySelector("[data-picker-own-note]")?.focus?.({ preventScroll: true });
}

function savePickerNote() {
  if (!pickerNote || !state.mealPicker?.open) return;
  const text = String(app.querySelector("[data-picker-note-input]")?.value ?? pickerNote.text).slice(0, 60).trim();
  if (!text) return;
  const index = state.mealPicker.dayIndex, week = getWeekKey();
  closeMealPicker({
    plansByWeek: { ...state.plansByWeek, [week]: { ...currentPlan(), [index]: "" } },
    dayModesByWeek: { ...state.dayModesByWeek, [week]: { ...currentDayModes(), [index]: "_note" } },
    dayNotesByWeek: { ...state.dayNotesByWeek, [week]: { ...currentDayNotes(), [index]: text } },
  });
}

function togglePickerFilter(key) {
  if (key.startsWith("category:")) { const category = key.slice(9); pickerFilters.category = pickerFilters.category === category ? "all" : category; }
  else if (key.startsWith("suitability:")) { const suitability = key.slice("suitability:".length); pickerFilters.suitability = pickerFilters.suitability === suitability ? "" : suitability; }
  else if (["quick","kidFriendly","favorite"].includes(key)) pickerFilters[key] = !pickerFilters[key];
  render();
}

function mealsMatchingPickerQuery(query = "") {
  const labels = getCategoryLabels();
  const normalizedQuery = query.toLowerCase().trim();
  return sortedMeals().filter((meal) => {
    if (!mealMatchesPickerFilters(meal, pickerFilters)) return false;
    if (!normalizedQuery) return true;
    const titleMatch = meal.title.toLowerCase().includes(normalizedQuery);
    const descMatch = (meal.description || "").toLowerCase().includes(normalizedQuery);
    const catMatch = meal.categories.some((cat) => (labels[cat] || cat).toLowerCase().includes(normalizedQuery));
    const ingrMatch = (meal.keyIngredients || []).some((ingr) => ingredientBaseName(ingr).toLowerCase().includes(normalizedQuery));
    return titleMatch || descMatch || catMatch || ingrMatch;
  });
}

function renderMealPickerListItems(query = "", dayIndex) {
  const labels = getCategoryLabels();
  const selectedMealId = dayPlansMeal(currentDayModes()[dayIndex]) ? currentPlan()[dayIndex] || "" : "";
  const filteredMeals = mealsMatchingPickerQuery(query);
  const quickTitle = pickerFiltersActive() ? "" : quickMealTitleForQuery(query, state.meals);

  let html = quickTitle ? `
    <button class="meal-picker-item quick-meal-item" type="button" data-focus-key="picker-quick-meal" data-create-quick-meal>
      <span class="meal-picker-item-details">
        <span class="meal-picker-item-title">+ Legg til «${escapeHtml(quickTitle)}» som ny middag</span>
        <span class="meal-picker-item-desc">Oppskriften kan fylles ut senere</span>
      </span>
    </button>
  ` : "";

  if (!query.trim()) {
    const suggestions = selectPickerSuggestions(rankedSuggestions(dayIndex, currentPlan(), [selectedMealId]).filter(({meal})=>mealMatchesPickerFilters(meal,pickerFilters)));
    if (suggestions.length) html += `<h4 class="meal-picker-category-title">FORSLAG TIL ${escapeHtml(dayNames[dayIndex].toUpperCase())}</h4>`
      + suggestions.map(({meal,planningLabel}) => renderPickerSuggestion(meal,dayIndex,planningLabel)).join("");
  }

  if (filteredMeals.length === 0 && pickerFiltersActive()) return `<div class="meal-picker-empty">Ingen middager passer filtrene.</div><button class="text-action" type="button" data-focus-key="picker-clear-filters" data-clear-picker-filters>Fjern filtre</button>`;
  if (filteredMeals.length === 0) {
    return html + `<div class="meal-picker-empty">Ingen oppskrifter matcher søket ditt.</div>`;
  }

  const prepTimeLabels = getPrepTimeLabels();

  const categoriesToRender = Object.keys(labels);
  categoriesToRender.forEach((category) => {
    const mealsInCategory = filteredMeals.filter((meal) => meal.categories[0] === category);
    if (mealsInCategory.length === 0) return;

    html += `<div class="meal-picker-category-title">${escapeHtml(labels[category])}</div>`;
    mealsInCategory.forEach((meal) => {
      const isSelected = selectedMealId === meal.id;
      const chips = [
        meal.prepTime ? `<span class="picker-chip time">${escapeHtml(prepTimeLabels[meal.prepTime] || meal.prepTime)}</span>` : "",
        meal.kidFriendly ? `<span class="picker-chip kid">Barnevennlig</span>` : "",
        meal.favorite ? `<span class="picker-chip fav">Favoritt</span>` : "",
      ].filter(Boolean).join("");

      html += `
        <button class="meal-picker-item ${isSelected ? "selected" : ""}" type="button" data-select-meal="${escapeHtml(meal.id)}" data-focus-key="picker-meal:${escapeHtml(meal.id)}">
          <span class="meal-picker-item-details">
            <span class="meal-picker-item-title">${escapeHtml(meal.title)}</span>
            ${meal.description ? `<span class="meal-picker-item-desc">${escapeHtml(meal.description)}</span>` : ""}
            <span class="meal-picker-item-chips">${chips}</span>
          </span>
          ${isSelected ? `<span class="meal-picker-check">${weekIcon("check")}</span>` : ""}
        </button>
      `;
    });
  });

  const uncategorized = filteredMeals.filter((meal) => !meal.categories[0] || !labels[meal.categories[0]]);
  if (uncategorized.length > 0) {
    html += `<div class="meal-picker-category-title">Annet</div>`;
    uncategorized.forEach((meal) => {
      const isSelected = selectedMealId === meal.id;
      const chips = [
        meal.prepTime ? `<span class="picker-chip time">${escapeHtml(prepTimeLabels[meal.prepTime] || meal.prepTime)}</span>` : "",
        meal.kidFriendly ? `<span class="picker-chip kid">Barnevennlig</span>` : "",
        meal.favorite ? `<span class="picker-chip fav">Favoritt</span>` : "",
      ].filter(Boolean).join("");

      html += `
        <button class="meal-picker-item ${isSelected ? "selected" : ""}" type="button" data-select-meal="${escapeHtml(meal.id)}" data-focus-key="picker-meal:${escapeHtml(meal.id)}">
          <span class="meal-picker-item-details">
            <span class="meal-picker-item-title">${escapeHtml(meal.title)}</span>
            ${meal.description ? `<span class="meal-picker-item-desc">${escapeHtml(meal.description)}</span>` : ""}
            <span class="meal-picker-item-chips">${chips}</span>
          </span>
          ${isSelected ? `<span class="meal-picker-check">${weekIcon("check")}</span>` : ""}
        </button>
      `;
    });
  }

  return html;
}

function renderPickerSuggestion(meal, dayIndex, planningLabel = "") {
  const homePlans = Object.fromEntries(Object.entries(state.plansByWeek || {}).map(([week, plan]) => [week, Object.fromEntries(plannedMealEntries(plan, week))]));
  const history = planningLabel || lastPlannedLabel(homePlans, meal.id, getWeekDates()[dayIndex]);
  const info = [getSuitabilityLabels()[currentDayTypes()[dayIndex]], getPrepTimeLabels()[meal.prepTime], history].filter(Boolean).join(" · ");
  return `<button class="meal-picker-item picker-suggestion" type="button" data-select-meal="${escapeHtml(meal.id)}" data-focus-key="picker-suggestion:${escapeHtml(meal.id)}"><span class="meal-picker-item-details"><strong>${escapeHtml(meal.title)}</strong><small>${escapeHtml(info)}</small></span><span class="picker-add" aria-hidden="true">+</span></button>`;
}

function addQuickMealForPicker() {
  const picker = state.mealPicker;
  if (!picker?.open || picker.dayIndex === null || pickerFiltersActive()) return;
  const title = quickMealTitleForQuery(picker.query, state.meals);
  if (!title) return;
  const meal = createQuickMeal(title, makeMealId(title));
  const weekKey = getWeekKey();
  const plan = { ...currentPlan(), [picker.dayIndex]: meal.id };
  closeMealPicker({
    meals: [...state.meals, meal],
    plansByWeek: { ...(state.plansByWeek || {}), [weekKey]: plan },
    dayModesByWeek: { ...state.dayModesByWeek, [weekKey]: { ...currentDayModes(), [picker.dayIndex]: "home" } },
  });
  showToast(`«${title}» er lagt til. Oppskriften kan fylles ut senere.`);
}


function planningWindowOpen() { return state.activeView === "week" && Boolean(state.mealPicker?.open || state.plannerDaySheet?.open || state.plannerActionsOpen || weekClearConfirmation); }

function getWeekDates(offset) {
  if (offset === undefined && planningWindowWeekKey && planningWindowOpen()) return dayNames.map((_, index) => dateForWeekDay(planningWindowWeekKey, index));
  return getWeekDatesForOffset(offset ?? state.weekOffset);
}

function getWeekKey(offset) {
  if (offset === undefined && planningWindowWeekKey && planningWindowOpen()) return planningWindowWeekKey;
  return getWeekKeyForOffset(offset ?? state.weekOffset);
}

function getUpcomingDays(n = 9) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const weekKey = getWeekKeyForDate(date);
    const dayIndex = getDayIndexForDate(date);
    const plan = state.plansByWeek?.[weekKey] || {};
    const dayModes = state.dayModesByWeek?.[weekKey] || {};
    const meal = getMeal(plan[dayIndex]);
    const dayMode = dayModes[dayIndex] || "home";
    days.push({ date, weekKey, dayIndex, meal, dayMode, dateKey: localDateKey(date) });
  }
  return days;
}

function currentPlan(weekKey = getWeekKey()) {
  return { ...emptyWeekPlan(), ...(state.plansByWeek?.[weekKey] || {}) };
}

function currentLocks(weekKey = getWeekKey()) {
  return { ...emptyWeekLocks(), ...(state.lockedPlansByWeek?.[weekKey] || {}) };
}

function currentDayTypes(weekKey = getWeekKey()) {
  return { ...emptyWeekDayTypes(), ...(state.dayTypesByWeek?.[weekKey] || {}) };
}

function currentDayModes(weekKey = getWeekKey()) {
  return { ...emptyWeekDayModes(), ...(state.dayModesByWeek?.[weekKey] || {}) };
}

function currentDayNotes(weekKey = getWeekKey()) {
  return { ...emptyWeekDayNotes(), ...(state.dayNotesByWeek?.[weekKey] || {}) };
}

function currentServings(weekKey = getWeekKey()) {
  return { ...emptyWeekServings(), ...(state.servingsByWeek?.[weekKey] || {}) };
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

function formatDate(date) {
  return date.toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function categoryChips(meal) {
  return renderCategoryChipsView(meal, getCategoryLabels(), escapeHtml);
}

function mealBadges(meal) {
  return renderMealBadgesView(meal);
}

function suitabilityChips(meal) {
  return renderSuitabilityChipsView(meal, getSuitabilityLabels(), escapeHtml);
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

function servingsForDay(weekKey, dayIndex) { return resolveServingsForDay(state, weekKey, dayIndex); }

function recipeTargetServings() {
  const context = state.selectedRecipeContext;
  const pending = recipeServingsBuffer.pending;
  if (context && pending?.mealId === state.selectedMealId && pending.weekKey === context.weekKey && pending.dayIndex === context.dayIndex) return pending.value;
  if (context) return servingsForDay(context.weekKey, context.dayIndex);
  if (recipeServingsView.key !== state.selectedMealId) recipeServingsView = { key: state.selectedMealId, value: null };
  return recipeServingsView.value ?? state.family.familySize;
}

function changeRecipeServings(delta) {
  setRecipeServings(Math.max(1, Math.min(30, recipeTargetServings() + delta)));
}

function setRecipeServings(value) {
  if (value !== recipeTargetServings()) {
    const context = state.selectedRecipeContext;
    if (context) recipeServingsBuffer.queue({ ...context, mealId: state.selectedMealId, value });
    else recipeServingsView.value = value === state.family.familySize ? null : value;
  }
  refreshRecipeServings(true);
}

function commitRecipeServingsInput() {
  const input = app.querySelector("[data-recipe-servings-input]");
  if (!input || state.activeView !== "recipe") return;
  const value = parseRecipeServings(input.value);
  if (value !== null) setRecipeServings(value);
  else input.value = String(recipeTargetServings());
}

function flushRecipeServings() {
  commitRecipeServingsInput();
  recipeServingsBuffer.flush();
}

function recipeServingCopy(meal, targetServings) {
  const base = mealBaseServings(meal), context = state.selectedRecipeContext;
  return {
    text: targetServings === base ? `Oppskrift til ${targetServings} porsjoner.`
      : `Justert til ${targetServings} porsjoner fra en oppskrift på ${base}.`,
    scope: context ? `Gjelder ${dayNames[context.dayIndex].toLowerCase()} ${formatDate(dateForWeekDay(context.weekKey, context.dayIndex)).replace(/\.$/, "")}.`
      : targetServings !== state.family.familySize ? "Gjelder bare denne visningen." : "",
  };
}

function refreshRecipeServings(forceInput = false) {
  const meal = getMeal(state.selectedMealId);
  if (!meal || state.activeView !== "recipe") return;
  const value = recipeTargetServings(), copy = recipeServingCopy(meal, value);
  const input = app.querySelector("[data-recipe-servings-input]");
  if (input && (forceInput || document.activeElement !== input)) input.value = String(value);
  app.querySelectorAll("[data-recipe-servings]").forEach(button => {
    button.disabled = Number(button.dataset.recipeServings) < 0 ? value <= 1 : value >= 30;
  });
  const note = app.querySelector("[data-recipe-serving-note]"); if (note) note.textContent = copy.text;
  const scope = app.querySelector("[data-recipe-serving-scope]"); if (scope) { scope.textContent = copy.scope; scope.hidden = !copy.scope; }
  app.querySelector("[data-toggle-wake]")?.setAttribute?.("aria-checked", String(state.keepScreenAwake));
  const ingredients = app.querySelector("[data-recipe-ingredients]");
  if (ingredients) ingredients.innerHTML = renderIngredientList(normalizeIngredients(meal.ingredients, meal.keyIngredients), {
    scaleAmount, baseServings: mealBaseServings(meal), targetServings: value, escapeHtml,
  });
}

// ── Handleliste ──────────────────────────────────────────────

const STORE_CATEGORIES = [
  { key: "produce", label: "Grønnsaker & frukt", keywords: ["løk", "gulrot", "gulrøtter", "tomat", "paprika", "spinat", "hvitløk", "brokkoli", "potet", "poteter", "agurk", "salat", "sopp", "mais", "erter", "eple", "banan", "sitron", "lime", "appelsin", "kål", "purre", "selleri", "squash", "aubergine", "chili", "vårløk", "gressløk", "persille", "koriander", "mango", "avokado", "jordbær", "blåbær", "grønnsak", "grønnsaker"] },
  { key: "meat", label: "Kjøtt & fisk", keywords: ["kylling", "laks", "torsk", "svin", "svinekjøtt", "biff", "reker", "kjøttdeig", "bacon", "pølse", "skinke", "lam", "tunfisk", "sei", "hyse", "ørret", "makrell", "sild", "fiskefilet", "fiskekaker", "fiskepinner", "kjøtt", "fisk", "farse", "karbonader"] },
  { key: "dairy", label: "Meieri & egg", keywords: ["melk", "fløte", "ost", "smør", "rømme", "yoghurt", "egg", "creme fraiche", "kesam", "brunost", "gouda", "parmesan", "mozzarella", "brie", "cottage", "ricotta", "kremost", "hvitost"] },
  { key: "bread", label: "Brød & bakevarer", keywords: ["brød", "knekkebrød", "kavring", "tortilla", "pita", "lefse", "rundstykke", "bagett", "loff", "wraps", "nachos", "chips", "flatbrød"] },
  { key: "dry", label: "Tørrvarer & hermetikk", keywords: ["pasta", "spaghetti", "spagetti", "spaghetti saus", "spaghettisaus", "pastasaus", "ris", "mel", "sukker", "olje", "tomatsaus", "linser", "kikert", "quinoa", "couscous", "nudler", "kokosmelk", "soyasaus", "olivenolje", "rapsolje", "eddik", "honning", "hermetikk", "hermetisk", "buljong", "kraft", "hoisin", "ketchup", "majones", "sennep", "hakket tomat"] },
  { key: "spices", label: "Krydder & sauser", keywords: ["salt", "pepper", "oregano", "ingefær", "karri", "kanel", "paprikapulver", "cumin", "gurkemeie", "chillipulver", "timian", "rosmarin", "laurbær", "muskat", "krydder", "garam masala", "tikka", "kardemomme", "allehånde", "løkpulver", "hvitløkspulver"] },
];

const DISABLED_INGREDIENT_MAPPING = "__disabled";

function categorizeIngredient(name) {
  const lower = ingredientBaseName(name).toLowerCase();
  const mappings = state?.metadata?.ingredientMappings || {};
  if (Object.prototype.hasOwnProperty.call(mappings, lower)) {
    return mappings[lower] === DISABLED_INGREDIENT_MAPPING ? "other" : mappings[lower];
  }
  for (const cat of STORE_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.key;
  }
  return "other";
}

function getStoreCategories() {
  const configured = Array.isArray(state.metadata?.storeCategories) ? state.metadata.storeCategories : [];
  const configuredByKey = new Map(configured.map((cat) => [cat.key, cat]));
  const builtInKeys = new Set(STORE_CATEGORIES.map((c) => c.key));
  const builtIns = STORE_CATEGORIES.map(({ key, label }) => ({
    key,
    label: configuredByKey.get(key)?.label || label,
    builtIn: true,
  }));
  const custom = configured
    .filter((cat) => cat.key && !builtInKeys.has(cat.key) && cat.key !== "other")
    .map((cat) => ({ ...cat, builtIn: false }));
  const other = { key: "other", label: configuredByKey.get("other")?.label || "Annet", builtIn: true };
  return orderStoreCategories([...builtIns, ...custom, other], state.metadata?.storeCategoryOrder);
}

function mergeGeneratedShoppingItems(generatedItems) {
  const existing = normalizeShoppingList(state.shoppingList).items;
  const existingByKey = new Map(existing.map((item) => [shoppingMergeKey(item), item]));
  const generated = normalizeShoppingList({ items: generatedItems }).items.map((item) => {
    const previous = existingByKey.get(shoppingMergeKey(item));
    return {
      ...item,
      id: previous?.id || item.id,
      category: previous?.category || item.category,
      checked: Boolean(previous?.checked),
      custom: false,
    };
  });
  const custom = existing.filter((item) => item.custom);
  return mergeShoppingItems(generated, custom);
}

function createShoppingItemFromIngredient(ingredient, ratio = 1, custom = false) {
  const parsedAmount = shoppingAmountValue(ingredient.amount);
  const scaled = parsedAmount === null ? NaN : parsedAmount * ratio;
  const name = ingredientBaseName(ingredient.name);
  return {
    id: Math.random().toString(36).slice(2),
    name,
    amount: isNaN(scaled) ? (ingredient.amount || "") : ratio === 1 ? (parseAmountRange(ingredient.amount) ? formatShoppingAmount(scaled) : ingredient.amount || "")
      : formatShoppingAmount(roundScaledAmount(scaled, ingredient.unit || "")),
    _rawAmount: isNaN(scaled) ? null : scaled,
    _scaled: ratio !== 1,
    unit: ingredient.unit || "",
    category: categorizeIngredient(name),
    checked: false,
    custom,
  };
}

function createMealShoppingReview(meal) {
  if (!meal?.ingredients?.length) return null;
  const targetServings = recipeTargetServings();
  const ratio = mealBaseServings(meal) > 0 ? targetServings / mealBaseServings(meal) : 1;
  const items = meal.ingredients
    .filter((ingredient) => ingredient.name?.trim())
    .map((ingredient) => createShoppingItemFromIngredient(ingredient, ratio, true));

  if (!items.length) return null;

  return {
    open: true,
    mode: "meal",
    title: `Legg til fra ${meal.title}`,
    groups: [{
      id: meal.id,
      title: meal.title,
      subtitle: targetServings ? `${targetServings} porsjoner` : "",
      items,
    }],
    selectedItemIds: items.map((item) => item.id),
  };
}

function createWeekShoppingReview(selectedDays) {
  const shortDayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];
  const missingIngredients = [];
  const groups = selectedDays
    .filter(({ dayMode }) => dayPlansMeal(dayMode))
    .map(({ weekKey, dayIndex, date, meal }) => {
      const plan = state.plansByWeek?.[weekKey] || {};
      const plannedMeal = meal || getMeal(plan[dayIndex]);
      if (!plannedMeal) return null;
      const ingredients = (plannedMeal.ingredients || []).filter((ingredient) => ingredient.name?.trim());
      if (!ingredients.length) {
        missingIngredients.push(`${plannedMeal.title} (${shortDayNames[date.getDay()]} ${formatDate(date)})`);
        return null;
      }

      const base = mealBaseServings(plannedMeal);
      const target = servingsForDay(weekKey, dayIndex);
      const ratio = base > 0 ? target / base : 1;
      const items = ingredients
        .map((ingredient) => createShoppingItemFromIngredient(ingredient, ratio, false));

      if (!items.length) return null;

      return {
        id: `${weekKey}-${dayIndex}`,
        title: plannedMeal.title,
        subtitle: `${shortDayNames[date.getDay()]} ${formatDate(date)} · ${target} porsjoner`,
        items,
      };
    })
    .filter(Boolean);

  const selectedItemIds = groups.flatMap((group) => group.items.map((item) => item.id));
  return {
    open: groups.length > 0,
    mode: "week",
    title: "Se over handlelisten",
    groups,
    selectedItemIds,
    missingIngredients,
  };
}

function selectedShoppingReviewItems() {
  const review = state.shoppingReview || {};
  const selectedIds = new Set(review.selectedItemIds || []);
  return roundRecipeShoppingItems((review.groups || []).flatMap((group) => group.items || []).filter((item) => selectedIds.has(item.id)), { weekly: review.mode === "week" });
}

function shoppingReviewItemCount(review = state.shoppingReview) {
  return (review?.selectedItemIds || []).length;
}

function closeShoppingReview() {
  navigate({ shoppingReview: { open: false, mode: null, title: "", groups: [], selectedItemIds: [] } });
}

function showToast(message) {
  const id = Math.random().toString(36).slice(2);
  setState({ toast: { id, message } });
  setTimeout(() => {
    if (state.toast?.id === id) setState({ toast: null });
  }, 2400);
}

function shoppingSuggestionSources() {
  const suggestions = new Map();
  const add = (name, category = null) => {
    const trimmed = String(name || "").trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (suggestions.has(key)) return;
    suggestions.set(key, { name: trimmed, category: category || categorizeIngredient(trimmed) });
  };

  Object.entries(state.metadata?.ingredientMappings || {}).forEach(([name, category]) => {
    if (category !== DISABLED_INGREDIENT_MAPPING) add(name, category);
  });
  STORE_CATEGORIES.forEach((cat) => cat.keywords.forEach((keyword) => add(keyword, cat.key)));
  (state.meals || []).forEach((meal) => {
    (meal.ingredients || []).forEach((ingredient) => add(ingredientBaseName(ingredient.name)));
    (meal.keyIngredients || []).forEach((ingredient) => add(ingredientBaseName(ingredient)));
  });
  (state.shoppingList?.items || []).forEach((item) => add(item.name, item.category));

  return [...suggestions.values()].sort((a, b) => a.name.localeCompare(b.name, "no"));
}

function shoppingSuggestions(query, limit = 8) {
  const term = String(query || "").trim().toLowerCase();
  if (term.length < 2) return [];
  return shoppingSuggestionSources()
    .filter((item) => item.name.toLowerCase().includes(term))
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aStarts = aName.startsWith(term);
      const bStarts = bName.startsWith(term);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.name.localeCompare(b.name, "no");
    })
    .slice(0, limit);
}

function renderShoppingSuggestions(query) {
  const suggestions = shoppingSuggestions(query);
  const categories = Object.fromEntries(getStoreCategories().map((cat) => [cat.key, cat.label]));
  return renderShoppingSuggestionsView({ suggestions, categories, escapeHtml });
}

function addShoppingItemByName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return;
  const newItem = {
    id: Math.random().toString(36).slice(2),
    name: trimmed,
    amount: "",
    unit: "",
    category: categorizeIngredient(trimmed),
    checked: false,
    custom: true,
  };
  setState({ shoppingList: { ...state.shoppingList, items: mergeShoppingItems(state.shoppingList?.items || [], [newItem]) } });
}

function generateShoppingListItems(selectedDays) {
  const items = [];
  for (const { weekKey, dayIndex, dayMode } of selectedDays) {
    if (!dayPlansMeal(dayMode)) continue;
    const meal = getMeal(state.plansByWeek?.[weekKey]?.[dayIndex]);
    if (!meal?.ingredients?.length) continue;
    const ratio = servingsForDay(weekKey, dayIndex) / mealBaseServings(meal);
    for (const ingredient of meal.ingredients) if (ingredient.name?.trim()) items.push(createShoppingItemFromIngredient(ingredient, ratio));
  }
  return roundRecipeShoppingItems(items, { weekly: true });
}

function renderGenerateModal() {
  const days = getUpcomingDays(9);
  const selected = state.generateModal.selectedDays;
  const shortDayNames = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

  const rows = days.map((d) => {
    const isChecked = selected.includes(d.dateKey);
    const hasPlannedMeal = dayPlansMeal(d.dayMode);
    const mealTitle = !hasPlannedMeal
      ? planModeLabel(d.dayMode)
      : d.meal ? d.meal.title : "Ikke planlagt";
    const isMuted = !hasPlannedMeal || !d.meal;
    const shortDay = shortDayNames[d.date.getDay()];
    const dateStr = formatDate(d.date);
    return `
      <label class="gen-modal-row${isChecked ? " selected" : ""}">
        <input type="checkbox" class="gen-modal-check" data-focus-key="generate-day:${escapeHtml(d.dateKey)}" data-modal-day="${escapeHtml(d.dateKey)}" ${isChecked ? "checked" : ""}>
        <div class="gen-modal-day">
          <span class="gen-modal-dayname">${shortDay}</span>
          <span class="gen-modal-date">${dateStr}</span>
        </div>
        <span class="gen-modal-meal${isMuted ? " muted" : ""}">${escapeHtml(mealTitle)}</span>
      </label>
    `;
  }).join("");

  const anySelected = selected.length > 0;

  return `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>Velg dager å handle for</h3>
          <button class="modal-close" data-focus-key="generate-close" data-close-modal aria-label="Lukk">×</button>
        </div>
        <div class="gen-modal-list" data-scroll-key="generate-days">
          ${rows}
        </div>
        <div class="modal-footer">
          <button class="button secondary compact" data-focus-key="generate-cancel" data-close-modal>Avbryt</button>
          <button class="button${anySelected ? "" : " disabled"}" data-focus-key="generate-confirm" data-confirm-generate ${anySelected ? "" : "disabled"}>
            Generer liste (${selected.length} dager)
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderShoppingReviewModal() {
  const review = state.shoppingReview || { groups: [], selectedItemIds: [] };
  const selectedCount = shoppingReviewItemCount(review);
  const totalCount = (review.groups || []).reduce((sum, group) => sum + (group.items || []).length, 0);
  return renderShoppingReviewModalView({ review, selectedCount, totalCount, escapeHtml });
}

function renderToast() {
  if (!state.toast?.message) return "";
  return `<div class="toast-message" role="status">${escapeHtml(state.toast.message)}</div>`;
}

function renderShoppingItem(item) {
  return renderShoppingItemView(item, escapeHtml);
}

function renderShoppingItemEditor() {
  const item = (state.shoppingList?.items || []).find((entry) => entry.id === state.editingShoppingItemId);
  return renderShoppingItemEditorView({
    item,
    unitOptions: getUnitOptions(),
    storeCategories: getStoreCategories(),
    escapeHtml,
  });
}

function renderShoppingList() {
  const items = state.shoppingList?.items || [];
  return renderShoppingListView({
    items,
    storeCategories: getStoreCategories(),
    generateModalHtml: state.generateModal?.open ? renderGenerateModal() : "",
    itemEditorHtml: state.editingShoppingItemId ? renderShoppingItemEditor() : "",
    shoppingIconHtml: icon("shopping"),
    escapeHtml,
  });
}

function renderShell(viewHtml) {
  const displayedSyncStatus = syncStatusText();
  const isRecipeView = state.activeView === "recipe";
  const isEditorView = state.activeView === "meals" && Boolean(state.editingMealId);
  const settingsViews = new Set(["setup", "account-settings", "ai-settings", "family-settings", "app-settings", "meal-preferences", "categories", "units", "prep-times", "suitability", "plan-modes", "ingredient-mappings", "store-categories"]);
  const isSettingsView = settingsViews.has(state.activeView);
  const isSubpage = isEditorView || isRecipeView || (isSettingsView && state.activeView !== "setup");
  const pickerModal = state.mealPicker?.open ? renderMealPickerModal() : "";
  const shoppingReviewModal = state.shoppingReview?.open ? renderShoppingReviewModal() : "";
  const toast = renderToast();
  app.innerHTML = `
    <div class="app-shell ${isSubpage ? "subpage-mode" : ""} ${isRecipeView ? "recipe-mode" : ""} ${isEditorView ? "editor-mode" : ""}">
      ${pickerModal}
      ${shoppingReviewModal}
      ${toast}
      ${isSubpage ? "" : `<header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">M</div>
            <div>
              <h1 class="brand-title">${escapeHtml(state.family.name)} sin middagsplan</h1>
              <p class="brand-subtitle">Planlegg uka med gode middager</p>
            </div>
          </div>
          <div class="topbar-actions">
            <div class="sync-pill${displayedSyncStatus === "Synket" ? " sync-pill--synced" : ""}"><span class="sync-dot" aria-hidden="true"></span><span class="sync-status-label">${escapeHtml(displayedSyncStatus)}</span></div>
            <button class="topbar-settings-button ${isSettingsView ? "active" : ""}" data-view="setup" aria-label="Innstillinger" title="Innstillinger">
              ${icon("settings")}
            </button>
          </div>
        </div>
      </header>`}
      <main class="content">${viewHtml}</main>
      <nav class="bottom-nav">
        <div class="bottom-nav-inner">
          ${navButton("shopping", "Handle", "shopping")}
          ${navButton("week", "Uke", "calendar")}
          ${navButton("meals", "Oppskrifter", "meals")}
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

function getTodayIndexInCurrentWeek() {
  const todayKey = localDateKey(new Date());
  return getWeekDates().findIndex(date => localDateKey(date) === todayKey);
}

function eligibleWeekDays(weekKey = getWeekKey()) { return weekEligibleDays(currentPlan(weekKey), currentLocks(weekKey), currentDayModes(weekKey), dayPlansMeal); }
function emptyWeekDays(weekKey = getWeekKey()) { return eligibleWeekDays(weekKey).filter(index => !currentPlan(weekKey)[index]); }

function renderWeek() {
  const rootKey = getWeekKey(state.weekOffset), dates = getWeekDates(state.weekOffset), heading = weekHeading(dates, state.weekOffset);
  const plan = currentPlan(rootKey), locks = currentLocks(rootKey), modes = currentDayModes(rootKey), notes = currentDayNotes(rootKey), servings = currentServings(rootKey);
  const todayIndex = dates.findIndex(date => localDateKey(date) === localDateKey(new Date()));
  const rowsHtml = dayNames.map((day,index) => {
    const home = dayPlansMeal(modes[index]), meal = getMeal(plan[index]);
    const ownNote = planModeType(modes[index]) === "note";
    return renderWeekRow({ day, index, dateLabel: formatDate(dates[index]), home,
      title: ownNote ? String(notes[index] || "").trim() || "Eget notat" : home ? meal?.title || "" : planModeLabel(modes[index]), mealId: meal?.id || "",
      locked: Boolean(locks[index]), isToday: index === todayIndex, ownServings: servings[index], note: ownNote ? "" : notes[index], escapeHtml });
  }).join("");
  const windowDates = getWeekDates(), windowHeading = weekHeading(windowDates, state.weekOffset);
  let windowsHtml = "";
  if (weekClearConfirmation) windowsHtml = renderWeekClear({ heading: windowHeading, escapeHtml });
  else if (state.plannerActionsOpen) windowsHtml = renderWeekMenu({ heading: windowHeading, emptyDays: emptyWeekDays().map(index=>dayNames[index]), replaceCount: eligibleWeekDays().length, escapeHtml });
  else if (state.plannerDaySheet?.open) {
    const index = state.plannerDaySheet.dayIndex, mode = currentDayModes()[index];
    windowsHtml = renderDaySheet({ day: dayNames[index], dateLabel: windowDates[index].toLocaleDateString("nb-NO", {day:"numeric",month:"long"}), index,
      locked: Boolean(currentLocks()[index]), home: dayPlansMeal(mode), meal: getMeal(currentPlan()[index]),
      planLabel: mode === "_note" ? String(currentDayNotes()[index] || "").trim() || "Eget notat" : planModeLabel(mode),
      dayMode: mode, dayType: currentDayTypes()[index], dayNote: currentDayNotes()[index], servings: servingsForDay(getWeekKey(),index), ownServings: currentServings()[index],
      standard: state.family.familySize, modes: [...planModeEntries(), ["_note", planModeOption("_note")]], types: suitabilityEntries(), escapeHtml });
  }
  return renderWeekView({ heading, offset: state.weekOffset, emptyCount: emptyWeekDays(rootKey).length, rowsHtml, windowsHtml, escapeHtml });
}

function advisorSummary() {
  const plan = currentPlan();
  const lockedPlan = currentLocks();
  const dayTypes = currentDayTypes();
  const plannedMeals = plannedMealEntries(plan).map(([, id]) => getMeal(id)).filter(Boolean);
  const kidCount = plannedMeals.filter((meal) => meal.kidFriendly).length;
  const quickDays = state.family.quickDays.join(", ");
  const lockedCount = Object.values(lockedPlan).filter(Boolean).length;
  const activeTypes = [...new Set(Object.values(dayTypes).map((type) => getSuitabilityLabels()[type] || type))].join(", ");
  const categoryStatus = categoryPreferenceStatus(plan);
  return `Rådgiveren fyller bare åpne dager og lar låste dager stå. Den matcher dagstype mot "Passer til", prioriterer raske middager på ${quickDays}, unngår duplikater i samme uke og varierer med alle tidligere og framtidige planer. Dagstyper denne uken: ${activeTypes}. Barnevennlige middager: ${kidCount}/${state.family.kidFriendlyPerWeek}. Låste dager: ${lockedCount}.${categoryStatus ? ` Middagspreferanser: ${categoryStatus}.` : ""}`;
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
  const grouped = state.filters.sort === "category" && !mealListFiltersActive();
  return renderMealsView({
    meals,
    filters: state.filters,
    showNeedsRecipe: state.meals.some(mealNeedsRecipe),
    grouped,
    categoryEntries: categoryEntries(),
    categoryLabels: getCategoryLabels(),
    suitabilityEntries: suitabilityEntries(),
    suitabilityLabels: getSuitabilityLabels(),
    editorHtml: state.editingMealId ? renderMealEditor() : "",
    addIconHtml: icon("add"),
    escapeHtml,
  });
}

function renderMealListOnly() {
  const meals = filteredMeals();
  const grouped = state.filters.sort === "category" && !mealListFiltersActive();
  return !meals.length ? renderMealEmptyView() : grouped ? renderGroupedMeals(meals) : meals.map(renderMealCard).join("");
}

function mealListFiltersActive() { return Boolean(state.filters.query.trim()) || mealFiltersActive(state.filters); }

function filteredMeals() {
  const query = state.filters.query.trim().toLowerCase();
  return sortedMeals().filter(meal => mealMatchesPickerFilters(meal, state.filters)
    && (!query || [meal.title, meal.description, ...(meal.keyIngredients || []).map(ingredientBaseName)].join(" ").toLowerCase().includes(query)));
}

function bindMealListControls(root = app) {
  root.querySelectorAll("[data-reset-meal-filters]").forEach(button => button.addEventListener("click", () => {
    state.filters = { ...defaultState.filters, sort: state.filters.sort }; render();
  }));
  root.querySelectorAll("[data-meal-sort]").forEach(button => button.addEventListener("click", () => {
    state.filters = { ...state.filters, sort: button.dataset.mealSort }; saveState(); render();
  }));
}

function refreshMealResults() {
  const clear = app.querySelector("[data-clear-meal-search]");
  if (clear) clear.style.display = state.filters.query ? "" : "none";
  const list = app.querySelector("[data-meal-list]");
  if (list) { list.innerHTML = renderMealListOnly(); bindMealResultActions(list); bindMealListControls(list); }
  const results = app.querySelector("[data-meal-results]");
  if (results) { results.innerHTML = renderMealResultsView({count:filteredMeals().length,filters:state.filters}); bindMealListControls(results); }
}

function renderGroupedMeals(meals) {
  return renderGroupedMealsView({
    meals,
    categoryLabels: getCategoryLabels(),
    suitabilityLabels: getSuitabilityLabels(),
    escapeHtml,
  });
}

function renderMealCard(meal) {
  return renderMealCardView({
    meal,
    categoryLabels: getCategoryLabels(),
    suitabilityLabels: getSuitabilityLabels(),
    escapeHtml,
  });
}

function renderMealDetail() {
  const meal = getMeal(state.selectedMealId);
  if (!meal) return "";
  const steps = meal.steps?.length ? meal.steps : ["Ingen fremgangsmåte er lagt inn ennå."];
  const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
  const wakeSupported = "wakeLock" in navigator;
  const leftoversText = leftoversLabel(meal.leftovers);
  const baseServings = mealBaseServings(meal);
  const targetServings = recipeTargetServings();
  const { text: servingText, scope: servingScope } = recipeServingCopy(meal, targetServings);

  return renderMealDetailView({
    meal,
    steps,
    ingredients,
    wakeSupported,
    keepScreenAwake: state.keepScreenAwake,
    leftoversText,
    servingText,
    servingScope,
    baseServings,
    targetServings,
    shoppingIconHtml: icon("shopping"),
    scaleAmount,
    escapeHtml,
  });
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
    excludeFromSuggestions: false,
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
  ensureMealEditorSession(baseMeal);
  const meal = getDraftMeal(baseMeal);
  const ingredients = getDraftIngredients(meal);
  const steps = getDraftSteps(meal);
  return renderMealEditorView({
    isNew,
    meal,
    baseServings: mealBaseServings(meal),
    ingredients,
    steps,
    categoryEntries: categoryEntries(),
    suitabilityEntries: suitabilityEntries(),
    prepTimeEntries: prepTimeEntries(),
    unitOptions: getUnitOptions(),
    recipeImport: recipeImportState,
    rowMenu: editorRowMenu,
    discardOpen: editorDiscardOpen,
    aiKeyStatus: aiKeyUi.status,
    aiKeyMessage: aiKeyUi.message,
    isAdmin: accessState.role === "admin",
    importAvailable: accessState.kind === "ready" && !accessState.offline && navigator.onLine !== false,
    escapeHtml,
  });
}

function ensureMealEditorSession(base) {
  if (mealEditorSession?.id === state.editingMealId) return;
  const items=normalizeIngredients(base.ingredients,base.keyIngredients);
  mealEditorSession={id:state.editingMealId,signature:mealEditorFingerprint(base,items.length?ingredientsToEditorRows(items):[{name:"",amount:"",unit:""}],base.steps?.length?base.steps:[""]),source:base.recipeUrl||""};
  editorDiscardOpen=false;
}

function hasUnsavedMealEditorChanges() {
  const base=state.editingMealId==="new"?emptyMeal():getMeal(state.editingMealId); if(!base)return false;
  ensureMealEditorSession(base);
  const dirty=mealEditorFingerprint(getDraftMeal(base),getDraftIngredients(base),getDraftSteps(base))!==mealEditorSession.signature;
  return dirty || String(recipeImportState.url||"").trim()!==mealEditorSession.source.trim() || Boolean(String(recipeImportState.text||"").trim())
    || Boolean(recipeImportState.images?.length || recipeImportState.pending || recipeImportState.busy || recipeImportState.preparing);
}

function closeMealEditor() {
  editorDiscardOpen=false; mealEditorSession=null;
  const target = mealEditorReturn || { activeView: "meals", selectedMealId: null, selectedRecipeContext: null };
  mealEditorReturn = null;
  navigate({...target,editingMealId:null,draftMeal:null,draftIngredients:null,draftSteps:null}, "back");
}

function openMealEditor(mealId) {
  mealEditorReturn = state.activeView === "recipe"
    ? { activeView: "recipe", selectedMealId: state.selectedMealId, selectedRecipeContext: state.selectedRecipeContext, previousView: state.previousView }
    : { activeView: "meals", selectedMealId: null, selectedRecipeContext: null, previousView: "meals" };
  navigate({ activeView: "meals", previousView: "meals", editingMealId: mealId, draftMeal: null, draftIngredients: null,
    draftSteps: null, selectedMealId: null, selectedRecipeContext: null, keepScreenAwake: false });
}

function requestCancelMealEditor() {
  syncMealEditorDraftFromDom(); syncRecipeImportFields();
  if (!hasUnsavedMealEditorChanges()) { closeMealEditor(); return true; }
  editorRowMenu=null; editorDiscardOpen=true; render();
  app.querySelector("[data-editor-continue]")?.focus?.({preventScroll:true});
  return false;
}

function continueMealEditing() {
  syncMealEditorDraftFromDom(); syncRecipeImportFields(); editorDiscardOpen=false; render(); uiHistory.sync();
  app.querySelector("[data-cancel-edit]")?.focus?.({preventScroll:true});
}

function getDraftMeal(meal) {
  return state.draftMeal ? { ...meal, ...state.draftMeal } : meal;
}

function getDraftIngredients(meal) {
  if (Array.isArray(state.draftIngredients)) return state.draftIngredients;
  const ingredients = normalizeIngredients(meal.ingredients, meal.keyIngredients);
  return ingredients.length ? ingredientsToEditorRows(ingredients) : [{ amount: "", unit: "", name: "" }];
}

function getDraftSteps(meal) {
  if (Array.isArray(state.draftSteps)) return state.draftSteps;
  return meal.steps?.length ? meal.steps : [""];
}

function renderIngredientEditorRow(item, index) {
  return renderIngredientEditorRowView({ item, index, unitOptions: getUnitOptions(), escapeHtml });
}

function renderStepEditorRow(step, index) {
  return renderStepEditorRowView({ step, index, escapeHtml });
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
    categories,
    suitability: formData.getAll("suitability"),
    kidFriendly: formData.has("kidFriendly"),
    favorite: formData.has("favorite"),
    excludeFromSuggestions: formData.has("excludeFromSuggestions"),
    leftovers: String(formData.get("leftovers") || "none"),
    prepTime: String(formData.get("prepTime") || ""),
    minDaysBetween: Math.max(1, Number(formData.get("minDaysBetween")) || 14),
    ingredients,
    keyIngredients: [...new Set(ingredients.map((item) => ingredientBaseName(item.name).toLowerCase()))],
    steps: collectStepRows(),
  };

  const meals = isNew
    ? [...state.meals, meal]
    : state.meals.map((item) => item.id === meal.id ? meal : item);
  const origin = mealEditorReturn;
  mealEditorReturn = null;
  navigate({ meals, activeView: "recipe", previousView: origin?.activeView === "recipe" ? origin.previousView : "meals",
    selectedRecipeContext: origin?.activeView === "recipe" ? origin.selectedRecipeContext : null,
    editingMealId: null, draftMeal: null, draftIngredients: null, draftSteps: null, selectedMealId: meal.id });
}

function makeMealId(title) {
  const base = makeSlug(title, "middag");
  let id = base;
  let count = 2;
  while (state.meals.some((meal) => meal.id === id)) {
    id = `${base}-${count}`;
    count += 1;
  }
  return id;
}

function collectIngredientRows() {
  return editorRowsToIngredients(readIngredientEditorRows());
}

function readIngredientEditorRows() {
  return [...app.querySelectorAll("[data-ingredient-row]")]
    .map((row) => row.dataset?.ingredientHeading === "true"
      ? { type: "heading", title: row.querySelector('[data-ingredient-field="group"]')?.value || "" }
      : ({
      amount: row.querySelector('[data-ingredient-field="amount"]')?.value.trim() || "",
      unit: row.querySelector('[data-ingredient-field="unit"]')?.value.trim() || "",
      name: row.querySelector('[data-ingredient-field="name"]')?.value.trim() || "",
    }));
}

function syncDraftIngredientsFromDom() {
  state.draftIngredients = readIngredientEditorRows();
}

function changeIngredientEditorRows(action, index = -1, delta = 0) {
  syncMealEditorDraftFromDom();
  editorRowMenu = null;
  let rows = state.draftIngredients || [];
  let focusIndex = null, focusField = "menu";
  if (action === "heading") rows = [...rows, { type: "heading", title: "" }];
  else if (action === "move") { focusIndex = Math.max(0, Math.min(rows.length - 1, index + delta)); rows = moveIngredientEditorRow(rows, index, delta); }
  else if (action === "group") {
    const group = ingredientEditorGroups(rows).find(group => group.headingIndex === delta);
    if (group && ingredientEditorGroupIndex(rows, index) !== delta) {
      focusIndex = group.end - (index < group.end ? 1 : 0); rows = moveIngredientToGroup(rows, index, delta);
    }
  } else if (action === "add-group") {
    focusIndex = ingredientEditorGroups(rows).find(group => group.headingIndex === index)?.end ?? null;
    rows = insertIngredientInGroup(rows, index); focusField = "amount";
  }
  else if (action === "remove") rows = rows.filter((_, rowIndex) => rowIndex !== index);
  if (!rows.length) rows = [{ amount: "", unit: "", name: "" }];
  navigate({ draftMeal: state.draftMeal, draftIngredients: rows, draftSteps: state.draftSteps });
  if (focusIndex !== null) focusEditorRow("ingredient", focusIndex, focusField);
}

function focusEditorRow(kind, index, field = "menu") {
  const selector = field === "amount" ? `[data-ingredient-row="${index}"] [data-ingredient-field="amount"]`
    : kind === "ingredient" && state.draftIngredients?.[index]?.type === "heading" ? `[data-move-ingredient-heading="${index}"]`
      : `[data-editor-row-menu="${kind}"][data-row-index="${index}"]`;
  const element = app.querySelector(selector);
  element?.focus?.(); element?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
}

function openEditorRowMenu(kind, index) {
  if (!state.editingMealId) return;
  syncMealEditorDraftFromDom();
  const rows = kind === "ingredient" ? state.draftIngredients : state.draftSteps;
  if (!rows?.[index] && rows?.[index] !== "") return;
  editorRowMenu = { editorId: state.editingMealId, kind, index };
  render(); uiHistory.sync();
  app.querySelector("[data-editor-menu-action]:not([disabled])")?.focus?.();
}

function closeEditorRowMenu() {
  if (!editorRowMenu) return;
  const { kind, index } = editorRowMenu;
  syncMealEditorDraftFromDom(); editorRowMenu = null; render(); uiHistory.sync(); focusEditorRow(kind, index);
}

function changeStepEditorRows(action, index, delta = 0) {
  syncMealEditorDraftFromDom(); editorRowMenu = null;
  const steps = state.draftSteps || [""];
  const next = action === "remove" ? removeStepEditorRow(steps, index) : moveStepEditorRow(steps, index, delta);
  navigate({ draftMeal: state.draftMeal, draftIngredients: state.draftIngredients, draftSteps: next });
  focusEditorRow("step", action === "remove" ? Math.min(index, next.length - 1) : Math.max(0, Math.min(next.length - 1, index + delta)));
}

function chooseEditorRowAction(action, groupIndex) {
  if (!editorRowMenu || editorRowMenu.editorId !== state.editingMealId) return;
  const { kind, index } = editorRowMenu;
  const delta = action === "up" ? -1 : action === "down" ? 1 : Number(groupIndex);
  if (kind === "ingredient") changeIngredientEditorRows(action === "up" || action === "down" ? "move" : action, index, delta);
  else changeStepEditorRows(action === "remove" ? "remove" : "move", index, delta);
}

document.addEventListener("keydown", event => {
  if (editorDiscardOpen) {
    if (event.key === "Escape") {event.preventDefault();continueMealEditing();return;}
    if (event.key === "Tab") {const first=app.querySelector("[data-editor-continue]"),last=app.querySelector("[data-editor-discard]");if(first&&last&&(event.shiftKey?document.activeElement===first:document.activeElement===last)){event.preventDefault();(event.shiftKey?last:first).focus({preventScroll:true});}}
    return;
  }
  if (!editorRowMenu) return;
  if (event.key === "Escape") { event.preventDefault(); closeEditorRowMenu(); return; }
  if (event.key === "Tab") {
    const buttons = [...app.querySelectorAll("[data-editor-menu] button:not([disabled])")];
    const first = buttons[0], last = buttons.at(-1);
    if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  }
});

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
    excludeFromSuggestions: formData.has("excludeFromSuggestions"),
    leftovers: String(formData.get("leftovers") || "none"),
    prepTime: String(formData.get("prepTime") || ""),
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
  if (!app.querySelector("[data-meal-form]")) return;
  syncDraftMealFromDom();
  syncDraftIngredientsFromDom();
  syncDraftStepsFromDom();
}

function resetRecipeImport() {
  recipeImportSerial += 1;
  recipeImportState = { editorId: state.editingMealId, busy: false,
    preparing: false, mode: "", tab: "url", expanded: state.editingMealId === "new" || mealCanImportFromLink(getMeal(state.editingMealId)), images: [], showImages: false,
    url: getMeal(state.editingMealId)?.recipeUrl || "", text: "", showText: false, message: "", warnings: [], pending: null, remainingToday: null };
}

function syncRecipeImportFields() {
  const url = app.querySelector("[data-import-url]");
  const text = app.querySelector("[data-import-text]");
  if (url) recipeImportState.url = url.value;
  if (text) recipeImportState.text = text.value;
}

async function addRecipeImages(files) {
  if (!state.editingMealId || state.activeView !== "meals" || recipeImportState.busy || recipeImportState.preparing) return;
  if (recipeImportState.editorId !== state.editingMealId) resetRecipeImport();
  const selected = Array.from(files || []);
  if (!selected.length) return;
  syncMealEditorDraftFromDom(); syncRecipeImportFields();
  recipeImportState.showImages = true; recipeImportState.showText = false; recipeImportState.tab = "image"; recipeImportState.expanded = true;
  if (recipeImportState.images.length + selected.length > 4) {
    recipeImportState.message = IMAGE_LIMIT_MESSAGE; render(); return;
  }
  const editorId = state.editingMealId, serial = recipeImportSerial, generation = syncGeneration;
  const valid = () => serial === recipeImportSerial && generation === syncGeneration && state.editingMealId === editorId;
  recipeImportState.preparing = true; recipeImportState.message = ""; render();
  try {
    const prepared = [];
    for (const file of selected) {
      prepared.push(await prepareRecipeImage(file));
      if (!valid()) return;
    }
    recipeImportState.images.push(...prepared);
  } catch { if (valid()) recipeImportState.message = IMAGE_ERROR_MESSAGE; }
  finally { if (valid()) {
    syncMealEditorDraftFromDom(); syncRecipeImportFields();
    recipeImportState.preparing = false; render();
  } }
}

function removeRecipeImage(index) {
  if (recipeImportState.busy || recipeImportState.preparing) return;
  syncMealEditorDraftFromDom(); syncRecipeImportFields();
  recipeImportState.images.splice(index, 1); render();
}

function pasteRecipeImages(event) {
  if (!state.editingMealId || state.activeView !== "meals" || !app.querySelector(".recipe-import-panel")
    || recipeImportState.busy || recipeImportState.preparing) return;
  const files = Array.from(event.clipboardData?.items || [])
    .filter(item => item.kind === "file" && item.type?.startsWith("image/"))
    .map(item => item.getAsFile()).filter(Boolean);
  if (!files.length) return;
  event.preventDefault();
  return addRecipeImages(files);
}

// Pending imports live only in recipeImportState, never in persisted/synced state.
function applyRecipeImportToEditor(recipe, options = {}) {
  const isNew = state.editingMealId === "new";
  const base = isNew ? emptyMeal() : getMeal(state.editingMealId);
  if (!base) return null;
  const editorRows = getDraftIngredients(base);
  const draft = { ...getDraftMeal(base), ingredients: editorRowsToIngredients(editorRows), steps: getDraftSteps(base) };
  const hasIngredients = draft.ingredients.some(item => item.name.trim());
  const hasSteps = draft.steps.some(step => step.trim());
  const ingredients = recipe.ingredients?.length || 0, steps = recipe.steps?.length || 0;
  const next = applyImportedRecipe(draft, recipe, { isNew, ...options });
  const filledIngredients = ingredients && (!hasIngredients || options.replaceIngredients) ? ingredients : 0;
  const filledSteps = steps && (!hasSteps || options.replaceSteps) ? steps : 0;
  state.draftMeal = next;
  state.draftIngredients = filledIngredients ? ingredientsToEditorRows(next.ingredients) : editorRows;
  state.draftSteps = next.steps;
  return { filledIngredients, filledSteps, changed: JSON.stringify(next) !== JSON.stringify(draft),
    conflictIngredients: ingredients > 0 && hasIngredients, conflictSteps: steps > 0 && hasSteps };
}

function recipeImportParts(ingredients, steps) {
  return [ingredients > 0 ? `${ingredients} ingredienser` : "", steps > 0 ? `${steps} steg` : ""].filter(Boolean).join(" og ");
}

function resolveRecipeImport(replace) {
  const pending = recipeImportState.pending;
  if (!pending) return;
  if (!pending.valid()) { resetRecipeImport(); render(); return; }
  // Read current form values, including edits made while the choice was visible.
  syncMealEditorDraftFromDom();
  syncRecipeImportFields();
  recipeImportState.pending = null;
  if (replace) {
    const applied = applyRecipeImportToEditor({ ...pending.recipe,
      ingredients: pending.conflictIngredients ? pending.recipe.ingredients : [],
      steps: pending.conflictSteps ? pending.recipe.steps : [],
    }, {
      isNew: false, replaceIngredients: pending.conflictIngredients, replaceSteps: pending.conflictSteps,
    });
    const ingredients = pending.conflictIngredients ? applied?.filledIngredients || 0 : 0;
    const steps = pending.conflictSteps ? applied?.filledSteps || 0 : 0;
    recipeImportState.message = ingredients || steps
      ? `Erstattet: ${recipeImportParts(ingredients, steps)}. Se over før du lagrer.` : "Ingenting ble endret.";
  } else recipeImportState.message = "Ingenting ble erstattet.";
  render();
}

async function startRecipeImport(mode = "url") {
  if (recipeImportState.busy || recipeImportState.preparing) return;
  if (mode === "url" && state.editingMealId && socialRecipeSource(app.querySelector("[data-import-url]")?.value ?? recipeImportState.url)) {
    syncMealEditorDraftFromDom(); syncRecipeImportFields(); fillRecipeSourceFromImport();
    recipeImportState.expanded=true; recipeImportState.tab="url"; render(); return;
  }
  if (!state.editingMealId || recipeImportState.busy || recipeImportState.preparing || accessState.kind !== "ready" || accessState.offline
    || navigator.onLine === false || !firebaseConnection) return;
  if (!aiKeyUi.status?.configured || aiKeyUi.status.status === "invalid") return;
  if (recipeImportState.editorId !== state.editingMealId) resetRecipeImport();
  syncMealEditorDraftFromDom();
  syncRecipeImportFields();
  recipeImportState.pending = null; recipeImportState.expanded = true; recipeImportState.tab = mode;
  const url = normalizedRecipeUrl(recipeImportState.url);
  if ((mode === "url" && !url) || (mode === "text" && recipeImportState.text.trim().length < 20)
    || (mode === "image" && !recipeImportState.images.length)) {
    recipeImportState.message = mode === "url" ? "Lim inn en lenke først."
      : mode === "image" ? "Velg minst ett bilde først." : "Lim inn oppskriftsteksten først.";
    recipeImportState.warnings = [];
    render();
    return;
  }
  const editorId = state.editingMealId, generation = syncGeneration, uid = accessState.user?.uid;
  const serial = ++recipeImportSerial;
  const valid = () => serial === recipeImportSerial && generation === syncGeneration && accessState.kind === "ready"
    && accessState.user?.uid === uid && state.editingMealId === editorId && state.activeView === "meals";
  recipeImportState.busy = true; recipeImportState.mode = mode; recipeImportState.message = ""; recipeImportState.warnings = []; recipeImportState.remainingToday = null;
  render();
  const input = { mode, categories: categoryEntries().map(([key, label]) => ({ key, label })), units: getUnitOptions(),
    ...(mode === "url" ? { url } : { ...(mode === "image" ? { images: recipeImportState.images } : { text: recipeImportState.text }),
      ...(url ? { sourceUrl: url } : {}) }) };
  try {
    if (mode === "image") {
      try { input.images = await recipeImagesForSend(input.images); }
      catch { if (valid()) recipeImportState.message = IMAGE_ERROR_MESSAGE; return; }
      if (!valid()) return;
    }
    if (!recipeImporter) recipeImporter = createRecipeImporter({ firebaseApp: firebaseConnection.firebaseApp, sdkVersion: FIREBASE_SDK_VERSION });
    const result = await recipeImporter(input);
    if (!valid()) return;
    // The form stays editable while waiting. Capture the most recent input.
    syncMealEditorDraftFromDom();
    if (!result.ok) {
      if (result.code === "NEEDS_TEXT") {
        recipeImportState.showText = true; recipeImportState.tab = "text";
        recipeImportState.message = "Instagram og Facebook kan ikke hentes automatisk. Lim inn bildeteksten, eller ta et skjermbilde og bruk Importer fra bilde.";
        if (!state.draftMeal?.recipeUrl) state.draftMeal = { ...(state.draftMeal || {}), recipeUrl: url };
      } else recipeImportState.message = result.message || "Kunne ikke importere oppskriften.";
      if (result.code === "AI_NOT_CONFIGURED") await loadAiKeyStatus();
      return;
    }
    const importedIngredients = result.recipe.ingredients?.length || 0;
    recipeImportState.remainingToday = Number.isInteger(result.remainingToday) && result.remainingToday >= 0 ? result.remainingToday : null;
    recipeImportState.images = [];
    const importedSteps = result.recipe.steps?.length || 0;
    const source = state.draftMeal?.recipeUrl || result.recipe.recipeUrl || url;
    const imported = mode === "url" ? { ...result.recipe, recipeUrl: source } : result.recipe;
    const applied = applyRecipeImportToEditor(imported);
    if (!applied) return;
    if (applied.conflictIngredients || applied.conflictSteps) {
      recipeImportState.pending = { recipe: imported, valid,
        conflictIngredients: applied.conflictIngredients, conflictSteps: applied.conflictSteps };
    }
    let host = mode === "image" ? "bilde" : "innlimt tekst";
    try { if (result.recipe.recipeUrl) host = new URL(result.recipe.recipeUrl).hostname; } catch {}
    recipeImportState.message = applied.filledIngredients || applied.filledSteps
      ? `Importert fra ${host}: ${recipeImportParts(applied.filledIngredients, applied.filledSteps)}. Se over før du lagrer.`
      : applied.changed ? `Importert fra ${host}. Se over før du lagrer.` : recipeImportState.pending ? "" : "Ingenting ble endret.";
    recipeImportState.warnings = [...(result.warnings || [])];
    if (!importedIngredients || !importedSteps) recipeImportState.warnings.push("Lim inn teksten for det som mangler, og trykk Tolk tekst.");
  } catch {
    if (valid()) recipeImportState.message = "Kunne ikke importere oppskriften. Prøv igjen.";
  } finally {
    if (valid()) {
      recipeImportState.busy = false; render();
      if (recipeImportState.pending) app.querySelector("[data-import-choice]")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }
  }
}

function fillRecipeSourceFromImport() {
  const base=state.editingMealId==="new"?emptyMeal():getMeal(state.editingMealId);if(!base)return;
  const draft=getDraftMeal(base),url=String(recipeImportState.url||"").trim();
  if (!draft.recipeUrl && url) {
    state.draftMeal={...draft,recipeUrl:url};
    const source=app.querySelector('[name="recipeUrl"]'); if(source)source.value=url;
  }
}

function switchRecipeImportMode(mode) {
  if(recipeImportState.busy || recipeImportState.preparing || !["url","text","image"].includes(mode))return;
  syncMealEditorDraftFromDom();syncRecipeImportFields();
  recipeImportState.expanded=true;recipeImportState.tab=mode;recipeImportState.showText=mode==="text";recipeImportState.showImages=mode==="image";
  render();
}

function bindImportModes(root=app) {
  root.querySelectorAll("[data-import-mode]").forEach(button=>button.addEventListener("click",()=>switchRecipeImportMode(button.dataset.importMode)));
}

function refreshRecipeImportControls() {
  const social=socialRecipeSource(recipeImportState.url);
  if(social)fillRecipeSourceFromImport();
  const base=state.editingMealId==="new"?emptyMeal():getMeal(state.editingMealId);
  const feedback=app.querySelector("[data-import-url-feedback]");
  if(feedback){feedback.innerHTML=renderSocialImportNotice(recipeImportState,getDraftMeal(base||emptyMeal()),escapeHtml);bindImportModes(feedback);}
  const usable=accessState.kind==="ready"&&!accessState.offline&&navigator.onLine!==false&&aiKeyUi.status?.configured&&aiKeyUi.status.status!=="invalid"&&!recipeImportState.busy&&!recipeImportState.preparing;
  const fetch=app.querySelector("[data-import-fetch]");if(fetch){fetch.hidden=Boolean(social);fetch.disabled=!usable||!recipeImportState.url.trim();}
  const text=app.querySelector("[data-import-interpret]");if(text)text.disabled=!usable||recipeImportState.text.trim().length<20;
}

function bindRecipeImportEvents() {
  const form = app.querySelector("[data-meal-form]");
  for (const event of ["input", "change"]) form?.addEventListener(event, syncMealEditorDraftFromDom);
  for (const selector of ["[data-import-url]", "[data-import-text]"]) app.querySelector(selector)?.addEventListener("input", ()=>{ syncMealEditorDraftFromDom(); syncRecipeImportFields(); refreshRecipeImportControls(); });
  bindImportModes();
  app.querySelector("[data-import-expand]")?.addEventListener("click",()=>{syncMealEditorDraftFromDom();syncRecipeImportFields();recipeImportState.expanded=true;recipeImportState.tab="url";if(!recipeImportState.url)recipeImportState.url=state.draftMeal?.recipeUrl||"";render();});
  app.querySelector("[data-import-collapse]")?.addEventListener("click",()=>{syncMealEditorDraftFromDom();syncRecipeImportFields();recipeImportState.expanded=false;render();});
  app.querySelectorAll("[data-import-pick-images]").forEach(button=>button.addEventListener("click",()=>app.querySelector("[data-import-image-files]")?.click?.()));
  app.querySelector("[data-import-show-text]")?.addEventListener("click", () => {
    switchRecipeImportMode("text");
  });
  app.querySelector("[data-import-show-images]")?.addEventListener("click", () => {
    switchRecipeImportMode("image");
  });
  app.querySelector("[data-import-image-files]")?.addEventListener("change", event => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    return addRecipeImages(files);
  });
  app.querySelectorAll("[data-import-remove-image]").forEach(button => button.addEventListener("click", () => removeRecipeImage(Number(button.dataset.importRemoveImage))));
  app.querySelector("[data-import-images]")?.addEventListener("click", () => startRecipeImport("image"));
  app.querySelector("[data-import-fetch]")?.addEventListener("click", () => startRecipeImport("url"));
  app.querySelector("[data-import-interpret]")?.addEventListener("click", () => startRecipeImport("text"));
  app.querySelector("[data-import-replace]")?.addEventListener("click", () => resolveRecipeImport(true));
  app.querySelector("[data-import-keep]")?.addEventListener("click", () => resolveRecipeImport(false));
}

function aiKeyAvailable() {
  return accessState.kind === "ready" && !accessState.offline && navigator.onLine !== false && !!firebaseConnection;
}

function getAiKeyClient() {
  if (!aiKeyClient) aiKeyClient = createAiKeyClient({ firebaseApp: firebaseConnection.firebaseApp, sdkVersion: FIREBASE_SDK_VERSION });
  return aiKeyClient;
}

async function loadAiKeyStatus() {
  if (!aiKeyAvailable() || aiKeyUi.busy) return;
  const serial = ++aiKeySerial, session = aiKeySession;
  aiKeyUi.loading = true;
  try {
    const result = await getAiKeyClient().status();
    if (serial !== aiKeySerial || session !== aiKeySession || !aiKeyAvailable()) return;
    if (result.ok) { aiKeyUi.status = sanitizeAiKeyStatus(result); aiKeyUi.message = result.message || ""; }
    else aiKeyUi.message = result.message;
  } catch {
    if (serial === aiKeySerial && session === aiKeySession) aiKeyUi.message = "Kunne ikke kontrollere OpenAI-tilkoblingen. Prøv igjen.";
  } finally {
    if (serial === aiKeySerial && session === aiKeySession) {
      aiKeyUi.loading = false;
      if (state.activeView === "meals" && state.editingMealId && app.querySelector("[data-meal-form]")) {
        syncMealEditorDraftFromDom(); syncRecipeImportFields();
      }
      render();
    }
  }
}

function syncAiKeyContext() {
  const session = `${syncGeneration}:${accessState.user?.uid || ""}:${accessState.kind}`;
  if (session !== aiKeySession) {
    resetRecipeImport();
    aiKeySession = session; aiKeySerial += 1; aiKeyClient = null; aiKeyTarget = ""; aiKeyEditorReturn = null;
    aiKeyUi = { status: null, loading: false, busy: false, busyAction: "", modelDraft: null, message: "" };
  }
  const target = accessState.kind !== "ready" ? "" : state.activeView === "meals" && state.editingMealId
    ? `editor:${state.editingMealId}` : ["setup", "ai-settings"].includes(state.activeView) ? state.activeView : "";
  if (target !== aiKeyTarget) {
    aiKeyTarget = target;
    if (target && aiKeyAvailable()) void loadAiKeyStatus();
  }
}

async function runAiKeyAction(action) {
  if (!aiKeyAvailable() || accessState.role !== "admin" || aiKeyUi.busy || aiKeyUi.loading) return;
  if (action === "model" && !aiKeyUi.status?.configured) return;
  if (action === "delete" && !window.confirm("Slette familiens OpenAI-nøkkel? Oppskriftsimport blir utilgjengelig til en ny nøkkel legges inn.")) return;
  const client = getAiKeyClient(), session = aiKeySession, serial = ++aiKeySerial;
  // Read and clear the password field before rendering or awaiting anything.
  if (action === "model") aiKeyUi.modelDraft = app.querySelector("[data-ai-model-input]")?.value || "";
  const pending = action === "model" ? client.saveModel(aiKeyUi.modelDraft)
    : action === "save" ? client.saveFromInput(app.querySelector("[data-ai-key-input]")) : client[action]();
  aiKeyUi.busy = true; aiKeyUi.busyAction = action; aiKeyUi.message = ""; render();
  try {
    const result = await pending;
    if (session !== aiKeySession || serial !== aiKeySerial || !aiKeyAvailable()) return;
    if (result.ok) {
      aiKeyUi.status = sanitizeAiKeyStatus(result);
      if (action === "model") aiKeyUi.modelDraft = null;
      aiKeyUi.message = result.message || (action === "model" ? `Modellen er byttet til ${aiKeyUi.status.model}.`
        : action === "delete" ? "Nøkkelen er slettet." : "OpenAI er tilkoblet.");
    } else aiKeyUi.message = result.message || "Kunne ikke kontrollere OpenAI-tilkoblingen.";
  } catch {
    if (session === aiKeySession && serial === aiKeySerial) aiKeyUi.message = "Kunne ikke kontakte serveren. Prøv igjen.";
  } finally {
    if (session === aiKeySession && serial === aiKeySerial) { aiKeyUi.busy = false; aiKeyUi.busyAction = ""; render(); }
  }
}

function bindAiKeyEvents() {
  app.querySelector("[data-ai-model-input]")?.addEventListener("input", event => { aiKeyUi.modelDraft = event.currentTarget.value; });
  app.querySelector("[data-ai-model-save]")?.addEventListener("click", () => runAiKeyAction("model"));
  for (const action of ["save", "test", "delete"]) app.querySelector(`[data-ai-key-${action}]`)?.addEventListener("click", () => runAiKeyAction(action));
  app.querySelector("[data-open-ai-settings]")?.addEventListener("click", () => {
    if (app.querySelector("[data-meal-form]")) syncMealEditorDraftFromDom();
    syncRecipeImportFields();
    aiKeyEditorReturn = state.editingMealId;
    navigate({ activeView: "ai-settings" });
  });
  app.querySelector("[data-ai-key-return-editor]")?.addEventListener("click", navigateBack);
}

function refreshAiKeyNetworkUi() {
  if (accessState.kind !== "ready" || !["setup", "ai-settings", "meals"].includes(state.activeView)) return;
  if (state.activeView === "meals" && !state.editingMealId) return;
  if (app.querySelector("[data-meal-form]")) { syncMealEditorDraftFromDom(); syncRecipeImportFields(); }
  render();
  if (aiKeyAvailable()) void loadAiKeyStatus();
}
window.addEventListener("online", refreshAiKeyNetworkUi);
window.addEventListener("offline", refreshAiKeyNetworkUi);

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
  const returnView = mealEditorReturn?.activeView === "recipe" ? mealEditorReturn.previousView : "meals";
  mealEditorReturn = null;
  navigate({ meals, plansByWeek, activeView: returnView || "meals", editingMealId: null, draftMeal: null, draftIngredients: null,
    draftSteps: null, selectedMealId: null, selectedRecipeContext: null }, "back");
}

function renderSetup() {
  return renderSetupView({
    aiStatusSummary: aiKeyStatusLabel(aiKeyUi.status),
    family: state.family,
    quickDays: state.family.quickDays,
    dayNames,
    counts: {
      preferenceGoals: activePreferenceGoalCount(),
      categories: categoryEntries().length,
      units: getUnitOptions().filter(Boolean).length,
      prepTimes: prepTimeEntries().length,
      suitability: suitabilityEntries().length,
      planModes: planModeEntries().length,
      ingredientMappings: Object.keys(state.metadata?.ingredientMappings || {}).length,
      storeCategories: STORE_CATEGORIES.length + (state.metadata?.storeCategories || []).filter((c) => !STORE_CATEGORIES.some((b) => b.key === c.key)).length,
    },
    appVersion: APP_VERSION,
    escapeHtml,
  });
}

function renderFamilySettings() {
  return renderFamilySettingsView({
    family: state.family,
    quickDays: state.family.quickDays,
    dayNames,
    escapeHtml,
  });
}

function renderAppSettings() {
  return renderAppSettingsView({
    appVersion: APP_VERSION,
    localStoreFailed,
    escapeHtml,
  });
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
    ${renderSubpageBar()}
    <section class="view-header">
      <div>
        <h2 class="view-title">Middagspreferanser</h2>
        <p class="view-lead">Definer hva dere helst vil ha i en vanlig uke. Tomme felt betyr ingen regel.</p>
      </div>

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
  return renderSetupPageView({
    title: "Kategorier",
    lead: "Kategorier brukes i middager, filter, kalender og planlegger.",
    bodyHtml: `
      ${renderMetadataRowsView({ entries: categoryEntries(), inputAttribute: "data-category-label", saveAttribute: "data-save-category", removeAttribute: "data-remove-category", editable: true, removeTitle: "Fjern kategori", escapeHtml })}
      ${renderMetadataAddFormView({ formAttribute: "data-category-form", inputName: "categoryName", placeholder: "Ny kategori, f.eks. Kylling", buttonLabel: "Legg til kategori", escapeHtml })}
    `,
    escapeHtml,
  });
}

function renderUnitsSetup() {
  return renderSetupPageView({
    title: "Enheter",
    lead: "Enhetene vises i ingrediensfeltet når du lager eller redigerer oppskrifter.",
    bodyHtml: `
      ${renderMetadataRowsView({ entries: getUnitOptions().filter(Boolean).map((unit) => [unit, unit]), removeAttribute: "data-remove-unit", removeTitle: "Fjern enhet", escapeHtml })}
      ${renderMetadataAddFormView({ formAttribute: "data-unit-form", inputName: "unitName", placeholder: "Ny enhet, f.eks. klype", buttonLabel: "Legg til enhet", escapeHtml })}
    `,
    escapeHtml,
  });
}

function renderPrepTimesSetup() {
  return renderSetupPageView({
    title: "Tilberedningstid",
    lead: "Disse valgene brukes i oppskriftene og senere av rådgiveren når travle dager skal planlegges.",
    bodyHtml: `
      ${renderMetadataRowsView({ entries: prepTimeEntries(), removeAttribute: "data-remove-prep-time", removeTitle: "Fjern tilberedningstid", escapeHtml })}
      ${renderMetadataAddFormView({ formAttribute: "data-prep-time-form", inputName: "prepTimeName", placeholder: "Ny tid, f.eks. Veldig rask under 15 min", buttonLabel: "Legg til tid", escapeHtml })}
    `,
    escapeHtml,
  });
}

function renderSuitabilitySetup() {
  return renderSetupPageView({
    title: "Passer til",
    lead: "Brukes til å merke om en middag passer til hverdag, helg, gjester eller andre situasjoner.",
    bodyHtml: `
      ${renderMetadataRowsView({ entries: suitabilityEntries(), removeAttribute: "data-remove-suitability", removeTitle: "Fjern passer til", escapeHtml })}
      ${renderMetadataAddFormView({ formAttribute: "data-suitability-form", inputName: "suitabilityName", placeholder: "Ny situasjon, f.eks. Turmat", buttonLabel: "Legg til", escapeHtml })}
    `,
    escapeHtml,
  });
}

function renderPlanModesSetup() {
  return `
    ${renderSubpageBar()}
    <section class="view-header">
      <div>
        <h2 class="view-title">Plan</h2>
        <p class="view-lead">Planvalg brukes i ukeplanen. Typen forteller appen om dagen skal ha oppskrift, være spise-borte-dag eller være rester.</p>
      </div>

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

function renderIngredientMappingsSetup() {
  const mappings = state.metadata?.ingredientMappings || {};
  const allCats = getStoreCategories();
  const builtInKeywords = new Map(STORE_CATEGORIES.flatMap((cat) => cat.keywords.map((kw) => [kw, cat.key])));
  const combined = new Map();
  builtInKeywords.forEach((catKey, ingredient) => {
    const override = mappings[ingredient];
    combined.set(ingredient, {
      ingredient,
      category: override === DISABLED_INGREDIENT_MAPPING ? "other" : (override || catKey),
      builtIn: true,
      disabled: override === DISABLED_INGREDIENT_MAPPING,
    });
  });
  Object.entries(mappings).forEach(([ingredient, catKey]) => {
    if (builtInKeywords.has(ingredient)) return;
    combined.set(ingredient, {
      ingredient,
      category: catKey,
      builtIn: false,
      disabled: catKey === DISABLED_INGREDIENT_MAPPING,
    });
  });
  const groupedRows = allCats.map((cat) => ({
    ...cat,
    rows: [...combined.values()]
      .filter((row) => (row.disabled ? cat.key === "other" : row.category === cat.key))
      .sort((a, b) => a.ingredient.localeCompare(b.ingredient, "no")),
  })).filter((cat) => cat.rows.length);

  return `
    ${renderSubpageBar()}
    <section class="view-header">
      <div>
        <h2 class="view-title">Vareoppslag</h2>
        <p class="view-lead">Koble matvarer til butikkategorier. Oppslagene brukes når handlelisten sorteres.</p>
      </div>

    </section>
    <section class="panel setup-section">
      <div class="mapping-groups">
        ${groupedRows.map((cat) => `
          <div class="mapping-group">
            <h3 class="mapping-group-title">${escapeHtml(cat.label)}</h3>
            <div class="metadata-list">
              ${cat.rows.map((row) => `
                <div class="metadata-row ingredient-mapping-row${row.disabled ? " muted-row" : ""}">
                  <span class="mapping-ingredient">${escapeHtml(row.ingredient)}${row.builtIn ? '<small>Innebygd</small>' : ""}</span>
                  <select class="select compact" data-mapping-cat="${escapeHtml(row.ingredient)}">
                    ${allCats.map((c) => `<option value="${c.key}"${row.category === c.key && !row.disabled ? " selected" : ""}>${escapeHtml(c.label)}</option>`).join("")}
                  </select>
                  <button class="button secondary compact" data-save-mapping="${escapeHtml(row.ingredient)}">Lagre</button>
                  <button class="icon-button" data-remove-mapping="${escapeHtml(row.ingredient)}" title="${row.builtIn ? "Deaktiver oppslag" : "Fjern oppslag"}">&times;</button>
                </div>`).join("")}
            </div>
          </div>
        `).join("")}
      </div>

      <form class="metadata-add ingredient-mapping-add" data-ingredient-mapping-form style="margin-top:14px">
        <input class="input" name="ingredientName" placeholder="Ingrediensnavn, f.eks. quinoa">
        <select class="select" name="ingredientCategory">
          ${allCats.map((c) => `<option value="${c.key}">${escapeHtml(c.label)}</option>`).join("")}
        </select>
        <button class="button secondary" type="submit">Legg til</button>
      </form>
    </section>
  `;
}

function renderStoreCategoriesSetup() {
  const categories = getStoreCategories();
  const rows = categories.map((cat, index) => `
    <div class="metadata-row editable store-category-row">
      <input class="input" data-store-cat-label="${escapeHtml(cat.key)}" value="${escapeHtml(cat.label)}" aria-label="Butikkategori ${escapeHtml(cat.label)}">
      <div class="store-category-actions">
        <button class="icon-button" type="button" data-move-store-cat="${escapeHtml(cat.key)}" data-direction="-1" aria-label="Flytt ${escapeHtml(cat.label)} opp" title="Flytt opp" ${index === 0 ? "disabled" : ""}>▲</button>
        <button class="icon-button" type="button" data-move-store-cat="${escapeHtml(cat.key)}" data-direction="1" aria-label="Flytt ${escapeHtml(cat.label)} ned" title="Flytt ned" ${index === categories.length - 1 ? "disabled" : ""}>▼</button>
        <button class="button secondary compact" type="button" data-save-store-cat="${escapeHtml(cat.key)}">Lagre</button>
        <button class="icon-button" type="button" data-remove-store-cat="${escapeHtml(cat.key)}" aria-label="Fjern ${escapeHtml(cat.label)}" title="Fjern kategori" ${cat.builtIn ? "disabled" : ""}>&times;</button>
      </div>
    </div>
  `).join("");
  return `
    ${renderSubpageBar()}
    <section class="view-header">
      <div>
        <h2 class="view-title">Butikkategorier</h2>
        <p class="view-lead">Legg kategoriene i den rekkefølgen dere går gjennom butikken. Rekkefølgen styrer handlelisten.</p>
      </div>

    </section>
    <section class="panel setup-section">
      <div class="metadata-list">${rows}</div>
      <form class="metadata-add" data-store-cat-form style="margin-top:14px">
        <input class="input" name="storeCatName" placeholder="Ny kategori, f.eks. Frysevarer">
        <button class="button secondary" type="submit">Legg til</button>
      </form>
    </section>
  `;
}

function moveStoreCategory(key, direction) {
  const keys = getStoreCategories().map((category) => category.key);
  const index = keys.indexOf(key);
  const target = index + direction;
  if (index < 0 || ![-1, 1].includes(direction) || target < 0 || target >= keys.length) return;
  [keys[index], keys[target]] = [keys[target], keys[index]];
  const scrollY = window.scrollY;
  setState({ metadata: { ...state.metadata, storeCategoryOrder: keys } });
  app.querySelector(`[data-move-store-cat="${CSS.escape(key)}"][data-direction="${direction}"]`)?.focus({ preventScroll: true });
  window.scrollTo(0, scrollY);
}

function downloadBackupWithLink(blob, name) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  try {
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

async function downloadBackup(button) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    const now = new Date();
    const backup = buildBackup({ data: syncPayload(), appVersion: APP_VERSION, familyId: FAMILY_ID, now });
    const name = backupFileName(now);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const file = typeof File === "function" ? new File([blob], name, { type: blob.type }) : null;
    let canShare = false;
    try {
      canShare = file && Boolean(window.matchMedia?.("(pointer: coarse)").matches)
        && typeof navigator.share === "function" && Boolean(navigator.canShare?.({ files: [file] }));
    } catch {
      // Some browsers expose canShare but reject file capability checks.
    }
    if (canShare) {
      try {
        await navigator.share({ files: [file] });
      } catch (error) {
        if (error?.name === "AbortError") return;
        downloadBackupWithLink(blob, name);
      }
    } else {
      downloadBackupWithLink(blob, name);
    }
    showToast("Sikkerhetskopi lagret.");
  } catch (error) {
    console.error("Kunne ikke lagre sikkerhetskopien.", error);
    showToast("Kunne ikke lagre sikkerhetskopien. Prøv igjen.");
  } finally {
    button.disabled = false;
  }
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
  if (key === "_note") return;
  const options = { ...getPlanModeOptions() };
  if (options[key]?.type === "home") return;
  delete options[key];
  const dayModesByWeek = Object.fromEntries(Object.entries(state.dayModesByWeek || {}).map(([weekKey, modes]) => [
    weekKey,
    Object.fromEntries(Object.entries(modes || {}).map(([dayIndex, mode]) => [dayIndex, mode === key ? "home" : mode])),
  ]));
  setState({ metadata: { ...state.metadata, planModeOptions: options }, dayModesByWeek });
}

async function refreshApp() {
  const refreshUrl = new URL("./index.html", window.location.href);
  refreshUrl.searchParams.set("updated", Date.now().toString());

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => {
      try {
        await registration.update();
      } catch (error) {
        // Continue with cache cleanup even if the browser blocks an update check.
      }
      await registration.unregister();
    }));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  window.location.replace(refreshUrl.toString());
}

function plannedMealEntries(plan, weekKey = getWeekKey()) {
  const modes = currentDayModes(weekKey);
  return Object.entries(plan || {}).filter(([index, id]) => id && dayPlansMeal(modes[index]));
}

function planHasCategory(plan, category, weekKey = getWeekKey()) {
  return plannedMealEntries(plan, weekKey).some(([, mealId]) => {
    const meal = getMeal(mealId);
    return meal && (meal.categories || []).includes(category);
  });
}

function categoryCountsForPlan(plan, excludeDayIndex = null) {
  const counts = {};
  plannedMealEntries(plan).forEach(([index, mealId]) => {
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
    const week = weekKeyOffset(currentWeekKey, -offset);
    if (planHasCategory(state.plansByWeek?.[week], category, week)) return false;
  }
  return true;
}

function categoryPreferenceScore(meal, plan, dayIndex) {
  const counts = categoryCountsForPlan(plan, dayIndex);
  const goalsByCategory = (meal.categories || []).reduce((goals, category) => ({
    ...goals,
    [category]: preferenceGoalFor(category),
  }), {});
  const dueCategories = (meal.categories || []).filter((category) => {
    const goal = goalsByCategory[category] || {};
    return categoryDueThisWeek(category, goal.minEveryWeeks, plan, dayIndex);
  });
  return scoreCategoryPreference(meal.categories || [], { counts, goalsByCategory, dueCategories });
}

function recentMealDistanceDays(mealId, targetDate) {
  const target = new Date(targetDate); target.setHours(12, 0, 0, 0);
  let closest = null;
  for (const [weekKey, plan] of Object.entries(state.plansByWeek || {})) {
    for (const [day, id] of plannedMealEntries(plan, weekKey)) {
      if (id !== mealId || !/^[0-6]$/.test(day)) continue;
      const plannedDate = dateForWeekDay(weekKey, Number(day));
      if (localDateKey(plannedDate) === localDateKey(targetDate)) continue;
      plannedDate.setHours(12, 0, 0, 0);
      const distance = daysBetweenDates(target, plannedDate);
      closest = closest === null ? distance : Math.min(closest, distance);
    }
  }
  return closest;
}

function recentCategoryCount(categories, lookbackWeeks = 2) {
  const currentWeekKey = getWeekKey();
  let count = 0;
  for (let offset = 1; offset <= lookbackWeeks; offset += 1) {
    const weekKey = weekKeyOffset(currentWeekKey, -offset);
    plannedMealEntries(state.plansByWeek?.[weekKey], weekKey).forEach(([, mealId]) => {
      const plannedMeal = getMeal(mealId);
      if (plannedMeal && (plannedMeal.categories || []).some((category) => categories.includes(category))) {
        count += 1;
      }
    });
  }
  return count;
}

function rotationScore(meal, dayIndex, daysSince = recentMealDistanceDays(meal.id, dateForWeekDay(getWeekKey(), dayIndex))) {
  const recentCategoryUses = recentCategoryCount(meal.categories || []);
  return scoreMealRecency(daysSince) + scoreRecentCategoryUse(recentCategoryUses);
}

function plannedTooClose(meal, dayIndex, planOverride) {
  const minDays = Math.max(1, Number(meal.minDaysBetween) || 1);
  const targetWeekKey = getWeekKey();
  const targetDate = dateForWeekDay(targetWeekKey, dayIndex);
  const allPlans = { ...(state.plansByWeek || {}), [targetWeekKey]: planOverride };
  return Object.entries(allPlans).some(([weekKey, plan]) => plannedMealEntries(plan, weekKey).some(([plannedDayIndex, mealId]) => {
    if (mealId !== meal.id) return false;
    if (weekKey === targetWeekKey && Number(plannedDayIndex) === dayIndex) return false;
    return daysBetweenDates(targetDate, dateForWeekDay(weekKey, plannedDayIndex)) < minDays;
  }));
}

function rankedSuggestions(dayIndex, planOverride = currentPlan(), excludeMealIds = []) {
  const plan = planOverride;
  const used = new Set(plannedMealEntries(plan).filter(([index]) => Number(index) !== dayIndex).map(([, mealId]) => mealId));
  excludeMealIds.filter(Boolean).forEach((mealId) => used.add(mealId));
  const day = dayNames[dayIndex];
  const wantsQuick = state.family.quickDays.includes(day);
  const dayType = currentDayTypes()[dayIndex] || "weekday";
  const candidates = state.meals
    .filter((meal) => !meal.excludeFromSuggestions)
    .filter((meal) => !used.has(meal.id))
    .filter((meal) => !plannedTooClose(meal, dayIndex, plan))
    .map((meal) => {
      const daysSince = recentMealDistanceDays(meal.id, dateForWeekDay(getWeekKey(), dayIndex));
      let score = scoreMealFit(meal, { wantsQuick, dayType, preferLeftovers: state.family.leftovers });
      score += categoryPreferenceScore(meal, plan, dayIndex);
      score += rotationScore(meal, dayIndex, daysSince);
      score += scoreVariation(getWeekKey(), dayIndex, meal.id);
      return { meal, score, daysSince };
    })
    .sort((a, b) => b.score - a.score);
  return candidates;
}

function pickSuggestion(dayIndex, planOverride = currentPlan(), excludeMealIds = []) {
  if (!dayPlansMeal(currentDayModes()[dayIndex])) return "";
  return rankedSuggestions(dayIndex, planOverride, excludeMealIds)[0]?.meal.id || "";
}

function updatePlanDay(dayIndex, mealId) {
  const week = getWeekKey();
  setState({ plansByWeek: { ...state.plansByWeek, [week]: { ...currentPlan(), [dayIndex]: mealId } },
    ...(mealId ? { dayModesByWeek: { ...state.dayModesByWeek, [week]: { ...currentDayModes(), [dayIndex]: "home" } } } : {}) });
}

function refreshPlanDay(dayIndex) {
  const plan = currentPlan();
  const currentMealId = plan[dayIndex] || "";
  const nextMealId = pickSuggestion(dayIndex, plan, [currentMealId]);
  if (nextMealId) updatePlanDay(dayIndex, nextMealId);
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

function updateDayServings(dayIndex, servings, weekKey = getWeekKey(), options) {
  const value = servings === null ? null : Math.max(1, Math.min(30, Number(servings) || 1));
  setState({ servingsByWeek: { ...state.servingsByWeek, [weekKey]: { ...emptyWeekServings(), ...state.servingsByWeek?.[weekKey],
    [dayIndex]: value === state.family.familySize ? null : value } } }, options);
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
  dayNames.forEach((_, index) => {
    if (!lockedPlan[index] && dayPlansMeal(dayModes[index])) {
      plan[index] = pickSuggestion(index, plan);
    }
  });
  setCurrentPlan(plan);
}

function addMealToNextFreeDay(mealId) {
  const plan = currentPlan();
  const freeIndex = dayNames.findIndex((_, index) => !plan[index] && dayPlansMeal(currentDayModes()[index]));
  if (freeIndex >= 0) updatePlanDay(freeIndex, mealId);
}

function bindMealResultActions(root = app) {
  root.querySelectorAll("[data-view-meal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      if (button.tagName === "BUTTON") event.stopPropagation();
      const dayIndex = button.dataset.recipeDay;
      openRecipeFromView(button.dataset.viewMeal, button.dataset.recipeDay === undefined ? null : Number(button.dataset.recipeDay));
    });
  });

  root.querySelectorAll("[data-edit-meal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMealEditor(button.dataset.editMeal);
    });
  });
}

function bindEvents() {
  app.querySelectorAll("[data-subpage-back]").forEach(button => button.addEventListener("click", navigateBack));
  app.querySelectorAll("[data-calendar-day]").forEach(button => button.addEventListener("click", () => openDaySheet(Number(button.dataset.calendarDay))));
  app.querySelectorAll("[data-editor-row-menu]").forEach(button => button.addEventListener("click", () => openEditorRowMenu(button.dataset.editorRowMenu, Number(button.dataset.rowIndex))));
  app.querySelectorAll("[data-editor-menu-action]").forEach(button => button.addEventListener("click", () => chooseEditorRowAction(button.dataset.editorMenuAction, button.dataset.groupIndex)));
  app.querySelectorAll("[data-editor-menu-close]").forEach(element => element.addEventListener("click", event => {
    if (event.target === event.currentTarget) closeEditorRowMenu();
  }));
  app.querySelectorAll("[data-add-ingredient-group]").forEach(button => button.addEventListener("click", () => changeIngredientEditorRows("add-group", Number(button.dataset.addIngredientGroup))));
  app.querySelectorAll("[data-recipe-servings]").forEach(button => button.addEventListener("click", () => changeRecipeServings(Number(button.dataset.recipeServings))));
  const servingsInput = app.querySelector("[data-recipe-servings-input]");
  servingsInput?.addEventListener("focus", () => servingsInput.select());
  servingsInput?.addEventListener("blur", commitRecipeServingsInput);
  servingsInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); commitRecipeServingsInput(); servingsInput.blur(); }
  });
  app.querySelectorAll("[data-use-standard-servings]").forEach(button => button.addEventListener("click", () => updateDayServings(Number(button.dataset.useStandardServings), null)));
  app.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = canonicalView(button.dataset.view), isTab = Boolean(button.matches?.(".nav-button"));
      if (isTab && pageScreenKey(state) === view) {
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        window.scrollTo?.({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
        return;
      }
      navigate({ activeView: view, selectedMealId: null, selectedRecipeContext: null, editingMealId: null, keepScreenAwake: false,
        plannerDaySheet:{open:false,dayIndex:null}, plannerActionsOpen:false, mealPicker:{open:false,dayIndex:null,query:""} }, isTab ? "tab" : "forward");
    });
  });

  // Open meal picker modal
  app.querySelectorAll("[data-open-meal-picker]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dayIndex = Number(btn.dataset.openMealPicker);
      openMealPicker(dayIndex, Boolean(btn.closest?.(".week-day-sheet")));
    });
  });

  // Close meal picker modal (backdrop or close btn)
  app.querySelectorAll("[data-close-meal-picker]").forEach((el) => {
    el.addEventListener("click", event => {
      if (event.target === el) closeMealPicker();
    });
  });

  app.querySelector("[data-picker-other-plans]")?.addEventListener("click",event=>{
    pickerOtherPlans=true; render();
    if (event?.detail === 0) app.querySelector("[data-picker-plan]")?.focus({preventScroll:true});
  });
  app.querySelector("[data-picker-plans-cancel]")?.addEventListener("click",event=>{
    pickerOtherPlans=false; render();
    if (event?.detail === 0) app.querySelector("[data-picker-other-plans]")?.focus({preventScroll:true});
  });
  app.querySelector("[data-picker-own-note]")?.addEventListener("click", openPickerNote);
  app.querySelector("[data-picker-note-back]")?.addEventListener("click", closePickerNote);
  app.querySelector("[data-picker-note-form]")?.addEventListener("submit", event => { event.preventDefault(); savePickerNote(); });
  const noteInput = app.querySelector("[data-picker-note-input]");
  noteInput?.addEventListener("input", () => {
    if (!pickerNote) return;
    pickerNote.text = noteInput.value.slice(0, 60);
    if (noteInput.value !== pickerNote.text) noteInput.value = pickerNote.text;
    const save = app.querySelector("[data-picker-note-save]"); if (save) save.disabled = !pickerNote.text.trim();
  });
  noteInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); savePickerNote(); }
  });
  app.querySelectorAll("[data-picker-filter]").forEach(button=>button.addEventListener("click",()=>togglePickerFilter(button.dataset.pickerFilter)));
  app.querySelectorAll("[data-picker-plan]").forEach(button=>button.addEventListener("click",()=>{
    const index=state.mealPicker.dayIndex; updateDayMode(index,button.dataset.pickerPlan); closeMealPicker();
  }));

  // Fast inline search filtering (prevent re-render focal loss)
  const searchInput = app.querySelector("[data-meal-picker-search]");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      state.mealPicker.query = query;

      const clearBtn = app.querySelector("[data-clear-search-input]");
      if (clearBtn) {
        clearBtn.style.display = query ? "block" : "none";
      }

      const listContainer = app.querySelector(".meal-picker-list");
      if (listContainer) {
        listContainer.innerHTML = renderMealPickerListItems(query, state.mealPicker.dayIndex);
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing && !pickerFiltersActive() && !mealsMatchingPickerQuery(searchInput.value).length) {
        event.preventDefault();
        state.mealPicker.query = searchInput.value;
        addQuickMealForPicker();
      }
    });

  }

  // Clear search query
  app.querySelectorAll("[data-clear-search-input]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = app.querySelector("[data-meal-picker-search]");
      if (input) {
        input.value = "";
        state.mealPicker.query = "";
        btn.style.display = "none";
        input.focus();
        const listContainer = app.querySelector(".meal-picker-list");
        if (listContainer) {
          listContainer.innerHTML = renderMealPickerListItems("", state.mealPicker.dayIndex);
        }
      }
    });
  });

  // Select meal inside picker via event delegation
  const pickerList = app.querySelector(".meal-picker-list");
  if (pickerList) {
    pickerList.addEventListener("click", (e) => {
      if (e.target.closest("[data-create-quick-meal]")) {
        addQuickMealForPicker();
        return;
      }
      if (e.target.closest("[data-clear-picker-filters]")) { pickerFilters = emptyPickerFilters(); render(); return; }
      const item = e.target.closest("[data-select-meal]");
      if (item) {
        const mealId = item.dataset.selectMeal;
        const dayIndex = state.mealPicker.dayIndex;
        if (dayIndex !== null) {
          const weekKey = getWeekKey();
          const plan = { ...currentPlan(), [dayIndex]: mealId };
          closeMealPicker({
            plansByWeek: { ...(state.plansByWeek || {}), [weekKey]: plan },
            dayModesByWeek: { ...state.dayModesByWeek, [weekKey]: { ...currentDayModes(), [dayIndex]: "home" } },
          });
        }
      }
    });
  }

  app.querySelectorAll("[data-day-type]").forEach((select) => {
    select.addEventListener("change", () => updateDayType(Number(select.dataset.dayType), select.value));
  });

  app.querySelectorAll("[data-day-mode]").forEach((select) => {
    select.addEventListener("change", () => updateDayMode(Number(select.dataset.dayMode), select.value));
  });

  app.querySelectorAll("[data-day-note]").forEach((input) => {
    input.addEventListener("change", () => updateDayNote(Number(input.dataset.dayNote), input.value));
    input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); updateDayNote(Number(input.dataset.dayNote), input.value); } });
  });

  app.querySelectorAll("[data-day-servings]").forEach((input) => {
    input.addEventListener("change", () => updateDayServings(Number(input.dataset.dayServings), input.value));
  });

  app.querySelectorAll("[data-random-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const dayIndex = Number(button.dataset.randomDay);
      if (!currentLocks()[dayIndex]) refreshPlanDay(dayIndex);
    });
  });

  app.querySelectorAll("[data-edit-planner-day]").forEach(button=>button.addEventListener("click",()=>openDaySheet(Number(button.dataset.editPlannerDay))));
  app.querySelectorAll("[data-close-planner-day]").forEach(element=>element.addEventListener("click",event=>{ if(event.target===element) navigate({plannerDaySheet:{open:false,dayIndex:null}}); }));
  app.querySelectorAll("[data-open-planner-actions]").forEach(button=>button.addEventListener("click",openWeekMenu));
  app.querySelectorAll("[data-close-planner-actions]").forEach(element=>element.addEventListener("click",event=>{ if(event.target===element) navigate({plannerActionsOpen:false}); }));
  app.querySelectorAll("[data-fill-week]").forEach(button=>button.addEventListener("click",()=>{ if(!emptyWeekDays().length) return; fillWeek(); if(state.plannerActionsOpen) navigate({plannerActionsOpen:false}); }));
  app.querySelectorAll("[data-replace-open-week]").forEach(button=>button.addEventListener("click",()=>{ if(!eligibleWeekDays().length) return; replaceOpenWeek(); navigate({plannerActionsOpen:false}); }));
  app.querySelectorAll("[data-clear-week]").forEach(button=>button.addEventListener("click",startWeekClear));
  app.querySelectorAll("[data-cancel-week-clear]").forEach(element=>element.addEventListener("click",event=>{ if(event.target===element) cancelWeekClear(); }));
  app.querySelectorAll("[data-confirm-week-clear]").forEach(button=>button.addEventListener("click",confirmWeekClear));
  app.querySelectorAll("[data-lock-day]").forEach(button=>button.addEventListener("click",()=>togglePlanLock(Number(button.dataset.lockDay))));
  app.querySelectorAll("[data-day-portions]").forEach(button=>button.addEventListener("click",()=>{
    const index=Number(button.dataset.dayPortions); updateDayServings(index, Math.max(1,Math.min(30,servingsForDay(getWeekKey(),index)+Number(button.dataset.delta))));
  }));
  app.querySelectorAll("[data-remove-day-meal]").forEach(button=>button.addEventListener("click",()=>updatePlanDay(Number(button.dataset.removeDayMeal),"")));
  app.querySelectorAll("[data-week]").forEach(button=>button.addEventListener("click",()=>changeWeek(Number(button.dataset.week))));
  bindWeekSwipe();

  app.querySelectorAll("[data-meal-filter]").forEach(button => button.addEventListener("click", () => {
    state.filters = toggleMealFilter(state.filters, button.dataset.mealFilter); render();
  }));
  bindMealListControls();
  const mealSearchInput = app.querySelector("[data-meal-search]");
  if (mealSearchInput) {
    mealSearchInput.addEventListener("input", () => {
      state.filters = { ...state.filters, query: mealSearchInput.value }; refreshMealResults();
    });
    mealSearchInput.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); mealSearchInput.blur(); }
    });
  }
  app.querySelectorAll("[data-clear-meal-search]").forEach(button => button.addEventListener("click", () => {
    state.filters = { ...state.filters, query: "" };
    if (mealSearchInput) { mealSearchInput.value = ""; mealSearchInput.focus({preventScroll:true}); }
    refreshMealResults();
  }));

  app.querySelectorAll("[data-add-next]").forEach((button) => {
    button.addEventListener("click", () => addMealToNextFreeDay(button.dataset.addNext));
  });

  app.querySelectorAll("[data-edit-meal]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openMealEditor(button.dataset.editMeal);
    });
  });

  app.querySelector("[data-editor-continue]")?.addEventListener("click",continueMealEditing);
  app.querySelector("[data-editor-discard]")?.addEventListener("click",closeMealEditor);
  app.querySelectorAll("[data-cancel-edit]").forEach((button) => {
    button.addEventListener("click", () => {requestCancelMealEditor();uiHistory.sync();});
  });

  app.querySelectorAll("[data-view-meal]").forEach((button) => {
    const dayIndex = button.dataset.recipeDay === undefined ? null : Number(button.dataset.recipeDay);
    button.addEventListener("click", (event) => {
      if (button.tagName === "BUTTON") event.stopPropagation();
      openRecipeFromView(button.dataset.viewMeal, button.dataset.recipeDay === undefined ? null : Number(button.dataset.recipeDay));
    });
  });

  app.querySelector("[data-close-meal]")?.addEventListener("click", navigateBack);

  app.querySelector("[data-toggle-wake]")?.addEventListener("click", () => {
    navigate({ keepScreenAwake: !state.keepScreenAwake });
  });

  app.querySelectorAll("[data-add-to-shopping]").forEach((button) => {
    button.addEventListener("click", () => {
      const meal = getMeal(button.dataset.addToShopping);
      if (!meal?.ingredients?.length) return;
      flushRecipeServings();
      const review = createMealShoppingReview(meal);
      if (review) navigate({ shoppingReview: review });
    });
  });

  app.querySelectorAll("[data-close-shopping-review]").forEach((el) => {
    el.addEventListener("click", (event) => {
      if (event.target === el) closeShoppingReview();
    });
  });

  app.querySelectorAll("[data-review-item]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const itemId = checkbox.dataset.reviewItem;
      const current = state.shoppingReview?.selectedItemIds || [];
      const selectedItemIds = checkbox.checked
        ? [...new Set([...current, itemId])]
        : current.filter((id) => id !== itemId);
      navigate({ shoppingReview: { ...state.shoppingReview, selectedItemIds } });
    });
  });

  app.querySelectorAll("[data-review-group-select]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = (state.shoppingReview?.groups || []).find((entry) => entry.id === button.dataset.reviewGroupSelect);
      if (!group) return;
      const selectedItemIds = [...new Set([...(state.shoppingReview?.selectedItemIds || []), ...group.items.map((item) => item.id)])];
      navigate({ shoppingReview: { ...state.shoppingReview, selectedItemIds } });
    });
  });

  app.querySelectorAll("[data-review-group-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      const group = (state.shoppingReview?.groups || []).find((entry) => entry.id === button.dataset.reviewGroupClear);
      if (!group) return;
      const groupIds = new Set(group.items.map((item) => item.id));
      const selectedItemIds = (state.shoppingReview?.selectedItemIds || []).filter((id) => !groupIds.has(id));
      navigate({ shoppingReview: { ...state.shoppingReview, selectedItemIds } });
    });
  });

  app.querySelector("[data-confirm-shopping-review]")?.addEventListener("click", () => {
    const review = state.shoppingReview;
    const selectedItems = selectedShoppingReviewItems();
    if (!review?.open || !selectedItems.length) return;

    if (review.mode === "week") {
      navigate({
        shoppingList: { items: mergeGeneratedShoppingItems(selectedItems), generatedForWeek: getWeekKey() },
        generateModal: { open: false, selectedDays: [] },
        shoppingReview: { open: false, mode: null, title: "", groups: [], selectedItemIds: [] },
      });
      showToast("Handlelisten er oppdatert.");
      return;
    }

    navigate({
      shoppingList: { ...state.shoppingList, items: mergeShoppingItems(state.shoppingList?.items || [], selectedItems) },
      shoppingReview: { open: false, mode: null, title: "", groups: [], selectedItemIds: [] },
    });
    showToast("Varene er lagt til i handlelisten.");
  });

  app.querySelector("[data-meal-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveMealFromForm(event.currentTarget);
  });

  app.querySelector("[data-delete-meal]")?.addEventListener("click", deleteCurrentMeal);

  app.querySelector("[data-add-ingredient]")?.addEventListener("click", () => {
    syncMealEditorDraftFromDom();
    const draftIngredients = [...(state.draftIngredients || []), { amount: "", unit: "", name: "" }];
    navigate({ draftMeal: state.draftMeal, draftIngredients, draftSteps: state.draftSteps });
  });

  app.querySelector("[data-add-ingredient-heading]")?.addEventListener("click", () => changeIngredientEditorRows("heading"));
  app.querySelectorAll("[data-move-ingredient-heading]").forEach(button => {
    button.addEventListener("click", () => changeIngredientEditorRows("move", Number(button.dataset.moveIngredientHeading), Number(button.dataset.direction)));
  });

  app.querySelectorAll("[data-remove-ingredient]").forEach((button) => {
    button.addEventListener("click", () => changeIngredientEditorRows("remove", Number(button.dataset.removeIngredient)));
  });

  app.querySelector("[data-add-step]")?.addEventListener("click", () => {
    syncMealEditorDraftFromDom();
    const draftSteps = [...(state.draftSteps || []), ""];
    navigate({ draftMeal: state.draftMeal, draftIngredients: state.draftIngredients, draftSteps });
  });

  app.querySelectorAll("[data-family]").forEach((field) => {
    field.addEventListener("change", () => {
      const value = field.dataset.family === "familySize" ? Math.max(1, Math.min(30, Number(field.value) || 1))
        : field.type === "number" ? Number(field.value) : field.value;
      state.family = { ...state.family, [field.dataset.family]: value };
      navigate({ family: state.family });
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
  app.querySelector("[data-download-backup]")?.addEventListener("click", (event) => downloadBackup(event.currentTarget));

  app.querySelector("[data-generate-list]")?.addEventListener("click", () => {
    const upcoming = getUpcomingDays(9);
    const preselected = upcoming
      .filter((d) => dayPlansMeal(d.dayMode) && d.meal)
      .map((d) => d.dateKey);
    navigate({ generateModal: { open: true, selectedDays: preselected } });
  });

  app.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target === el) navigate({ generateModal: { open: false, selectedDays: [] } });
    });
  });

  app.querySelectorAll("[data-modal-day]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const dateKey = checkbox.dataset.modalDay;
      const current = state.generateModal.selectedDays;
      const selectedDays = checkbox.checked
        ? [...current, dateKey]
        : current.filter((d) => d !== dateKey);
      navigate({ generateModal: { ...state.generateModal, selectedDays } });
    });
  });

  app.querySelector("[data-confirm-generate]")?.addEventListener("click", () => {
    const selectedKeys = new Set(state.generateModal.selectedDays);
    const selectedDays = getUpcomingDays(9).filter((d) => selectedKeys.has(d.dateKey));
    const review = createWeekShoppingReview(selectedDays);
    if (review?.open) {
      navigate({ generateModal: { open: false, selectedDays: [] }, shoppingReview: review });
    } else {
      showToast("Ingen av de valgte middagene har ingredienser.");
    }
  });

  app.querySelector("[data-add-custom-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector("[name=item]");
    const name = input.value.trim();
    if (!name) return;
    addShoppingItemByName(name);
  });

  app.querySelectorAll("[data-edit-shopping-item]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate({ editingShoppingItemId: button.dataset.editShoppingItem });
    });
  });

  app.querySelectorAll("[data-close-shopping-editor]").forEach((el) => {
    el.addEventListener("click", (event) => {
      if (event.target === el || el.matches("button")) {
        navigate({ editingShoppingItemId: null });
      }
    });
  });

  app.querySelector("[data-shopping-editor-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const itemId = state.editingShoppingItemId;
    const name = String(formData.get("name") || "").trim();
    const amount = String(formData.get("amount") || "").trim();
    const unit = String(formData.get("unit") || "").trim();
    const category = String(formData.get("category") || "other").trim();
    if (!itemId || !name) return;
    const items = (state.shoppingList?.items || []).map((item) => (
      item.id === itemId ? { ...item, name, amount, unit, category } : item
    ));
    const mappings = { ...(state.metadata?.ingredientMappings || {}), [name.toLowerCase()]: category };
    navigate({
      shoppingList: { ...state.shoppingList, items },
      metadata: { ...state.metadata, ingredientMappings: mappings },
      editingShoppingItemId: null,
    });
  });

  app.querySelector("[data-delete-shopping-item]")?.addEventListener("click", (event) => {
    const itemId = event.currentTarget.dataset.deleteShoppingItem;
    const items = (state.shoppingList?.items || []).filter((item) => item.id !== itemId);
    navigate({ shoppingList: { ...state.shoppingList, items }, editingShoppingItemId: null });
  });

  const shoppingInput = app.querySelector("[data-shopping-input]");
  const suggestionBox = app.querySelector("[data-shopping-suggestions]");
  if (shoppingInput && suggestionBox) {
    shoppingInput.addEventListener("input", () => {
      suggestionBox.innerHTML = renderShoppingSuggestions(shoppingInput.value);
    });
    suggestionBox.addEventListener("click", (event) => {
      const button = event.target.closest("[data-shopping-suggestion]");
      if (!button) return;
      addShoppingItemByName(button.dataset.shoppingSuggestion);
    });
  }

  app.querySelectorAll("[data-toggle-item]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const items = (state.shoppingList?.items || []).map((item) =>
        item.id === checkbox.dataset.toggleItem ? { ...item, checked: checkbox.checked } : item
      );
      navigate({ shoppingList: { ...state.shoppingList, items } });
    });
  });

  app.querySelector("[data-clear-checked]")?.addEventListener("click", () => {
    const items = (state.shoppingList?.items || []).filter((item) => !item.checked);
    navigate({ shoppingList: { ...state.shoppingList, items } });
  });

  app.querySelectorAll("[data-toggle-family]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggleFamily;
      state.family = { ...state.family, [key]: !state.family[key] };
      navigate({ family: state.family });
    });
  });

  app.querySelectorAll("[data-quick-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = button.dataset.quickDay;
      const quickDays = state.family.quickDays.includes(day)
        ? state.family.quickDays.filter((item) => item !== day)
        : [...state.family.quickDays, day];
      state.family = { ...state.family, quickDays };
      navigate({ family: state.family });
    });
  });

  // Store categories: add new
  app.querySelector("[data-store-cat-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const label = String(formData.get("storeCatName") || "").trim();
    if (!label) return;
    const key = makeSlug(label);
    const configured = Array.isArray(state.metadata?.storeCategories) ? state.metadata.storeCategories : [];
    const allKeys = Object.fromEntries(getStoreCategories().map((c) => [c.key, c.label]));
    const nextKey = uniqueMetadataKey(key, allKeys);
    const storeCategoryOrder = [...getStoreCategories().map((category) => category.key), nextKey];
    navigate({ metadata: {
      ...state.metadata,
      storeCategories: [...configured.filter((c) => c.key !== nextKey), { key: nextKey, label }],
      storeCategoryOrder,
    } });
    e.currentTarget.reset();
  });

  app.querySelectorAll("[data-save-store-cat]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.saveStoreCat;
      const input = app.querySelector(`[data-store-cat-label="${CSS.escape(key)}"]`);
      const label = String(input?.value || "").trim();
      if (!key || !label) return;
      const configured = Array.isArray(state.metadata?.storeCategories) ? state.metadata.storeCategories : [];
      const storeCategories = [...configured.filter((cat) => cat.key !== key), { key, label }];
      navigate({ metadata: { ...state.metadata, storeCategories } });
    });
  });

  app.querySelectorAll("[data-move-store-cat]").forEach((button) => {
    button.addEventListener("click", () => moveStoreCategory(button.dataset.moveStoreCat, Number(button.dataset.direction)));
  });

  app.querySelectorAll("[data-remove-store-cat]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.removeStoreCat;
      const builtInKeys = new Set(STORE_CATEGORIES.map((c) => c.key));
      if (builtInKeys.has(key) || key === "other") return;
      const storeCategories = (state.metadata?.storeCategories || []).filter((c) => c.key !== key);
      const storeCategoryOrder = (state.metadata?.storeCategoryOrder || []).filter((categoryKey) => categoryKey !== key);
      const mappings = Object.fromEntries(Object.entries(state.metadata?.ingredientMappings || {}).map(([ingredient, catKey]) => [
        ingredient,
        catKey === key ? "other" : catKey,
      ]));
      const items = (state.shoppingList?.items || []).map((item) => item.category === key ? { ...item, category: "other" } : item);
      navigate({
        metadata: { ...state.metadata, storeCategories, storeCategoryOrder, ingredientMappings: mappings },
        shoppingList: { ...state.shoppingList, items },
      });
    });
  });

    // Shopping list: remap item category and save to ingredientMappings
  app.querySelectorAll("[data-remap-item]").forEach((select) => {
    select.addEventListener("change", () => {
      const itemId = select.dataset.remapItem;
      const newCat = select.value;
      let ingredientName = null;
      const items = (state.shoppingList?.items || []).map((item) => {
        if (item.id !== itemId) return item;
        ingredientName = item.name.toLowerCase();
        return { ...item, category: newCat };
      });
      const mappings = ingredientName
        ? { ...(state.metadata?.ingredientMappings || {}), [ingredientName]: newCat }
        : state.metadata?.ingredientMappings || {};
      navigate({
        shoppingList: { ...state.shoppingList, items },
        metadata: { ...state.metadata, ingredientMappings: mappings },
      });
    });
  });

  // Ingredient mappings setup: add new mapping
  app.querySelector("[data-ingredient-mapping-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("ingredientName") || "").trim().toLowerCase();
    const cat = String(formData.get("ingredientCategory") || "").trim();
    if (!name || !cat) return;
    const mappings = { ...(state.metadata?.ingredientMappings || {}), [name]: cat };
    navigate({ metadata: { ...state.metadata, ingredientMappings: mappings } });
    e.currentTarget.reset();
  });

  // Ingredient mappings setup: save existing mapping
  app.querySelectorAll("[data-save-mapping]").forEach((button) => {
    button.addEventListener("click", () => {
      const ingredient = button.dataset.saveMapping;
      const select = app.querySelector(`[data-mapping-cat="${CSS.escape(ingredient)}"]`);
      if (!select) return;
      const mappings = { ...(state.metadata?.ingredientMappings || {}), [ingredient]: select.value };
      navigate({ metadata: { ...state.metadata, ingredientMappings: mappings } });
    });
  });

  // Ingredient mappings setup: remove mapping
  app.querySelectorAll("[data-remove-mapping]").forEach((button) => {
    button.addEventListener("click", () => {
      const ingredient = button.dataset.removeMapping;
      const isBuiltIn = STORE_CATEGORIES.some((cat) => cat.keywords.includes(ingredient));
      const mappings = { ...(state.metadata?.ingredientMappings || {}) };
      if (isBuiltIn) {
        mappings[ingredient] = DISABLED_INGREDIENT_MAPPING;
      } else {
        delete mappings[ingredient];
      }
      navigate({ metadata: { ...state.metadata, ingredientMappings: mappings } });
    });
  });
}

function captureWindowPositions() {
  const active = document.activeElement;
  return [...app.querySelectorAll("[data-scroll-key]")].map(element => {
    const windowRoot = element.closest(".modal-backdrop") || element;
    return { key: element.dataset.scrollKey, scrollTop: element.scrollTop,
      scrollLeft: element.scrollLeft, focusKey: windowRoot.contains(active) ? active?.dataset?.focusKey : null };
  });
}

function restoreWindowPositions(positions) {
  const previous = new Map(positions.map(position => [position.key, position]));
  for (const element of app.querySelectorAll("[data-scroll-key]")) {
    const position = previous.get(element.dataset.scrollKey);
    if (!position) continue;
    const windowRoot = element.closest(".modal-backdrop") || element;
    const focused = position.focusKey ? [...windowRoot.querySelectorAll("[data-focus-key]")]
      .find(control => control.dataset.focusKey === position.focusKey) : null;
    focused?.focus({ preventScroll: true });
    element.scrollTop = position.scrollTop;
    if (position.scrollLeft !== undefined) element.scrollLeft = position.scrollLeft;
  }
}

function render(preserveShoppingInput = true) {
  // Sync/status callbacks during rapid taps must not replace the touched controls.
  if ((recipeServingsBuffer.pending || document.activeElement === app.querySelector("[data-recipe-servings-input]"))
    && accessState.kind === "ready" && state.activeView === "recipe" && !state.shoppingReview?.open
    && pageScroll.key === `recipe:${state.selectedMealId}` && app.querySelector("[data-recipe-servings-input]")) {
    refreshRecipeServings();
    const status = app.querySelector(".sync-status-label"); if (status) status.textContent = syncStatusText();
    return;
  }
  state.activeView = canonicalView(state.activeView); state.previousView = canonicalView(state.previousView);
  const screenKey = accessState.kind === "ready" ? pageScreenKey(state) : null;
  const screenChanged = screenKey !== pageScroll.key;
  if (screenChanged) syncMealPickerScrollLock(false);
  const pageTarget = screenKey === null ? null
    : pageScroll.beforeRender(screenKey, window.scrollY ?? document.documentElement?.scrollTop ?? 0, pageScrollDirection);
  if (!planningWindowOpen() || accessState.kind !== "ready") planningWindowWeekKey = null;
  if (!state.mealPicker?.open || accessState.kind !== "ready" || state.activeView !== "week") { pickerFilters = emptyPickerFilters(); pickerOtherPlans = false; pickerNote = null; }
  if (state.activeView !== "week" || accessState.kind !== "ready") weekClearConfirmation = null;
  if (!state.mealPicker?.open || canonicalView(state.activeView) !== "week" || accessState.kind !== "ready") mealPickerReturn = null;
  const windowPositions = captureWindowPositions();
  if (accessState.kind !== "ready" || state.activeView !== "meals" || editorRowMenu?.editorId !== state.editingMealId) editorRowMenu = null;
  if (state.activeView !== "recipe" || accessState.kind !== "ready") { recipeServingsView = { key: null, value: null }; recipeServingsBuffer.cancel(); }
  if (!state.editingMealId || accessState.kind!=="ready" || (state.activeView!=="meals" && !aiKeyEditorReturn)) {mealEditorSession=null;editorDiscardOpen=false;}
  if (!state.editingMealId || accessState.kind !== "ready" || (state.activeView !== "meals" && !aiKeyEditorReturn)) mealEditorReturn = null;
  syncAiKeyContext();
  if (!state.editingMealId) aiKeyEditorReturn = null;
  if (recipeImportState.editorId !== state.editingMealId) resetRecipeImport();
  if (accessState.kind !== "ready") {
    pageScroll.reset();
    resetRecipeImport();
    syncMealPickerScrollLock(false);
    releaseWakeLock();
    app.innerHTML = renderAccessScreen({ access: accessState, summary: restoreBackup ? summarizeBackup(restoreBackup) : null, busy: accountBusy, escapeHtml });
    bindAccountEvents();
    if (accessState.kind !== "checking") hideLoadingScreen();
    return;
  }
  const oldInput = preserveShoppingInput ? app.querySelector("[data-shopping-input]") : null;
  const oldKeyInput = state.activeView === "ai-settings" && !aiKeyUi.busy && !aiKeyUi.loading ? app.querySelector("[data-ai-key-input]") : null;
  const keyInputValue = oldKeyInput?.value || "";
  const draft = oldInput ? { value: oldInput.value, focused: document.activeElement === oldInput,
    start: oldInput.selectionStart, end: oldInput.selectionEnd, direction: oldInput.selectionDirection } : null;
  const views = {
    week: renderWeek,
    meals: renderMeals,
    shopping: renderShoppingList,
    recipe: renderMealDetail,
    setup: renderSetup,
    "account-settings": () => renderAccountView({ email: accessState.user?.email || "", role: accessState.role, members: accountMembers, message: accountMessage, offline: accessState.offline, busy: accountBusy, escapeHtml }),
    "ai-settings": () => renderAiKeyView({ status: aiKeyUi.status, isAdmin: accessState.role === "admin", available: aiKeyAvailable() && !aiKeyUi.loading,
      busy: aiKeyUi.busy, busyAction: aiKeyUi.busyAction, modelValue: aiKeyUi.modelDraft, returnToEditor: !!aiKeyEditorReturn, message: aiKeyUi.message, escapeHtml }),
    "family-settings": renderFamilySettings,
    "app-settings": renderAppSettings,
    "meal-preferences": renderMealPreferencesSetup,
    categories: renderCategoriesSetup,
    units: renderUnitsSetup,
    "prep-times": renderPrepTimesSetup,
    suitability: renderSuitabilitySetup,
    "plan-modes": renderPlanModesSetup,
    "ingredient-mappings": renderIngredientMappingsSetup,
    "store-categories": renderStoreCategoriesSetup,
  };
  const pickerOpen = Boolean(state.mealPicker?.open && state.activeView === "week");
  if (!screenChanged) syncMealPickerScrollLock(pickerOpen);
  renderShell((views[state.activeView] || renderMeals)());
  bindEvents();
  bindAccountEvents();
  bindRecipeImportEvents();
  bindAiKeyEvents();
  const newKeyInput = oldKeyInput ? app.querySelector("[data-ai-key-input]") : null;
  if (newKeyInput) newKeyInput.value = keyInputValue;
  const newInput = draft ? app.querySelector("[data-shopping-input]") : null;
  if (newInput) {
    newInput.value = draft.value;
    const suggestions = app.querySelector("[data-shopping-suggestions]");
    if (suggestions) suggestions.innerHTML = renderShoppingSuggestions(draft.value);
    if (draft.focused) {
      newInput.focus({ preventScroll: true });
      if (draft.start != null) newInput.setSelectionRange(draft.start, draft.end, draft.direction);
    }
  }
  restoreWindowPositions(windowPositions);
  hideLoadingScreen();
  if (pageTarget !== null) window.scrollTo?.(0, pageTarget);
  if (screenChanged && pickerOpen) syncMealPickerScrollLock(true);
}

function hideLoadingScreen() {
  const loadingScreen = document.querySelector("#app-loading-screen");
  if (!loadingScreen) return;
  loadingScreen.classList.add("hide");
  setTimeout(() => loadingScreen.remove(), 320);
}

function syncMealPickerScrollLock(isOpen) {
  const isLocked = document.body.classList.contains("meal-picker-open");

  if (isOpen && !isLocked) {
    mealPickerScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.top = `-${mealPickerScrollY}px`;
    document.body.classList.add("meal-picker-open");
    return;
  }

  if (!isOpen && isLocked) {
    document.body.classList.remove("meal-picker-open");
    document.body.style.top = "";
    window.scrollTo(0, mealPickerScrollY);
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js", { updateViaCache: "none" }).catch(() => {});
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

function handleVisibilityChange(now = Date.now()) {
  if (document.visibilityState !== "visible") { if (accessState.kind === "ready" && state.activeView === "recipe") flushRecipeServings(); if (backgroundAt === null) backgroundAt = now; return; }
  const currentWeek = getWeekKeyForOffset(0, new Date(now));
  if ((backgroundAt !== null && now - backgroundAt > 30 * 60000) || currentWeek !== lastVisibleWeekKey) {
    state.weekOffset = 0; saveState(); render();
  }
  backgroundAt = null; lastVisibleWeekKey = currentWeek;
  syncWakeLock();
}

document.addEventListener("visibilitychange", () => handleVisibilityChange());

async function initFirebaseSync() {
  if (navigator.onLine === false) { showOfflineStartup(); return; }
  try {
    firebaseConnection = await initFirebaseClient({ firebaseConfig, sdkVersion: FIREBASE_SDK_VERSION, familyId: FAMILY_ID,
      onAuthReady: async (connection) => {
        currentAuthUser = connection.user;
        firebaseConnection = connection;
        if (!accessSession) accessSession = makeAccessSession(connection);
        await accessSession.start(connection.user);
      },
      onAuthError: () => { accessSession?.stop(); stopAllSync(); accessState = { kind: "error", message: "Kunne ikke kontrollere innloggingen. Prøv igjen." }; render(); },
    });
  } catch (error) {
    if (navigator.onLine === false || isNetworkError(error)) showOfflineStartup();
    else { accessState = { kind: "error", message: "Kunne ikke laste inn innloggingen. Prøv igjen." }; render(); }
  }
}

function readOfflineMembership() {
  return localStore.read("middagsapp-membership");
}
function clearOfflineMembership() { return localStore.remove("middagsapp-membership"); }
function showOfflineStartup() {
  accessSession?.stop();
  stopAllSync();
  const flag = readOfflineMembership();
  if (offlineMemberMatches(flag, { projectId: firebaseConfig.projectId, familyId: FAMILY_ID })) {
    if (Number(flag.minAppVersion || 0) > APP_VERSION_NUMBER) accessState = { kind: "update" };
    else {
      accessState = { kind: "ready", user: { uid: flag.uid, email: flag.email }, role: flag.role, offline: true };
      syncStatus = "Lokal lagring";
    }
  } else accessState = { kind: "login", message: "Krever nett første gang" };
  render();
}
function stopAllSync() {
  recipeServingsBuffer.cancel();
  mealEditorSession=null;editorDiscardOpen=false;
  planningWindowWeekKey = null; pickerFilters = emptyPickerFilters();
  pickerOtherPlans = false; pickerNote = null; weekClearConfirmation = null;
  mealPickerReturn = null;
  uiHistory.reset();
  editorRowMenu = null;
  servingsTransition = null; weeksServerReady = false; profileServerReady = false;
  recipeServingsView = { key: null, value: null };
  resetRecipeImport();
  syncEnabled = false;
  syncGeneration += 1;
  for (const unsubscribe of syncUnsubscribers.splice(0)) unsubscribe?.();
  Object.values(remoteSaveTimers).forEach(clearTimeout);
  for (const key of Object.keys(remoteSaveTimers)) delete remoteSaveTimers[key];
  pendingRemoteScopes.clear();
  shoppingSync.stop(); shoppingSync = makeShoppingSync(); shoppingSyncStatus = null;
  mealsSync.stop(); mealsSync = makeMealsSync(); mealsSyncStatus = null;
  weeksSync.stop(); weeksSync = makeWeeksSync(); weeksSyncStatus = null;
  restoreBackup = null;
  accountMembers = []; accountMessage = "";
}
function makeAccessSession(connection) {
  const { refs, firestoreApi: api } = connection;
  return createAccessSession({ api, refs, projectId: firebaseConfig.projectId, familyId: FAMILY_ID, appVersion: APP_VERSION_NUMBER,
    readOffline: readOfflineMembership,
    writeOffline: (flag) => localStore.write("middagsapp-membership", flag),
    clearOffline: clearOfflineMembership, onStop: stopAllSync,
    onScreen: (screen) => { accessState = screen; if (screen.offline) syncStatus = "Lokal lagring"; render(); },
    onReady: async ({ valid }) => {
      Object.assign(remoteRefs, refs);
      syncEnabled = true;
      syncStatus = "Kobler til synk";
      const token = syncGeneration;
      servingsTransition = createServingsDefaultsTransition({
        appVersion: APP_VERSION_NUMBER,
        readMeta: async () => { const doc = await api.getDocFromServer(refs.meta); return doc.exists() ? doc.data() : null; },
        getState: () => state, currentWeek: () => getWeekKeyForOffset(0),
        enqueue: servingsByWeek => setState({ servingsByWeek }), waitForWrites: () => weeksSync.waitForWrites(),
        markDone: () => valid() && token === syncGeneration ? api.updateDoc(refs.meta, { servingsDefaultsV106: true }) : Promise.reject(new Error("Avbrutt")),
        valid: () => valid() && token === syncGeneration && syncEnabled,
        onDone: ({ count, familySize }) => showToast(`Porsjonene for ${count} dager følger nå standarden (${familySize}).`),
      });
      window.middagsplanDoc = api.doc;
      window.middagsplanGetDoc = api.getDoc;
      window.middagsplanGetDocs = api.getDocs;
      window.middagsplanSetDoc = (...args) => token === syncGeneration && syncEnabled ? api.setDoc(...args) : Promise.resolve();
      window.middagsplanDeleteDoc = (...args) => token === syncGeneration && syncEnabled ? api.deleteDoc(...args) : Promise.resolve();
      window.middagsplanServerTimestamp = api.serverTimestamp;
      await Promise.all([shoppingSync.start({ api, refs, skipMigration: true }), mealsSync.start({ api, refs }), weeksSync.start({ api, refs })]);
      if (!valid() || token !== syncGeneration) return;
      startSplitSyncListeners((ref, next, error) => {
        // A cache-identical profile still needs a server metadata notification
        // before the one-time defaults transition may use its family value.
        const unsubscribe = api.onSnapshot(ref, ...(ref === refs.profile ? [{ includeMetadataChanges: true }] : []), (snapshot) => { if (valid() && token === syncGeneration) next(snapshot); },
          (failure) => { if (valid() && token === syncGeneration) error(failure); });
        syncUnsubscribers.push(unsubscribe);
      });
    },
  });
}

async function retryAccess() {
  if (accountBusy) return;
  if (firebaseConnection && accessSession) await accessSession.start(currentAuthUser);
  else await initFirebaseSync();
}

async function signOutAccount() {
  accountBusy = false;
  currentAuthUser = null;
  clearOfflineMembership();
  accessSession?.stop();
  stopAllSync();
  accessState = { kind: "login", message: "" };
  render();
  try { await firebaseConnection?.signOut(); }
  catch { accessState.message = "Utloggingen kunne ikke fullføres. Prøv igjen når du er på nett."; render(); }
}

async function signInAccount() {
  if (accountBusy || !firebaseConnection) {
    if (!firebaseConnection) { accessState.message = "Krever nett første gang. Trykk Prøv igjen når du er på nett."; render(); }
    return;
  }
  // This call must remain directly in the click handler, before any awaited work.
  const login = firebaseConnection.signIn();
  accountBusy = true;
  try {
    const result = await login;
    if (result?.user && ["login", "denied", "error"].includes(accessState.kind)) {
      currentAuthUser = result.user;
      if (!accessSession) accessSession = makeAccessSession(firebaseConnection);
      await accessSession.start(result.user);
    }
  }
  catch (error) {
    const message = loginErrorMessage(error);
    if (message) accessState = { kind: "login", message };
  } finally { accountBusy = false; render(); }
}

async function loadAccountMembers() {
  if (accessState.kind !== "ready" || accessState.offline || !firebaseConnection) return;
  const token = syncGeneration;
  try {
    const snapshot = await firebaseConnection.firestoreApi.getDocsFromServer(firebaseConnection.refs.members);
    if (token !== syncGeneration || accessState.kind !== "ready") return;
    accountMembers = snapshot.docs.map((doc) => ({ email: doc.id, role: doc.data().role })).sort((a, b) => a.email.localeCompare(b.email));
    accountMessage = "";
  } catch {
    if (token !== syncGeneration) return;
    accountMessage = "Kunne ikke hente medlemslisten. Sjekk nettforbindelsen og prøv igjen.";
  }
  render();
}

async function changeMember(email, memberRole, remove = false) {
  if (accountBusy || accessState.offline || !firebaseConnection) return;
  const token = syncGeneration;
  accountBusy = true;
  try {
    await writeMember({ api: firebaseConnection.firestoreApi, refs: firebaseConnection.refs,
      role: accessState.role, ownEmail: accessState.user.email, email, memberRole, remove,
      valid: () => token === syncGeneration && accessState.kind === "ready" });
    if (token === syncGeneration) await loadAccountMembers();
  } catch (error) {
    if (token === syncGeneration) accountMessage = error.code === "permission-denied"
      ? "Du har ikke tillatelse til å endre medlemslisten. Prøv igjen etter ny innlogging." : error.message || "Kunne ikke lagre medlemmet.";
  } finally { accountBusy = false; render(); }
}

function emptySetupBackup() {
  const data = structuredClone(defaultState);
  return { app: "middagsapp", exportVersion: 1, exportedAt: new Date().toISOString(), appVersion: APP_VERSION,
    data: { family: data.family, mealPreferences: data.mealPreferences, metadata: data.metadata, meals: [],
      plansByWeek: {}, lockedPlansByWeek: {}, dayTypesByWeek: {}, servingsByWeek: {}, dayModesByWeek: {}, dayNotesByWeek: {},
      shoppingList: { items: [], generatedForWeek: null }, clientUpdatedAt: 0 } };
}

async function restoreDatabase(backup) {
  if (accountBusy || accessState.kind !== "setup" || accessState.role !== "admin" || !firebaseConnection) return;
  const token = syncGeneration;
  const user = accessState.user;
  accountBusy = true;
  accessState.message = "";
  render();
  try {
    const data = await executeRestore({ backup, email: user.email.toLowerCase(), role: accessState.role,
      appVersion: APP_VERSION_NUMBER,
      api: firebaseConnection.firestoreApi, refs: firebaseConnection.refs,
      valid: () => token === syncGeneration && accessState.kind === "setup" && accessState.user?.uid === user.uid });
    state = normalizeStateForStartup({ ...structuredClone(defaultState), ...data, projectId: firebaseConfig.projectId, pendingLocalSync: false });
    // Stored shopping timestamps must match the restored documents.
    state.shoppingList.items = state.shoppingList.items.map((item, index) => ({ ...item, createdAt: index }));
    saveState();
    accountBusy = false;
    await accessSession.start(user);
  } catch (error) {
    if (token === syncGeneration) accessState.message = error.code === "permission-denied"
      ? "Du har ikke tillatelse til oppsettet. Kontroller administratorrolle og Firestore-regler." : error.message || "Innlesingen mislyktes. Prøv igjen med samme fil.";
  } finally { accountBusy = false; render(); }
}

function bindAccountEvents() {
  app.querySelector("[data-google-login]")?.addEventListener("click", signInAccount);
  app.querySelector("[data-access-retry]")?.addEventListener("click", retryAccess);
  app.querySelectorAll("[data-sign-out]").forEach((button) => button.addEventListener("click", signOutAccount));
  if (accessState.kind !== "ready") app.querySelector("[data-refresh-app]")?.addEventListener("click", refreshApp);
  app.querySelector("[data-restore-file]")?.addEventListener("change", async (event) => {
    if (accountBusy || accessState.role !== "admin") return;
    const file = event.target.files?.[0];
    if (!file) return;
    const token = syncGeneration;
    try {
      const backup = validateBackup(JSON.parse(await file.text()));
      if (token !== syncGeneration || accessState.kind !== "setup") return;
      restoreBackup = backup; accessState.message = "";
    } catch { if (token === syncGeneration) { restoreBackup = null; accessState.message = "Ugyldig sikkerhetskopi. Velg en fullstendig Middagsapp JSON-fil."; } }
    render();
  });
  app.querySelector("[data-confirm-restore]")?.addEventListener("click", () => { if (restoreBackup) restoreDatabase(restoreBackup); });
  app.querySelector("[data-cancel-restore]")?.addEventListener("click", () => { if (!accountBusy) { restoreBackup = null; render(); } });
  app.querySelector("[data-empty-setup]")?.addEventListener("click", () => {
    if (!accountBusy && window.confirm("Vil du starte med en tom database uten oppskrifter, ukeplaner eller handlevarer?")) restoreDatabase(emptySetupBackup());
  });
  app.querySelectorAll('[data-view="account-settings"]').forEach((button) => button.addEventListener("click", loadAccountMembers));
  app.querySelector("[data-add-member]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    changeMember(form.get("email"), form.get("role"));
  });
  app.querySelectorAll("[data-member-role]").forEach((select) => select.addEventListener("change", () => changeMember(select.dataset.memberRole, select.value)));
  app.querySelectorAll("[data-remove-member]").forEach((button) => button.addEventListener("click", () => {
    if (window.confirm(`Fjerne ${button.dataset.removeMember} fra familiens medlemsliste?`)) changeMember(button.dataset.removeMember, null, true);
  }));
}

function startSplitSyncListeners(onSnapshot) {
  onSnapshot(remoteRefs.profile, (snapshot) => {
    if (snapshot.exists() && !snapshot.metadata?.fromCache && !snapshot.metadata?.hasPendingWrites) profileServerReady = true;
    if (!snapshot.exists()) {
      if (state.pendingLocalSync) scheduleRemoteSave(0, ["profile"]);
      return;
    }
    applyRemoteDocument("profile", snapshot.data(), (data) => {
      applyRemoteStatePatch({ family: data.family, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
      maybeTransitionServings();
    });
  }, markSyncFailed);

  onSnapshot(remoteRefs.metadata, (snapshot) => {
    if (!snapshot.exists()) {
      if (state.pendingLocalSync) scheduleRemoteSave(0, ["metadata"]);
      return;
    }
    applyRemoteDocument("metadata", snapshot.data(), (data) => {
      applyRemoteStatePatch({ metadata: data.metadata, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
    });
  }, markSyncFailed);

  onSnapshot(remoteRefs.preferences, (snapshot) => {
    if (!snapshot.exists()) {
      if (state.pendingLocalSync) scheduleRemoteSave(0, ["preferences"]);
      return;
    }
    applyRemoteDocument("preferences", snapshot.data(), (data) => {
      applyRemoteStatePatch({ mealPreferences: data.mealPreferences, clientUpdatedAt: Number(data.clientUpdatedAt || 0), pendingLocalSync: false });
    });
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
  if (remoteDocumentIsStale({ pendingScopes: pendingRemoteScopes, scope, remoteClientUpdatedAt, localClientUpdatedAt })) {
    const token = syncGeneration;
    setTimeout(() => { if (token === syncGeneration && syncEnabled) scheduleRemoteSave(0, [scope]); }, 0);
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

function scheduleRemoteSave(delay = 700, scopes = ["profile", "preferences", "metadata"]) {
  if (!syncEnabled || !remoteRefs.profile || applyingRemoteState) return;
  scopes.forEach((scope) => pendingRemoteScopes.add(scope));
  const key = [...new Set(scopes)].sort().join("-");
  clearTimeout(remoteSaveTimers[key]);
  const token = syncGeneration;
  remoteSaveTimers[key] = setTimeout(async () => {
    if (!syncEnabled || token !== syncGeneration) return;
    try {
      syncStatus = "Synker";
      render();
      await saveRemoteScopes(scopes);
      if (!syncEnabled || token !== syncGeneration) return;
      scopes.forEach((scope) => pendingRemoteScopes.delete(scope));
      state.pendingLocalSync = pendingRemoteScopes.size > 0;
      saveState();
      syncStatus = "Synket";
      render();
    } catch {
      if (!syncEnabled || token !== syncGeneration) return;
      syncStatus = "Synk feilet";
      render();
    }
  }, delay);
}

async function saveRemoteScopes(scopes, options = {}) {
  if (!syncEnabled) return;
  const token = syncGeneration;
  const uniqueScopes = [...new Set(scopes)];
  const updatedAt = window.middagsplanServerTimestamp();
  const clientUpdatedAt = state.clientUpdatedAt || Date.now();
  const writes = await buildRemoteWrites({
    scopes: uniqueScopes,
    state,
    refs: remoteRefs,
    api: {
      doc: window.middagsplanDoc,
      getDoc: window.middagsplanGetDoc,
      setDoc: (...args) => token === syncGeneration && syncEnabled ? window.middagsplanSetDoc(...args) : Promise.resolve(),
      deleteDoc: (...args) => token === syncGeneration && syncEnabled ? window.middagsplanDeleteDoc(...args) : Promise.resolve(),
    },
    updatedAt,
    clientUpdatedAt,
    pendingLocalSync: state.pendingLocalSync,
    allowMissingRemoteWrite: Boolean(options.allowMissingRemoteWrite),
  });

  if (token !== syncGeneration) return;

  await Promise.all(writes);
}

document.addEventListener("paste", pasteRecipeImages);
render();
initFirebaseSync();
