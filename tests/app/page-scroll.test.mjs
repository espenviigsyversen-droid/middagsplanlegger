import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const appUrl = new URL("../../app.js", import.meta.url);
let source = await readFile(appUrl,"utf8");
const imports=/import\s+(\{[\s\S]*?\})\s+from\s+"([^"]+)";/g,bindings={};
for(const match of source.matchAll(imports)) {
  const module=await import(new URL(match[2],appUrl));
  for(const entry of match[1].slice(1,-1).split(",").filter(s=>s.trim())) {
    const [name,alias=name]=entry.trim().split(/\s+as\s+/);bindings[alias]=module[name];
  }
}
source=source.replace(imports,"").replace(/render\(\);\s*initFirebaseSync\(\);\s*$/,"");

function fixture(view="meals") {
  const selectors=new Map(),events={},storage=new Map(),queue=[],scrolls=[],classes=new Set();
  const entries=[null]; let index=0, reduced=false;
  const history={replaceState(value){entries[index]=structuredClone(value);},pushState(value){entries.splice(++index);entries[index]=structuredClone(value);},
    go(delta){const target=index+delta;if(target<0||target>=entries.length)return;index=target;queue.push({state:structuredClone(entries[index])});}};
  const app={innerHTML:"",querySelector:s=>selectors.get(s)?.[0]||null,querySelectorAll:s=>selectors.get(s)||[]};
  const window={history,scrollY:0,addEventListener:(type,fn)=>events[type]=fn,
    matchMedia:query=>({matches:query==="(prefers-reduced-motion: reduce)"&&reduced}),confirm:()=>true,
    scrollTo(x,y){const top=typeof x==="object"?x.top:y;window.scrollY=top;scrolls.push({top,behavior:typeof x==="object"?x.behavior:"auto",locked:classes.has("meal-picker-open"),html:app.innerHTML});}};
  const context=vm.createContext({...bindings,structuredClone,Date,Blob,File,URL,console,window,
    document:{querySelector:s=>s==="#app"?app:null,addEventListener(){},documentElement:{scrollTop:0},
      body:{classList:{contains:key=>classes.has(key),add(key){classes.add(key);if(key==="meal-picker-open")window.scrollY=0;},remove:key=>classes.delete(key)},style:{}}},
    navigator:{onLine:false},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    setTimeout(){},clearTimeout(){},FormData:class{constructor(form){return form.values;}}
  });
  vm.runInContext(source,context);
  const run=code=>vm.runInContext(code,context);
  const flush=()=>{let turns=0;while(queue.length){assert.ok(++turns<20,"History must settle");events.popstate(queue.shift());}};
  context.startView=view;
  run('accessState={kind:"ready",role:"member",offline:true};loadAiKeyStatus=async()=>{};state.meals=normalizeMeals([{...emptyMeal(),id:"a",title:"Fiskemiddag",ingredients:[{name:"Fisk",amount:"500",unit:"g"}],steps:["Stek"]}]);navigate({activeView:startView})');flush();
  const event=(selector,dataset={},type="click",tab=false)=>{
    const node={dataset,tagName:"BUTTON",checked:true,handlers:{},matches:s=>tab&&s===".nav-button",addEventListener(t,fn){this.handlers[t]=fn;},focus(){},select(){}};
    selectors.set(selector,[node]);run("bindEvents();bindAiKeyEvents()");
    assert.ok(node.handlers[type],selector);node.handlers[type]({target:node,currentTarget:node,stopPropagation(){},preventDefault(){}});
    selectors.delete(selector);flush();
  };
  return {run,flush,event,window,scrolls,selectors,storage,classes,context,app,setReduced:value=>{reduced=value;},back(){history.go(-1);flush();}};
}

