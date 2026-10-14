import { dateForWeekDay, getWeekKeyForDate, localDateKey } from "./weeks.js";

export function canonicalView(view) { return view === "calendar" || view === "planner" ? "week" : view; }

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function weekDateRange(dates, long = false) {
  const first = dates[0], last = dates[6];
  const shortMonths = ["jan.", "feb.", "mars", "apr.", "mai", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "des."];
  const month = date => long ? date.toLocaleDateString("nb-NO", { month: "long" }) : shortMonths[date.getMonth()];
  return first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()
    ? `${first.getDate()}.–${last.getDate()}. ${month(last)}`
    : `${first.getDate()}. ${month(first)}–${last.getDate()}. ${month(last)}`;
}

export function weekHeading(dates, offset) {
  const number = isoWeekNumber(dates[0]);
  const title = offset === 0 ? "Denne uken" : offset === 1 ? "Neste uke" : offset === -1 ? "Forrige uke" : `Uke ${number}`;
  return { number, title, subtitle: `Uke ${number} · ${weekDateRange(dates)}`, dates: weekDateRange(dates, true) };
}

export function weekEligibleDays(plan, locks, modes, isHome) {
  return Array.from({ length: 7 }, (_, index) => index).filter(index => !locks[index] && isHome(modes[index]));
}

export function weekSwipeDirection(start, end, width) {
  if (!start || !end || width < 48 || start.x < 24 || start.x > width - 24) return 0;
  const dx = end.x - start.x, dy = end.y - start.y;
  return Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5 ? dx < 0 ? 1 : -1 : 0;
}

export function lastPlannedLabel(plans, mealId, targetDate) {
  const target = localDateKey(targetDate);
  let last = "";
  for (const [weekKey, plan] of Object.entries(plans || {})) {
    for (const [day, id] of Object.entries(plan || {})) {
      if (id !== mealId || !/^[0-6]$/.test(day)) continue;
      const date = localDateKey(dateForWeekDay(weekKey, Number(day)));
      if (date < target && date > last) last = date;
    }
  }
  if (!last) return "";
  const utc = key => Date.UTC(...key.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0)));
  const weeks = Math.round((utc(getWeekKeyForDate(targetDate)) - utc(getWeekKeyForDate(new Date(`${last}T12:00:00`)))) / 604800000);
  return weeks === 1 ? "Sist i planen forrige uke" : weeks > 1 ? `Sist i planen for ${weeks} uker siden` : "";
}
