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
const document = { activeElement: null, addEventListener() {}, visibilityState: "visible",
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
  select() {}
  setSelectionRange() {}
  scrollIntoView() {}
  set innerHTML(html) {
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
    if (!this.contains(document.activeElement)) document.activeElement = null;
  }
  get innerHTML() { return this.html || ""; }
}
const app = new Node();
document.querySelector = selector => selector === "#app" ? app : null;
const pageScrolls = [];
const window = { addEventListener() {}, scrollY: 330, scrollTo: (x, y) => { pageScrolls.push([x, y]); window.scrollY = y; } };
const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console, document, window,
  navigator: { onLine: false }, setTimeout() {}, clearTimeout() {},
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);
context.checkExclusiveWindows = () => assert.equal(run("Boolean(state.plannerDaySheet?.open && state.mealPicker?.open)"), false,
  "The picker and day sheet must never be open in the same render");
run("const renderWithWindows = render; render = (...args) => { checkExclusiveWindows(); renderWithWindows(...args); };");
run('accessState={kind:"ready",offline:true}; loadAiKeyStatus=async()=>{}; state.activeView="shopping";');
const scroller = key => app.querySelector(`[data-scroll-key="${key}"]`);
const control = key => app.querySelectorAll("[data-focus-key]").find(node => node.dataset.focusKey === key) || null;
const activate = (key, type = "click", configure = () => {}) => {
  const target = control(key); assert.ok(target, key); target.focus({preventScroll:true}); configure(target);
  target.handlers[type]({ target, currentTarget: target, preventDefault() {} });
};
const expectFocus = key => {
  assert.equal(document.activeElement, control(key));
  assert.equal(focusCalls.at(-1).key, key); assert.equal(focusCalls.at(-1).options.preventScroll, true);
};

const review = { open: true, mode: "meal", title: "Legg til fra Lang oppskrift", groups: [
  { id: 'group:"a', title: "Mat", items: Array.from({length:23}, (_, index) => ({id:`item:${index}`,name:`Vare ${index}`,amount:"1",unit:"stk"})) },
], selectedItemIds: Array.from({length:23}, (_, index) => `item:${index}`) };
context.review = review; run("setState({shoppingReview:structuredClone(review)})");
const oldReview = scroller("shopping-review"); oldReview.scrollTop = 860;
activate("review-item:item:20", "change", node => { node.checked = false; });
assert.notEqual(scroller("shopping-review"), oldReview, "The render actually replaces DOM nodes");
assert.equal(scroller("shopping-review").scrollTop, 860); expectFocus("review-item:item:20");
assert.match(app.innerHTML, /22 av 23 varer er valgt/); assert.match(app.innerHTML, /22 av 23 valgt/);
assert.match(app.innerHTML, /Legg til 22 varer/);
activate("review-item:item:21", "change", node => { node.checked = false; });
assert.equal(scroller("shopping-review").scrollTop, 860); expectFocus("review-item:item:21");
assert.match(app.innerHTML, /21 av 23 varer er valgt/); assert.match(app.innerHTML, /Legg til 21 varer/);
activate('review-none:group:"a');
assert.equal(scroller("shopping-review").scrollTop, 860); expectFocus('review-none:group:"a');
assert.match(app.innerHTML, /0 av 23 valgt/); assert.match(app.innerHTML, /Legg til 0 varer/);
activate('review-all:group:"a');
assert.equal(scroller("shopping-review").scrollTop, 860); expectFocus('review-all:group:"a');
assert.match(app.innerHTML, /23 av 23 valgt/); assert.match(app.innerHTML, /Legg til 23 varer/);
activate("review-cancel"); assert.equal(scroller("shopping-review"), null);
run("setState({shoppingReview:structuredClone(review)})");
assert.equal(scroller("shopping-review").scrollTop, 0, "No position retained after closure");

