export function getWeekDatesForOffset(offset = 0, baseDate = new Date()) {
  const today = new Date(baseDate);
  const monday = new Date(today);
  const day = monday.getDay() || 7;
  monday.setDate(today.getDate() - day + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function getWeekKeyForOffset(offset = 0, baseDate = new Date()) {
  return localDateKey(getWeekDatesForOffset(offset, baseDate)[0]);
}

export function getWeekKeyForDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return localDateKey(d);
}

export function getDayIndexForDate(date) {
  const day = new Date(date).getDay();
  return day === 0 ? 6 : day - 1;
}

export function localDateKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function emptyWeekPlan() {
  return { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
}

export function emptyWeekLocks() {
  return { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
}

export function emptyWeekDayTypes() {
  return { 0: "weekday", 1: "weekday", 2: "weekday", 3: "weekday", 4: "weekday", 5: "weekend", 6: "weekend" };
}

export function emptyWeekDayModes() {
  return { 0: "home", 1: "home", 2: "home", 3: "home", 4: "home", 5: "home", 6: "home" };
}

export function emptyWeekDayNotes() {
  return { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
}

export function emptyWeekServings(familySize = 5) {
  const servings = Math.max(1, Number(familySize) || 5);
  return { 0: servings, 1: servings, 2: servings, 3: servings, 4: servings, 5: servings, 6: servings };
}

export function dateForWeekDay(weekKey, dayIndex) {
  const date = new Date(`${weekKey}T00:00:00`);
  date.setDate(date.getDate() + Number(dayIndex));
  return date;
}

export function daysBetweenDates(a, b) {
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));
}

export function weekKeyOffset(weekKey, offsetWeeks) {
  const date = new Date(`${weekKey}T00:00:00`);
  date.setDate(date.getDate() + offsetWeeks * 7);
  return localDateKey(date);
}
