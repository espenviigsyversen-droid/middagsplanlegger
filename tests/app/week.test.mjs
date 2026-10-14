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
// Week behavior tests.
context.window.innerWidth=375;
context.checkOneWindow=()=>assert.ok(run('Number(Boolean(state.plannerDaySheet?.open))+Number(Boolean(state.mealPicker?.open))+Number(Boolean(state.plannerActionsOpen))+Number(Boolean(weekClearConfirmation))')<=1);
run('const originalWeekRender=render; render=(...args)=>{checkOneWindow();originalWeekRender(...args)};');
run('const key=getWeekKey(); state.family={...state.family,familySize:4}; state.meals=normalizeMeals(Array.from({length:8},(_,i)=>({...emptyMeal(),id:"m"+i,title:"Middag "+i,prepTime:i%2?"quick":"medium",minDaysBetween:1}))); state.plansByWeek[key]={...emptyWeekPlan(),0:"m0"}; state.lockedPlansByWeek[key]={...emptyWeekLocks(),1:true}; state.dayModesByWeek[key]={...emptyWeekDayModes(),2:"away"}; render()');
assert.equal(run("emptyWeekDays().length"),4);assert.equal(run("eligibleWeekDays().length"),5);
for(const legacy of ["calendar","planner"]) {
  const saved={...json("syncPayload()"),projectId:"middagsplanlegger-6db4e",activeView:legacy,previousView:legacy};
  storage.set("middagsapp-state",JSON.stringify(saved));assert.equal(run("loadState().activeView"),"shopping");
  context.saved=saved;assert.equal(run("normalizeState(saved).activeView"),"week");assert.equal(run("normalizeState(saved).previousView"),"week");
}
assert.match(app.innerHTML,/Foreslå til 4 tomme dager/);assert.doesNotMatch(app.innerHTML,/Planlegg uken|Middagsplan<\/h2>|planner-fab/);
for(const legacy of ['calendar','planner']) {
 context.legacy=legacy;run('navigate({activeView:legacy})');assert.equal(run('state.activeView'),'week');
 run('state.previousView=legacy; state.activeView="recipe"; state.selectedMealId="m0"; render(); navigateBack()');flush();assert.equal(run('state.activeView'),'week');
}
run('state.meals=normalizeMeals(state.meals);');
const ranked=json('rankedSuggestions(3).map(candidate=>candidate.meal.id)');
assert.equal(run('pickSuggestion(3)'),ranked[0]);assert.ok(!ranked.includes('m0'));
run('const allWeekMeals=state.meals; state.meals=[];');assert.doesNotMatch(run('renderMealPickerListItems("",3)'),/FORSLAG TIL/);
run('state.meals=allWeekMeals;');
run('openMealPicker(3)');flush();assert.match(app.innerHTML,/FORSLAG TIL/);assert.doesNotMatch(app.innerHTML,/Ingen middag planlagt|data-select-meal=""/);
const suggestionIds=[...app.innerHTML.matchAll(/class="meal-picker-item picker-suggestion"[^>]*data-select-meal="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(suggestionIds,ranked.slice(0,3));
const other=button();selectors.set('[data-picker-other-plans]',[other]);run('bindEvents()');other.handlers.click();selectors.delete('[data-picker-other-plans]');
assert.match(app.innerHTML,/data-picker-plan="away"/);
click('[data-picker-plan]',{pickerPlan:'away'});assert.equal(run('currentDayModes()[3]'),'away');assert.equal(run('currentPlan()[3]'),'');assert.equal(run('state.mealPicker.open'),false);assert.equal(index,0);
run('state.plansByWeek[key][1]="m1"; openDaySheet(1)');flush();
assert.match(app.innerHTML,/data-random-day="1" disabled/);assert.doesNotMatch(app.innerHTML,/data-open-meal-picker="1" disabled/);
run('openMealPicker(1,true)');flush();assert.equal(run('state.plannerDaySheet.open'),false);history.go(-1);flush();assert.equal(run('state.plannerDaySheet.open'),true);
click('[data-day-portions]',{dayPortions:'1',delta:'1'});assert.equal(run('currentServings()[1]'),5);
click('[data-day-portions]',{dayPortions:'1',delta:'-1'});assert.equal(run('currentServings()[1]'),null);
click('[data-lock-day]',{lockDay:'1'});assert.equal(run('currentLocks()[1]'),false);
const note=button({dayNote:'1'});note.value='Trening – spiser tidlig';selectors.set('[data-day-note]',[note]);run('bindEvents()');note.handlers.keydown({key:'Enter',preventDefault(){}});selectors.delete('[data-day-note]');assert.equal(run('currentDayNotes()[1]'),'Trening – spiser tidlig');
click('[data-remove-day-meal]',{removeDayMeal:'1'});assert.equal(run('currentPlan()[1]'),'');
history.go(-1);flush();
// Opening a recipe from the sheet closes the sheet and returns to the same week.
run('openDaySheet(0)');flush();click('[data-view-meal]',{viewMeal:'m0',recipeDay:'0'});
assert.equal(run('state.previousView'),'week');assert.equal(run('state.selectedRecipeContext.dayIndex'),0);assert.equal(run('state.plannerDaySheet.open'),false);
click('[data-close-meal]');assert.equal(run('state.activeView'),'week');assert.equal(run('state.weekOffset'),0);
run('state.lockedPlansByWeek[key][1]=true; openWeekMenu()');flush();assert.equal(index,1);
assert.match(app.innerHTML,/Foreslå hele uka på nytt/);
click('[data-clear-week]');assert.equal(run('state.plannerActionsOpen'),false);assert.ok(run('weekClearConfirmation'));assert.equal(index,2);
assert.match(app.innerHTML,/dagstyper, porsjoner og notater/);
history.go(-1);flush();assert.equal(run('state.plannerActionsOpen'),true);assert.equal(run('weekClearConfirmation'),null);assert.equal(index,1);
click('[data-clear-week]');click('[data-cancel-week-clear]');assert.equal(index,1);
click('[data-clear-week]');click('[data-confirm-week-clear]');assert.equal(index,0);assert.equal(run('state.plannerActionsOpen'),false);
for(const [field,defaults] of [['plansByWeek','emptyWeekPlan()'],['lockedPlansByWeek','emptyWeekLocks()'],['dayModesByWeek','emptyWeekDayModes()'],['dayTypesByWeek','emptyWeekDayTypes()'],['servingsByWeek','emptyWeekServings()'],['dayNotesByWeek','emptyWeekDayNotes()']]) assert.deepEqual(json(`state.${field}[key]`),json(defaults));
assert.equal(run('window.confirm'),undefined,'Clear must work without a native confirm');
// Proposal commands retain locked and non-home days and use the unchanged ranking.
run('state.plansByWeek[key]={...emptyWeekPlan(),0:"m0"}; state.lockedPlansByWeek[key][0]=true; state.dayModesByWeek[key][1]="away"; fillWeek()');
assert.equal(run('currentPlan()[0]'),'m0');assert.equal(run('currentPlan()[1]'),'');assert.equal(run('Object.values(currentPlan()).filter(Boolean).length'),6);
run('replaceOpenWeek()');assert.equal(run('currentPlan()[0]'),'m0');assert.equal(run('currentPlan()[1]'),'');
run('state.lockedPlansByWeek[key]=Object.fromEntries(dayNames.map((_,i)=>[i,true])); render()');assert.match(app.innerHTML,/Alle dager er planlagt/);
const list=button();selectors.set('[data-week-days]',[list]);run('bindEvents()');
const swipe=(x,y,x2,y2)=>{list.handlers.touchstart({touches:[{clientX:x,clientY:y}]});list.handlers.touchend({changedTouches:[{clientX:x2,clientY:y2}]});};
swipe(100,100,20,110);assert.equal(run('state.weekOffset'),1);
swipe(100,100,100,200);assert.equal(run('state.weekOffset'),1);swipe(10,100,110,100);assert.equal(run('state.weekOffset'),1);
swipe(100,100,180,110);assert.equal(run('state.weekOffset'),0);
run('openDaySheet(0)');flush();swipe(100,100,20,100);assert.equal(run('state.weekOffset'),0);history.go(-1);flush();
run('saveState()');assert.doesNotMatch(storage.get('middagsapp-state'),/weekClearConfirmation|pickerOtherPlans/);

// v113: only today's actual selection owns the selected class, never the first result.
run('state.meals=normalizeMeals([{...emptyMeal(),id:"fish-a",title:"Fisk A",categories:["fish"]},{...emptyMeal(),id:"fish-b",title:"Fisk B",categories:["fish"]}]); state.plansByWeek[getWeekKey()]={...emptyWeekPlan()};');
assert.doesNotMatch(run('renderMealPickerListItems("",0)'),/class="meal-picker-item selected"/);
run('state.plansByWeek[getWeekKey()][0]="fish-b"');
const selectionHtml=run('renderMealPickerListItems("",0)');
const selectedIds=[...selectionHtml.matchAll(/class="meal-picker-item selected"[^>]*data-select-meal="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(selectedIds,['fish-b']);

console.log('week app tests ok');