// Days modal: actual checkbox change plus button count update, with a fresh scroller after closure.
run('setState({shoppingReview:{open:false},generateModal:{open:true,selectedDays:[]}})');
const daysScroller = scroller("generate-days"); assert.ok(daysScroller); daysScroller.scrollTop = 430;
const dayCheckbox = daysScroller.querySelectorAll("[data-modal-day]").at(-1);
activate(dayCheckbox.dataset.focusKey, "change", node => { node.checked = true; });
assert.equal(scroller("generate-days").scrollTop, 430); expectFocus(dayCheckbox.dataset.focusKey);
assert.match(app.innerHTML, /Generer liste \(1 dager\)/);
activate("generate-cancel"); run('setState({generateModal:{open:true,selectedDays:[]}})');
assert.equal(scroller("generate-days").scrollTop, 0);

// Planner body and a footer button outside the scroller keep position/focus.
run('setState({generateModal:{open:false},activeView:"week",plannerDaySheet:{open:true,dayIndex:2}})');
assert.ok(scroller("planner-day")); scroller("planner-day").scrollTop = 250;
activate("planner-plus:2");
assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-plus:2");
activate("planner-lock:2"); assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-lock:2");
assert.equal(control("planner-lock:2").attrs["aria-checked"], "true");

// The day sheet is suspended, and only the picker is rendered. Its own rerenders still preserve scroll/focus.
window.scrollY = 330; pageScrolls.length = 0; // Scroll the week after arriving at the top of this screen.
activate("planner-meal:2");
assert.equal(run("state.plannerDaySheet.open"), false); assert.equal(scroller("planner-day"), null);
assert.deepEqual(JSON.parse(run("JSON.stringify(navigationLevels())")), ["planner-day:2", "picker:2"]);
assert.equal(classes.has("meal-picker-open"), true); assert.equal(document.body.style.top, "-330px");
scroller("meal-picker").scrollTop = 360; control("picker-search").focus({preventScroll:true}); run("render()");
assert.equal(scroller("meal-picker").scrollTop, 360); expectFocus("picker-search");
assert.equal(scroller("planner-day"), null, "No hidden day-sheet DOM behind the picker");
assert.equal(pageScrolls.length, 0, "Rerender does not unlock or move the underlying page");
activate("picker-close"); assert.equal(classes.has("meal-picker-open"), false);
assert.deepEqual(pageScrolls, [[0,330]]);
assert.equal(run("state.plannerDaySheet.dayIndex"), 2); assert.equal(scroller("planner-day").scrollTop, 250);
expectFocus("planner-meal:2"); assert.equal(run("mealPickerReturn"), null);

activate("planner-meal:2");
const pickerBackdrop = app.querySelector("[data-close-meal-picker]");
pickerBackdrop.handlers.click({target:scroller("meal-picker"),currentTarget:pickerBackdrop});
assert.equal(run("state.mealPicker.open"), true, "An inside click must not dismiss the picker");
pickerBackdrop.handlers.click({target:pickerBackdrop,currentTarget:pickerBackdrop});
assert.equal(run("state.mealPicker.open"), false); assert.equal(run("state.plannerDaySheet.open"), true);
assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-meal:2");

// Selecting and clearing dinner returns to the same sheet, showing the latest plan and restoring its position.
run('state.meals=normalizeMeals([{...emptyMeal(),id:"pick",title:"Valgt middag"}]);');
activate("planner-meal:2");
const selected = app.querySelectorAll("[data-select-meal]").find(node => node.dataset.selectMeal === "pick");
assert.ok(selected); scroller("meal-picker").handlers.click({target:selected});
assert.equal(run("currentPlan()[2]"), "pick"); assert.equal(run("state.mealPicker.open"), false);
assert.equal(run("state.plannerDaySheet.open"), true); assert.match(app.innerHTML, /Valgt middag/);
assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-meal:2");
activate("planner-meal:2");
activate("picker-close");
app.querySelector("[data-remove-day-meal]").handlers.click();
assert.equal(run("currentPlan()[2]"), ""); assert.equal(run("state.plannerDaySheet.open"), true);
assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-meal:2");

// Creating a quick meal follows the same return flow and keeps scroll through the toast render.
activate("planner-meal:2");
run('state.mealPicker.query="Helt ny middag"; addQuickMealForPicker()');
assert.equal(run("getMeal(currentPlan()[2]).title"), "Helt ny middag");
assert.equal(scroller("planner-day").scrollTop, 250); expectFocus("planner-meal:2");

