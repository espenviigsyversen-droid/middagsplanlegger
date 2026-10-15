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
const selectors=new Map(),events={},storage=new Map(),queue=[];
const entries=[null]; let index=0,pushes=0;
const history={replaceState(value){entries[index]=structuredClone(value);},pushState(value){pushes++;entries.splice(++index);entries[index]=structuredClone(value);},
  go(delta){const target=index+delta;if(target<0||target>=entries.length)return;index=target;queue.push({state:structuredClone(entries[index])});}};
const flush=()=>{let turns=0;while(queue.length){assert.ok(++turns<20,"History must settle");events.popstate(queue.shift());}};
const app={innerHTML:"",querySelector:s=>selectors.get(s)?.[0]||null,querySelectorAll:s=>selectors.get(s)||[]};
const values={title:"Ulagret tittel",description:"Ulagret beskrivelse",baseServings:"5",minDaysBetween:"14"};
const form={addEventListener(){},values:{get:key=>values[key]||"",getAll:()=>[],has:()=>false}};
const context=vm.createContext({...bindings,structuredClone,Date,Blob,File,URL,console,
  window:{history,addEventListener:(type,fn)=>events[type]=fn,scrollTo(){},scrollY:0},
  document:{querySelector:s=>s==="#app"?app:null,addEventListener:(type,fn)=>events[type]=fn,documentElement:{scrollTop:0},
    body:{classList:{contains:()=>false,add(){},remove(){}},style:{}}},
  navigator:{onLine:false},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setTimeout(){},clearTimeout(){},FormData:class{constructor(f){return f.values;}}
});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context),json=code=>JSON.parse(run(`JSON.stringify(${code})`));
run('accessState={kind:"ready",offline:true}; loadAiKeyStatus=async()=>{}; state.activeView="week"; state.meals=normalizeMeals([{...emptyMeal(),id:"wok",title:"Kyllingwok",ingredients:[{name:"Kylling",amount:"1",unit:"stk"}],steps:["Stek"]}]);');
assert.equal(pushes,0,"Startup adds no entry");
const button=(dataset={})=>({dataset,tagName:"BUTTON",handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(){},select(){}});
const click=(selector,dataset={})=>{
  const node=button(dataset);selectors.set(selector,[node]);run("bindEvents(); bindAiKeyEvents()");
  node.handlers.click({target:node,currentTarget:node,stopPropagation(){},preventDefault(){}});selectors.delete(selector);flush();
};
click("[data-view-meal]",{viewMeal:"wok",recipeDay:"2"});
assert.equal(index,1);assert.equal(run("state.previousView"),"week");
assert.deepEqual(json("state.selectedRecipeContext"),{weekKey:run("getWeekKey()"),dayIndex:2});
const noRenderPush=pushes;run("render(); render(); applyRemoteStatePatch({family:{...state.family,name:'Sky'}})");
assert.equal(pushes,noRenderPush,"Rendering/sky updates never add entries");
assert.match(app.innerHTML,/class="recipe-edit"[^>]*data-edit-meal="wok">Rediger/);
assert.doesNotMatch(app.innerHTML,/data-open-recipe-menu|data-scroll-key="recipe-menu"|⋯/);
click("[data-add-to-shopping]",{addToShopping:"wok"});assert.equal(index,2);
history.go(-1);flush();assert.equal(run("state.shoppingReview.open"),false);assert.equal(run("state.activeView"),"recipe");
history.go(-1);flush();assert.equal(run("state.activeView"),"week");assert.equal(index,0);
for(let turn=0;turn<8;turn++) {
  click("[data-view-meal]",{viewMeal:"wok"});click("[data-close-meal]");
  assert.equal(index,0);assert.equal(entries.length,2,"Back + new entry reuses the forward slot");
}
history.go(1);flush();assert.equal(index,0);assert.equal(run("state.activeView"),"week","Forward does not resurrect an old recipe");
run('navigate({activeView:"recipe",selectedMealId:"wok",previousView:"week"})');
click("[data-add-to-shopping]",{addToShopping:"wok"});
const beforePop=pushes;history.go(-2);flush();assert.equal(run("state.activeView"),"week");assert.equal(pushes,beforePop);
// A new action while the browser is consuming a closed entry uses the latest target.
run('navigate({activeView:"recipe",selectedMealId:"wok",previousView:"week"}); navigateBack(); navigate({activeView:"family-settings"})');
flush();assert.equal(run("state.activeView"),"family-settings");assert.equal(index,1);
click("[data-subpage-back]");
const pages=["account-settings","ai-settings","family-settings","app-settings","meal-preferences","categories","units","prep-times","suitability","plan-modes","ingredient-mappings","store-categories"];
for(const page of pages) {
  click("[data-view]",{view:page});assert.match(app.innerHTML,/class="subpage-bar"/);
  assert.doesNotMatch(app.innerHTML,/<button class="button secondary" data-view="setup">Tilbake/);
  click("[data-subpage-back]");assert.equal(run("state.activeView"),"setup");assert.equal(index,0);
}

