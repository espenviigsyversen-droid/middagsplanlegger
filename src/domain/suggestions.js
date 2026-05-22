export function scoreMealRecency(daysSince) {
  if (daysSince === null || daysSince === undefined) return 18;
  if (daysSince <= 7) return -95;
  if (daysSince <= 14) return -58;
  if (daysSince <= 21) return -30;
  if (daysSince <= 28) return -14;
  return 0;
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
  if (meal?.favorite) score += 20;
  if (meal?.kidFriendly) score += 15;
  if (wantsQuick && meal?.prepTime === "quick") score += 25;
  if (preferLeftovers && meal?.leftovers === "likely") score += 6;
  if ((meal?.suitability || []).includes(dayType)) score += 35;
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
