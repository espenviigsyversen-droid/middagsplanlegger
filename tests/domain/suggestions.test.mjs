import assert from "node:assert/strict";
import {
  scoreCategoryPreference,
  scoreMealFit,
  scoreMealRecency,
  scoreRecentCategoryUse,
} from "../../src/domain/suggestions.js";

function testMealRecencyScore() {
  assert.equal(scoreMealRecency(null), 18);
  assert.equal(scoreMealRecency(7), -95);
  assert.equal(scoreMealRecency(14), -58);
  assert.equal(scoreMealRecency(21), -30);
  assert.equal(scoreMealRecency(28), -14);
  assert.equal(scoreMealRecency(35), 0);
}

function testRecentCategoryUseScore() {
  assert.equal(scoreRecentCategoryUse(6), -22);
  assert.equal(scoreRecentCategoryUse(4), -14);
  assert.equal(scoreRecentCategoryUse(2), -6);
  assert.equal(scoreRecentCategoryUse(1), 0);
}

function testMealFitScore() {
  assert.equal(
    scoreMealFit(
      { favorite: true, kidFriendly: true, prepTime: "quick", leftovers: "likely", suitability: ["weekend"] },
      { wantsQuick: true, dayType: "weekend", preferLeftovers: true },
    ),
    101,
  );

  assert.equal(
    scoreMealFit(
      { favorite: false, kidFriendly: false, prepTime: "medium", leftovers: "unlikely", suitability: [] },
      { wantsQuick: true, dayType: "weekday", preferLeftovers: true },
    ),
    0,
  );
}

function testCategoryPreferenceScore() {
  assert.equal(
    scoreCategoryPreference(["fisk", "vegetar"], {
      counts: { fisk: 0, vegetar: 2 },
      goalsByCategory: {
        fisk: { minPerWeek: 1, minEveryWeeks: 2 },
        vegetar: { maxPerWeek: 2 },
      },
      dueCategories: ["fisk"],
    }),
    -10,
  );

  assert.equal(scoreCategoryPreference(["pasta"], { goalsByCategory: {} }), 0);
}

testMealRecencyScore();
testRecentCategoryUseScore();
testMealFitScore();
testCategoryPreferenceScore();

console.log("suggestions domain tests ok");