// Direct row opening has no sheet return context and starts the picker at the top.
run('openMealPicker(2)');
assert.equal(scroller("meal-picker").scrollTop, 0);
assert.equal(run("mealPickerReturn"), null); activate("picker-close"); assert.equal(run("state.plannerDaySheet.open"), false);

// The clear confirmation replaces the week menu and returns to its scroll/focus on cancellation.
run("openWeekMenu()");scroller("week-menu").scrollTop=330;
activate("week-menu-clear");assert.equal(scroller("week-menu"),null);assert.ok(scroller("week-clear"));
scroller("week-clear").scrollTop=80;control("week-clear-cancel").focus({preventScroll:true});run("render()");
assert.equal(scroller("week-clear").scrollTop,80);expectFocus("week-clear-cancel");
activate("week-clear-cancel");assert.equal(scroller("week-clear"),null);
assert.equal(scroller("week-menu").scrollTop,330);expectFocus("week-menu-clear");activate("week-menu-close");

// Row-menu list, unrelated focus, and a focused control that disappears.
run('setState({mealPicker:{open:false,dayIndex:null,query:""},plannerDaySheet:{open:false},activeView:"meals",editingMealId:"new",draftMeal:emptyMeal(),draftIngredients:[{type:"heading",title:"Mat"},{name:"gulrot"},{type:"heading",title:"Saus"},{name:"vann"}],draftSteps:[""]})');
run('editorRowMenu={editorId:"new",kind:"ingredient",index:1}; render()');
scroller("editor-row-menu").scrollTop = 140; control("editor-row-group:2").focus({preventScroll:true}); run("render()");
assert.equal(scroller("editor-row-menu").scrollTop, 140); expectFocus("editor-row-group:2");
document.activeElement = app.querySelector("[data-add-ingredient]");
const focusCount = focusCalls.length; run("render()");
assert.equal(focusCalls.length, focusCount, "No window focus restored when focus was outside it");
assert.equal(scroller("editor-row-menu").scrollTop, 140);
control("editor-row-group:2").focus({preventScroll:true});
run('state.draftIngredients=state.draftIngredients.slice(0,2); render()');
assert.equal(control("editor-row-group:2"), null); assert.equal(scroller("editor-row-menu").scrollTop, 140);
run('editorRowMenu=null; render(); editorRowMenu={editorId:"new",kind:"ingredient",index:1}; render()');
assert.equal(scroller("editor-row-menu").scrollTop, 0);
run("saveState()");
assert.doesNotMatch(storage.get("middagsapp-state"), /scrollTop|scrollKey|focusKey/);
assert.doesNotMatch(storage.get("middagsapp-state"), /mealPickerReturn/);
assert.doesNotMatch(run("JSON.stringify(syncPayload())"), /scrollTop|scrollKey|focusKey/);
assert.ok(scrollWrites.length > 0);

// v113: automatic search focus belongs to desktop opening, never ordinary binding/render.
let finePointer = false;
const pointerQueries = [];
window.matchMedia = query => { pointerQueries.push(query); return { matches: finePointer }; };
run('editorRowMenu=null; setState({activeView:"week",editingMealId:null,mealPicker:{open:false,dayIndex:null,query:""},plannerDaySheet:{open:false}})');
document.activeElement = null;
focusCalls.length = 0;
run('openMealPicker(0)');
assert.equal(focusCalls.length,0,'Touch opening must not request focus or open the keyboard');
assert.equal(document.activeElement,null);
assert.doesNotMatch(run('renderMealPickerModal()'),/\bautofocus\b/);
assert.ok(control('picker-other-plans'),'Fixed footer remains available');
run('render()'); assert.equal(focusCalls.length,0,'v108 restoration must not invent focus on first touch opening');
// A user who deliberately taps the search keeps focus and scroll through a later render.
control('picker-search').focus({preventScroll:true});
scroller('meal-picker').scrollTop=175; run('render()'); expectFocus('picker-search');
assert.equal(scroller('meal-picker').scrollTop,175);
run('closeMealPicker()');
document.activeElement=null; focusCalls.length=0; finePointer=true;
run('openMealPicker(0)'); expectFocus('picker-search');
assert.equal(focusCalls.length,1,'Fine pointer opening focuses the search once');
// Rebinding/rendering must not steal focus from footer buttons, even on desktop.
activate('picker-other-plans');
assert.equal(control('picker-other-plans'),null);
assert.ok(control('picker-plan:away'));
control('picker-plan:away').focus({preventScroll:true});
run('render()'); expectFocus('picker-plan:away');
activate('picker-plan-cancel');
assert.ok(control('picker-other-plans'));
control('picker-other-plans').focus({preventScroll:true});
run('render()'); expectFocus('picker-other-plans');
assert.ok(pointerQueries.every(query=>query==='(pointer: fine)'));
run('closeMealPicker()');
finePointer=false; document.activeElement=null; focusCalls.length=0;
run('openDaySheet(0)');
control('planner-note:0').focus({preventScroll:true});
const beforeTouchReopen=focusCalls.length;
run('openMealPicker(0,true)');
assert.equal(focusCalls.length,beforeTouchReopen,'A focused note in the old day sheet must not focus the new picker');
assert.equal(document.activeElement,null);


