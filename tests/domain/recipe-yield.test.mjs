import assert from "node:assert/strict";
import { normalizeMeals, recipeYieldFields } from "../../src/domain/meals.js";
import { recipeYieldView, recipeYieldFromInputs } from "../../src/domain/recipe-yield.js";
import { mealEditorFingerprint } from "../../src/domain/meal-editor.js";
import { buildBackup } from "../../src/domain/backup.js";
import { validateBackup, buildRestoreDocuments } from "../../src/sync/restore.js";
import { backupFixture } from "../helpers/backup-fixture.mjs";
import { renderRecipeYieldEditor } from "../../src/render/recipe-yield.js";
import { readFileSync } from "node:fs";
import { diffMeals } from "../../src/sync/meals.js";

const meal={id:"piece",title:"Pannekaker",baseServings:4,yieldAmount:15,yieldUnit:" pannekaker ",ingredients:[{name:"Mel",amount:"500",unit:"g"}],steps:["Stek"],categories:[]};
assert.deepEqual(recipeYieldFields(normalizeMeals([meal])[0]),{yieldAmount:15,yieldUnit:"pannekaker"});
assert.equal(diffMeals([meal],[{...meal,yieldAmount:16}]).upserts[0].yieldAmount,16);
const reverted=diffMeals([meal],[{...meal,yieldAmount:undefined,yieldUnit:undefined}]).upserts[0];
assert.equal(Object.hasOwn(reverted,"yieldAmount"),false);assert.equal(Object.hasOwn(reverted,"yieldUnit"),false);
for(const patch of [{yieldAmount:undefined},{yieldUnit:undefined},{yieldAmount:0},{yieldAmount:201},{yieldAmount:"15"},{yieldAmount:1.5},{yieldUnit:"porsjoner"},{yieldUnit:" PORSJONER "},{yieldUnit:"x".repeat(21)},{yieldUnit:20},{yieldUnit:""}]){
 const normalized=normalizeMeals([{...meal,...patch}])[0];assert.equal(Object.hasOwn(normalized,"yieldAmount"),false);assert.equal(Object.hasOwn(normalized,"yieldUnit"),false);
}
assert.equal(recipeYieldView(meal,15).ratio,1);assert.equal(recipeYieldView(meal,30).ratio,2);
assert.equal(recipeYieldView(meal,15).scope,"Hele oppskriften");assert.equal(recipeYieldView(meal,30).scope,"");
assert.equal(recipeYieldView(meal,5,true).estimate,"Gir ca. 19 pannekaker");
assert.equal(recipeYieldView({...meal,yieldAmount:2,yieldUnit:"brød"},5,true).estimate,"Gir ca. 2,5 brød");
assert.equal(recipeYieldView(meal,5,true).ratio,1.25);assert.equal(recipeYieldView(meal,15).maximum,200);assert.equal(recipeYieldView(meal,5,true).maximum,30);
assert.deepEqual(recipeYieldFromInputs({amount:"15",unit:"porsjoner",approximate:4}),{baseServings:15});
assert.deepEqual(recipeYieldFromInputs({amount:"15",unit:" pannekaker ",approximate:4}),{baseServings:4,yieldAmount:15,yieldUnit:"pannekaker"});
for(const input of [{amount:"0",unit:"stk",approximate:4},{amount:"201",unit:"stk",approximate:4},{amount:"15",unit:"",approximate:4},{amount:"15",unit:"stk",approximate:31}])assert.equal(recipeYieldFromInputs(input),null);
const signature=mealEditorFingerprint(meal,meal.ingredients,meal.steps);
for(const patch of [{yieldAmount:16},{yieldUnit:"stk"},{baseServings:5},{_yieldAmountInput:"abc"},{_yieldUnitInput:""}])assert.notEqual(signature,mealEditorFingerprint({...meal,...patch},meal.ingredients,meal.steps));
const backup=backupFixture();backup.data.meals=[normalizeMeals([meal])[0]];backup.appVersion="v123";
const exported=buildBackup({data:backup.data,appVersion:"v123",familyId:"familien",now:new Date()});
assert.equal(validateBackup(exported).data.meals[0].yieldAmount,15);
const document=buildRestoreDocuments(exported).find(d=>d.path[0]==="meals");assert.equal(document.data.yieldUnit,"pannekaker");assert.equal(document.data.baseServings,4);
for(const patch of [{yieldAmount:0},{yieldAmount:201},{yieldAmount:"15"},{yieldAmount:1.5},{yieldUnit:15},{yieldUnit:"x".repeat(21)}]){const bad=structuredClone(exported);Object.assign(bad.data.meals[0],patch);assert.throws(()=>validateBackup(bad),/Ugyldig/);}
const partial=structuredClone(exported);delete partial.data.meals[0].yieldUnit;assert.equal(Object.hasOwn(validateBackup(partial).data.meals[0],"yieldAmount"),false);
const html=renderRecipeYieldEditor(meal);assert.match(html,/Oppskriften gir/);assert.match(html,/value="15"/);assert.match(html,/Holder til ca\./);
assert.doesNotMatch(renderRecipeYieldEditor({baseServings:4}),/data-yield-holder-section >|data-yield-holder-section\s*>/);
const sw=readFileSync(new URL('../../service-worker.js',import.meta.url),'utf8');for(const file of ['src/domain/recipe-yield.js','src/render/recipe-yield.js'])assert.equal(sw.split(file).length-1,2);
console.log('recipe yield domain/backup/restore/render tests ok');
