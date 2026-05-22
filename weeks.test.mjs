import assert from "node:assert/strict";
import {
  dateForWeekDay,
  daysBetweenDates,
  emptyWeekDayModes,
  emptyWeekDayNotes,
  emptyWeekDayTypes,
  emptyWeekLocks,
  emptyWeekPlan,
  emptyWeekServings,
  getDayIndexForDate,
  getWeekDatesForOffset,
  getWeekKeyForDate,
  getWeekKeyForOffset,
  localDateKey,
  weekKeyOffset,
} from "../../src/domain/weeks.js";

function noonDate(value) {
  return new Date(`${value}T12:00:00`);
}

function testWeekKeysAndDates() {
  const wednesday = noonDate("2026-05-20");
  const dates = getWeekDatesForOffset(0, wednesday);

  assert.equal(localDateKey(dates[0]), "2026-05-18");
  assert.equal(localDateKey(dates[6]), "2026-05-24");
  assert.equal(getWeekKeyForOffset(1, wednesday), "2026-05-25");
  assert.equal(getWeekKeyForOffset(-1, wednesday), "2026-05-11");
}

function testWeekKeyForDate() {
  assert.equal(getWeekKeyForDate(noonDate("2026-05-18")), "2026-05-18");
  assert.equal(getWeekKeyForDate(noonDate("2026-05-20")), "2026-05-18");
  assert.equal(getWeekKeyForDate(noonDate("2026-05-24")), "2026-05-18");
  assert.equal(getWeekKeyForDate(noonDate("2026-05-25")), "2026-05-25");
}

function testDayIndexAndLocalKey() {
  assert.equal(getDayIndexForDate(noonDate("2026-05-18")), 0);
  assert.equal(getDayIndexForDate(noonDate("2026-05-23")), 5);
  assert.equal(getDayIndexForDate(noonDate("2026-05-24")), 6);
  assert.equal(localDateKey(noonDate("2026-05-04")), "2026-05-04");
}

function testEmptyWeekObjects() {
  assert.deepEqual(emptyWeekPlan(), { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
  assert.deepEqual(emptyWeekLocks(), { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
  assert.deepEqual(emptyWeekDayTypes(), { 0: "weekday", 1: "weekday", 2: "weekday", 3: "weekday", 4: "weekday", 5: "weekend", 6: "weekend" });
  assert.deepEqual(emptyWeekDayModes(), { 0: "home", 1: "home", 2: "home", 3: "home", 4: "home", 5: "home", 6: "home" });
  assert.deepEqual(emptyWeekDayNotes(), { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
  assert.deepEqual(emptyWeekServings(3), { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3 });
  assert.deepEqual(emptyWeekServings(0), { 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5 });
}

function testWeekOffsetsAndDistances() {
  assert.equal(localDateKey(dateForWeekDay("2026-05-18", 0)), "2026-05-18");
  assert.equal(localDateKey(dateForWeekDay("2026-05-18", 6)), "2026-05-24");
  assert.equal(daysBetweenDates(noonDate("2026-05-18"), noonDate("2026-05-25")), 7);
  assert.equal(daysBetweenDates(noonDate("2026-05-25"), noonDate("2026-05-18")), 7);
  assert.equal(weekKeyOffset("2026-05-18", 1), "2026-05-25");
  assert.equal(weekKeyOffset("2026-05-18", -2), "2026-05-04");
}

testWeekKeysAndDates();
testWeekKeyForDate();
testDayIndexAndLocalKey();
testEmptyWeekObjects();
testWeekOffsetsAndDistances();

console.log("weeks domain tests ok");