// v114: filters affect both ranking cards and category results, preserving horizontal scroll.
run('closeMealPicker(); state.meals=normalizeMeals([{...emptyMeal(),id:"fast-kid",title:"Rask fisk",categories:["fisk"],prepTime:"quick",kidFriendly:true},{...emptyMeal(),id:"fast-veg",title:"Rask vegetar",categories:["vegetar"],prepTime:"quick"},{...emptyMeal(),id:"slow-kid",title:"Langsom fisk",categories:["fisk"],prepTime:"long",kidFriendly:true}]); state.plansByWeek[getWeekKey()]={...emptyWeekPlan()}; openMealPicker(0)');
scroller('picker-filters').scrollLeft=140;
activate('picker-filter:quick');
assert.equal(scroller('picker-filters').scrollLeft,140);expectFocus('picker-filter:quick');
assert.equal(control('picker-filter:quick').attrs['aria-pressed'],'true');
activate('picker-filter:kidFriendly');
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("").map(m=>m.id))')),['fast-kid']);
assert.doesNotMatch(run('renderMealPickerListItems("",0)'),/data-select-meal="fast-veg"|data-select-meal="slow-kid"/);
activate('picker-filter:category:vegetar');assert.match(app.innerHTML,/Ingen middager passer filtrene/);assert.doesNotMatch(app.innerHTML,/FORSLAG TIL/);
activate('picker-filter:category:fisk');assert.equal(run('pickerFilters.category'),'fisk');
assert.equal(control('picker-filter:category:vegetar').attrs['aria-pressed'],'false');
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("rask").map(m=>m.id))')),['fast-kid']);
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("vegetar").map(m=>m.id))')),[]);
activate('picker-filter:favorite');assert.match(app.innerHTML,/Fjern filtre/);
scroller('meal-picker').handlers.click({target:control('picker-clear-filters')});
assert.equal(run('pickerFiltersActive()'),false);assert.doesNotMatch(app.innerHTML,/Ingen middager passer filtrene/);
activate('picker-filter:quick');run('closeMealPicker(); openMealPicker(0)');assert.equal(run('pickerFiltersActive()'),false);
// Keyboard activation shows a heading instead of the trigger, and focuses the first choice.
const trigger=control('picker-other-plans');trigger.focus({preventScroll:true});trigger.handlers.click({detail:0});
assert.equal(control('picker-other-plans'),null);assert.match(app.innerHTML,/ANNEN PLAN/);
assert.ok(control('picker-plan:away').attrs.class.includes('picker-plan-option'));expectFocus('picker-plan:away');
control('picker-plan-cancel').handlers.click({detail:0});assert.ok(control('picker-other-plans'));expectFocus('picker-other-plans');
// Long background resets the underlying week, never the open picker's target week.
run('closeMealPicker(); state.weekOffset=1; openDaySheet(0); openMealPicker(0,true);');
const originalWindowWeek=run('getWeekKey()');const visibleLevels=run('JSON.stringify(navigationLevels())');
scroller('meal-picker').scrollTop=245;
document.visibilityState='hidden';const hiddenNow=Date.now();context.hiddenNow=hiddenNow;
run('handleVisibilityChange(hiddenNow)');document.visibilityState='visible';run('handleVisibilityChange(hiddenNow+31*60000)');
assert.equal(run('state.weekOffset'),0);assert.equal(run('getWeekKey()'),originalWindowWeek);assert.equal(scroller('meal-picker').scrollTop,245);
assert.equal(run('JSON.stringify(navigationLevels())'),visibleLevels);assert.equal(run('state.mealPicker.open'),true);
run('updatePlanDay(0,"fast-kid")');assert.equal(run('state.plansByWeek[getWeekKey()][0]'),'fast-kid');
run('closeMealPicker()');assert.equal(run('state.plannerDaySheet.open'),true);assert.equal(run('getWeekKey()'),originalWindowWeek);
run('navigate({plannerDaySheet:{open:false,dayIndex:null}})');assert.equal(run('planningWindowWeekKey'),null);
assert.equal(run('getWeekKey()'),run('getWeekKeyForOffset(0)'));
run('state.weekOffset=1; openWeekMenu(); startWeekClear()');const clearTarget=run('getWeekKey()');
document.visibilityState='hidden';run('handleVisibilityChange(hiddenNow+40*60000)');document.visibilityState='visible';run('handleVisibilityChange(hiddenNow+80*60000)');
assert.equal(run('getWeekKey()'),clearTarget);assert.ok(run('weekClearConfirmation'));
run('cancelWeekClear()');assert.equal(run('getWeekKey()'),clearTarget);run('navigate({plannerActionsOpen:false})');
run('saveState()');assert.doesNotMatch(storage.get('middagsapp-state'),/pickerFilters|planningWindowWeekKey|weekOffset/);


