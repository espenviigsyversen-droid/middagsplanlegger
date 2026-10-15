import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

// Real rendering and event handlers, with a small local DOM stub that replaces nodes on innerHTML.
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl, "utf8");
const imports = /import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g, bindings = {};
for (const match of source.matchAll(imports)) {
  const module = await import(new URL(match[2], appUrl));
  for (const entry of match[1].slice(1, -1).split(",").filter(item => item.trim())) {
    const [name, alias = name] = entry.trim().split(/\s+as\s+/); bindings[alias] = module[name];
  }
}
source = source.replace(imports, "").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/, "");
const decode = value => value.replaceAll("&quot;", '"').replaceAll("&#039;", "'")
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const documentEvents = {};
const document = { activeElement: null, addEventListener(type, fn) { documentEvents[type] = fn; }, visibilityState: "visible",
  documentElement: { scrollTop: 0 }, body: { style: {} } };
const classes = new Set();
document.body.classList = { contains: key => classes.has(key), add: key => classes.add(key), remove: key => classes.delete(key),
  toggle: (key, on) => on ? classes.add(key) : classes.delete(key) };
const focusCalls = [], scrollWrites = [], storage = new Map();
class Node {
  constructor(tag = "div", attrs = {}) {
    this.tagName = tag; this.attrs = attrs; this.children = []; this.parent = null; this.style = {}; this.handlers = {};
    this.dataset = Object.fromEntries(Object.entries(attrs).filter(([key]) => key.startsWith("data-"))
      .map(([key, value]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
    this.checked = "checked" in attrs; this.value = attrs.value || ""; this.disabled = "disabled" in attrs; this._scrollTop = 0;
  }
  get scrollTop() { return this._scrollTop; }
  set scrollTop(value) { this._scrollTop = value; scrollWrites.push([this.dataset.scrollKey, value]); }
  matches(selector) {
    if (selector.startsWith(".")) return (this.attrs.class || "").split(/\s+/).includes(selector.slice(1));
    if (selector.startsWith("#")) return this.attrs.id === selector.slice(1);
    const attribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
    return attribute ? attribute[1] in this.attrs && (attribute[2] === undefined || this.attrs[attribute[1]] === attribute[2])
      : this.tagName === selector;
  }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  focus(options) {
    document.activeElement = this; focusCalls.push({ key: this.dataset.focusKey, options });
    // Model the unwanted scroll when focus() is called without preventScroll.
    if (!options?.preventScroll) { const scroller = this.closest("[data-scroll-key]"); if (scroller) scroller.scrollTop = 0; }
  }
  blur() { if(document.activeElement===this) document.activeElement=null; }
  select() {}
  setSelectionRange() {}
  scrollIntoView() {}
  set innerHTML(html) {
    const replacedFocusedNode = this.contains(document.activeElement);
    this.html = html; this.children = [];
    const stack = [this], voidTags = new Set(["input", "br", "hr", "img", "path", "circle", "rect"]);
    for (const match of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*)>/gi)) {
      const tag = match[1].toLowerCase();
      if (match[0].startsWith("</")) {
        if (stack.at(-1)?.tagName === tag) stack.pop();
        continue;
      }
      const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g)]
        .map(attribute => [attribute[1], decode(attribute[2] ?? attribute[3] ?? "")]));
      const child = new Node(tag, attrs); child.parent = stack.at(-1); child.parent.children.push(child);
      if (!voidTags.has(tag) && !match[0].endsWith("/>")) stack.push(child);
    }
    if (replacedFocusedNode && !this.contains(document.activeElement)) document.activeElement = null;
  }
  get innerHTML() { return this.html || ""; }
}
const app = new Node();
document.querySelector = selector => selector === "#app" ? app : null;
const pageScrolls = [];
const media = {matches:false,addEventListener(type,fn){this.changed=fn;}};
const window = { matchMedia:query=>query==="(min-width: 900px)"?media:{matches:false},addEventListener() {}, scrollY: 330, scrollTo: (x, y) => { pageScrolls.push([x, y]); window.scrollY = y; } };
const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console, document, window,
  navigator: { onLine: false }, setTimeout() {}, clearTimeout() {},
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);