// Each window closes before the parent view; no user edits are restored from history data.
for(const [patch,open] of [
  ['{activeView:"shopping",generateModal:{open:true,selectedDays:[]}}','state.generateModal.open'],
  ['{activeView:"week",plannerDaySheet:{open:true,dayIndex:2}}','state.plannerDaySheet.open'],
  ['{activeView:"week",plannerActionsOpen:true}','state.plannerActionsOpen'],
  ['{activeView:"week",mealPicker:{open:true,dayIndex:2,query:""}}','state.mealPicker.open'],
]) {
  run(`navigate(${patch})`);flush();assert.equal(run(open),true);assert.equal(index,1);
  history.go(-1);flush();assert.equal(run(open),false);assert.equal(index,0);
}

// v111: the sheet stays in history, but is not open behind the picker.
const chooseDinner = mealId => {
  const list=button(),item={dataset:{selectMeal:mealId},closest:selector=>selector==="[data-select-meal]"?item:null};
  selectors.set(".meal-picker-list",[list]);run("bindEvents()");list.handlers.click({target:item});selectors.delete(".meal-picker-list");flush();
};
for(const fromCalendar of [false,true]) {
  if(fromCalendar) click("[data-calendar-day]",{calendarDay:"3"});
  else run('navigate({activeView:"week",plannerDaySheet:{open:true,dayIndex:3}})');
  flush();assert.equal(index,1);
  run('openMealPicker(3,true)');flush();
  assert.equal(run("state.plannerDaySheet.open"),false);assert.equal(run("state.mealPicker.open"),true);assert.equal(index,2);
  assert.deepEqual(json("navigationLevels()"),["planner-day:3","picker:3"]);
  assert.doesNotMatch(app.innerHTML,/class="modal planner-sheet active"/);
  history.go(-1);flush();assert.equal(run("state.plannerDaySheet.open"),true);assert.equal(run("state.plannerDaySheet.dayIndex"),3);
  assert.equal(run("state.mealPicker.open"),false);assert.equal(index,1);
  run('openMealPicker(3,true)');flush();click("[data-close-meal-picker]");assert.equal(index,1);
  assert.equal(run("state.plannerDaySheet.open"),true);
  run('openMealPicker(3,true)');flush();chooseDinner("wok");
  assert.equal(run("currentPlan()[3]"),"wok");assert.equal(index,1);assert.equal(run("state.plannerDaySheet.dayIndex"),3);
  click("[data-remove-day-meal]",{removeDayMeal:"3"});assert.equal(run("currentPlan()[3]"),"");assert.equal(index,1);
  for(let turn=0;turn<4;turn++) {
    run('openMealPicker(3,true)');flush();click("[data-close-meal-picker]");assert.equal(index,1);assert.equal(entries.length,3);
  }
  history.go(-1);flush();assert.equal(run("state.plannerDaySheet.open"),false);assert.equal(run("state.activeView"),"week");assert.equal(index,0);
}
run('openMealPicker(1)');flush();assert.equal(index,1);assert.equal(run("mealPickerReturn"),null);
chooseDinner("wok");assert.equal(run("currentPlan()[1]"),"wok");assert.equal(run("state.plannerDaySheet.open"),false);assert.equal(index,0);

// v124: filter surfaces get their own history level; back keeps selections.
run('navigate({activeView:"meals"});openMealFilters()');flush();assert.equal(index,1);
assert.deepEqual(json('navigationLevels()'),['meal-filters']);
run('state.filters.category="fisk";render()');assert.equal(index,1);
history.go(-1);flush();assert.equal(run('mealFilterSheetOpen'),false);assert.equal(run('state.filters.category'),'fisk');assert.equal(index,0);
run('openMealFilters();closeMealFilters()');flush();assert.equal(index,0);
run('navigate({activeView:"week"});openMealPicker(1)');flush();
click('[data-picker-filters-toggle]');assert.equal(index,2);assert.equal(run('pickerFilterGroupsOpen'),true);
history.go(-1);flush();assert.equal(run('pickerFilterGroupsOpen'),false);assert.equal(run('state.mealPicker.open'),true);assert.equal(index,1);
history.go(-1);flush();assert.equal(run('state.mealPicker.open'),false);assert.equal(index,0);