// v115: dynamic suitability buttons between flags and categories, with two dividers.
run('state.meals=normalizeMeals([{...emptyMeal(),id:"weekend-fast",title:"Rask helgefisk",prepTime:"quick",categories:["fisk"],suitability:["weekend"]},{...emptyMeal(),id:"weekday-fast",title:"Rask hverdagsfisk",prepTime:"quick",categories:["fisk"],suitability:["weekday"]},{...emptyMeal(),id:"weekend-slow",title:"Langsom helgefisk",prepTime:"long",categories:["fisk"],suitability:["weekend"]},{...emptyMeal(),id:"unmarked",title:"Rask uten merker",prepTime:"quick",categories:["fisk"],suitability:[]},{...emptyMeal(),id:"weekend-veg",title:"Rask helgevegetar",prepTime:"quick",categories:["vegetar"],suitability:["weekend"]}]);state.plansByWeek[getWeekKey()]={...emptyWeekPlan()};openMealPicker(0)');
const filterKeys=()=>scroller('picker-filters').querySelectorAll('[data-picker-filter]').map(node=>node.dataset.pickerFilter);
assert.deepEqual(filterKeys(),['quick','kidFriendly','favorite',...JSON.parse(run('JSON.stringify(suitabilityEntries().map(([key])=>"suitability:"+key))')),...JSON.parse(run('JSON.stringify(Object.keys(getCategoryLabels()).map(key=>"category:"+key))'))]);
const dividers=scroller('picker-filters').querySelectorAll('.picker-filter-divider');assert.equal(dividers.length,2);assert.ok(dividers.every(node=>node.attrs['aria-hidden']==='true'));
scroller('picker-filters').scrollLeft=180;
activate('picker-filter:suitability:weekend');
assert.equal(control('picker-filter:suitability:weekend').attrs['aria-pressed'],'true');assert.equal(scroller('picker-filters').scrollLeft,180);expectFocus('picker-filter:suitability:weekend');
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("").map(m=>m.id).sort())')),['weekend-fast','weekend-slow','weekend-veg']);
assert.doesNotMatch(run('renderMealPickerListItems("",0)'),/data-select-meal="unmarked"|data-select-meal="weekday-fast"/);
activate('picker-filter:suitability:weekday');assert.equal(run('pickerFilters.suitability'),'weekday');assert.equal(control('picker-filter:suitability:weekend').attrs['aria-pressed'],'false');
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("").map(m=>m.id))')),['weekday-fast']);
activate('picker-filter:suitability:weekday');assert.equal(run('pickerFilters.suitability'),'');assert.equal(run('pickerFiltersActive()'),false);
activate('picker-filter:suitability:weekend');activate('picker-filter:quick');activate('picker-filter:category:fisk');
const suitSearch=control('picker-search');suitSearch.value='helge';suitSearch.handlers.input({target:suitSearch});
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery(state.mealPicker.query).map(m=>m.id))')),['weekend-fast']);
assert.doesNotMatch(run('renderMealPickerListItems("",0)'),/data-select-meal="weekend-slow"|data-select-meal="unmarked"|data-select-meal="weekday-fast"|data-select-meal="weekend-veg"/);
activate('picker-filter:favorite');assert.match(app.innerHTML,/Ingen middager passer filtrene/);assert.ok(control('picker-clear-filters'));
scroller('meal-picker').handlers.click({target:control('picker-clear-filters')});assert.equal(run('pickerFilters.suitability'),'');assert.equal(run('pickerFiltersActive()'),false);
// The same metadata used by Settings determines filter names/order, including new options.
run('setState({metadata:{...state.metadata,suitabilityLabels:{...getSuitabilityLabels(),custom_day:"Turdag"}}})');
assert.ok(control('picker-filter:suitability:custom_day'));assert.match(run('renderPickerFilters()'),/data-picker-filter="suitability:custom_day" aria-pressed="false">Turdag/);
const settingsSuitOrder=JSON.parse(run('JSON.stringify(suitabilityEntries().map(([key])=>"suitability:"+key))'));
assert.deepEqual(filterKeys().filter(key=>key.startsWith('suitability:')),settingsSuitOrder);
run('state.mealPicker.query=""; render()');activate('picker-filter:suitability:custom_day');assert.match(app.innerHTML,/Ingen middager passer filtrene/);
run('setState({meals:[...state.meals,{...emptyMeal(),id:"custom-suit",title:"Turmiddag",suitability:["custom_day"]}]})');
assert.deepEqual(JSON.parse(run('JSON.stringify(mealsMatchingPickerQuery("").map(m=>m.id))')),['custom-suit']);
run('closeMealPicker();openMealPicker(0)');assert.equal(run('pickerFilters.suitability'),'');assert.equal(control('picker-filter:suitability:custom_day').attrs['aria-pressed'],'false');
run('saveState()');assert.doesNotMatch(storage.get('middagsapp-state'),/pickerFilters/);


