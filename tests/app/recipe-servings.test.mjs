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
const context = vm.createContext({ ...bindings, structuredClone, Date, Blob, File, URL, console, document, window,
  navigator: { onLine: false }, setTimeout:(callback,delay)=>{timers.set(++timerId,{callback,at:now+delay});return timerId;}, clearTimeout:id=>timers.delete(id),
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
vm.runInContext(source, context);
const run = code => vm.runInContext(code, context);


const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
run('accessState={kind:"ready",offline:false}; syncEnabled=true;loadAiKeyStatus=async()=>{};state.family.familySize=4;state.meals=normalizeMeals([{...emptyMeal(),id:"portion",title:"Testoppskrift",baseServings:4,ingredients:[{name:"Fisk",amount:"500",unit:"g"}],steps:["Stek"]}]);navigate({activeView:"meals"});openRecipeFromView("portion",null)');
let plus=app.querySelector('[data-recipe-servings="1"]'),minus=app.querySelector('[data-recipe-servings="-1"]'),input=app.querySelector('[data-recipe-servings-input]');
const click=node=>{node.focus({preventScroll:true});node.handlers.click({preventDefault(){},stopPropagation(){}});};
window.scrollY=600;
for(let i=0;i<11;i++){click(plus);assert.equal(run('recipeTargetServings()'),5+i);assert.equal(app.querySelector('[data-recipe-servings="1"]'),plus);assert.equal(app.querySelector('[data-recipe-servings="-1"]'),minus);assert.equal(document.activeElement,plus);assert.equal(window.scrollY,600);assert.ok(app.querySelector('[data-recipe-ingredients]').innerHTML.includes(([625,750,875,1000,1125,1250,1375,1500,1625,1750,1875][i])+' g'));}
assert.equal(input.value,'15');assert.match(app.querySelector('[data-recipe-ingredients]').innerHTML,/1875 g/);assert.equal(run('recipeServingsBuffer.pending'),null);
for(const value of ['0','31','abc','']){input.value=value;input.handlers.blur();assert.equal(input.value,'15');}
input.focus({preventScroll:true});input.handlers.focus();assert.equal(input.selectionStart,0);assert.equal(input.selectionEnd,2);
for(const value of ['1','30','15']){input.value=value;input.handlers.keydown({key:'Enter',preventDefault(){}});assert.equal(run('recipeTargetServings()'),Number(value));assert.equal(minus.disabled,value==='1');assert.equal(plus.disabled,value==='30');}
// Ordinary weeks sync remains responsible for the one document write.
const writes=[],listeners=[];
context.connection={refs:{weeks:'weeks'},api:{doc:(ref,key)=>ref+'/'+key,serverTimestamp:()=> 'server',setDoc:(...args)=>{writes.push(args);return Promise.resolve();},onSnapshot:(ref,options,next)=>{listeners.push(next);return()=>{};}}};
await run('weeksSync.start(connection)');
const server=value=>listeners[0]({docs:[{id:'2026-10-12',data:()=>({servings:{0:value},plan:{0:'portion'}})}],metadata:{fromCache:false,hasPendingWrites:false}});
server(null);run('navigate({activeView:"week"});state.weekOffset=0;openRecipeFromView("portion",0);state.selectedRecipeContext.weekKey="2026-10-12";render()');pop();
plus=app.querySelector('[data-recipe-servings="1"]');minus=app.querySelector('[data-recipe-servings="-1"]');input=app.querySelector('[data-recipe-servings-input]');
const enqueue=run('weeksSync.enqueue');let enqueues=[];context.captureEnqueue=(patch,options)=>{enqueues.push(JSON.parse(JSON.stringify(patch)));enqueue(patch,options);};run('weeksSync.enqueue=captureEnqueue');
for(let i=0;i<11;i++){click(plus);tick(10);}
assert.equal(run('recipeTargetServings()'),15);assert.equal(enqueues.length,0);assert.equal(writes.length,0);
server(7);assert.equal(run('recipeTargetServings()'),15);assert.equal(input.value,'15');assert.equal(app.querySelector('[data-recipe-servings="1"]'),plus);
run('render()');assert.equal(app.querySelector('[data-recipe-servings="1"]'),plus);
tick(489);assert.equal(enqueues.length,0);tick(1);assert.equal(enqueues.length,1);assert.equal(enqueues[0]['2026-10-12'].servings[0],15);assert.equal(run('state.servingsByWeek["2026-10-12"][0]'),15);
assert.equal(app.querySelector('[data-recipe-servings="1"]'),plus);assert.equal(writes.length,1);tick(500);assert.equal(writes.length,1);assert.equal(writes[0][1].servings[0],15);
await Promise.resolve();await Promise.resolve();
// Back before the UI debounce expires flushes into sync immediately.
run('state.selectedRecipeContext={weekKey:"2026-10-12",dayIndex:0};render()');plus=app.querySelector('[data-recipe-servings="1"]');click(plus);assert.equal(enqueues.length,1);
run('backInApp()');pop();assert.equal(enqueues.length,2);assert.equal(enqueues[1]['2026-10-12'].servings[0],16);assert.equal(run('state.activeView'),'week');
const open=()=>{run('openRecipeFromView("portion",0);state.selectedRecipeContext.weekKey="2026-10-12";render()');pop();};
open();plus=app.querySelector('[data-recipe-servings="1"]');click(plus);document.visibilityState='hidden';run('handleVisibilityChange()');assert.equal(enqueues.length,3);assert.equal(run('recipeServingsBuffer.pending'),null);document.visibilityState='visible';
open();plus=app.querySelector('[data-recipe-servings="1"]');click(plus);const displayed=run('recipeTargetServings()');click(app.querySelector('[data-add-to-shopping]'));assert.equal(run('state.shoppingReview.groups[0].subtitle'),displayed+' porsjoner');assert.equal(run('recipeServingsBuffer.pending'),null);
run('closeShoppingReview();backInApp()');pop();open();plus=app.querySelector('[data-recipe-servings="1"]');click(plus);const edited=run('recipeTargetServings()');click(app.querySelector('[data-edit-meal]'));assert.equal(run('state.servingsByWeek["2026-10-12"][0]'),edited);assert.equal(run('recipeServingsBuffer.pending'),null);
run('state.activeView="week";state.editingMealId=null;state.selectedMealId=null;state.selectedRecipeContext=null;render()');open();plus=app.querySelector('[data-recipe-servings="1"]');click(plus);const beforePop=enqueues.length, popValue=run('recipeTargetServings()');history.go(-1);pop();assert.equal(run('state.activeView'),'week');assert.equal(enqueues.length,beforePop+1);assert.equal(run('state.servingsByWeek["2026-10-12"][0]'),popValue);
open();plus=app.querySelector('[data-recipe-servings="1"]');click(plus);const tabValue=run('recipeTargetServings()');click(app.querySelector('[data-view="shopping"]'));pop();assert.equal(run('state.activeView'),'shopping');assert.equal(run('state.servingsByWeek["2026-10-12"][0]'),tabValue);
run('state.activeView="week";state.selectedRecipeContext=null;state.servingsByWeek[getWeekKey()]={...emptyWeekServings(),0:10};openDaySheet(0)');for(let n=0;n<11;n++)click(app.querySelector('[data-day-portions="0"][data-delta="1"]')||app.querySelectorAll('[data-day-portions]').find(b=>b.dataset.delta==='1'));
assert.equal(run('servingsForDay(getWeekKey(),0)'),21);
run('closeMealPicker();state.plannerDaySheet={open:false,dayIndex:null}');open();click(app.querySelector('[data-recipe-servings="1"]'));const beforeStop=enqueues.length;run('stopAllSync()');tick(2000);assert.equal(run('recipeServingsBuffer.pending'),null);assert.equal(enqueues.length,beforeStop);console.log('recipe servings app tests ok (rapid taps, stable DOM, input, sync overlay, flush and day sheet)');
