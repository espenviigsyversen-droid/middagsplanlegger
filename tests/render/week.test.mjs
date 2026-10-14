import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderWeekView, renderWeekRow, renderDaySheet, renderWeekMenu, renderWeekClear } from "../../src/render/week.js";
const e=value=>String(value??"").replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const heading={title:"Denne uken",number:42,subtitle:"Uke 42 · 12.–18. okt.",dates:"12.–18. oktober"};
const row = options => renderWeekRow({day:"Onsdag",dateLabel:"14. okt.",index:2,title:"Wok",home:true,mealId:"wok",escapeHtml:e,...options});
assert.match(row({locked:true,isToday:true,ownServings:6,note:"<notat>"}), /role="img" aria-label="Låst"/);
assert.match(row({locked:true,isToday:true,ownServings:6,note:"<notat>"}), /6 porsjoner · &lt;notat&gt;/);
assert.match(row({}),/data-view-meal="wok" data-recipe-day="2"/);assert.match(row({}),/aria-label="Endre onsdag"/);
assert.doesNotMatch(row({}),/week-today-label/);
const empty=row({mealId:"",locked:true});assert.match(empty,/data-open-meal-picker="2"/);assert.doesNotMatch(empty,/week-pencil/);
assert.match(row({home:false,title:"Spise borte"}),/data-edit-planner-day="2"/);
for (const offset of [0,1]) {
 const html=renderWeekView({heading,offset,emptyCount:1,rowsHtml:row({}),windowsHtml:"",escapeHtml:e});
 assert.match(html,/Foreslå til 1 tom dag/);
 assert.equal(html.includes('aria-label="Gå til denne uken"'),Boolean(offset));
 assert.equal(html.includes('class="week-today"'),Boolean(offset));
}
assert.match(renderWeekView({heading,offset:0,emptyCount:0,rowsHtml:"",escapeHtml:e}),/Alle dager er planlagt/);
const options={day:"Tirsdag",dateLabel:"13. oktober",index:1,locked:true,home:true,meal:{id:"a",title:"Pasta",description:"PASTA 🍝"},planLabel:"Middag hjemme",dayMode:"home",dayType:"weekday",dayNote:"",servings:4,ownServings:null,standard:4,modes:[["home",{label:"Middag hjemme"}]],types:[["weekday","Hverdag"]],escapeHtml:e};
const sheet=renderDaySheet(options);
assert.doesNotMatch(sheet,/PASTA 🍝/);assert.match(sheet,/data-random-day="1" disabled/);
assert.match(sheet,/Dagen er låst – Foreslå hopper over den/);
assert.doesNotMatch(sheet,/data-open-meal-picker="1" disabled/);
assert.match(sheet,/role="switch" aria-checked="true"/);assert.match(sheet,/Fjern middag fra tirsdag/);
assert.match(sheet,/Følger standarden/);assert.match(sheet,/data-scroll-key="planner-day"/);
assert.match(renderDaySheet({...options,meal:null}),/Ingen middag valgt/);
assert.doesNotMatch(renderDaySheet({...options,home:false,meal:null}),/Bytt middag|Åpne oppskrift|Velg middag/);
const menu=renderWeekMenu({heading,emptyDays:["Mandag","Tirsdag"],replaceCount:6,escapeHtml:e});
assert.match(menu,/Fyller mandag og tirsdag/);assert.match(menu,/ikke er låst \(6 dager\)/);assert.doesNotMatch(menu,/Oppdag/);
assert.match(renderWeekMenu({heading,emptyDays:[],replaceCount:0,escapeHtml:e}),/data-replace-open-week disabled/);
assert.match(renderWeekClear({heading,escapeHtml:e}),/planvalg, dagstyper, porsjoner og notater/);
const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
assert.match(css,/repeat\(3, minmax\(0, 1fr\)\)/);assert.match(css,/#e3efe8/);assert.match(css,/\.week-view \{ max-width: 720px/);
assert.doesNotMatch(css,/\.planner-fab|\.calendar-view-header|\.planner-day-card/);

// v113: anonymous examples and explicit picker colors/focus rules.
assert.match(sheet,/placeholder="F.eks. spiser tidlig, trening eller gjester"/);
const pickerBase=/\.meal-picker-item\s*\{([^}]+)\}/.exec(css)?.[1];
assert.match(pickerBase,/color:\s*var\(--text\)/);
assert.match(css,/\.picker-suggestion strong\s*\{[^}]*color:\s*var\(--text\)/);
const pickerHover=/\.meal-picker-item:hover\s*\{([^}]+)\}/.exec(css)?.[1];
assert.doesNotMatch(pickerHover,/border-color/,'Hover must never mimic the selected border');
assert.match(css,/@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.meal-picker-item:hover/);
assert.match(css,/\.meal-picker-item:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--brand\)/);
assert.match(css,/\.meal-picker-item:focus:not\(:focus-visible\)\s*\{[^}]*outline:\s*none/);
const namePattern=/(?<![\p{L}\p{N}_-])(?:Line|Espen|Floan|Syversen|Viig)(?![\p{L}\p{N}_-])/iu;
const {readdirSync}=await import('node:fs');
function checkAnonymous(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=new URL(entry.name,dir);if(entry.isDirectory())checkAnonymous(new URL(entry.name+'/',dir));else assert.doesNotMatch(readFileSync(file,'utf8'),namePattern,file.pathname);}}
checkAnonymous(new URL('../../src/',import.meta.url));
for(const path of ['../../app.js','../../index.html'])assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),namePattern,path);

console.log("week render tests ok");