const f=fixture();assert.equal(f.window.history.scrollRestoration,"manual");
f.window.scrollY=1200;f.event("[data-view-meal]",{viewMeal:"a"});assert.equal(f.window.scrollY,0);
assert.match(f.scrolls.at(-1).html,/recipe-detail/); // Scroll after drawing, in the same synchronous action.
f.window.scrollY=800;f.event("[data-close-meal]");assert.equal(f.window.scrollY,1200);
f.event("[data-view-meal]",{viewMeal:"a"});assert.equal(f.window.scrollY,0);
f.window.scrollY=800;f.event("[data-edit-meal]",{editMeal:"a"});assert.equal(f.window.scrollY,0);
f.window.scrollY=350;f.event("[data-cancel-edit]");assert.equal(f.run("state.activeView"),"recipe");assert.equal(f.window.scrollY,800);
f.event("[data-close-meal]");assert.equal(f.window.scrollY,1200);
f.event("[data-view-meal]",{viewMeal:"a"});f.window.scrollY=750;f.event("[data-edit-meal]",{editMeal:"a"});f.window.scrollY=250;
f.back();assert.equal(f.run("state.activeView"),"recipe");assert.equal(f.window.scrollY,750);
f.back();assert.equal(f.run("state.activeView"),"meals");assert.equal(f.window.scrollY,1200);

const shopping=fixture("shopping");shopping.run('setState({shoppingList:{items:[{id:"item",name:"Løk",amount:"1",unit:"stk",category:"gronnsaker",checked:false}]}})');
shopping.window.scrollY=600;const before=shopping.scrolls.length;
shopping.event("[data-toggle-item]",{toggleItem:"item"},"change");assert.equal(shopping.window.scrollY,600);assert.equal(shopping.scrolls.length,before);
shopping.run('render();applyRemoteStatePatch({family:{...state.family,name:"Familien"}})');assert.equal(shopping.window.scrollY,600);assert.equal(shopping.scrolls.length,before);
shopping.event("[data-view]",{view:"week"},"click",true);assert.equal(shopping.window.scrollY,0);
shopping.window.scrollY=450;shopping.run('navigate({weekOffset:1});render()');assert.equal(shopping.window.scrollY,450);
shopping.event("[data-view]",{view:"week"},"click",true);assert.equal(shopping.window.scrollY,0);assert.equal(shopping.scrolls.at(-1).behavior,"smooth");
shopping.window.scrollY=450;shopping.setReduced(true);shopping.event("[data-view]",{view:"week"},"click",true);assert.equal(shopping.scrolls.at(-1).behavior,"auto");
shopping.run('openDaySheet(2)');shopping.flush();assert.equal(shopping.window.scrollY,0);shopping.back();assert.equal(shopping.window.scrollY,0);

const setup=fixture("setup");setup.window.scrollY=500;setup.event("[data-view]",{view:"family-settings"});assert.equal(setup.window.scrollY,0);
setup.window.scrollY=200;setup.back();assert.equal(setup.run("state.activeView"),"setup");assert.equal(setup.window.scrollY,500);

const locked=fixture("week");locked.window.scrollY=400;locked.run('openMealPicker(2)');locked.flush();assert.equal(locked.classes.has("meal-picker-open"),true);
assert.equal(locked.window.scrollY,0);locked.event("[data-view]",{view:"shopping"},"click",true);
assert.equal(locked.classes.has("meal-picker-open"),false);assert.equal(locked.window.scrollY,0);
assert.deepEqual(locked.scrolls.slice(-2).map(s=>[s.top,s.locked]),[[400,false],[0,false]],"Unlock restores old page before the new screen gets its final target");
locked.event("[data-view]",{view:"week"},"click",true);locked.window.scrollY=450;locked.run('openMealPicker(1)');locked.flush();
const lockCalls=locked.scrolls.length;locked.run('render()');assert.equal(locked.scrolls.length,lockCalls);
locked.back();assert.equal(locked.window.scrollY,450);