// Editor guard: collect unsaved DOM values, restore history entry and leave the editor intact.
click("[data-edit-meal]",{editMeal:"wok"});
selectors.set("[data-meal-form]",[form]);
selectors.set("[data-ingredient-row]",[{querySelector:s=>({value:s.includes('"name"')?"Ulagret ingrediens":s.includes('"amount"')?"3":"g"})}]);
selectors.set("[data-step-row]",[{querySelector:()=>({value:"Ulagret steg"})}]);
for(let turn=0;turn<4;turn++) {
  history.go(-1);flush();assert.equal(index,2);assert.equal(entries.length,3);assert.equal(run("editorDiscardOpen"),true);
  history.go(-1);flush();assert.equal(index,1);assert.equal(run("editorDiscardOpen"),false);
  assert.equal(run("state.editingMealId"),"wok");assert.equal(run("state.draftMeal.title"),"Ulagret tittel");
  assert.equal(run("state.draftIngredients[0].name"),"Ulagret ingrediens");assert.equal(run("state.draftSteps[0]"),"Ulagret steg");
}
run('openEditorRowMenu("ingredient",0)');flush();assert.equal(index,2);
history.go(-1);flush();assert.equal(run("editorRowMenu"),null);assert.equal(run("state.editingMealId"),"wok");
const openAi=button();selectors.set("[data-open-ai-settings]",[openAi]);run("bindAiKeyEvents()");openAi.handlers.click();flush();
assert.equal(run("state.activeView"),"ai-settings");assert.equal(index,2);assert.match(app.innerHTML,/data-ai-key-return-editor/);
click("[data-ai-key-return-editor]");assert.equal(run("state.activeView"),"meals");assert.equal(run("state.editingMealId"),"wok");assert.equal(index,1);
openAi.handlers.click();flush();history.go(-1);flush();assert.equal(run("state.activeView"),"meals");assert.equal(index,1);
click("[data-cancel-edit]");assert.equal(index,2);click("[data-editor-discard]");assert.equal(index,0);
selectors.delete("[data-meal-form]");selectors.delete("[data-ingredient-row]");selectors.delete("[data-step-row]");

// Direct Edit adds an editor guard above the recipe so Cancel/Back returns there.
click("[data-view-meal]",{viewMeal:"wok"});
const edit=button({editMeal:"wok"});selectors.set("[data-edit-meal]",[edit]);run("bindEvents()");edit.handlers.click({stopPropagation(){}});
assert.equal(queue.length,0);assert.equal(run("state.editingMealId"),"wok");flush();assert.equal(index,2);
selectors.delete("[data-edit-meal]");click("[data-cancel-edit]");assert.equal(run("state.activeView"),"recipe");assert.equal(index,1);
click("[data-close-meal]");assert.equal(index,0);

// Calendar: real button binding, note and today mark only in the current week.
run('state.activeView="week"; const weekKey=getWeekKey(); state.plansByWeek[weekKey]={...emptyWeekPlan(),2:"wok"}; state.dayNotesByWeek[weekKey]={...emptyWeekDayNotes(),3:"Middag hos venner"}; render()');
assert.doesNotMatch(app.innerHTML,/today-summary|today-kicker/);assert.match(app.innerHTML,/Middag hos venner/);
assert.equal((app.innerHTML.match(/week-today-label/g)||[]).length,1);
run("state.weekOffset=1; render()");assert.doesNotMatch(app.innerHTML,/week-today-label/);run("state.weekOffset=0");
click("[data-calendar-day]",{calendarDay:"3"});assert.equal(run("state.activeView"),"week");
assert.equal(run("state.plannerDaySheet.dayIndex"),3);history.go(-1);flush();
click("[data-view-meal]",{viewMeal:"wok",recipeDay:"2"});assert.equal(run("state.selectedRecipeContext.dayIndex"),2);
click("[data-toggle-wake]");assert.equal(run("state.keepScreenAwake"),true);click("[data-toggle-wake]");assert.equal(run("state.keepScreenAwake"),false);
assert.doesNotMatch(JSON.stringify(entries),/Ulagret|Kylling|ingredients/);
assert.doesNotMatch(storage.get("middagsapp-state"),/middagsappNavigation/);
assert.doesNotMatch(source,/recipeMenuOpen|recipe-menu|closeRecipeMenu/);
const beforeAccessStop=pushes;run('stopAllSync(); accessState={kind:"login"}; render()');
assert.equal(pushes,beforeAccessStop,"Account/sync stop never pushes history");
console.log("navigation app tests ok");
