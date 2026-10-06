import { WEEK_SYNC_FIELDS } from "./state.js";
import { emptyWeekPlan, emptyWeekLocks, emptyWeekDayTypes, emptyWeekServings,
  emptyWeekDayModes, emptyWeekDayNotes } from "../domain/weeks.js";

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const strings = (value) => Array.isArray(value) && value.every((entry) => typeof entry === "string");
const stringMap = (value) => object(value) && Object.values(value).every(entry => typeof entry === "string");
const idIsValid = (id) => typeof id === "string" && id.trim() && !id.includes("/")
  && ![".", ".."].includes(id) && !/^__.*__$/.test(id) && id.length <= 500;
const reject = () => { throw new Error("Ugyldig sikkerhetskopi. Filen må være en fullstendig Middagsapp-sikkerhetskopi i eksportformat 1."); };

export function validateBackup(backup) {
  if (!object(backup) || backup.app !== "middagsapp" || backup.exportVersion !== 1
    || typeof backup.appVersion !== "string" || typeof backup.exportedAt !== "string"
    || !Number.isFinite(Date.parse(backup.exportedAt)) || !object(backup.data)) reject();
  const d = backup.data;
  if (!object(d.family) || typeof d.family.name !== "string" || !Number.isFinite(d.family.familySize)
    || d.family.familySize < 1 || !object(d.mealPreferences) || !object(d.mealPreferences.categoryGoals)
    || !object(d.metadata) || !object(d.metadata.categoryLabels) || !strings(d.metadata.units)
    || !Array.isArray(d.meals) || !object(d.shoppingList) || !Array.isArray(d.shoppingList.items)
    || !Number.isFinite(d.clientUpdatedAt) || d.clientUpdatedAt < 0) reject();
  if ((d.family.quickDays !== undefined && !strings(d.family.quickDays))
    || ["leftovers", "reuseIngredients"].some(key => d.family[key] !== undefined && typeof d.family[key] !== "boolean")
    || (d.family.kidFriendlyPerWeek !== undefined && (!Number.isFinite(d.family.kidFriendlyPerWeek) || d.family.kidFriendlyPerWeek < 0))) reject();
  for (const goal of Object.values(d.mealPreferences.categoryGoals)) {
    if (!object(goal) || Object.values(goal).some(value => value !== null && (!Number.isFinite(value) || value < 0))) reject();
  }
  if (!stringMap(d.metadata.categoryLabels)) reject();
  for (const field of ["prepTimeLabels", "suitabilityLabels", "ingredientMappings"]) {
    if (d.metadata[field] !== undefined && !stringMap(d.metadata[field])) reject();
  }
  if (d.metadata.storeCategoryOrder !== undefined && !strings(d.metadata.storeCategoryOrder)) reject();
  if (d.metadata.storeCategories !== undefined && (!Array.isArray(d.metadata.storeCategories)
    || d.metadata.storeCategories.some(category => !object(category) || typeof category.key !== "string" || typeof category.label !== "string"))) reject();
  if (d.metadata.planModeOptions !== undefined && (!object(d.metadata.planModeOptions)
    || Object.values(d.metadata.planModeOptions).some(mode => !object(mode) || typeof mode.label !== "string" || typeof mode.type !== "string"))) reject();
  const unique = (entries) => {
    const ids = new Set();
    for (const entry of entries) {
      if (!object(entry) || !idIsValid(entry.id) || ids.has(entry.id)) reject();
      ids.add(entry.id);
    }
  };
  unique(d.meals); unique(d.shoppingList.items);
  for (const meal of d.meals) {
    if (typeof meal.title !== "string" || !meal.title.trim() || !strings(meal.categories)
      || !Array.isArray(meal.ingredients) || !strings(meal.steps)
      || !Number.isFinite(meal.baseServings) || meal.baseServings < 1) reject();
    for (const ingredient of meal.ingredients) {
      if (!object(ingredient) || !["name", "amount", "unit"].every((key) => typeof ingredient[key] === "string")) reject();
      if (ingredient.group !== undefined && (typeof ingredient.group !== "string" || ingredient.group.trim().length > 60)) reject();
    }
    for (const field of ["suitability", "keyIngredients"]) if (meal[field] !== undefined && !strings(meal[field])) reject();
    for (const field of ["description", "recipeUrl", "prepTime", "leftovers"]) if (meal[field] !== undefined && typeof meal[field] !== "string") reject();
    for (const field of ["favorite", "kidFriendly", "excludeFromSuggestions"]) if (meal[field] !== undefined && typeof meal[field] !== "boolean") reject();
  }
  for (const item of d.shoppingList.items) {
    if (!["name", "amount", "unit", "category"].every((key) => typeof item[key] === "string")
      || !item.name.trim() || typeof item.checked !== "boolean" || typeof item.custom !== "boolean") reject();
  }
  for (const field of WEEK_SYNC_FIELDS) {
    if (!object(d[field])) reject();
    for (const [week, days] of Object.entries(d[field])) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Number.isFinite(Date.parse(week)) || !object(days)) reject();
      for (const [day, value] of Object.entries(days)) {
        if (!/^[0-6]$/.test(day)) reject();
        if (field === "lockedPlansByWeek" ? typeof value !== "boolean"
          : field === "servingsByWeek" ? !Number.isFinite(value) || value < 1
            : typeof value !== "string") reject();
      }
    }
  }
  const normalized = structuredClone(backup);
  for (const meal of normalized.data.meals) for (const ingredient of meal.ingredients) {
    if (ingredient.group !== undefined) {
      const group = ingredient.group.trim();
      if (group) ingredient.group = group; else delete ingredient.group;
    }
  }
  return normalized;
}

