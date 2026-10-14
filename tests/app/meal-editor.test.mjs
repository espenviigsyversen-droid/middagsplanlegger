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
const button=(dataset={})=>({dataset,tagName:"BUTTON",handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(){},select(){}});
const click=(selector,dataset={})=>{
  const node=button(dataset);selectors.set(selector,[node]);run("bindEvents(); bindAiKeyEvents(); bindRecipeImportEvents()");
  node.handlers.click({target:node,currentTarget:node,stopPropagation(){},preventDefault(){}});selectors.delete(selector);flush();
};

context.navigator.onLine=true;
run('accessState={kind:"ready",role:"member",offline:false,user:{uid:"test"}}; firebaseConnection={firebaseApp:{}};loadAiKeyStatus=async()=>{};aiKeyUi.status={configured:true,status:"connected"};');
form.values.getAll=key=>Array.isArray(values[key])?values[key]:[];form.values.has=key=>Boolean(values[key]);
form.handlers={};form.addEventListener=(type,fn)=>{form.handlers[type]=fn};
let sourceValue='',textValue='';const inputNode=(getter,setter)=>({get value(){return getter()},set value(v){setter(v)},handlers:{},addEventListener(type,fn){this.handlers[type]=fn}});
const urlInput=inputNode(()=>sourceValue,v=>{sourceValue=v}),textInput=inputNode(()=>textValue,v=>{textValue=v}),sourceField=inputNode(()=>values.recipeUrl,v=>{values.recipeUrl=v});
function formFor(base) {
  for(const key of Object.keys(values))delete values[key];Object.assign(values,base,{baseServings:String(base.baseServings),minDaysBetween:String(base.minDaysBetween)});
  const fields={amount:'',unit:'',name:''};selectors.set('[data-meal-form]',[form]);selectors.set('[name="recipeUrl"]',[sourceField]);
  selectors.set('[data-ingredient-row]',[{querySelector:selector=>({value:fields[/"(\w+)"/.exec(selector)[1]]})}]);
  selectors.set('[data-step-row]',[{querySelector:()=>({value:''})}]);
  return fields;
}
function open(isNew=true,recipeUrl='') {
 selectors.clear();sourceValue=recipeUrl;textValue='';
 context.fixtureRecipeUrl=recipeUrl;run('state.activeView="meals";state.meals=[{...emptyMeal(),id:"saved",title:"Lagret middag",recipeUrl:fixtureRecipeUrl}];navigate({editingMealId:null,draftMeal:null,draftIngredients:null,draftSteps:null});');flush();
 context.openNew=isNew;run('navigate({editingMealId:openNew?"new":"saved",draftMeal:null,draftIngredients:null,draftSteps:null})');flush();
 const base=run('state.editingMealId==="new"?emptyMeal():getMeal("saved")'),fields=formFor(base);
 selectors.set('[data-import-url]',[urlInput]);run('aiKeyUi.status={configured:true,status:"connected"};bindEvents();bindRecipeImportEvents()');return fields;
}
open();assert.match(app.innerHTML,/<strong>Ny oppskrift/);assert.doesNotMatch(app.innerHTML,/meals-view-header|data-edit-meal="new"|data-meal-search/);
click('[data-cancel-edit]');assert.equal(run('state.editingMealId'),null);assert.equal(index,0);
open(false);assert.match(app.innerHTML,/<strong>Rediger/);click('[data-cancel-edit]');assert.equal(run('state.editingMealId'),null);
const fields=open();values.title='Ulagret middag';fields.name='Fisk';
click('[data-cancel-edit]');assert.equal(run('editorDiscardOpen'),true);assert.equal(index,2);assert.match(app.innerHTML,/role="alertdialog"/);assert.match(app.innerHTML,/Ulagret middag/);
const savedBefore=run('JSON.stringify(state.meals)');click('[data-editor-continue]');assert.equal(index,1);assert.equal(run('state.draftMeal.title'),'Ulagret middag');assert.equal(run('state.draftIngredients[0].name'),'Fisk');
history.go(-1);flush();assert.equal(run('editorDiscardOpen'),true);assert.equal(index,2);
history.go(-1);flush();assert.equal(run('editorDiscardOpen'),false);assert.equal(index,1);assert.equal(run('state.editingMealId'),'new');
click('[data-cancel-edit]');click('[data-editor-discard]');assert.equal(index,0);assert.equal(run('state.editingMealId'),null);assert.equal(run('JSON.stringify(state.meals)'),savedBefore);
open();history.go(-1);flush();assert.equal(run('state.editingMealId'),null);assert.equal(index,0);
// Unpersisted import content is an edit, even when the user has not pressed Save.
open();run('applyRecipeImportToEditor({title:"Importert",ingredients:[{name:"Fisk",amount:"500",unit:"g"}],steps:["Stek"]})');
selectors.delete('[data-meal-form]');selectors.delete('[data-ingredient-row]');selectors.delete('[data-step-row]');
click('[data-cancel-edit]');assert.equal(run('editorDiscardOpen'),true);assert.equal(run('state.meals.length'),1);click('[data-editor-discard]');
// Social source hints need no SDK/AI request, and retain an existing different source.
let importCalls=0;context.fakeImport=async()=>{importCalls++;return {ok:false,code:'NOT_A_RECIPE',message:'Ingen oppskrift'}};
for(const host of ['instagram.com','www.instagram.com','m.facebook.com','fb.watch','www.tiktok.com']) {
 open();sourceValue='https://'+host+'/post';run('recipeImporter=fakeImport');urlInput.handlers.input();
 assert.equal(run('state.draftMeal.recipeUrl'),sourceValue);assert.equal(values.recipeUrl,sourceValue);
 assert.match(run('renderMealEditor()'),/Lenken er lagret som kilde/);await run('startRecipeImport("url")');assert.equal(importCalls,0);
 run('switchRecipeImportMode("text")');assert.equal(run('recipeImportState.tab'),'text');run('switchRecipeImportMode("image")');assert.equal(run('recipeImportState.tab'),'image');
}
open(false,'https://example.com/original');sourceValue='https://instagram.com/post';urlInput.handlers.input();assert.equal(values.recipeUrl,'https://example.com/original');assert.doesNotMatch(run('renderMealEditor()'),/Lenken er lagret som kilde/);
// Switching retains other-mode inputs and prepared images in runtime memory only.
open();sourceValue='https://example.com/recipe';run('switchRecipeImportMode("text")');selectors.delete('[data-import-url]');selectors.set('[data-import-text]',[textInput]);
textValue='En lang oppskriftstekst som beholdes.';run('recipeImportState.images=[{mediaType:"image/jpeg",data:"PRIVATE_IMAGE"}];switchRecipeImportMode("image")');selectors.delete('[data-import-text]');
run('switchRecipeImportMode("url")');assert.equal(run('recipeImportState.url'),sourceValue);assert.equal(run('recipeImportState.text'),textValue);assert.equal(run('recipeImportState.images.length'),1);
assert.doesNotMatch(run('JSON.stringify(localStateForStorage(state,firebaseConfig.projectId))'),/PRIVATE_IMAGE|recipeImport|mealEditorSession/);
// Closing/reopening an existing import card keeps work in other modes.
open(false,'https://example.com/original');
selectors.clear();run('state.meals[0].ingredients=[{name:"Fisk",amount:"500",unit:"g"}];state.meals[0].steps=["Stek"];mealEditorSession=null;resetRecipeImport();render();');
assert.equal(run('recipeImportState.expanded'),false);assert.match(app.innerHTML,/data-import-expand/);
click('[data-import-expand]');assert.equal(run('recipeImportState.tab'),'url');assert.equal(run('recipeImportState.url'),'https://example.com/original');
run('recipeImportState.text="Tekst som beholdes ved lukking";recipeImportState.images=[{data:"PRIVATE_IMAGE"}];switchRecipeImportMode("image")');
click('[data-import-collapse]');assert.equal(run('recipeImportState.expanded'),false);
click('[data-import-expand]');assert.equal(run('recipeImportState.tab'),'url');assert.equal(run('recipeImportState.text'),'Tekst som beholdes ved lukking');assert.equal(run('recipeImportState.images.length'),1);
// The comparison baseline survives render and a visit to AI settings.
const signature=run('mealEditorSession.signature');
click('[data-open-ai-settings]');assert.equal(run('state.activeView'),'ai-settings');
click('[data-ai-key-return-editor]');assert.equal(run('state.activeView'),'meals');assert.equal(run('mealEditorSession.signature'),signature);assert.equal(run('recipeImportState.images.length'),1);
// Successful ordinary-link import supplies an empty source, but never replaces a chosen source.
open();sourceValue='https://example.com/recipe';context.ordinaryResult={ok:true,recipe:{title:'Hentet',ingredients:[{name:'Fisk'}],steps:['Stek']}};
run('recipeImporter=async()=>ordinaryResult');await run('startRecipeImport("url")');assert.equal(run('state.draftMeal.recipeUrl'),sourceValue);
open(false,'https://example.com/original');sourceValue='https://example.com/import';
run('recipeImporter=async()=>ordinaryResult');await run('startRecipeImport("url")');assert.equal(run('state.draftMeal.recipeUrl'),'https://example.com/original');
// Both Save controls target the same validated form and existing submit handler.
open();values.title='Lagret via skjema';run('bindEvents()');assert.match(app.innerHTML,/type="submit" form="mealEditorForm">Lagre/);assert.match(app.innerHTML,/id="mealEditorForm"/);
form.handlers.submit({preventDefault(){},currentTarget:form});flush();assert.equal(run('state.editingMealId'),null);assert.ok(run('state.meals.some(m=>m.title==="Lagret via skjema")'));
console.log('meal editor app tests ok');
