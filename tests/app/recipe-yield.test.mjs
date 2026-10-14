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
  blur() { if(document.activeElement===this) document.activeElement=null; }
  setAttribute(key,value) { this.attrs[key]=value; }
  select() { this.selectionStart=0; this.selectionEnd=this.value.length; }
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
const pageScrolls = [], timers=new Map(), windowEvents={}, entries=[null], popQueue=[];let now=0,timerId=0,historyIndex=0;
const history={replaceState(v){entries[historyIndex]=structuredClone(v);},pushState(v){entries.splice(++historyIndex);entries[historyIndex]=structuredClone(v);},go(d){const n=historyIndex+d;if(n<0||n>=entries.length)return;historyIndex=n;popQueue.push({state:entries[n]});}};
const pop=()=>{while(popQueue.length)windowEvents.popstate(popQueue.shift());};
const tick=ms=>{const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].callback();}now=end;};
const window = { history, addEventListener:(type,fn)=>windowEvents[type]=fn, scrollY: 330, scrollTo: (x, y) => { pageScrolls.push([x, y]); window.scrollY = y; } };
class LocalFormData {
 constructor(form){this.form=form;}
 nodes(key){return this.form.querySelectorAll('[name="'+key+'"]');}
 get(key){const node=this.nodes(key)[0];if(!node)return null;if(node.tagName==='select')return node.children.find(c=>'selected' in c.attrs)?.value||node.children[0]?.value||'';return node.value;}
 getAll(key){return this.nodes(key).filter(n=>n.attrs.type!=='checkbox'||n.checked).map(n=>n.value);}
 has(key){return this.nodes(key).some(n=>n.attrs.type!=='checkbox'||n.checked);}
}
const context = vm.createContext({ ...bindings, FormData:LocalFormData, structuredClone, Date, Blob, File, URL, console, document, window,
  navigator: { onLine: false }, setTimeout:(callback,delay)=>{timers.set(++timerId,{callback,at:now+delay});return timerId;}, clearTimeout:id=>timers.delete(id),
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);


const json=code=>JSON.parse(run('JSON.stringify('+code+')'));

run('accessState={kind:"ready",offline:true};loadAiKeyStatus=async()=>{};state.family.familySize=4;state.meals=normalizeMeals([{...emptyMeal(),id:"pan",title:"Pannekaker",baseServings:4,yieldAmount:15,yieldUnit:"pannekaker",ingredients:[{name:"Mel",amount:"500",unit:"g"}],steps:["Stek"]}]);navigate({activeView:"meals"});openRecipeFromView("pan",null)');

const click=selector=>{const node=app.querySelector(selector);assert.ok(node,selector);node.focus({preventScroll:true});node.handlers.click({preventDefault(){},stopPropagation(){}});};
assert.equal(run('recipeTargetServings()'),15);assert.match(app.innerHTML,/Oppskriften gir 15 pannekaker · holder til ca. 4 personer/);assert.match(app.innerHTML,/Hele oppskriften/);assert.match(app.innerHTML,/500 g/);
const plus=app.querySelector('[data-recipe-servings="1"]');for(let i=0;i<15;i++)plus.handlers.click();assert.equal(run('recipeTargetServings()'),30);assert.equal(app.querySelector('[data-recipe-servings="1"]'),plus);assert.match(app.querySelector('[data-recipe-ingredients]').innerHTML,/1000 g/);assert.equal(app.querySelector('[data-recipe-serving-scope]').hidden,true);
assert.equal(run('createMealShoppingReview(getMeal("pan")).groups[0].items[0].amount'),'1000');assert.equal(run('createMealShoppingReview(getMeal("pan")).groups[0].subtitle'),'30 pannekaker');
run('backInApp();openRecipeFromView("pan",null)');pop();assert.equal(run('recipeTargetServings()'),30);assert.equal(JSON.stringify(json('syncPayload()')).includes('recipeYieldAmounts'),false);
let input=app.querySelector('[data-recipe-servings-input]');input.value='200';input.handlers.keydown({key:'Enter',preventDefault(){}});assert.equal(run('recipeTargetServings()'),200);assert.equal(app.querySelector('[data-recipe-servings="1"]').disabled,true);input.value='201';input.handlers.blur();assert.equal(input.value,'200');
run('navigate({activeView:"week",selectedMealId:null,selectedRecipeContext:null});state.servingsByWeek[getWeekKey()]={...emptyWeekServings(),0:5};state.plansByWeek[getWeekKey()]={...emptyWeekPlan(),0:"pan"};openRecipeFromView("pan",0)');pop();
assert.equal(run('recipeTargetServings()'),5);assert.match(app.innerHTML,/Gir ca. 19 pannekaker/);assert.match(app.innerHTML,/Oppskriften gir 15 pannekaker til ca. 4 personer/);assert.match(app.innerHTML,/625 g/);
assert.equal(run('createMealShoppingReview(getMeal("pan")).groups[0].items[0].amount'),'625');assert.equal(run('generateShoppingListItems([{weekKey:getWeekKey(),dayIndex:0,dayMode:"home"}])[0].amount'),'625');
run('state.meals.push({...getMeal("pan"),id:"bread",title:"Brød",yieldAmount:2,yieldUnit:"brød"});openRecipeFromView("bread",0)');assert.match(app.innerHTML,/Gir ca. 2,5 brød/);
// Editor unit switches keep all other unsaved fields, with first approximation from the family.
run('navigate({activeView:"meals",selectedMealId:null,selectedRecipeContext:null});openMealEditor("new")');pop();
let amount=app.querySelector('[data-yield-amount]'),unit=app.querySelector('[data-yield-unit]'),holder=app.querySelector('[data-yield-holder-input]');
assert.equal(amount.value,'4');assert.equal(unit.value,'porsjoner');assert.equal(app.querySelector('[data-yield-holder-section]').attrs.hidden,'');
app.querySelector('[name="title"]').value='Ulagret oppskrift';app.querySelector('[name="description"]').value='Ulagret beskrivelse';amount.value='15';amount.handlers.input();
click('[data-yield-unit-choice="pannekaker"]');assert.equal(unit.value,'pannekaker');assert.equal(holder.value,'4');assert.equal(run('state.draftMeal.baseServings'),4);assert.equal(run('state.draftMeal.yieldAmount'),15);assert.equal(run('state.draftMeal.yieldUnit'),'pannekaker');assert.equal(app.querySelector('[data-yield-holder-section]').hidden,false);
assert.equal(run('state.draftMeal.title'),'Ulagret oppskrift');assert.equal(run('state.draftMeal.description'),'Ulagret beskrivelse');assert.equal(run('hasUnsavedMealEditorChanges()'),true);
click('[data-yield-holder="1"]');assert.equal(holder.value,'5');click('[data-yield-unit-choice="porsjoner"]');assert.equal(run('state.draftMeal.baseServings'),15);assert.equal(run('state.draftMeal.yieldAmount'),undefined);assert.equal(app.querySelector('[data-yield-holder-section]').hidden,true);
click('[data-yield-unit-choice="pannekaker"]');assert.equal(holder.value,'5');assert.equal(run('state.draftMeal.baseServings'),5);run('render()');amount=app.querySelector('[data-yield-amount]');unit=app.querySelector('[data-yield-unit]');holder=app.querySelector('[data-yield-holder-input]');assert.equal(amount.value,'15');assert.equal(unit.value,'pannekaker');assert.equal(holder.value,'5');
run('saveMealFromForm(app.querySelector("[data-meal-form]"))');pop();let saved=json('getMeal(state.selectedMealId)');assert.equal(saved.yieldAmount,15);assert.equal(saved.yieldUnit,'pannekaker');assert.equal(saved.baseServings,5);assert.equal(Object.keys(saved).some(k=>k.startsWith('_yield')),false);
run('openMealEditor(state.selectedMealId)');pop();click('[data-yield-unit-choice="porsjoner"]');run('saveMealFromForm(app.querySelector("[data-meal-form]"))');pop();saved=json('getMeal(state.selectedMealId)');assert.equal(saved.baseServings,15);assert.equal(Object.hasOwn(saved,'yieldAmount'),false);assert.equal(Object.hasOwn(saved,'yieldUnit'),false);
assert.doesNotMatch(storage.get('middagsapp-state'),/_yieldAmountInput|_yieldUnitInput|_yieldApproxServings|recipeYieldAmounts/);
run('state.family.familySize=6;openMealEditor("new")');pop();click('[data-yield-unit-choice="rundstykker"]');assert.equal(app.querySelector('[data-yield-holder-input]').value,'6');assert.equal(run('state.draftMeal.baseServings'),6);
run('state.meals=state.meals.map(m=>m.id==="bread"?{...m,baseServings:6}:m);openMealEditor("bread")');pop();holder=app.querySelector('[data-yield-holder-input]');assert.equal(holder.value,'6');holder.value='abc';holder.handlers.blur();assert.equal(holder.value,'6');
// Actual archived v122 save handler retains unknown additive yield fields through ...existing.
run('navigate({activeView:"meals",selectedMealId:null,selectedRecipeContext:null});openMealEditor("pan")');pop();
vm.runInContext(await readFile(new URL('../fixtures/v122-save-meal.js',import.meta.url),'utf8'),context);run('normalizeMeals=legacyNormalizeMeals');
app.querySelector('[name="title"]').value='Pannekaker redigert av eldre klient';run('saveMealFromForm(app.querySelector("[data-meal-form]"))');pop();assert.equal(run('getMeal("pan").yieldAmount'),15);assert.equal(run('getMeal("pan").yieldUnit'),'pannekaker');assert.equal(run('getMeal("pan").baseServings'),4);
assert.equal(run('generateShoppingListItems([{weekKey:getWeekKey(),dayIndex:0,dayMode:"home"}])[0].amount'),'625');
console.log('recipe yield app tests ok (both scaling contexts, editor switches, memory, shopping and archived v122 save)');
