import { mealNeedsRecipe } from "./meals.js";

export function scoreMealRecency(daysSince) {
  if (daysSince === null || daysSince === undefined) return 25;
  if (daysSince <= 7) return -95;
  if (daysSince <= 14) return -58;
  if (daysSince <= 21) return -30;
  if (daysSince <= 28) return -14;
  return Math.min(30, 2 * Math.floor(Math.abs(daysSince) / 7));
}

export function scoreRecentCategoryUse(recentCategoryUses) {
  if (recentCategoryUses >= 6) return -22;
  if (recentCategoryUses >= 4) return -14;
  if (recentCategoryUses >= 2) return -6;
  return 0;
}

export function scoreMealFit(meal, options = {}) {
  const {
    wantsQuick = false,
    dayType = "weekday",
    preferLeftovers = false,
  } = options;

  let score = 0;
  if (meal?.favorite) score += 10;
  if (meal?.kidFriendly) score += 6;
  if (wantsQuick && meal?.prepTime === "quick") score += 25;
  if (preferLeftovers && meal?.leftovers === "likely") score += 6;
  score += scoreDayType(meal, dayType);
  return score;
}

export function scoreCategoryPreference(categories, options = {}) {
  const {
    counts = {},
    goalsByCategory = {},
    dueCategories = [],
  } = options;
  const due = new Set(dueCategories);

  return (categories || []).reduce((score, category) => {
    const goal = goalsByCategory[category] || {};
    const current = counts[category] || 0;
    let nextScore = score;
    if (goal.minPerWeek && current < goal.minPerWeek) nextScore += 45;
    if (goal.maxPerWeek && current >= goal.maxPerWeek) nextScore -= 90;
    if (due.has(category)) nextScore += 35;
    return nextScore;
  }, 0);
}

export function scoreDayType(meal, dayType) {
  const types = meal?.suitability || [];
  return types.includes(dayType) ? 22 : types.length ? -20 : 10;
}

export function scoreVariation(weekKey, dayIndex, mealId) {
  let hash = 2166136261;
  for (const char of JSON.stringify([weekKey, dayIndex, mealId])) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return hash % 16;
}

// Diagnostic/test-only breakdown; no scores or internals are rendered in the app.
export function suggestionScoreBreakdown(meal, options = {}) {
  const { dayType = "weekday", wantsQuick = false, preferLeftovers = false,
    daysSince = null, categoryScore = 0, recentCategoryUses = 0, weekKey = "", dayIndex = 0 } = options;
  const parts = {
    dayType: scoreDayType(meal, dayType),
    marks: (meal?.favorite ? 10 : 0) + (meal?.kidFriendly ? 6 : 0),
    quick: wantsQuick && meal?.prepTime === "quick" ? 25 : 0,
    leftovers: preferLeftovers && meal?.leftovers === "likely" ? 6 : 0,
    recency: scoreMealRecency(daysSince),
    category: categoryScore + scoreRecentCategoryUse(recentCategoryUses),
    variation: scoreVariation(weekKey, dayIndex, meal?.id || ""),
  };
  return { ...parts, total: Object.values(parts).reduce((sum, n) => sum + n, 0) };
}

export function mealMatchesPickerFilters(meal, filters = {}) {
  return (!filters.quick || meal.prepTime === "quick")
    && (!filters.kidFriendly || meal.kidFriendly)
    && (!filters.favorite || meal.favorite)
    && (!filters.needsRecipe || mealNeedsRecipe(meal))
    && (!filters.suitability || (meal.suitability || []).includes(filters.suitability))
    && (!filters.category || filters.category === "all" || (meal.categories || []).includes(filters.category));
}

// Picker-only discovery slot. Proposal commands keep the pure score ranking.
export function selectPickerSuggestions(ranked) {
  const result = ranked.slice(0, 2);
  const chosen = new Set(result.map(entry => entry.meal.id));
  const remaining = ranked.filter(entry => !chosen.has(entry.meal.id));
  const discovery = remaining.find(entry => entry.daysSince == null)
    || remaining.find(entry => entry.daysSince >= 56)
    || remaining[0];
  if (discovery) result.push(discovery);
  return result.map(entry => entry.daysSince == null || entry.daysSince >= 56
    ? { ...entry, planningLabel: entry.daysSince == null ? "Aldri i planen" : "Ikke i planen på lenge" } : entry);
}