// Save opens the recipe as a forward screen; delete returns to its original parent.
const saved=fixture();saved.window.scrollY=1100;saved.event("[data-view-meal]",{viewMeal:"a"});saved.window.scrollY=700;saved.event("[data-edit-meal]",{editMeal:"a"});
const form={values:{get:key=>({title:"Fiskemiddag",baseServings:"4",minDaysBetween:"14",leftovers:"none",prepTime:"quick"}[key]||""),getAll:()=>[],has:()=>false}};
saved.context.form=form;saved.selectors.set("[data-ingredient-row]",[{querySelector:selector=>({value:selector.includes('"name"')?"Fisk":selector.includes('"amount"')?"500":"g"})}]);
saved.selectors.set("[data-step-row]",[{querySelector:()=>({value:"Stek"})}]);saved.window.scrollY=350;
saved.run('saveMealFromForm(form)');saved.flush();assert.equal(saved.run("state.activeView"),"recipe");assert.equal(saved.window.scrollY,0);
saved.selectors.clear();saved.back();assert.equal(saved.window.scrollY,1100);
saved.event("[data-view-meal]",{viewMeal:"a"});saved.event("[data-edit-meal]",{editMeal:"a"});saved.run('deleteCurrentMeal()');saved.flush();
assert.equal(saved.run("state.activeView"),"meals");assert.equal(saved.window.scrollY,1100);assert.equal(saved.run("state.meals.length"),0);

const week=fixture("week");week.window.scrollY=550;week.event("[data-view-meal]",{viewMeal:"a",recipeDay:"2"});week.window.scrollY=650;
week.event("[data-edit-meal]",{editMeal:"a"});week.event("[data-cancel-edit]");assert.equal(week.run("state.selectedRecipeContext.dayIndex"),2);assert.equal(week.window.scrollY,650);
week.back();assert.equal(week.run("state.activeView"),"week");assert.equal(week.window.scrollY,550);
week.event("[data-view-meal]",{viewMeal:"a",recipeDay:"2"});week.event("[data-edit-meal]",{editMeal:"a"});week.run('deleteCurrentMeal()');week.flush();
assert.equal(week.run("state.activeView"),"week");assert.equal(week.window.scrollY,550);
const fromShopping=fixture("shopping");fromShopping.window.scrollY=600;fromShopping.event("[data-view-meal]",{viewMeal:"a"});assert.equal(fromShopping.window.scrollY,0);
fromShopping.back();assert.equal(fromShopping.window.scrollY,600);

const newRecipe=fixture();newRecipe.window.scrollY=1200;newRecipe.event("[data-edit-meal]",{editMeal:"new"});assert.equal(newRecipe.window.scrollY,0);
newRecipe.run('state.draftMeal={...emptyMeal(),title:"Endret oppskrift"}');newRecipe.window.scrollY=500;
newRecipe.event("[data-cancel-edit]");assert.equal(newRecipe.run("editorDiscardOpen"),true);assert.equal(newRecipe.window.scrollY,500);
newRecipe.back();assert.equal(newRecipe.run("editorDiscardOpen"),false);assert.equal(newRecipe.window.scrollY,500);
newRecipe.event("[data-open-ai-settings]");assert.equal(newRecipe.window.scrollY,0);newRecipe.window.scrollY=200;
newRecipe.event("[data-ai-key-return-editor]");assert.equal(newRecipe.run("state.editingMealId"),"new");assert.equal(newRecipe.window.scrollY,500);
newRecipe.event("[data-cancel-edit]");newRecipe.event("[data-editor-discard]");assert.equal(newRecipe.window.scrollY,1200);
for(const test of [f,shopping,setup,locked,saved,week,fromShopping,newRecipe]) {
  assert.doesNotMatch(test.storage.get("middagsapp-state"),/pageScroll|mealEditorReturn|scrollY|positions/);
  assert.doesNotMatch(JSON.stringify(test.run('syncPayload()')),/pageScroll|mealEditorReturn|scrollY/);
}
console.log("page scroll app tests ok");
