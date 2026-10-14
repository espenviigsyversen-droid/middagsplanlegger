import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseRecipeServings, createRecipeServingsBuffer } from "../../src/ui/recipe-servings.js";
for (const value of ["0","31","abc","", " ","1.5","-1","1e1"]) assert.equal(parseRecipeServings(value),null);
for (const value of [1,15,30," 15 "]) assert.equal(parseRecipeServings(value),Number(value));
const timers=new Map(), commits=[];let id=0,now=0;
const buffer=createRecipeServingsBuffer({commit:value=>{assert.equal(buffer.pending.value,value.value);commits.push(value);},
  setTimer:(callback,ms)=>{timers.set(++id,{callback,at:now+ms});return id;},clearTimer:key=>timers.delete(key)});
const tick=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.callback();}};
for(let n=5;n<=15;n++){buffer.queue({value:n,weekKey:"2026-10-12",dayIndex:0,mealId:"recipe"});tick(10);}
assert.equal(commits.length,0);tick(489);assert.equal(commits.length,0);tick(1);assert.equal(commits.length,1);assert.equal(commits[0].value,15);assert.equal(buffer.pending,null);
buffer.queue({value:7});buffer.flush();assert.equal(commits.length,2);tick(1000);assert.equal(commits.length,2);
buffer.queue({value:9});const obsolete=[...timers.values()][0].callback;buffer.cancel();obsolete();assert.equal(commits.length,2);assert.equal(buffer.pending,null);
const css=readFileSync(new URL('../../styles.css',import.meta.url),'utf8');
assert.match(css,/button, a, input, select, textarea, label, summary, \[role="button"\], \[role="switch"\]\s*\{\s*touch-action:\s*manipulation/);
assert.match(css,/\.recipe-servings-control\s*\{[^}]*gap:\s*8px/);
assert.match(css,/\.recipe-servings-control \.button\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px/);
assert.match(css,/\.week-portions \.week-outline\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px/);
assert.match(css,/\.recipe-servings-value input\s*\{[^}]*width:\s*3ch[^}]*font-size:\s*16px/);
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
assert.match(html,/<meta name="viewport" content="width=device-width, initial-scale=1">/);
assert.doesNotMatch(html,/maximum-scale|user-scalable/);
const sw=readFileSync(new URL('../../service-worker.js',import.meta.url),'utf8');assert.equal(sw.split('src/ui/recipe-servings.js').length-1,2);
console.log('recipe servings UI buffer/validation/CSS tests ok');