run('accessState={kind:"ready",offline:true};loadAiKeyStatus=async()=>{};state.meals=normalizeMeals([{...emptyMeal(),id:"fish",title:"Fisk med ris",categories:["fisk"],suitability:["weekend"],prepTime:"quick",kidFriendly:true,favorite:true,ingredients:[{name:"Ris"}],steps:["Kok"]},{...emptyMeal(),id:"pasta",title:"Pasta",categories:["pasta"],suitability:["weekday"],prepTime:"medium",ingredients:[{name:"Pasta"}],steps:["Kok"]},{...emptyMeal(),id:"missing",title:"Fisk uten innhold",prepTime:"",categories:["fisk"]}]);navigate({activeView:"meals"})');
const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
const click=selector=>{const node=app.querySelector(selector);assert.ok(node,selector);node.focus({preventScroll:true});node.handlers.click({preventDefault(){}});};
assert.doesNotMatch(app.innerHTML,/meal-search-suggestion|<select/);
assert.match(app.innerHTML,/3 oppskrifter/);assert.match(app.innerHTML,/data-meal-sort="category" aria-pressed="true"/);
click("[data-meal-filters-toggle]");assert.match(app.innerHTML,/data-meal-filter="needsRecipe"/);click("[data-meal-filters-close]");
const search=app.querySelector('[data-meal-search]');search.focus({preventScroll:true});search.selectionStart=4;search.selectionEnd=4;search.value='Fisk';search.handlers.input();
assert.equal(app.querySelector('[data-meal-search]'),search);assert.equal(document.activeElement,search);assert.equal(search.selectionStart,4);assert.match(app.querySelector('[data-meal-results]').innerHTML,/2 treff/);assert.doesNotMatch(app.querySelector('[data-meal-list]').innerHTML,/Pasta/);
search.handlers.keydown({key:'Enter',preventDefault(){}});assert.equal(document.activeElement,null);assert.equal(run('state.filters.query'),'Fisk');
window.scrollY=600;const strip=app.querySelector('[data-scroll-key="meal-filters"]');strip.scrollLeft=150;click('[data-meal-filter="quick"]');
assert.equal(window.scrollY,600);assert.equal(app.querySelector('[data-scroll-key="meal-filters"]').scrollLeft,150);assert.equal(document.activeElement.dataset.focusKey,'meal-filter:quick');assert.match(app.innerHTML,/1 treff/);
click('[data-meal-filter="kidFriendly"]');click('[data-meal-filter="favorite"]');click('[data-meal-filters-toggle]');click('[data-meal-filter="suitability:weekend"]');click('[data-meal-filter="category:fisk"]');assert.deepEqual(json('filteredMeals().map(m=>m.id)'),['fish']);
click('[data-meal-filter="category:pasta"]');assert.equal(run('state.filters.category'),'pasta');assert.match(app.innerHTML,/Ingen oppskrifter passer/);assert.match(app.innerHTML,/Nullstill søk og filtre/);
click('[data-meal-filters-close]');click('[data-reset-meal-filters]');assert.equal(run('state.filters.query'),'');assert.equal(run('mealListFiltersActive()'),false);
click('[data-meal-sort="alpha"]');assert.deepEqual(JSON.parse(storage.get('middagsapp-state')).filters,{sort:'alpha',frameOpen:true});
click('[data-meal-filters-toggle]');click('[data-meal-filter="needsRecipe"]');click('[data-meal-filters-close]');assert.deepEqual(json('filteredMeals().map(m=>m.id)'),['missing']);
run('state.filters.query="Fisk";openRecipeFromView("missing",null);backInApp()');assert.equal(run('state.filters.query'),'Fisk');assert.equal(run('state.filters.needsRecipe'),true);
run('navigate({activeView:"week"});navigate({activeView:"meals"})');assert.equal(run('state.filters.needsRecipe'),true);
run('saveState()');assert.deepEqual(JSON.parse(storage.get('middagsapp-state')).filters,{sort:'alpha',frameOpen:true});assert.equal(run('loadState().filters.query'),'');assert.equal(run('loadState().filters.needsRecipe'),false);assert.equal(run('loadState().filters.sort'),'alpha');
click('[data-reset-meal-filters]');assert.equal(run('state.filters.sort'),'alpha');assert.match(app.innerHTML,/data-meal-sort="alpha" aria-pressed="true"/);
run('state.meals=state.meals.filter(m=>m.id!=="missing");render()');assert.doesNotMatch(app.innerHTML,/data-meal-filter="needsRecipe"/);
const old=run('normalizeStateForStartup({...state,filters:{query:"Fisk",category:"fisk",flag:"favorite",sort:"alpha"}})');assert.equal(old.filters.query,'');assert.equal(old.filters.category,'all');assert.equal(old.filters.favorite,false);assert.equal(old.filters.sort,'alpha');
run('state.activeView="week";openMealPicker(0);togglePickerFilter("quick")');assert.equal(run('state.filters.quick'),false);assert.equal(run('pickerFilters.quick'),true);
console.log('meal list search/filter tests ok (partial render, focus, memory, sort, navigation and independent picker)');

