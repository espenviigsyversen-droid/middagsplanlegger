import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mealFilterGroups, renderMealFilters, toggleMealFilter, mealFiltersActive } from "../../src/render/meal-filters.js";
import { renderMealsView, renderMealResultsView } from "../../src/render/meals.js";
import { mealMatchesPickerFilters } from "../../src/domain/suggestions.js";

const entries = {suitabilityEntries:[["weekday","Hverdag"],["weekend","Helg"],["custom","Turdag"]],categoryEntries:[["fisk","Fisk"],["pasta","Pasta"]]};
let filters = {category:"all",suitability:"",sort:"alpha"};
for (const key of ["quick","kidFriendly","favorite","suitability:weekend","category:fisk"]) filters=toggleMealFilter(filters,key);
const meal={prepTime:"quick",kidFriendly:true,favorite:true,suitability:["weekend"],categories:["fisk"],ingredients:[{name:"Fisk"}]};
assert.equal(mealMatchesPickerFilters(meal,filters),true);
for (const patch of [{prepTime:"medium"},{kidFriendly:false},{favorite:false},{suitability:[]},{categories:["pasta"]}]) assert.equal(mealMatchesPickerFilters({...meal,...patch},filters),false);
filters=toggleMealFilter(filters,"category:pasta");assert.equal(filters.category,"pasta");
filters=toggleMealFilter(filters,"category:pasta");assert.equal(filters.category,"all");
filters=toggleMealFilter(filters,"suitability:weekday");assert.equal(filters.suitability,"weekday");
filters=toggleMealFilter(filters,"suitability:weekday");assert.equal(filters.suitability,"");
assert.equal(mealMatchesPickerFilters({ingredients:[],steps:[]},{needsRecipe:true}),true);
assert.equal(mealMatchesPickerFilters(meal,{needsRecipe:true}),false);
assert.equal(mealMatchesPickerFilters({recipeUrl:"https://example.com"},{needsRecipe:true}),false,"Keep the existing mealNeedsRecipe definition");
const html=renderMealFilters({...entries,filters,scope:"meal",showNeedsRecipe:true,expanded:true});
assert.match(html,/data-meal-filter="suitability:custom"[^>]*>Turdag/);
assert.equal((html.match(/role="group"/g)||[]).length,4);
assert.ok(html.indexOf('>Favoritter')<html.indexOf('>Hverdag')&&html.indexOf('>Turdag')<html.indexOf('>Fisk')&&html.indexOf('>Pasta')<html.indexOf('>Mangler oppskrift'));
assert.doesNotMatch(renderMealFilters({...entries}),/Mangler oppskrift/);
assert.equal(mealFiltersActive({sort:"alpha",query:""}),false);
assert.match(renderMealResultsView({count:41}),/41 oppskrifter/);
assert.match(renderMealResultsView({count:1}),/1 oppskrift</);
assert.match(renderMealResultsView({count:1,filters:{query:"fisk"}}),/1 treff/);
assert.match(renderMealResultsView({count:5,filters:{favorite:true}}),/5 treff/);
assert.doesNotMatch(renderMealResultsView({count:5,filters:{favorite:true}}),/data-meal-sort/);
assert.match(renderMealsView({meals:[]}),/Ingen oppskrifter passer.*Nullstill søk og filtre/s);
const sw=readFileSync(new URL('../../service-worker.js',import.meta.url),'utf8');assert.equal(sw.split('src/render/meal-filters.js').length-1,2);
for(const file of ['../../app.js','../../src/render/meals.js','../../styles.css']) assert.doesNotMatch(readFileSync(new URL(file,import.meta.url),'utf8'),/renderMealSearchSuggestions|meal-search-suggestion/);
console.log('shared meal filters render/domain tests ok');

const order = mealFilterGroups({categoryEntries:[["a","Ål"],["b","Ørret"],["c","Ærter"],["d","Bønner"],["e","Fisk"]],suitabilityEntries:entries.suitabilityEntries});
assert.deepEqual(order[1].entries.map(([,label])=>label),["Hverdag","Helg","Turdag"]);
assert.deepEqual(order[2].entries.map(([,label])=>label),["Bønner","Fisk","Ærter","Ørret","Ål"]);
const compact=renderMealFilters({...entries});
assert.equal((compact.match(/<button /g)||[]).length,4);assert.doesNotMatch(compact,/role="group"/);
const chosen=renderMealFilters({...entries,filters:{category:"fisk",suitability:"weekday",quick:true}});
assert.match(chosen,/filter-count">2</);assert.match(chosen,/aria-label="Fjern filter Fisk"/);
assert.ok(chosen.indexOf('Fjern filter Fisk')<chosen.indexOf('data-picker-filter="quick"'));
assert.ok(chosen.indexOf('Fjern filter Hverdag')<chosen.indexOf('data-picker-filter="quick"'));
for (const count of [0,1,3]) assert.match(renderMealFilters({...entries,scope:"meal",expanded:true,count}),new RegExp(`Vis ${count} ${count===1?"oppskrift":"oppskrifter"}<`));
const desktop=renderMealFilters({...entries,scope:"meal",desktop:true,showNeedsRecipe:true});
assert.equal((desktop.match(/role="group"/g)||[]).length,3);assert.match(desktop,/Skjul filtre/);assert.doesNotMatch(desktop,/role="dialog"|>ANNET</);
assert.match(renderMealFilters({...entries,scope:"meal",desktop:true,filters:{frameOpen:false}}),/data-meal-filters-toggle/);
const picker=renderMealFilters({...entries,expanded:true,showNeedsRecipe:true});assert.match(picker,/Ferdig/);assert.doesNotMatch(picker,/Mangler oppskrift|role="dialog"/);

for (const markup of [html,desktop,picker]) {
  const keys=[...markup.matchAll(/data-focus-key="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(keys).size,keys.length,"Repeated filter controls must have unique focus identities");
}
const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
assert.match(css,/\.filter-compact \.picker-filter\s*\{[^}]*height: 40px[^}]*font-size: 13px/s);
assert.match(css,/\.filter-sheet-header \.modal-close\s*\{[^}]*width: 44px; height: 44px/s);
assert.match(css,/\.filter-group-scroll\s*\{[^}]*overflow-y: auto/s);
assert.match(css,/\.picker-filter-panel\s*\{[^}]*max-height: 45vh/s);
