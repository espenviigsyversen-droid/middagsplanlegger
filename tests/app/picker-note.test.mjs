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

// Own-note behavior with the real picker handlers and simulated history.
assert.deepEqual(json('planModeOption("_note")'),{label:'Eget notat',type:'note'});
assert.equal(run('dayPlansMeal("_note")'),false);
assert.equal(run('planModeEntries().some(([key])=>key==="_note")'),false);
assert.equal(run('"_note" in normalizePlanModeOptions({_note:{label:"Notat",type:"home"}})'),false);
assert.equal(run('makeSlug("_note")'),'note');
assert.doesNotMatch(run('renderPlanModesSetup()'),/value="_note"|Eget notat/);
run('const noteWeek=getWeekKey();state.clientUpdatedAt=123;state.pendingLocalSync=false;state.plansByWeek[noteWeek]={...emptyWeekPlan(),0:"wok"};state.dayModesByWeek[noteWeek]={...emptyWeekDayModes()};state.dayNotesByWeek[noteWeek]={...emptyWeekDayNotes(),0:"Tidligere notat"};openMealPicker(0)');flush();
assert.match(app.innerHTML,/<strong>Annen plan/);
click('[data-picker-other-plans]');assert.match(app.innerHTML,/>ANNEN PLAN</);
let focusCalls=0;
const input={value:'Tidligere notat',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(options){focusCalls++;assert.equal(options.preventScroll,true);}};
const submit={disabled:false,addEventListener(){}};
const formNote={handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};
selectors.set('[data-picker-note-input]',[input]);selectors.set('[data-picker-note-save]',[submit]);selectors.set('[data-picker-note-form]',[formNote]);
click('[data-picker-own-note]');assert.equal(index,2);assert.equal(focusCalls,1);assert.equal(run('pickerNote.text'),'Tidligere notat');
assert.deepEqual(json('navigationLevels()'),['picker:0','picker-note']);
input.value='   ';input.handlers.input();assert.equal(submit.disabled,true);run('savePickerNote()');assert.equal(run('state.mealPicker.open'),true);
input.value='x'.repeat(70);input.handlers.input();assert.equal(input.value.length,60);assert.equal(run('pickerNote.text.length'),60);
input.value='Cup';input.handlers.input();assert.equal(submit.disabled,false);
run('render()');assert.match(app.innerHTML,/value="Cup"/);assert.equal(run('state.clientUpdatedAt'),123);assert.equal(run('state.pendingLocalSync'),false);
history.go(-1);flush();assert.equal(index,1);assert.equal(run('pickerNote'),null);assert.equal(run('pickerOtherPlans'),true);assert.equal(run('state.mealPicker.open'),true);
assert.match(app.innerHTML,/>ANNEN PLAN</);
click('[data-picker-own-note]');input.value=' Cup ';input.handlers.input();
formNote.handlers.submit({preventDefault(){}});flush();
assert.equal(run('currentDayModes()[0]'),'_note');assert.equal(run('currentDayNotes()[0]'),'Cup');assert.equal(run('currentPlan()[0]'),'');assert.equal(run('state.mealPicker.open'),false);assert.equal(index,0);
assert.equal(run('state.clientUpdatedAt'),123);assert.equal(run('state.pendingLocalSync'),false);
assert.match(run('renderWeek()'),/<span class="week-day-title">Cup<\/span>/);assert.doesNotMatch(run('renderWeek()'),/week-day-note">Cup/);
selectors.delete('[data-picker-note-input]');selectors.delete('[data-picker-note-save]');selectors.delete('[data-picker-note-form]');

// The reserved mode remains non-home even if a stale plan still contains a meal ID.
run('state.plansByWeek[noteWeek][0]="wok";state.dayModesByWeek[noteWeek]=Object.fromEntries(dayNames.map((_,i)=>[i,i===0?"_note":"away"]));');
assert.equal(run('emptyWeekDays().includes(0)'),false);assert.equal(run('eligibleWeekDays().includes(0)'),false);assert.equal(run('pickSuggestion(0)'),'');
run('fillWeek();replaceOpenWeek()');assert.equal(run('currentDayModes()[0]'),'_note');assert.equal(run('currentDayNotes()[0]'),'Cup');
assert.equal(run('generateShoppingListItems([{weekKey:noteWeek,dayIndex:0,dayMode:"_note"}]).length'),0);
assert.equal(run('createWeekShoppingReview([{weekKey:noteWeek,dayIndex:0,dayMode:"_note",date:dateForWeekDay(noteWeek,0)}]).groups.length'),0);
assert.deepEqual(json('categoryCountsForPlan(currentPlan())'),{});assert.match(run('advisorSummary()'),/Barnevennlige middager: 0\//);
assert.equal(run('recentMealDistanceDays("wok",dateForWeekDay(noteWeek,2))'),null);
assert.equal(run('plannedTooClose(getMeal("wok"),2,currentPlan())'),false);
run('state.dayNotesByWeek[noteWeek][0]=""');assert.match(run('renderWeek()'),/<span class="week-day-title">Eget notat<\/span>/);
run('state.dayNotesByWeek[noteWeek][0]="Cup";openDaySheet(0)');flush();
assert.match(app.innerHTML,/value="_note" selected>Eget notat/);assert.match(app.innerHTML,/<h4>Cup<\/h4>/);
run('updateDayNote(0,"Høstcup")');assert.match(app.innerHTML,/<span class="week-day-title">Høstcup<\/span>/);

// Choosing dinner resets the mode to home and retains the note as a subline.
run('openMealPicker(0,true)');flush();
const list={handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}};selectors.set('.meal-picker-list',[list]);run('bindEvents()');
list.handlers.click({target:{closest:selector=>selector==='[data-select-meal]'?{dataset:{selectMeal:'wok'}}:null}});flush();
assert.equal(run('currentDayModes()[0]'),'home');assert.equal(run('currentPlan()[0]'),'wok');assert.equal(run('currentDayNotes()[0]'),'Høstcup');assert.equal(run('state.plannerDaySheet.open'),true);
assert.match(app.innerHTML,/<span class="week-day-title">Kyllingwok<\/span><small class="week-day-note">Høstcup/);
selectors.delete('.meal-picker-list');

// Enter and the explicit Back button use the same note-panel flow.
run('openMealPicker(1)');flush();selectors.set('[data-picker-note-input]',[input]);input.value='';
click('[data-picker-other-plans]');click('[data-picker-own-note]');click('[data-picker-note-back]');assert.equal(index,1);assert.equal(run('pickerNote'),null);
click('[data-picker-own-note]');input.value='Bursdag';input.handlers.input();input.handlers.keydown({key:'Enter',preventDefault(){}});flush();
assert.equal(run('currentDayModes()[1]'),'_note');assert.equal(run('currentDayNotes()[1]'),'Bursdag');assert.equal(run('state.mealPicker.open'),false);
assert.doesNotMatch(storage.get('middagsapp-state'),/pickerNote/);
assert.equal(JSON.parse(storage.get('middagsapp-state')).dayModesByWeek[run('noteWeek')][1],'_note');
selectors.delete('[data-picker-note-input]');

// Backup/restore preserve the existing string fields, and restore requires v125.
const {buildRestoreDocuments,validateBackup}=await import('../../src/sync/restore.js');
const exported=json('buildBackup({data:syncPayload(),appVersion:APP_VERSION,familyId:FAMILY_ID})');
const restored=validateBackup(exported),docs=buildRestoreDocuments(restored,{email:'admin@example.com'});
const weekDoc=docs.find(d=>d.path[0]==='weeks'&&d.path[1]===run('noteWeek'));
assert.equal(weekDoc.data.dayModes[1],'_note');assert.equal(weekDoc.data.dayNotes[1],'Bursdag');assert.equal(docs.at(-1).data.minAppVersion,125);
assert.equal(run('currentDayModes()[1]'),'_note');assert.equal(json('normalizeState({...state})').dayModesByWeek[run('noteWeek')][1],'_note');
run('state.weekOffset=1;openMealPicker(2)');flush();const boundWeek=run('getWeekKey()');
selectors.set('[data-picker-note-input]',[input]);click('[data-picker-other-plans]');click('[data-picker-own-note]');
input.value='Gjester';input.handlers.input();run('state.weekOffset=0;render();savePickerNote()');flush();
assert.equal(run(`state.dayModesByWeek["${boundWeek}"][2]`),'_note');assert.equal(run(`state.dayNotesByWeek["${boundWeek}"][2]`),'Gjester');
selectors.delete('[data-picker-note-input]');
run('updateDayMode(3,"_note");updateDayNote(3,"Forberedelser");openMealPicker(3);state.mealPicker.query="Hurtigmiddag";addQuickMealForPicker()');flush();
assert.equal(run('currentDayModes()[3]'),'home');assert.equal(run('currentDayNotes()[3]'),'Forberedelser');assert.equal(run('getMeal(currentPlan()[3]).title'),'Hurtigmiddag');
run('removePlanMode("_note")');assert.equal(run('currentDayModes()[1]'),'_note');
run('openWeekMenu();startWeekClear();confirmWeekClear()');flush();
assert.deepEqual(json('currentDayModes()'),json('emptyWeekDayModes()'));assert.deepEqual(json('currentDayNotes()'),json('emptyWeekDayNotes()'));
console.log('picker own-note app tests ok');