// v116: keyboard-reachable recipe-card controls use the existing open/edit flows separately.
run('closeMealPicker(); state.meals=normalizeMeals([{...emptyMeal(),id:"card-recipe",title:"Kortoppskrift"}]); navigate({activeView:"meals",editingMealId:null,selectedMealId:null,filters:{query:"",category:"all",flag:"all",sort:"title"}})');
const primary=app.querySelector('[data-view-meal="card-recipe"]'),edit=app.querySelector('[data-edit-meal="card-recipe"]');
assert.ok(primary);assert.ok(edit);assert.equal(primary.tagName,'button');assert.equal(edit.tagName,'button');
assert.equal(primary.attrs['aria-label'],'Kortoppskrift, åpne oppskrift');assert.equal(edit.attrs['aria-label'],'Rediger Kortoppskrift');
const recipeArticle=primary.closest('.meal-card');assert.ok(recipeArticle);assert.equal(recipeArticle.dataset.viewMeal,undefined);
assert.equal(primary.parent,edit.parent);assert.equal(primary.contains(edit),false);assert.equal(edit.contains(primary),false);
primary.focus({preventScroll:true});primary.handlers.click({stopPropagation(){}});
assert.equal(run('state.activeView'),'recipe');assert.equal(run('state.selectedMealId'),'card-recipe');assert.equal(run('state.editingMealId'),null);
run('navigateBack()');const editAfterReturn=app.querySelector('[data-edit-meal="card-recipe"]');assert.ok(editAfterReturn);
editAfterReturn.focus({preventScroll:true});editAfterReturn.handlers.click({stopPropagation(){}});
assert.equal(run('state.activeView'),'meals');assert.equal(run('state.editingMealId'),'card-recipe');assert.equal(run('state.selectedMealId'),null);
console.log("window scroll/focus app tests ok");
