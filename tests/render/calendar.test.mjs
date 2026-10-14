import assert from "node:assert/strict";
import { renderCalendarView, renderWeekRowView } from "../../src/render/calendar.js";

const escapeHtml = (value) => String(value ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function testCalendarRender() {
  const row = renderWeekRowView({ shortDay: "Man", dateLabel: "25. mai", title: "", showPlanner: true, escapeHtml });
  assert.match(row, /Ikke planlagt/);
  assert.match(row, /data-calendar-day="0"/);
  assert.doesNotMatch(row, />Planlegg</);

  const page = renderCalendarView({ weekRangeLabel: "18. mai - 24. mai", weekRowsHtml: row, isCurrentWeek: true, escapeHtml });
  assert.match(page, /Middagsplan/);
  assert.match(page, /Hele uken/);
  assert.doesNotMatch(page, /today-summary/);
  const planned = renderWeekRowView({day:"Onsdag",shortDay:"Ons",dateLabel:"14. okt.",title:"Kyllingwok",mealId:"wok",dayIndex:2,showRecipe:true,isToday:true,note:"Notat <test>",escapeHtml});
  assert.match(planned, /<button class="week-row is-today"/);
  assert.match(planned, /aria-label="Onsdag 14\. okt\., Kyllingwok, åpne oppskrift"/);
  assert.match(planned, /data-view-meal="wok" data-recipe-day="2"/);
  assert.match(planned, /week-today-badge">I dag/); assert.match(planned, /Notat &lt;test&gt;/);
  assert.doesNotMatch(planned, />Oppskrift</);
  assert.doesNotMatch(renderWeekRowView({isToday:false}), /is-today|week-today-badge/);
}

testCalendarRender();

console.log("calendar render tests ok");