export function summarizeBackup(backup) {
  const valid = validateBackup(backup);
  return { exportedAt: valid.exportedAt, appVersion: valid.appVersion,
    meals: valid.data.meals.length, weeks: restoreWeekKeys(valid.data).length,
    items: valid.data.shoppingList.items.length };
}

export function restoreWeekKeys(data) {
  return [...new Set(WEEK_SYNC_FIELDS.flatMap((field) => Object.keys(data[field] || {})))].sort();
}

export function buildRestoreDocuments(backup, { email } = {}) {
  const { data: d } = validateBackup(backup);
  const timestamp = d.clientUpdatedAt;
  const documents = [
    { path: ["app", "profile"], data: { family: d.family, clientUpdatedAt: timestamp } },
    { path: ["app", "preferences"], data: { mealPreferences: d.mealPreferences, clientUpdatedAt: timestamp } },
    { path: ["app", "metadata"], data: { metadata: d.metadata, clientUpdatedAt: timestamp } },
    ...d.meals.map((meal) => ({ path: ["meals", meal.id], data: { ...meal, clientUpdatedAt: timestamp } })),
    ...restoreWeekKeys(d).map((key) => ({ path: ["weeks", key], data: {
      plan: { ...emptyWeekPlan(), ...d.plansByWeek[key] },
      lockedPlan: { ...emptyWeekLocks(), ...d.lockedPlansByWeek[key] },
      dayTypes: { ...emptyWeekDayTypes(), ...d.dayTypesByWeek[key] },
      servings: { ...emptyWeekServings(d.family.familySize), ...d.servingsByWeek[key] },
      dayModes: { ...emptyWeekDayModes(), ...d.dayModesByWeek[key] },
      dayNotes: { ...emptyWeekDayNotes(), ...d.dayNotesByWeek[key] },
      clientUpdatedAt: timestamp,
    } })),
    ...d.shoppingList.items.map((item, index) => ({ path: ["shoppingItems", item.id], data: {
      name: item.name, amount: item.amount, unit: item.unit, category: item.category,
      checked: item.checked, custom: item.custom, createdAt: index,
    } })),
    { path: ["app", "shopping"], data: {}, marker: "shopping" },
    { path: ["app", "meta"], data: { schemaVersion: 1, initializedBy: email, minAppVersion: 98 }, marker: "meta" },
  ];
  return documents;
}

export function checkRestoreCollections(documents, existing = {}) {
  let count = 0;
  for (const collection of ["meals", "weeks", "shoppingItems"]) {
    const allowed = new Set(documents.filter((doc) => doc.path[0] === collection).map((doc) => doc.path[1]));
    count += (existing[collection] || []).filter((id) => !allowed.has(id)).length;
  }
  if (count) throw new Error(`Databasen inneholder ${count} dokumenter som ikke finnes i sikkerhetskopien. Tøm samlingene meals, weeks og shoppingItems i Firebase-konsollen først.`);
  return true;
}

export async function executeRestore({ backup, email, role, api, refs, appVersion = 98, valid = () => true }) {
  if (role !== "admin") throw new Error("Bare administratorer kan sette opp databasen.");
  const documents = buildRestoreDocuments(backup, { email });
  const assertCurrent = () => { if (!valid()) throw new Error("Oppsettet ble avbrutt fordi konto eller tilgang ble endret."); };
  assertCurrent();
  const meta = await api.getDocFromServer(refs.meta);
  assertCurrent();
  if (meta.exists() && (meta.data().initializedAt || Number(meta.data().minAppVersion || 0) > appVersion)) {
    throw new Error("Databasen er allerede satt opp, eller appen må oppdateres. Last inn siden på nytt.");
  }
  const existing = {};
  for (const name of ["meals", "weeks", "shoppingItems"]) {
    const snapshot = await api.getDocsFromServer(refs[name]);
    assertCurrent();
    existing[name] = snapshot.docs.map((doc) => doc.id);
  }
  checkRestoreCollections(documents, existing);
  for (const document of documents) {
    assertCurrent();
    // Recheck the marker before final commit; never mark a partial restore ready.
    if (document.marker === "meta") {
      const latest = await api.getDocFromServer(refs.meta);
      assertCurrent();
      if (latest.exists() && (latest.data().initializedAt || Number(latest.data().minAppVersion || 0) > appVersion)) {
        throw new Error("Oppsettet er endret på en annen enhet. Last inn siden på nytt.");
      }
    }
    const data = { ...document.data };
    if (document.marker === "meta") data.initializedAt = api.serverTimestamp();
    else if (document.marker === "shopping") data.migratedToItemsAt = api.serverTimestamp();
    else data.updatedAt = api.serverTimestamp();
    const ref = document.path[0] === "app" ? refs[document.path[1]] : api.doc(refs[document.path[0]], document.path[1]);
    await api.setDoc(ref, data, document.marker === "shopping" ? { merge: true } : undefined);
  }
  assertCurrent();
  return validateBackup(backup).data;
}