// v124 surfaces and UI-only storage preference.
run('closeMealPicker();navigate({activeView:"meals"});state.filters={...defaultState.filters};render()');
assert.equal(run('mealFilterSheetOpen'),false);click('[data-meal-filters-toggle]');
assert.equal(run('mealFilterSheetOpen'),true);assert.ok(json('navigationLevels()').includes('meal-filters'));
assert.equal(document.activeElement.dataset.focusKey,'meal-filters-reset');
let group=app.querySelector('[data-scroll-key="meal-filter-groups"]');group.scrollTop=75;
click('[data-meal-filter="category:fisk"]');assert.equal(app.querySelector('[data-scroll-key="meal-filter-groups"]').scrollTop,75);
assert.equal(document.activeElement.dataset.focusKey,'meal-group-filter:category:fisk');assert.equal(run('mealFilterSheetOpen'),true);
run('backInApp()');assert.equal(run('mealFilterSheetOpen'),false);assert.equal(document.activeElement.dataset.focusKey,'meal-filters-toggle');assert.equal(run('state.filters.category'),'fisk');
click('[data-meal-filters-toggle]');const backdrop=app.querySelector('[data-meal-filters-backdrop]');backdrop.handlers.click({target:backdrop,currentTarget:backdrop});assert.equal(run('mealFilterSheetOpen'),false);
media.matches=true;media.changed();assert.match(app.innerHTML,/meal-filter-frame/);assert.doesNotMatch(app.innerHTML,/role="dialog"/);
click('[data-meal-filters-close]');assert.equal(JSON.parse(storage.get('middagsapp-state')).filters.frameOpen,false);assert.equal(run('loadState().filters.frameOpen'),false);
click('[data-meal-filters-toggle]');assert.equal(JSON.parse(storage.get('middagsapp-state')).filters.frameOpen,true);assert.equal(run('state.filters.category'),'fisk');
media.matches=false;media.changed();assert.ok(app.querySelector('[data-meal-filters-toggle]'));assert.doesNotMatch(app.innerHTML,/meal-filter-frame/);
run('navigate({activeView:"week"});openMealPicker(0)');assert.equal(run('pickerFilterGroupsOpen'),false);
click('[data-picker-filters-toggle]');assert.equal(run('pickerFilterGroupsOpen'),true);assert.ok(json('navigationLevels()').includes('picker-filter-groups'));
run('backInApp()');assert.equal(run('pickerFilterGroupsOpen'),false);assert.equal(run('state.mealPicker.open'),true);
click('[data-picker-filters-toggle]');click('[data-picker-filters-close]');assert.equal(run('pickerFilterGroupsOpen'),false);
run('closeMealPicker();openMealPicker(0)');assert.equal(run('pickerFilterGroupsOpen'),false);

run('closeMealPicker();navigate({activeView:"meals"});state.filters={...defaultState.filters};render()');
click('[data-meal-filters-toggle]');click('[data-meal-filter="suitability:weekday"]');click('[data-meal-filters-close]');
click('[data-meal-filter="suitability:weekday"]');assert.equal(run('state.filters.suitability'),'');assert.equal(document.activeElement.dataset.focusKey,'meal-filters-toggle');
click('[data-meal-filters-toggle]');const pushesBefore=run('navigationLevels().length');run('render();render()');assert.equal(run('navigationLevels().length'),pushesBefore);
const dialog=app.querySelector('#meal-filter-panel'),buttons=dialog.querySelectorAll('button');buttons.at(-1).focus({preventScroll:true});
let prevented=false;documentEvents.keydown({key:'Tab',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(document.activeElement.dataset.focusKey,'meal-filters-reset');
documentEvents.keydown({key:'Escape',preventDefault(){}});assert.equal(run('mealFilterSheetOpen'),false);assert.equal(document.activeElement.dataset.focusKey,'meal-filters-toggle');
click('[data-meal-filters-toggle]');media.matches=true;media.changed();assert.equal(run('mealFilterSheetOpen'),false);assert.match(app.innerHTML,/meal-filter-frame/);
// Crossing the breakpoint never redraws an unrelated view or a partially typed editor.
run('navigate({activeView:"meals",editingMealId:"new"})');const editorMarkup=app.innerHTML;media.matches=false;media.changed();assert.equal(app.innerHTML,editorMarkup);
